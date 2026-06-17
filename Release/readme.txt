 Nhóm: 23520036 - Cáp Kim Hải Anh & 23520880 - Nguyễn Bá Long

 CYBER ENDLESS RUNNER 3D — HƯỚNG DẪN CÀI ĐẶT VÀ SỬ DỤNG
 Đồ án môn Đồ Họa Máy Tính (CS105.Q22) — Three.js / WebGL

MỤC LỤC
  1. Yêu cầu môi trường
  2. Hướng dẫn chạy (thư mục Release — không cần build)
  3. Điều khiển trong game
  4. Chế độ Demo Gallery
  5. Nội dung đồ họa đã đáp ứng

1. YÊU CẦU MÔI TRƯỜNG

Trình duyệt hỗ trợ WebGL 2.0 (bắt buộc):
  - Google Chrome >= 107
  - Microsoft Edge >= 107
  - Firefox >= 107

! QUAN TRỌNG: Không mở file index.html trực tiếp bằng đường dẫn file:// trên trình duyệt.
  Trình duyệt sẽ chặn tải model GLB và texture (lỗi CORS). Phải dùng local HTTP server như hướng dẫn bên dưới.

2. HƯỚNG DẪN CHẠY TỪ THƯ MỤC RELEASE (KHÔNG CẦN BUILD)

Thư mục Release đã có sẵn file dist/app.bundle.js đã được build sẵn. Chỉ cần khởi động một local server.

Cách 1: Dùng Python (đơn giản nhất và ưu tiên)

Yêu cầu: Python 3.x đã cài sẵn trên máy.

Bước 1: Mở Command Prompt hoặc PowerShell.
Bước 2: Di chuyển vào thư mục Release: cd đường\dẫn\đến\Release
Bước 3: Chạy lệnh:
          python -m http.server 5173 --bind 127.0.0.1
Bước 4: Mở trình duyệt và truy cập:
          http://127.0.0.1:5173

Cách 2: Dùng VS Code Live Server 

Bước 1: Cài extension "Live Server" trong VS Code (nếu chưa có).
Bước 2: Mở thư mục Release bằng VS Code.
Bước 3: Nhấn chuột phải vào file index.html
        → chọn "Open with Live Server".
Bước 4: Trình duyệt tự mở, thường ở cổng 5500.

Cách 3: Dùng Node.js http-server

Bước 1: Cài http-server (nếu chưa có):
          npm install -g http-server
Bước 2: Di chuyển vào thư mục Release, rồi chạy:
          http-server -p 5173
Bước 3: Mở trình duyệt tại:
          http://127.0.0.1:5173

3. CHẾ ĐỘ GAME PLAY

Gameplay (Endless Runner) 

  A / D  hoặc ←/→     Đổi làn đường (trái / phải)
  Space  hoặc ↑       Nhảy
  P      hoặc Esc     Tạm dừng / Tiếp tục
  H                   Về màn hình chờ (Home)
  C                   Chuyển đổi góc nhìn camera
  G                   Mở / Đóng Demo Gallery
  M                   Chuyển sang chế độ Marble (bóng lăn)
  
Vật phẩm trong game 

  Coin  (vàng)   +1 coin, tăng combo và điểm số
  Orb   (xanh)   +3 coins, tăng combo mạnh hơn
  Shield (tím)   +1 khiên — khi va vào chướng ngại vật sẽ chặn 1 lần thay vì game over; số lượng khiên hiện trên HUD (Shield: 1, 2...)

4. CHẾ ĐỘ DEMO GALLERY

Nhấn phím G hoặc nút "Demo" để vào Gallery.

Phím tắt điều khiển vật thể 

  [ / ]            Chọn vật thể trước / tiếp theo
  Tab              Chọn vật thể tiếp theo
  W/A/S/D          Tịnh tiến theo X/Z
  R + X            Xoay quanh trục X
  R + Y            Xoay quanh trục Y
  R + Z            Xoay quanh trục Z
  + / -            Phóng to / Thu nhỏ

Chuột 

  Click vào vật thể         Chọn vật thể
  Kéo chuột                 Tịnh tiến trên mặt phẳng X/Z
  Shift + kéo chuột         Di chuyển theo trục Y
  Lăn chuột                 Phóng to / Thu nhỏ

Bảng "Phòng Trưng Bày Hình Học" (bên trái) 

  Reset Transform           Về vị trí, góc, tỷ lệ mặc định
  Khôi phục toàn bộ         Đưa tất cả về trạng thái ban đầu
  Thêm / Xoá hình học       Heart, Torus Knot, Tetrahedron...
  Thêm / Xoá nguồn sáng     PointLight trong Gallery
  Animation                 Không, Xoay, Nổi, Lắc lư
  Bề mặt (Texture)          Circuit, Carbon Fiber, Hologram
  Upload ảnh bitmap         Áp texture từ file ảnh lên vật thể

Menu Biến đổi Affine (dat.GUI) 

  Translate X / Y / Z       Tịnh tiến theo từng trục
  Rotate X / Y / Z          Xoay theo từng trục
  Scale                     Phóng to / Thu nhỏ
  Ma trận 4×4               Cập nhật thời gian thực
  Reset Affine              Đặt lại đồng bộ cả dat.GUI và ma trận

5. NỘI DUNG ĐỒ HỌA ĐÃ ĐÁP ỨNG

  [1]  Biểu diễn các đối tượng hình học 3D và Load model.
  [2]  Các phép biến đổi trên đối tượng.
  [3]  Điều khiển camera và chiếu phối cảnh.
  [4]  Chiếu sáng & Bóng đổ.
  [5]  Texture & Mapping.
  [6]  Animation và Hiệu ứng đồ hoạ.
    
Ghi chú: Thư mục Release không cần npm install hay build. Để xem/sửa mã nguồn, xem thư mục Source/.
