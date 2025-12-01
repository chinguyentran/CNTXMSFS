// js/airports.js
// Danh sách tọa độ các sân bay phổ biến (Bạn có thể thêm tiếp vào đây)
export const airports = {
    "VVTS": { name: "Tan Son Nhat", lat: 10.8180, lon: 106.6510 },
    "VVNB": { name: "Noi Bai", lat: 21.2212, lon: 105.8072 },
    "VVDN": { name: "Da Nang", lat: 16.0439, lon: 108.1994 },
    "VVPQ": { name: "Phu Quoc", lat: 10.1699, lon: 103.9915 },
    "VVCX": { name: "Cam Ranh", lat: 11.9980, lon: 109.2190 },
    "RJTT": { name: "Haneda Tokyo", lat: 35.5494, lon: 139.7798 },
    "WSSS": { name: "Changi Singapore", lat: 1.3644, lon: 103.9915 },
    "VTBS": { name: "Suvarnabhumi", lat: 13.6900, lon: 100.7501 },
    "RJAA": { name: "Narita Tokyo", lat: 35.7719, lon: 140.3928 }
};

// Công thức Haversine tính khoảng cách (km)
export function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}