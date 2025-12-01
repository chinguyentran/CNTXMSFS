// js/admin.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, getDocs, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { airports, getDistance } from './airports.js'; // Import logic tính khoảng cách

// 1. CHECK QUYỀN ADMIN
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
            console.log("Admin Access Granted");
            loadData(); // Tải dữ liệu nếu đúng là admin
        } else {
            alert("Access Denied!");
            window.location.href = "dashboard.html";
        }
    } else {
        window.location.href = "login.html";
    }
});

// 2. HÀM TẢI DỮ LIỆU CHUNG
async function loadData() {
    await loadEvents();
    await loadRanks();
}

// --- QUẢN LÝ EVENTS ---
const eventsContainer = document.getElementById('eventsContainer');
const eventForm = document.getElementById('addEventForm');


async function loadEvents() {
    eventsContainer.innerHTML = '<p>Loading...</p>';
    const q = query(collection(db, "events"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    
    eventsContainer.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const div = document.createElement('div');
        div.className = 'item-card';
        div.innerHTML = `
            <div>
                <strong style="color:var(--primary)">${data.route}</strong>
                <div style="font-size:0.8rem">${data.aircraft} | 💎 ${data.points} PTS</div>
            </div>
            <button class="delete-btn" onclick="window.deleteItem('events', '${docSnap.id}')">DEL</button>
        `;
        eventsContainer.appendChild(div);
    });
}

eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const dep = document.getElementById('dep').value.toUpperCase();
    const arr = document.getElementById('arr').value.toUpperCase();

    // Validate sân bay
    if (!airports[dep] || !airports[arr]) {
        alert("Mã sân bay chưa có trong hệ thống (file airports.js).");
        return;
    }
    const dist = getDistance(airports[dep].lat, airports[dep].lon, airports[arr].lat, airports[arr].lon);
    const points = Math.round(dist); 

    try {
        await addDoc(collection(db, "events"), {
            dep: dep, 
            arr: arr,
            route: `${dep} - ${arr}`,
            aircraft: document.getElementById('aircraft').value,
            points: points,     // Điểm dự kiến
            distance: Math.round(dist), // Khoảng cách
            date: document.getElementById('date').value,
            createdAt: new Date()
        });
        alert(`Đã thêm chuyến bay! ${Math.round(dist)}km = ${points} điểm.`);
        eventForm.reset();
        // Gọi hàm loadEvents() ở đây nếu có
    } catch (err) { alert("Error: " + err.message); }
});

// --- QUẢN LÝ RANKS ---
const ranksContainer = document.getElementById('ranksContainer');
const rankForm = document.getElementById('addRankForm');

async function loadRanks() {
    ranksContainer.innerHTML = '<p>Loading...</p>';
    const q = query(collection(db, "ranks"), orderBy("requiredPoints", "asc"));
    const snapshot = await getDocs(q);
    
    ranksContainer.innerHTML = '';
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const div = document.createElement('div');
        div.className = 'item-card';
        div.style.borderLeft = "3px solid #00ff00";
        div.innerHTML = `
            <div>
                <strong style="color:var(--success)">${data.title}</strong>
                <div style="font-size:0.8rem">Yêu cầu: ${data.requiredPoints} PTS</div>
            </div>
            <button class="delete-btn" onclick="window.deleteItem('ranks', '${docSnap.id}')">DEL</button>
        `;
        ranksContainer.appendChild(div);
    });
}

rankForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "ranks"), {
            title: document.getElementById('rankTitle').value,
            requiredPoints: Number(document.getElementById('rankPoints').value)
        });
        rankForm.reset();
        loadRanks();
    } catch (err) { alert("Error: " + err.message); }
});

// --- HÀM XÓA GLOBAL ---
window.deleteItem = async (col, id) => {
    if (confirm("Are you sure?")) {
        await deleteDoc(doc(db, col, id));
        loadData();
    }
};

eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const dep = document.getElementById('dep').value.toUpperCase();
    const arr = document.getElementById('arr').value.toUpperCase();
    
    // 1. Kiểm tra mã sân bay có trong database không
    if (!airports[dep] || !airports[arr]) {
        alert("Mã sân bay không tồn tại trong hệ thống (airports.js). Hãy nhập đúng hoặc thêm mới vào file code.");
        return;
    }

    // 2. Tự động tính điểm dựa trên khoảng cách (100km = 100 điểm => 1km = 1 điểm)
    const dist = getDistance(airports[dep].lat, airports[dep].lon, airports[arr].lat, airports[arr].lon);
    const calculatedPoints = Math.round(dist); 

    try {
        await addDoc(collection(db, "events"), {
            dep: dep, // Lưu mã sân bay đi
            arr: arr, // Lưu mã sân bay đến
            route: `${dep} - ${arr}`, // Tự tạo string route để hiển thị
            aircraft: document.getElementById('aircraft').value,
            points: calculatedPoints, // Điểm tự tính
            distance: Math.round(dist), // Lưu khoảng cách dự kiến
            date: document.getElementById('date').value,
            createdAt: new Date()
        });
        eventForm.reset();
        loadEvents();
        alert(`Đã thêm chuyến bay! Khoảng cách: ${Math.round(dist)}km - Điểm thưởng: ${calculatedPoints}`);
    } catch (err) { alert("Error: " + err.message); }
});