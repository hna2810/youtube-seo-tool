# HƯỚNG DẪN TRIỂN KHAI ỨNG DỤNG LÊN HOSTING / SERVER

Bộ mã nguồn này là ứng dụng Node.js hoàn chỉnh (Backend Express + Frontend tĩnh + Tích hợp Multi-model LLM).

---

## Cách 1: Triển khai trên cPanel / Cloud Hosting (Hỗ trợ Node.js)
1. **Tải file zip lên**: Vào File Manager trên cPanel/Hosting, upload file `.zip` vào thư mục domain/subdomain của bạn (ví dụ: `public_html/youtube-seo-tool` hoặc thư mục app).
2. **Giải nén**: Giải nén toàn bộ tệp tin.
3. **Cài đặt Node.js App trên cPanel**:
   - Vào mục **Setup Node.js App** trên cPanel.
   - Bấm **Create Application**:
     - **Node.js version**: Chọn bản 18.x, 20.x hoặc 22.x.
     - **Application mode**: Production.
     - **Application root**: Đường dẫn thư mục bạn vừa giải nén.
     - **Application startup file**: `server.js`.
   - Bấm **Create**.
4. **Cài đặt Dependencies**:
   - Trong bảng điều khiển Node.js App, bấm nút **Run NPM Install** (hoặc mở Terminal gõ `npm install --production`).
5. **Cấu hình API Key**:
   - Mở file `openrouter.yaml` và điền API Key, hoặc thêm biến môi trường `OPENROUTER_API_KEY` trong mục Environment Variables.
6. **Khởi động App**: Bấm **Restart** ứng dụng trên cPanel.

---

## Cách 2: Triển khai trên VPS (Hostinger VPS, Ubuntu, Debian, CentOS...)
1. **Upload & giải nén code vào thư mục**:
   ```bash
   mkdir -p /var/www/youtube-seo-tool
   unzip youtube-seo-tool.zip -d /var/www/youtube-seo-tool
   cd /var/www/youtube-seo-tool
   ```

2. **Cài đặt dependencies**:
   ```bash
   npm install --production
   ```

3. **Chạy ứng dụng liên tục với PM2 (Khuyến nghị)**:
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

4. **Cấu hình Nginx Reverse Proxy (Domain trỏ về port 3000)**:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## Cách 3: Triển khai trên Render / Railway / Vercel
- Kết nối trực tiếp với GitHub Repository: `https://github.com/hna2810/youtube-seo-tool`
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Environment Variables**:
  - `OPENROUTER_API_KEY`: Điền key của bạn
  - `OPENROUTER_MODEL`: `openai/gpt-4o-mini`
