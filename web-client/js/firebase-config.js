// Import SDK từ CDN (Vanilla JS style)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDE8JC3AmNbvpebg3ls9O_QFdcIdnOJLbs",
  authDomain: "cntxmsfs.firebaseapp.com",
  databaseURL: "https://cntxmsfs-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cntxmsfs",
  storageBucket: "cntxmsfs.firebasestorage.app",
  messagingSenderId: "850384735200",
  appId: "1:850384735200:web:7f5c0ebba3ed8feee57985",
  measurementId: "G-44B2QBN0YB"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

export { auth, db, rtdb };
