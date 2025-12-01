// js/main.js - FINAL VERSION WITH FULL LEADERBOARD LOGIC
import { auth, db, rtdb } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, updateDoc, collection, query, orderBy, getDocs, onSnapshot, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { initMap, updateAircraft2D, drawRouteLine2D } from './map.js';
import { airports } from './airports.js';

const map = initMap();
let myUid = null;
let myJob = null;
let myCurrentRankInfo = null;
const activeFlights = {}; 
let plannedRouteLayer = null;

// --- CẤU HÌNH RANK ---
const RANK_SYSTEM = [
    { pts: 0,      color: "#a0a0a0", title: "Trainee (Học viên)" },
    { pts: 5000,   color: "#00ff00", title: "Junior First Officer (Cơ phó dự bị)" },
    { pts: 10000,  color: "#00ccff", title: "First Officer (Cơ phó)" },
    { pts: 20000,  color: "#bd00ff", title: "Senior First Officer (Cơ phó cấp cao)" },
    { pts: 40000,  color: "#ff9900", title: "Captain (Cơ trưởng)" },
    { pts: 60000,  color: "#ff0000", title: "Senior Captain (Cơ trưởng cấp cao)" },
    { pts: 80000,  color: "#ff0066", title: "Commander (Chỉ huy trưởng)" },
    { pts: 100000, color: "#ffd700", title: "Legendary Pilot (Phi công huyền thoại)" },
    { pts: 150000, color: "#00ffff", title: "Sky Marshal (Thống Lĩnh Bầu Trời)" },
    { pts: 200000, color: "#ffffff", title: "The GOAT (Huyền Thoại Sống)" }
];

function getRankInfo(points) {
    let current = RANK_SYSTEM[0];
    for (let i = 0; i < RANK_SYSTEM.length; i++) {
        if (points >= RANK_SYSTEM[i].pts) current = RANK_SYSTEM[i];
        else break;
    }
    let engTitle = current.title.split(' (')[0].trim();
    return { fullTitle: current.title, engTitle: engTitle, color: current.color };
}

// --- 1. AUTH & USER ---
onAuthStateChanged(auth, (user) => {
    if (!user) { window.location.href = "login.html"; return; }
    myUid = user.uid;
    
    onSnapshot(doc(db, "users", myUid), (docSnap) => {
        if (docSnap.exists()) {
            const d = docSnap.data();
            const pts = d.points || 0;
            myCurrentRankInfo = getRankInfo(pts);

            document.getElementById('userEmail').innerText = d.email;
            document.getElementById('userPoints').innerText = Math.round(pts) + " PTS";
            
            const rankEl = document.getElementById('userRankDisplay');
            if(rankEl) {
                rankEl.innerText = myCurrentRankInfo.fullTitle;
                rankEl.style.color = myCurrentRankInfo.color;
                rankEl.style.fontWeight = "bold";
                rankEl.style.textShadow = `0 0 5px ${myCurrentRankInfo.color}`;
            }

            if(d.role === 'admin') document.getElementById('btnAdmin').style.display = 'block';
            
            if (d.currentJob) {
                if (!myJob || JSON.stringify(myJob) !== JSON.stringify(d.currentJob)) {
                    setJobState(true, d.currentJob);
                }
            } else {
                setJobState(false, null);
            }
        }
    });
    listenToSky();
});

// --- 2. MAP LOGIC ---
function listenToSky() {
    onValue(ref(rtdb, 'live_flights'), async (snap) => {
        const allData = snap.val() || {};
        const currentUids = new Set(Object.keys(allData));

        for (const uid of currentUids) {
            if (uid === myUid && !myJob) continue;

            let rInfo = { title: "Pilot", color: "#fff", engTitle: "PILOT" };
            if (uid === myUid && myCurrentRankInfo) rInfo = myCurrentRankInfo;
            else rInfo = { fullTitle: "Traffic", color: "#aaaaaa", engTitle: "TRAFFIC" };

            updateAircraft2D(map, uid, allData[uid], activeFlights, (uid === myUid), rInfo);

            if (uid === myUid && myJob) {
                updateTelemetry(allData[uid]);
                checkFinishCondition(allData[uid]);
            }
        }

        Object.keys(activeFlights).forEach(uid => {
            if (!currentUids.has(uid) || (uid === myUid && !myJob)) {
                if (activeFlights[uid]) {
                    map.removeLayer(activeFlights[uid].marker);
                    map.removeLayer(activeFlights[uid].polyline);
                    delete activeFlights[uid];
                }
            }
        });
    });
}

function updateTelemetry(d) {
    document.getElementById('tStatus').innerText = d.status;
    document.getElementById('tAlt').innerText = d.telemetry.alt;
    document.getElementById('tSpd').innerText = d.telemetry.speed;
    document.getElementById('tHdg').innerText = d.telemetry.heading;
}

function checkFinishCondition(d) {
    const btnFinish = document.getElementById('btnFinishJob');
    const statusText = document.getElementById('jobStatusText');
    const dist = d.distance_remain || 9999;
    statusText.innerText = `Dest: ${dist} km`;

    if (dist < 10 && d.telemetry.speed < 15) {
        document.getElementById('btnFinishJob').onclick = async () => {
             alert("CHÚC MỪNG! Chuyến bay hoàn tất.");
             await finishJobProcess();
        };
        btnFinish.innerText = "✅ HOÀN THÀNH";
        btnFinish.style.background = "#00ff00"; 
        btnFinish.style.color = "black";
    } else {
        document.getElementById('btnFinishJob').onclick = async () => {
            if(confirm("Hủy chuyến bay?")) await finishJobProcess();
        };
        btnFinish.innerText = "HỦY CHUYẾN BAY";
        btnFinish.style.background = "#ef4444"; 
        btnFinish.style.color = "white";
    }
}

async function finishJobProcess() {
    try {
        await updateDoc(doc(db, "users", myUid), { currentJob: null });
        setJobState(false, null);
    } catch (e) { alert("Lỗi: " + e.message); }
}

function setJobState(hasJob, jobData) {
    myJob = hasJob ? jobData : null;
    if (plannedRouteLayer) { map.removeLayer(plannedRouteLayer); plannedRouteLayer = null; }

    if (hasJob) {
        document.getElementById('activeJobPanel').style.display = 'block';
        document.getElementById('btnOpenJobCenter').style.display = 'none';
        document.getElementById('telemetryPanel').style.display = 'block';
        document.getElementById('jobRoute').innerText = jobData.route;
        document.getElementById('jobAircraft').innerText = jobData.aircraft;
        
        if(airports[jobData.dep] && airports[jobData.arr]) {
            plannedRouteLayer = drawRouteLine2D(map, airports[jobData.dep], airports[jobData.arr]);
            if (plannedRouteLayer) map.fitBounds(plannedRouteLayer.getBounds(), {padding: [50, 50]});
        }
    } else {
        document.getElementById('activeJobPanel').style.display = 'none';
        document.getElementById('btnOpenJobCenter').style.display = 'block';
        document.getElementById('telemetryPanel').style.display = 'none';
        if (activeFlights[myUid]) {
            map.removeLayer(activeFlights[myUid].marker);
            map.removeLayer(activeFlights[myUid].polyline);
            delete activeFlights[myUid];
        }
    }
}

// --- PHẦN MODAL & EVENT LISTENER (FULL) ---
const modalJobs = document.getElementById('modalJobs');
const modalRank = document.getElementById('modalRank');

// Nút mở Job Center
document.getElementById('btnOpenJobCenter').onclick = async () => {
    modalJobs.style.display = 'block';
    const container = document.getElementById('jobListContainer');
    container.innerHTML = '<p style="text-align:center">Loading...</p>';
    const q = query(collection(db, "events"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    container.innerHTML = '';
    
    snapshot.forEach(docSnap => {
        const e = docSnap.data();
        const div = document.createElement('div');
        div.className = 'glass';
        div.style.padding = '10px'; div.style.marginBottom = '10px';
        div.style.display = 'flex'; div.style.gap = '10px'; div.style.alignItems = 'center';
        div.innerHTML = `
            <div style="flex:1"><strong style="color:var(--primary)">${e.route}</strong><div style="font-size:0.8rem; color:#aaa;">${e.aircraft} | ${e.distance}km</div></div>
            <div style="text-align:right;"><div style="color:var(--gold);">~${e.points} PTS</div><button class="btn-accept" style="background:var(--success); border:none; padding:5px 15px; border-radius:5px; cursor:pointer; font-weight:bold;">ACCEPT</button></div>`;
        
        div.querySelector('.btn-accept').onclick = async () => {
            if (confirm(`Nhận chuyến bay ${e.route}?`)) {
                const jobData = { dep: e.dep, arr: e.arr, route: e.route, aircraft: e.aircraft, points: e.points, startedAt: new Date().toISOString() };
                await updateDoc(doc(db, "users", myUid), { currentJob: jobData });
                modalJobs.style.display = 'none';
            }
        };
        container.appendChild(div);
    });
};

// Nút mở Leaderboard (ĐÃ BỔ SUNG ĐẦY ĐỦ)
document.getElementById('btnOpenLeaderboard').onclick = async () => {
    modalRank.style.display = 'block';
    const tbody = document.getElementById('leaderboardBody');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px;">Loading data...</td></tr>';
    
    try {
        const q = query(collection(db, "users"), orderBy("points", "desc"), limit(20));
        const snapshot = await getDocs(q);
        
        tbody.innerHTML = '';
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No data found.</td></tr>';
            return;
        }

        let idx = 1;
        snapshot.forEach(docSnap => {
            const u = docSnap.data();
            const pts = u.points || 0;
            const rankInfo = getRankInfo(pts);
            
            let displayName = u.email.split('@')[0];
            let rowStyle = "border-bottom:1px solid rgba(255,255,255,0.05);";
            if (docSnap.id === myUid) {
                displayName += " (YOU)";
                rowStyle += " background: rgba(124, 58, 237, 0.2);";
            }

            let idxDisplay = `#${idx}`;
            if (idx === 1) idxDisplay = "🥇";
            if (idx === 2) idxDisplay = "🥈";
            if (idx === 3) idxDisplay = "🥉";

            const row = `
                <tr style="${rowStyle}">
                    <td style="padding:10px; text-align:center; color:#fff;">${idxDisplay}</td>
                    <td style="padding:10px;">
                        <div style="font-weight:bold; color:#fff;">${displayName}</div>
                        <div style="font-size:0.7rem; color:${rankInfo.color}; font-weight:800; text-transform:uppercase;">${rankInfo.engTitle}</div>
                    </td>
                    <td style="padding:10px; text-align:right; font-weight:bold; color:var(--gold);">${Math.round(pts)}</td>
                </tr>
            `;
            tbody.innerHTML += row;
            idx++;
        });
    } catch (error) {
        console.error("Leaderboard Error:", error);
        tbody.innerHTML = `<tr><td colspan="3" style="color:orange; text-align:center;">Lỗi Index! Mở Console (F12) để lấy link sửa.</td></tr>`;
    }
};

document.getElementById('closeJobModal').onclick = () => modalJobs.style.display = 'none';
document.getElementById('closeRankModal').onclick = () => modalRank.style.display = 'none';
document.getElementById('btnLogout').onclick = () => { if(confirm("Đăng xuất?")) signOut(auth).then(() => window.location.href="index.html"); };
