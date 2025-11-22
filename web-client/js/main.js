// js/main.js - FULL FIXED VERSION
import { auth, db, rtdb } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, orderBy, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { initMap, createPlaneMarker, updateMarkerPosition } from './map.js';

// --- GLOBAL VARIABLES ---
const map = initMap();
const activeFlights = {}; // Lưu marker của tất cả máy bay
let myUid = null;
let myJob = null; // Lưu thông tin job hiện tại của mình
const flightPathPolyline = L.polyline([], {color: '#7c3aed', weight: 3}).addTo(map); // Đường bay của mình

// --- 1. AUTHENTICATION CHECK ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Nếu không có user -> Đá về login ngay
        window.location.href = "login.html";
        return;
    }
    
    console.log("Logged in:", user.email);
    myUid = user.uid;
    
    // Load thông tin User từ Firestore
    await loadUserProfile(user);

    // Bắt đầu lắng nghe Realtime Database (Map)
    listenToSky();
});

// --- 2. USER PROFILE & JOB STATE ---
async function loadUserProfile(user) {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    
    if (snap.exists()) {
        const data = snap.data();
        
        // Update UI
        document.getElementById('userEmail').innerText = data.email;
        document.getElementById('userPoints').innerText = (data.points || 0) + " PTS";
        if (data.role === 'admin') document.getElementById('btnAdmin').style.display = 'block';

        // QUAN TRỌNG: Check xem user có đang giữ Job không
        if (data.currentJob) {
            console.log("Found active job:", data.currentJob);
            setJobState(true, data.currentJob);
        } else {
            setJobState(false, null);
        }
    }
}

// Hàm chuyển đổi giao diện: Có Job vs Không Job
function setJobState(hasJob, jobData) {
    myJob = hasJob ? jobData : null;

    const jobPanel = document.getElementById('activeJobPanel');
    const btnJobCenter = document.getElementById('btnOpenJobCenter');
    const telemetryPanel = document.getElementById('telemetryPanel');

    if (hasJob) {
        // ĐANG CÓ JOB
        jobPanel.style.display = 'block';
        btnJobCenter.style.display = 'none'; // Ẩn nút nhận việc
        telemetryPanel.style.display = 'block'; // Hiện bảng thông số
        
        // Điền thông tin job
        document.getElementById('jobRoute').innerText = jobData.route;
        document.getElementById('jobAircraft').innerText = jobData.aircraft;
    } else {
        // KHÔNG CÓ JOB (RẢNH)
        jobPanel.style.display = 'none';
        btnJobCenter.style.display = 'block'; // Hiện nút nhận việc
        telemetryPanel.style.display = 'none'; // Ẩn bảng thông số
        
        // Xóa sạch marker và đường bay của mình nếu có
        if (activeFlights[myUid]) {
            map.removeLayer(activeFlights[myUid].marker);
            delete activeFlights[myUid];
        }
        flightPathPolyline.setLatLngs([]);
    }
}

// --- 3. MAP LOGIC (REALTIME) ---
function listenToSky() {
    const skyRef = ref(rtdb, 'live_flights');
    
    onValue(skyRef, (snapshot) => {
        const allData = snapshot.val() || {};

        // A. Cập nhật các máy bay đang bay
        Object.keys(allData).forEach(uid => {
            const flightData = allData[uid];
            
            // LOGIC CỐT LÕI: 
            // Nếu là MÌNH (uid === myUid) VÀ KHÔNG CÓ JOB (!myJob) -> THÌ KHÔNG VẼ
            if (uid === myUid && !myJob) {
                return; 
            }

            updateAircraft(uid, flightData);
        });

        // B. Xóa các máy bay đã ngắt kết nối
        Object.keys(activeFlights).forEach(uid => {
            // Nếu không còn dữ liệu HOẶC (là mình mà mình vừa hủy job)
            if (!allData[uid] || (uid === myUid && !myJob)) {
                if (activeFlights[uid]) {
                    map.removeLayer(activeFlights[uid].marker);
                    delete activeFlights[uid];
                }
            }
        });
    });
}

function updateAircraft(uid, data) {
    const tel = data.telemetry;
    const isMe = (uid === myUid);

    // Nếu là mình -> Cập nhật bảng thông số
    if (isMe) {
        document.getElementById('tStatus').innerText = data.status;
        document.getElementById('tAlt').innerText = tel.alt;
        document.getElementById('tSpd').innerText = tel.speed;
        document.getElementById('tHdg').innerText = tel.heading;
        
        // Vẽ đường bay màu tím cho mình
        if (data.flight_path) {
            const path = Object.values(data.flight_path).map(p => [p.lat, p.lon]);
            flightPathPolyline.setLatLngs(path);
        }
    }

    // Vẽ/Cập nhật Marker
    if (!activeFlights[uid]) {
        // Tạo mới
        const color = isMe ? '#7c3aed' : '#ffd700'; // Mình: Tím, Bạn: Vàng
        const marker = createPlaneMarker(tel.lat, tel.lon, tel.heading).addTo(map);
        
        if (!isMe) marker.setOpacity(0.7); // Làm mờ người khác
        else map.setView([tel.lat, tel.lon], 13); // Zoom vào mình

        activeFlights[uid] = { marker };
    } else {
        // Cập nhật vị trí
        updateMarkerPosition(activeFlights[uid].marker, tel.lat, tel.lon, tel.heading);
    }
}

// --- 4. JOB ACTIONS (NHẬN / HỦY) ---

// Load danh sách Event để nhận
async function loadEventsToModal() {
    const container = document.getElementById('jobListContainer');
    container.innerHTML = 'Loading...';
    
    const q = query(collection(db, "events"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    
    container.innerHTML = '';
    snapshot.forEach(docSnap => {
        const e = docSnap.data();
        const div = document.createElement('div');
        div.className = 'glass';
        div.style.padding = '15px'; div.style.marginBottom = '10px';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong style="color:var(--primary);">${e.route}</strong>
                    <div style="font-size:0.8rem; color:#aaa;">✈ ${e.aircraft} | +${e.points} PTS</div>
                </div>
                <button class="btn-accept" style="background:var(--success); border:none; padding:5px 15px; border-radius:5px; cursor:pointer; font-weight:bold;">ACCEPT</button>
            </div>
        `;
        
        // Xử lý nút ACCEPT
        div.querySelector('.btn-accept').onclick = async () => {
            if (confirm(`Nhận chuyến bay ${e.route}?`)) {
                const jobData = {
                    route: e.route,
                    aircraft: e.aircraft,
                    points: e.points,
                    startedAt: new Date().toISOString()
                };

                // Lưu vào Firestore
                await updateDoc(doc(db, "users", myUid), { currentJob: jobData });
                
                // Cập nhật State cục bộ
                setJobState(true, jobData);
                
                // Đóng modal
                document.getElementById('modalJobs').style.display = 'none';
                alert("Đã nhận việc! Máy bay của bạn sẽ hiện lên bản đồ ngay bây giờ.");
            }
        };
        container.appendChild(div);
    });
}

// Nút HỦY / KẾT THÚC JOB
document.getElementById('btnFinishJob').onclick = async () => {
    if (confirm("Bạn muốn KẾT THÚC hoặc HỦY chuyến bay này?")) {
        // Xóa job trong Firestore
        await updateDoc(doc(db, "users", myUid), { currentJob: null });
        
        // Cập nhật State -> Máy bay sẽ tự biến mất
        setJobState(false, null);
    }
};

// --- 5. MODAL HANDLERS ---
const modalJobs = document.getElementById('modalJobs');
const modalRank = document.getElementById('modalRank');

document.getElementById('btnOpenJobCenter').onclick = () => {
    modalJobs.style.display = 'block';
    loadEventsToModal();
};
document.getElementById('btnOpenLeaderboard').onclick = () => {
    modalRank.style.display = 'block';
    loadLeaderboard();
};
document.getElementById('closeJobModal').onclick = () => modalJobs.style.display = 'none';
document.getElementById('closeRankModal').onclick = () => modalRank.style.display = 'none';

// --- 6. LEADERBOARD ---
async function loadLeaderboard() {
    const tbody = document.getElementById('leaderboardBody');
    tbody.innerHTML = 'Loading...';
    const q = query(collection(db, "users"), orderBy("points", "desc"), limit(10));
    const snap = await getDocs(q);
    tbody.innerHTML = '';
    let idx = 1;
    snap.forEach(d => {
        const u = d.data();
        tbody.innerHTML += `<tr><td>${idx++}</td><td>${u.email.split('@')[0]}</td><td>${u.points}</td></tr>`;
    });
}

// --- 7. LOGOUT (ĐÃ SỬA) ---
document.getElementById('btnLogout').addEventListener('click', () => {
    signOut(auth).then(() => {
        console.log("Signed out");
        window.location.href = "index.html";
    }).catch((error) => {
        alert("Logout error: " + error.message);
    });
});