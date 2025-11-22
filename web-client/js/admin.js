// js/admin.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, getDocs, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
    try {
        await addDoc(collection(db, "events"), {
            route: document.getElementById('route').value,
            aircraft: document.getElementById('aircraft').value,
            points: Number(document.getElementById('points').value),
            date: document.getElementById('date').value,
            createdAt: new Date()
        });
        eventForm.reset();
        loadEvents();
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