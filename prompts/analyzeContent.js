/**
 * Prompt cho LLM Agent 1: Phân tích Nội dung (Topic / Subtopic / Entity / Context)
 */
function buildAnalyzeContentPrompt(metadata, transcript) {
  const metaText = `
Tiêu đề video: ${metadata.title || ''}
Kênh YouTube: ${metadata.channelTitle || ''}
Mô tả video: ${metadata.description ? metadata.description.substring(0, 1000) : ''}
Tags: ${(metadata.tags || []).join(', ')}
`;

  const transcriptSample = transcript.fullText 
    ? (transcript.fullText.length > 15000 ? transcript.fullText.substring(0, 15000) + '...' : transcript.fullText)
    : 'Không có transcript, dựa trên tiêu đề và mô tả video.';

  return `
Bạn là Chuyên gia Cao cấp về Phân tích Nội dung & Thực thể Semantic (Semantic Entity Analyst).
Hãy phân tích sâu dữ liệu video YouTube sau đây:

=== THÔNG TIN VIDEO ===
${metaText}

=== BẢN NÓI NỘI DUNG (TRANSCRIPT) ===
${transcriptSample}

=== YÊU CẦU PHÂN TÍCH ===
Hãy bóc tách toàn diện và trả về đúng 1 đối tượng JSON thuần túy (không kèm markdown hay giải thích thừa).
QUY ĐỊNH: Tuyệt đối không dùng dấu ngoặc kép đôi " bên trong giá trị chuỗi (dùng dấu nháy đơn ' hoặc không dùng ngoặc) và không dùng ký tự xuống dòng thô trong chuỗi JSON.
{
  "mainTopic": "Chủ đề bao trùm ngắn gọn, rõ ràng của video",
  "summary": "Đoạn tóm tắt cô đọng 2-3 câu về nội dung thực tế của video",
  "subtopics": [
    {
      "title": "Tên chủ đề con / ý chính 1",
      "summary": "Chi tiết ngắn gọn ý chính này nói về điều gì"
    }
  ],
  "entities": {
    "concepts": ["Các khái niệm, thuật ngữ chuyên ngành xuất hiện trong video"],
    "methods": ["Các phương pháp, kỹ thuật, cách làm được hướng dẫn"],
    "products_or_ingredients": ["Tên sản phẩm, nguyên liệu, dụng cụ được nhắc tới"],
    "audiences": ["Đối tượng người nghe mục tiêu (ví dụ: mẹ bầu, mẹ sau sinh, người chăm sóc...)"]
  },
  "context": {
    "background": "Bối cảnh thực tế khi người xem tìm kiếm video này",
    "painPoints": [
      "Nỗi đau / lo lắng / trăn trở bức thiết 1 của người xem",
      "Nỗi đau 2",
      "Nỗi đau 3"
    ]
  },
  "uniqueValues": [
    "Điểm độc đáo, hữu ích, lời khuyên đắt giá 1 từ video",
    "Điểm độc đáo 2"
  ]
}
`;
}

module.exports = {
  buildAnalyzeContentPrompt
};
