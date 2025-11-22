// js/map.js
// File này chứa các hàm xử lý bản đồ thuần túy, không dính tới Firebase

// 1. Khởi tạo bản đồ
export function initMap() {
    // Tọa độ mặc định (Việt Nam)
    const map = L.map('map').setView([16.047079, 108.206230], 6); 

    // Sử dụng lớp bản đồ tối (Dark Mode) của CartoDB cho hợp tông màu Neon
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    return map;
}

// 2. Tạo Marker Máy bay (Dùng HTML DivIcon để xoay được bằng CSS)
export function createPlaneMarker(lat, lon, heading) {
    const icon = L.divIcon({
        className: 'custom-plane-container', // Class rỗng để tránh style mặc định
        html: `<div class="plane-marker" style="transform: rotate(${heading}deg);">✈️</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15] // Căn giữa tâm
    });

    return L.marker([lat, lon], {icon: icon});
}

// 3. Cập nhật vị trí và hướng xoay
export function updateMarkerPosition(marker, lat, lon, heading) {
    marker.setLatLng([lat, lon]);
    
    // update icon rotation bằng cách set lại HTML (Leaflet Vanilla trick)
    const icon = marker.getIcon();
    // Trừ 45 độ hoặc giữ nguyên tùy vào icon emoji gốc, emoji máy bay ✈️ thường hướng lên 
    // hoặc hướng 45 độ. Ta xoay trực tiếp div bên trong.
    // Lưu ý: Emoji ✈️ mặc định hướng lên (0 độ).
    marker.setIcon(L.divIcon({
        className: 'custom-plane-container',
        html: `<div class="plane-marker" style="transform: rotate(${heading - 45}deg);">✈️</div>`, // -45 do icon gốc hơi nghiêng
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    }));
}