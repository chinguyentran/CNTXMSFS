// js/map.js - 2D LEAFLET VERSION

export function initMap() {
    // Tọa độ trung tâm Việt Nam
    const map = L.map('map', {
        center: [16.047079, 108.206230],
        zoom: 5,
        zoomControl: false, // Tắt nút zoom cho đẹp
        attributionControl: false
    });

    // Layer bản đồ Tối (Dark Matter) - Rất hợp với giao diện Neon
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    return map;
}

// js/map.js

// ... (Hàm initMap và drawRouteLine2D giữ nguyên) ...

// CẬP NHẬT MÁY BAY 2D (KÈM RANK LABEL)
export function updateAircraft2D(map, uid, data, activeFlights, isMe, rankInfo) {
    const tel = data.telemetry;
    
    // Nếu chưa có rankInfo (ví dụ người lạ chưa kịp load), dùng mặc định
    const rInfo = rankInfo || { title: "Pilot", color: "#ffffff" }; 

    if (!activeFlights[uid]) {
        // --- TẠO MỚI ---
        const color = isMe ? '#7c3aed' : '#ffd700'; 
        
        const icon = L.divIcon({
            className: 'custom-plane',
            html: `<div class="plane-marker" style="transform: rotate(${tel.heading - 45}deg); color: ${color}; font-size: 24px;">✈️</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        const marker = L.marker([tel.lat, tel.lon], {icon: icon}).addTo(map);
        
        // --- TẠO NHÃN TÊN & RANK (TOOLTIP) ---
        // Chỉ lấy tên email trước @
        const shortName = uid.slice(0, 6) + "..."; // Hoặc lấy email từ data nếu có truyền xuống
        
        // Nội dung hiển thị: Rank (Màu) + Tên
        const labelContent = `
            <div style="color: ${rInfo.color}; font-weight: 800; text-transform: uppercase; font-size: 9px;">${rInfo.engTitle}</div>
            <div style="color: #fff;">${isMe ? "YOU" : shortName}</div>
        `;

        marker.bindTooltip(labelContent, {
            permanent: true,      // Luôn hiện
            direction: 'top',     // Hiện bên trên
            className: 'pilot-label', // Class CSS đã viết ở bước 1
            offset: [0, -10]      // Đẩy lên cao một chút khỏi máy bay
        });

        const polyline = L.polyline([], {color: color, weight: isMe ? 3 : 1}).addTo(map);
        activeFlights[uid] = { marker, polyline };
        
        if (isMe) map.setView([tel.lat, tel.lon], 6);

    } else {
        // --- CẬP NHẬT ---
        const flight = activeFlights[uid];
        flight.marker.setLatLng([tel.lat, tel.lon]);
        
        // Xoay icon
        const iconDiv = flight.marker.getElement().querySelector('.plane-marker');
        if(iconDiv) {
            iconDiv.style.transform = `rotate(${tel.heading - 45}deg)`;
        }

        // Cập nhật Rank/Màu nếu thay đổi (Ví dụ đang bay mà lên cấp)
        // Lưu ý: Để tối ưu hiệu năng, ta có thể không cần setContent liên tục nếu rank không đổi
        // Nhưng set lại cũng không sao với số lượng ít.
        const labelContent = `
            <div style="color: ${rInfo.color}; font-weight: 800; text-transform: uppercase; font-size: 9px;">${rInfo.engTitle}</div>
            <div style="color: #fff;">${isMe ? "YOU" : uid.slice(0, 6)}...</div>
        `;
        flight.marker.setTooltipContent(labelContent);

        if (data.flight_path) {
            const path = Object.values(data.flight_path).map(p => [p.lat, p.lon]);
            flight.polyline.setLatLngs(path);
        }
    }
}

// Vẽ đường dự kiến (Màu vàng nét đứt)
export function drawRouteLine2D(map, dep, arr) {
    // Xóa đường cũ nếu có (bằng cách tìm layer có id riêng hoặc xóa hết layer group - ở đây làm đơn giản)
    // Trong main.js sẽ quản lý biến này
    
    // Nếu có plugin Geodesic (Đường cong)
    if (L.geodesic) {
        return L.geodesic([[dep.lat, dep.lon], [arr.lat, arr.lon]], {
            weight: 2,
            opacity: 0.6,
            color: '#ffd700', // Vàng
            steps: 50,
            dashArray: '10, 10' // Nét đứt
        }).addTo(map);
    } else {
        // Không có plugin thì vẽ đường thẳng
        return L.polyline([[dep.lat, dep.lon], [arr.lat, arr.lon]], {
            weight: 2,
            opacity: 0.6,
            color: '#ffd700',
            dashArray: '10, 10'
        }).addTo(map);
    }
}