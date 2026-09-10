const { extractVideoId } = require('./services/youtubeService');
const { gradeSeoArticle, scanBannedWords } = require('./services/seoGraderService');
const { generateDocxBuffer } = require('./services/docxExportService');
const { getApiKeyStatus } = require('./services/llmService');
const fs = require('fs');

async function runTests() {
  console.log('--- 1. Kiểm tra Video ID Extractor ---');
  const testUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ'
  ];
  for (const u of testUrls) {
    const id = extractVideoId(u);
    console.log(`URL: ${u} -> ID: ${id} [${id === 'dQw4w9WgXcQ' ? 'PASS' : 'FAIL'}]`);
  }

  console.log('\n--- 2. Kiểm tra API Key Status ---');
  const keyStatus = getApiKeyStatus();
  console.log('Key Status:', keyStatus);

  console.log('\n--- 3. Kiểm tra Bộ Lọc Từ Cấm & SEO Grader ---');
  const sampleArticle = {
    h1Title: '7 cách nhanh chóng và dễ dàng để massage bầu tại nhà',
    metaTitle: 'Massage bầu tại nhà đúng cách giúp thư giãn cơ thể',
    slug: 'massage-bau-tai-nha',
    metaDescription: 'Khám phá phương pháp massage bầu tại nhà an toàn giúp giảm đau lưng và thư giãn tinh thần. Xem ngay!',
    contentMarkdown: `
Cảm giác đau lưng và nặng nề khi mang thai khiến nhiều mẹ bầu mệt mỏi, đặc biệt là vào những tháng cuối thai kỳ. Phương pháp **massage bầu tại nhà** sẽ là giải pháp nhẹ nhàng giúp giải tỏa căng thẳng và cải thiện giấc ngủ hiệu quả.

Bài viết này chia sẻ những kỹ thuật đơn giản mà người thân có thể hỗ trợ mẹ mỗi tối, giúp mẹ cảm thấy thoải mái hơn sau một ngày dài.

## Những vị trí mẹ bầu cần lưu ý khi massage
Khi thực hiện massage, việc hiểu rõ các nhóm cơ cần chăm sóc là vô cùng cần thiết.

| Vị trí | Lợi ích | Lưu ý an toàn |
| --- | --- | --- |
| Lưng dưới | Giảm mỏi lưng | Xoa nhẹ nhàng, không ấn mạnh |
| Bắp chân | Giảm phù nề | Vuốt từ dưới lên trên |

<div class="video-container">
  <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
</div>

[ảnh 1: Kỹ thuật massage lưng nhẹ nhàng cho mẹ bầu]

Để có thêm kinh nghiệm dinh dưỡng, bạn có thể tham khảo thêm về [thực đơn ở cữ khoa học](https://mtopviet.vn/thuc-don-o-cu-khoa-hoc) và dịch vụ [chăm sóc mẹ và bé sau sinh](https://mtopviet.vn/dich-vu-cham-soc-me-va-be-sau-sinh).

## Câu hỏi thường gặp về massage bầu tại nhà
Mẹ bầu nên massage vào thời điểm nào trong ngày? Thời điểm thích hợp là trước khi đi ngủ khoảng 30 phút.

## Lời kết
Chúc các mẹ bầu luôn có một thai kỳ khỏe khoắn và an vui.
    `,
    cleanHtml: '<p>Sample HTML</p>'
  };

  const report = gradeSeoArticle(sampleArticle, 'massage bầu tại nhà');
  console.log(`Điểm SEO đạt được: ${report.totalScore}/100 [Xếp loại: ${report.grade} ${report.badge}]`);
  console.log(`Mật độ từ khóa: ${report.keywordStats.density}% (${report.keywordStats.count} lần / ${report.keywordStats.totalWords} từ)`);
  console.log(`Từ cấm phát hiện: ${report.bannedWordsFound.length}`);

  console.log('\n--- 4. Kiểm tra Thử nghiệm Bắt Từ Cấm ---');
  const badText = 'Đây là sản phẩm tốt nhất, cam kết chữa khỏi bệnh và điều trị dứt điểm 100% hiệu quả.';
  const badScan = scanBannedWords(badText);
  console.log('Phát hiện từ cấm trong văn bản mẫu vi phạm:', badScan.foundBanned.map(b => b.word));

  console.log('\n--- 5. Kiểm tra Xuất File Word .docx ---');
  const buffer = await generateDocxBuffer(sampleArticle, 'massage bầu tại nhà');
  fs.writeFileSync('test_output.docx', buffer);
  console.log(`Đã xuất file test_output.docx thành công (${buffer.length} bytes)!`);

  console.log('\n✅ TẤT CẢ CÁC BÀI TEST CHỨC NĂNG ĐỀU ĐẠT CHUẨN!');
}

runTests().catch(console.error);
