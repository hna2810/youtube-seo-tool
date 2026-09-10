/**
 * Prompt cho LLM Agent 5: Hỗ trợ Rà soát chuyên sâu và Gợi ý tối ưu
 */
function buildAuditArticlePrompt(articleData, selectedKeyword, seoReport) {
  return `
Bạn là Trưởng Ban Kiểm Duyệt Chất Lượng Bài Viết SEO (Quality Assurance & SEO Auditor).
Hãy đọc bài viết sau và kết quả kiểm tra SEO sơ bộ:

- Từ khóa chính: "${selectedKeyword}"
- Tiêu đề: ${articleData.h1Title}
- Điểm SEO hiện tại: ${seoReport.totalScore}/100
- Các cảnh báo lỗi: ${JSON.stringify(seoReport.criticalErrors)}
- Đề xuất tối ưu: ${JSON.stringify(seoReport.optimizations)}
- Từ cấm phát hiện: ${JSON.stringify(seoReport.bannedWordsFound)}

=== BÀI VIẾT (MARKDOWN) ===
${articleData.contentMarkdown.substring(0, 5000)}

=== YÊU CẦU ĐÁNH GIÁ ===
Hãy đưa ra đánh giá chuyên sâu và trả về JSON thuần túy:
{
  "executiveSummary": "Nhận xét tổng thể 2-3 câu về chất lượng bài viết",
  "strengths": [
    "Điểm mạnh 1",
    "Điểm mạnh 2"
  ],
  "improvements": [
    "Điểm cần cải thiện 1",
    "Điểm cần cải thiện 2"
  ],
  "suggestedSnippet": "Đoạn Sapo hoàn hảo mẫu (dòng 1 in đậm từ khóa chính, xoáy nỗi đau, đoạn 2 giải pháp) nếu đoạn Sapo hiện tại chưa tối ưu",
  "readyToPublish": true/false
}
`;
}

module.exports = {
  buildAuditArticlePrompt
};
