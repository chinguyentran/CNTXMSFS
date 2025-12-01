// js/auth.js (Phiên bản Debug chi tiết)
import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const loginForm = document.getElementById('loginForm');
const ADMIN_EMAIL = "chinguyengaming@gmail.com";

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const btn = loginForm.querySelector('button');
        
        console.log("Đang xử lý đăng nhập cho:", email); // Kiểm tra xem nút có hoạt động không

        try {
            btn.textContent = "Đang đăng nhập...";
            
            // 1. Thử đăng nhập
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log("Đăng nhập thành công:", userCredential.user.uid);
            
            // Kiểm tra xem user này đã có trong Firestore chưa (để tránh lỗi null ở Dashboard)
            await checkAndCreateUserProfile(userCredential.user);

            window.location.href = "dashboard.html";
            
        } catch (error) {
            console.error("Lỗi đăng nhập:", error.code, error.message);

            // 2. Nếu user chưa tồn tại -> Chuyển sang đăng ký
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials') {
                // Lưu ý: Firebase mới gộp lỗi sai pass và ko tìm thấy user thành 'invalid-login-credentials' để bảo mật
                // Nên ta sẽ thử tạo mới.
                
                const confirmRegister = confirm("Tài khoản này chưa tồn tại hoặc sai mật khẩu. Bạn có muốn ĐĂNG KÝ MỚI với email này không?");
                
                if (confirmRegister) {
                    try {
                        btn.textContent = "Đang đăng ký...";
                        const newUserCred = await createUserWithEmailAndPassword(auth, email, password);
                        
                        await checkAndCreateUserProfile(newUserCred.user);
                        
                        alert("Đăng ký thành công! Đang chuyển hướng...");
                        window.location.href = "dashboard.html";

                    } catch (regError) {
                         // Nếu đăng ký lỗi -> Có thể do sai pass của nick cũ (nếu nick đã có)
                        if(regError.code === 'auth/email-already-in-use') {
                            alert("Lỗi: Email này đã có người dùng nhưng bạn nhập sai mật khẩu!");
                        } else {
                            alert("Lỗi Đăng ký: " + regError.message);
                        }
                        btn.textContent = "ACCESS SYSTEM";
                    }
                } else {
                     btn.textContent = "ACCESS SYSTEM";
                }
            } else {
                alert("Lỗi: " + error.code + " - " + error.message);
                btn.textContent = "ACCESS SYSTEM";
            }
        }
    });
}

// Hàm phụ: Đảm bảo User luôn có data trong Firestore
async function checkAndCreateUserProfile(user) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    

    if (!userSnap.exists()) {
        console.log("User chưa có data trong Firestore, đang tạo...");
        const role = (user.email === ADMIN_EMAIL) ? 'admin' : 'pilot';
        await setDoc(userRef, {
            email: user.email,
            role: role,
            points: 0,
            createdAt: new Date().toISOString()
        });
    }
}