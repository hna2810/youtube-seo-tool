# 🎥 YOUTUBE SEO ARTICLE GENERATOR (Node.js & LLM Pipeline)

Ứng dụng web Node.js chuyên nghiệp giúp chuyển đổi **Video YouTube** thành **Bài viết chuẩn SEO, Semantic SEO & AEO (AI Search Engine Optimization)** hoàn chỉnh, tự động nhúng Video YouTube, chèn Internal Link, tuân thủ nghiêm ngặt quy chuẩn nội dung `AGENTS.md` và chấm điểm chất lượng theo 16 tiêu chí chuẩn 100 điểm.

---

## 🌟 Tính Năng Nổi Bật

1. **Thu thập Dữ liệu Đa tầng**:
   - Nhận diện mọi dạng URL YouTube (`watch?v=`, `youtu.be/`, `shorts/`).
   - Tự động lấy Metadata (tiêu đề, thumbnail, mô tả, tags, kênh, lượt xem).
   - Tự động tải phụ đề (Transcript tiếng Việt hoặc đa ngôn ngữ), hỗ trợ xem và chỉnh sửa trực tiếp.
   - Hoạt động mượt mà không bắt buộc phải có YouTube API Key (có hệ thống scraper dự phòng).

2. **Quy trình Tư duy Đa Tác tử (Multi-Agent LLM Pipeline)**:
   - **LLM Agent 1**: Phân tích Topic cốt lõi, Subtopics theo timeline, bóc tách Thực thể Semantic (Entities) và Nỗi đau độc giả (User Pain Points).
   - **LLM Agent 2**: Nghiên cứu Search Intent (Thông tin, Khảo sát, Giao dịch) và gợi ý 4-6 Từ khóa SEO chính + danh sách LSI Keywords.
   - **Human-in-the-loop**: Cho phép người dùng trực tiếp chọn hoặc tự sửa từ khóa chính; tùy chỉnh thương hiệu, văn phong và danh sách internal links.
   - **LLM Agent 3**: Tạo Content Brief và Lập Dàn ý H1-H4 áp dụng linh hoạt **Bộ 218 công thức tiêu đề CTR**, mở bài Sapo chuẩn và không dùng Title Case hay dấu `:`.
   - **Human-in-the-loop**: Cho phép duyệt và chỉnh sửa trực tiếp từng đề mục của Dàn ý.
   - **LLM Agent 4**: Viết bài chuyên sâu (1.200 - 2.000 từ) kết hợp Semantic SEO + AEO (Direct Answer Blocks cho AI Snippets), bắt buộc có bảng so sánh dữ liệu, chèn video YouTube responsive và chèn internal link tự nhiên.
   - **LLM Agent 5 + Rule Engine**: Chấm điểm SEO 16 tiêu chí (Thang 100 điểm), tính mật độ từ khóa (Keyword Density), quét bộ lọc từ cấm y khoa/cam kết giả định theo `AGENTS.md`.

3. **Xuất Bản Đa Định Dạng**:
   - 📄 **File Word (.docx)**: Tạo tài liệu Word chuẩn đẹp (đầy đủ heading, bảng biểu, danh sách, metadata Yoast SEO).
   - 🌐 **HTML Sạch WordPress**: Chuẩn quy cách Classic Editor (không chứa H1 trong thân bài, responsive video iframe, không rác markdown).
   - 📋 **Markdown (.md)** & Nút Copy 1-Click.

---

## 🚀 Hướng Dẫn Khởi Chạy Local (Windows)

### Cách 1: Chạy 1-Click
Nhấp đúp chuột vào file `start.bat` trong thư mục `youtube-seo-tool/`. Trình duyệt sẽ tự động mở trang `http://localhost:3000`.

### Cách 2: Chạy bằng dòng lệnh
```bash
cd youtube-seo-tool
npm install
npm start
```
Truy cập trình duyệt tại: `http://localhost:3000`.

---

## ⚙️ Cấu Hình API Keys

Ứng dụng hỗ trợ 2 cơ chế cấu hình API Key:
1. **Nhập trực tiếp trên Giao diện Web**:
   - Nhấp vào phần *Cài đặt API Key* ở Bước 1 trên Web UI và nhập Gemini API Key hoặc YouTube Data API Key. Khóa này sẽ được lưu an toàn trong trình duyệt của bạn (`localStorage`).
2. **Cấu hình tự động từ File Server**:
   - Ứng dụng tự động đọc khóa từ file `gemini.yaml` (hoặc biến môi trường `GEMINI_API_KEY` trong file `.env`). Người dùng không cần phải nhập lại mỗi lần sử dụng.

---

## 🌐 Hướng Dẫn Triển Khai Lên Hosting (Deploy to Hostinger / VPS / cPanel)

Dự án được viết 100% bằng **Node.js thuần túy**, không phụ thuộc Python runtime hay trình biên dịch C, giúp việc deploy lên host cực kỳ đơn giản:

### 1. Triển khai trên Hostinger (hPanel Node.js Application)
1. Đăng nhập vào hPanel của Hostinger -> Vào mục **Node.js** (Websites -> Manage -> Node.js).
2. Tạo ứng dụng mới:
   - **Node.js Version**: Chọn phiên bản 18 trở lên (khuyên dùng Node 20.x hoặc 22.x).
   - **Application Root**: Thư mục tải mã nguồn lên (ví dụ: `public_html` hoặc `seo-tool`).
   - **Application Startup File**: Điền `server.js`.
3. Tải toàn bộ file trong thư mục `youtube-seo-tool/` lên thư mục đã chọn (qua File Manager hoặc Git).
4. Nhấn nút **NPM Install** trên bảng điều khiển hPanel (hoặc SSH: `npm install --production`).
5. Trong mục **Environment Variables**, thêm:
   - `PORT`: 3000 (hoặc cổng do Hostinger cấp)
   - `GEMINI_API_KEY`: Khóa API Gemini của bạn.
6. Nhấn **Restart Application** -> Truy cập tên miền của bạn để sử dụng!

### 2. Triển khai trên VPS (Ubuntu / Debian / Docker / PM2)
```bash
# Cài đặt PM2 để quản lý tiến trình nền
npm install -g pm2

# Vào thư mục ứng dụng
cd /var/www/youtube-seo-tool
npm install

# Khởi chạy cùng PM2
pm2 start server.js --name "youtube-seo-tool"
pm2 save
pm2 startup
```

---

## 📁 Cấu Trúc Thư Mục

```
youtube-seo-tool/
├── package.json               # Cấu hình dependency Node.js
├── server.js                  # Express backend server & REST API
├── start.bat                  # File chạy 1-click cho máy Windows
├── config/
│   ├── bannedWords.json       # Danh sách từ cấm theo AGENTS.md
│   ├── seoCriteria.json       # 16 tiêu chí chấm điểm 100 điểm
│   └── defaultLinks.json      # Bể liên kết nội bộ gợi ý
├── services/
│   ├── youtubeService.js      # Trích xuất metadata & transcript
│   ├── llmService.js          # Kết nối Gemini API (hỗ trợ retry & JSON mode)
│   ├── seoGraderService.js    # Chấm điểm 16 tiêu chí & quét từ cấm
│   └── docxExportService.js   # Sinh file Microsoft Word .docx
├── prompts/
│   ├── analyzeContent.js      # Prompt Agent 1: Topic, Entity, Context
│   ├── suggestKeywords.js     # Prompt Agent 2: Keyword research & Intent
│   ├── generateOutline.js     # Prompt Agent 3: Content Brief & Dàn ý H1-H4
│   ├── writeArticle.js        # Prompt Agent 4: Full Article (SEO + Semantic + AEO)
│   └── auditArticle.js        # Prompt Agent 5: Quality Audit & Actionable Fixes
└── public/                    # Giao diện Web SPA
    ├── index.html             # Giao diện 4 bước trực quan
    ├── css/style.css          # Giao diện hiện đại, responsive
    └── js/
        ├── api.js             # Client API service
        └── app.js             # Quản lý tương tác & luồng dữ liệu
```
