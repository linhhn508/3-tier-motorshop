CREATE DATABASE IF NOT EXISTS motorshop;
USE motorshop;

CREATE TABLE products (
    id          VARCHAR(100) PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    price       INT NOT NULL,
    category    VARCHAR(100) NOT NULL,
    brand       VARCHAR(100),
    made_in     VARCHAR(100),
    material    VARCHAR(100),
    color       VARCHAR(100),
    detail      TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE contacts (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    phone       VARCHAR(50),
    subject     VARCHAR(255),
    message     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE feedback (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT NOT NULL,
    category    VARCHAR(100),
    product_id  VARCHAR(100),
    suggestion  TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO products (id, name, price, category, brand, made_in, material, color, detail) VALUES
('yen-doi-triump-speed-400', 'Yên đôi TRIUMP SPEED 400', 197, 'Yên', 'Triumph', 'Anh', 'Da cao cấp', 'Đen', 'Yên đôi cho xe Triumph Speed 400, chất liệu da cao cấp, thiết kế thể thao, phù hợp cho cả người lái và hành khách.'),
('xi-nhan-led-koso', 'Xi nhan LED Koso', 363, 'Đèn', 'KOSO', 'Đài Loan', 'Nhôm, nhựa ABS', 'Đen', 'Xi nhan LED KOSO thiết kế hiện đại, ánh sáng LED sắc nét, tiết kiệm điện, dễ lắp đặt trên hầu hết các dòng xe phổ thông và phân khối lớn.'),
('po-akrapovic-r1', 'Pô Akrapovic R1', 358, 'Pô xe', 'Akrapovic', 'Slovenia', 'Thép không gỉ, Titanium', 'Bạc', 'Pô Akrapovic dành cho Yamaha R1, chất liệu titanium cao cấp, âm thanh thể thao đặc trưng, giảm trọng lượng và tăng hiệu suất động cơ đáng kể.'),
('lop-michelin-city-grip-2', 'Lốp Michelin City Grip 2', 244, 'Bánh & Lốp', 'Michelin', 'Pháp', 'Cao su tổng hợp', 'Đen', 'Lốp Michelin City Grip 2 thế hệ mới, bám đường vượt trội trên mọi điều kiện thời tiết, độ bền cao, phù hợp cho xe tay ga đô thị.'),
('heo-dau-brembo-4-pis', 'Heo dầu Brembo 4 pis', 118, 'Phanh & Thắng', 'Brembo', 'Ý', 'Nhôm đúc CNC', 'Vàng', 'Heo dầu Brembo 4 piston hiệu suất phanh cao, lực kẹp mạnh mẽ và ổn định, thiết kế đẹp mắt, nâng cấp hoàn hảo cho hệ thống phanh xe phân khối lớn.'),
('phuoc-sau-ohlins-binh-dau', 'Phuộc sau Ohlins bình dầu', 214, 'Phuộc & Giảm xóc', 'Öhlins', 'Thụy Điển', 'Nhôm CNC, thép không gỉ', 'Vàng', 'Phuộc sau Öhlins bình dầu tách rời, cho phép điều chỉnh độ nén và độ hoàn, giảm xóc êm ái, tăng cường khả năng vận hành và ổn định trên mọi địa hình.'),
('guong-gu-tay-lai-crg', 'Gương gù tay lái CRG', 444, 'Gương & Kính', 'CRG', 'Ý', 'Nhôm, kính cường lực', 'Đen, bạc', 'Gương gù tay lái CRG phong cách Italy, thiết kế gọn nhẹ, tầm nhìn rộng, kính chống chói, dễ điều chỉnh góc, phù hợp cho xe naked và sport.'),
('gac-chan-nhom-biker', 'Gác chân nhôm Biker', 459, 'Đồ chơi CNC & Kiểng', 'Biker', 'Việt Nam', 'Nhôm CNC 6061', 'Đen, bạc, đỏ', 'Gác chân nhôm Biker gia công CNC từ nhôm 6061 cao cấp, bề mặt anodized chống ăn mòn, thiết kế thể thao, tăng sự thoải mái và tính thẩm mỹ cho xe.'),
('nhong-sen-dia-did-vang-428hd', 'Nhông sên dĩa DID vàng 428HD', 442, 'Truyền động', 'DID', 'Nhật Bản', 'Thép mạ vàng', 'Vàng', 'Bộ nhông sên dĩa DID 428HD mạ vàng, độ bền vượt trội, truyền động mượt mà và ít tiếng ồn, kháng mài mòn cao, phù hợp cho xe số và xe tay côn.');

INSERT INTO feedback (name, rating, comment, product_id) VALUES
('Trần Minh Khoa', 5, 'Chất lượng sản phẩm tuyệt vời, đúng hàng chính hãng. Shop tư vấn nhiệt tình, giao hàng nhanh. Sẽ ủng hộ lần sau!', 'lop-michelin-city-grip-2'),
('Nguyễn Thị Lan', 5, 'Mình đã tìm nhiều chỗ mới ra được hàng chính hãng. Shop có đầy đủ giấy tờ, tem chính hãng rõ ràng. Rất tin tưởng!', 'phuoc-sau-ohlins-binh-dau'),
('Lê Hoàng Bảo', 4, 'Pô đẹp, âm thanh rất phê. Lắp vào xe R1 vừa khít, chất liệu titanium nhẹ hơn hẳn pô zin.', 'po-akrapovic-r1'),
('Phạm Anh Tuấn', 5, 'Giao hàng đúng hẹn, đóng gói cẩn thận. Sản phẩm khớp hoàn toàn với mô tả. Mình rất hài lòng với trải nghiệm mua sắm tại đây.', 'heo-dau-brembo-4-pis'),
('Võ Thanh Hùng', 4, 'Xi nhan LED sáng đẹp, thiết kế hiện đại. Lắp đặt dễ dàng, chỉ cần nối dây là xong.', 'xi-nhan-led-koso'),
('Đặng Quốc Việt', 5, 'Gương CRG chất lượng Ý, nhìn rất sang. Tầm nhìn rộng hơn gương zin nhiều, kính chống chói rất tốt.', 'guong-gu-tay-lai-crg'),
('Hoàng Minh Đức', 5, 'Gác chân nhôm CNC đẹp, bề mặt anodized sáng bóng. Chân đạp chắc chắn, không bị trượt khi đi mưa.', 'gac-chan-nhom-biker'),
('Nguyễn Văn Tâm', 4, 'Bộ nhông sên dĩa DID chạy rất êm, ít tiếng ồn hơn hàng cũ. Mạ vàng đẹp, chống gỉ tốt.', 'nhong-sen-dia-did-vang-428hd'),
('Trương Công Danh', 5, 'Yên Triumph Speed 400 ngồi rất êm, da cao cấp không bị nóng khi đi trời nắng. Thiết kế thể thao, đẹp hơn yên zin.', 'yen-doi-triump-speed-400'),
('Lý Thanh Sơn', 3, 'Lốp Michelin bám đường tốt nhưng giá hơi cao so với các loại lốp khác cùng size. Bù lại độ bền khá ổn.', 'lop-michelin-city-grip-2'),
('Phan Hữu Nghĩa', 5, 'Phuộc Ohlins êm ái, đi đường xấu không còn bị xóc như trước. Điều chỉnh độ cứng mềm dễ dàng.', 'phuoc-sau-ohlins-binh-dau'),
('Bùi Đức Thắng', 4, 'Heo Brembo 4 piston phanh cực nhạy, lực kẹp mạnh. Chỉ cần bóp nhẹ là xe dừng ngay, rất an toàn.', 'heo-dau-brembo-4-pis');
