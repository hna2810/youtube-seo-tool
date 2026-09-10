@echo off
chcp 65001 > nul
echo ===================================================
echo   YOUTUBE SEO ARTICLE GENERATOR (Node.js & LLM)
echo ===================================================
echo Đang kiểm tra dependencies...
if not exist node_modules (
    echo Đang cài đặt thư viện npm...
    call npm install
)

echo Đang khởi động Server Node.js...
start http://localhost:3000
node server.js
pause
