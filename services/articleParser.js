const { marked } = require('marked');

// Cấu hình marked
marked.setOptions({
  gfm: true,
  breaks: true
});

/**
 * Tự động chuyển đổi & quét sạch 100% các ký tự tiếng Trung (CJK characters) rò rỉ từ các model AI
 */
function sanitizeChineseCharacters(text) {
  if (!text || typeof text !== 'string') return text;

  // 1. Bản đồ thay thế các cụm từ / trợ từ tiếng Trung phổ biến mà LLM hay rò rỉ
  const cjkMap = [
    [/則提供/g, ' cung cấp '],
    [/提供/g, ' cung cấp '],
    [/則/g, ' thì '],
    [/因此/g, ' vì vậy '],
    [/所以/g, ' do đó '],
    [/例如/g, ' ví dụ '],
    [/主要/g, ' chủ yếu '],
    [/重要/g, ' quan trọng '],
    [/幫助|帮助/g, ' hỗ trợ '],
    [/保護|保护/g, ' bảo vệ '],
    [/發展|发展/g, ' phát triển '],
    [/促進|促进/g, ' thúc đẩy '],
    [/進行|进行/g, ' tiến hành '],
    [/使用/g, ' sử dụng '],
    [/出現|出现/g, ' xuất hiện '],
    [/注意/g, ' lưu ý '],
    [/選擇|选择/g, ' lựa chọn '],
    [/情況|情况/g, ' tình trạng '],
    [/方法/g, ' phương pháp '],
    [/階段|阶段/g, ' giai đoạn '],
    [/過程|过程/g, ' quá trình '],
    [/時間|时间/g, ' thời gian '],
    [/健康/g, ' sức khỏe '],
    [/營養|营养/g, ' dinh dưỡng '],
    [/寶寶|宝宝/g, ' em bé '],
    [/媽媽|妈妈/g, ' mẹ '],
    [/胎兒|胎儿/g, ' thai nhi '],
    [/懷孕|怀孕/g, ' mang thai '],
    [/睡眠/g, ' giấc ngủ '],
    [/大腦|大脑/g, ' não bộ '],
    [/身體|身体/g, ' cơ thể '],
    [/放鬆|放松/g, ' thư giãn '],
    [/活動|活动/g, ' hoạt động '],
    [/休息/g, ' nghỉ ngơi '],
    [/環境|环境/g, ' môi trường '],
    [/特別/g, ' đặc biệt '],
    [/正常/g, ' bình thường '],
    [/減少/g, ' giảm '],
    [/增加/g, ' tăng '],
    [/保持/g, ' duy trì '],
    [/需要/g, ' cần '],
    [/應該|应该/g, ' cần '],
    [/避免/g, ' tránh '],
    [/預防|预防/g, ' phòng ngừa '],
    [/問題|问题/g, ' vấn đề '],
    [/原因/g, ' nguyên nhân '],
    [/症狀|症状/g, ' biểu hiện '],
    [/處理|处理/g, ' xử lý '],
    [/調理|调理/g, ' chăm sóc '],
    [/護理|护理/g, ' chăm sóc '],
    [/的/g, ' của '],
    [/是/g, ' là '],
    [/在/g, ' ở '],
    [/和|與|与|以及/g, ' và '],
    [/等/g, ' '],
    [/為|为/g, ' cho '],
    [/將|将/g, ' sẽ '],
    [/被/g, ' được '],
    [/但/g, ' nhưng '],
    [/而/g, ' mà '],
    [/或/g, ' hoặc '],
    [/也/g, ' cũng '],
    [/很/g, ' rất '],
    [/更/g, ' càng '],
    [/中/g, ' trong '],
    [/上/g, ' trên '],
    [/下/g, ' dưới '],
    [/後|后/g, ' sau '],
    [/前/g, ' trước '],
    [/這|这/g, ' này '],
    [/那/g, ' đó '],
    [/有/g, ' có '],
    [/無|无/g, ' không có '],
    [/能/g, ' có thể '],
    [/使|令|讓|让/g, ' giúp ']
  ];

  let cleaned = text;
  for (const [pattern, replacement] of cjkMap) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  // 2. Xóa triệt để mọi ký tự Hán / CJK ideographs còn sót lại
  cleaned = cleaned.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, '');

  // 3. Chuẩn hóa khoảng trắng
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
  return cleaned.trim();
}

/**
 * Phân tích phản hồi từ LLM Agent 4 (Hỗ trợ cả định dạng Tag Delimiter và JSON)
 */
function parseArticleResponse(rawResponse, defaultKeyword = '') {
  if (!rawResponse || typeof rawResponse !== 'string') {
    throw new Error('Nội dung phản hồi từ AI rỗng');
  }

  let text = sanitizeChineseCharacters(rawResponse.trim());
  let h1Title = '';
  let metaTitle = '';
  let slug = '';
  let metaDescription = '';
  let contentMarkdown = '';

  // 1. Thử bóc tách theo Tag Delimiter <metadata> và <content>
  const metaMatch = text.match(/<metadata>([\s\S]*?)<\/metadata>/i);
  const contentMatch = text.match(/<content>([\s\S]*?)<\/content>/i);

  if (metaMatch) {
    try {
      const metaJson = JSON.parse(metaMatch[1].trim());
      h1Title = metaJson.h1Title || '';
      metaTitle = metaJson.metaTitle || metaJson.h1Title || '';
      slug = metaJson.slug || '';
      metaDescription = metaJson.metaDescription || '';
    } catch (e) {
      console.warn('Không thể parse metadata JSON trong tag:', e.message);
    }
  }

  if (contentMatch) {
    contentMarkdown = contentMatch[1].trim();
  } else if (metaMatch) {
    // Nếu có <metadata> nhưng không có </content>, lấy phần còn lại sau </metadata>
    const afterMeta = text.split(/<\/metadata>/i)[1] || '';
    contentMarkdown = afterMeta.replace(/<content>/i, '').replace(/<\/content>/i, '').trim();
  }

  // 2. Nếu không tìm thấy tag delimiter, thử parse JSON
  if (!contentMarkdown) {
    try {
      let cleanJsonText = text;
      if (cleanJsonText.startsWith('```json')) {
        cleanJsonText = cleanJsonText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      } else if (cleanJsonText.startsWith('```')) {
        cleanJsonText = cleanJsonText.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
      }
      const parsed = JSON.parse(cleanJsonText);
      h1Title = parsed.h1Title || '';
      metaTitle = parsed.metaTitle || parsed.h1Title || '';
      slug = parsed.slug || '';
      metaDescription = parsed.metaDescription || '';
      contentMarkdown = parsed.contentMarkdown || '';
    } catch (err) {
      // 3. Fallback bóc tách bằng Regex khi JSON bị cắt cụt (Unexpected end of JSON input)
      console.warn('JSON parse thất bại, chuyển sang regex fallback extraction:', err.message);

      const h1Match = text.match(/"h1Title"\s*:\s*"([^"]+)"/i);
      if (h1Match) h1Title = h1Match[1];

      const metaTitleMatch = text.match(/"metaTitle"\s*:\s*"([^"]+)"/i);
      if (metaTitleMatch) metaTitle = metaTitleMatch[1];

      const slugMatch = text.match(/"slug"\s*:\s*"([^"]+)"/i);
      if (slugMatch) slug = slugMatch[1];

      const metaDescMatch = text.match(/"metaDescription"\s*:\s*"([^"]+)"/i);
      if (metaDescMatch) metaDescription = metaDescMatch[1];

      const mdMatch = text.match(/"contentMarkdown"\s*:\s*"([\s\S]*)/i);
      if (mdMatch) {
        let rawMd = mdMatch[1];
        // Bỏ phần đuôi nếu còn đóng ngoặc JSON
        rawMd = rawMd.replace(/",?\s*"cleanHtml"[\s\S]*$/i, '').replace(/"\s*}\s*$/i, '');
        // Unescape ký tự
        contentMarkdown = rawMd
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
          .trim();
      } else {
        // Lấy nguyên bản text làm contentMarkdown
        contentMarkdown = text;
      }
    }
  }

  // Fallback nếu thiếu thông tin
  if (!h1Title) {
    // Thử lấy heading đầu tiên từ markdown
    const firstH1 = contentMarkdown.match(/^#\s+(.+)$/m);
    if (firstH1) {
      h1Title = firstH1[1].trim();
      // Bỏ H1 khỏi thân bài theo quy chuẩn CMS
      contentMarkdown = contentMarkdown.replace(/^#\s+.+$/m, '').trim();
    } else {
      h1Title = `Hướng dẫn chi tiết về ${defaultKeyword}`;
    }
  }

  if (!metaTitle) metaTitle = h1Title;
  if (!slug) slug = defaultKeyword.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
  if (!metaDescription) {
    // Lấy 160 ký tự đầu tiên
    metaDescription = contentMarkdown.replace(/#|<[^>]+>|\[[^\]]+\]|\*\*/g, '').slice(0, 155).trim() + '...';
  }

  // Đảm bảo thân bài không chứa H1 (# )
  contentMarkdown = contentMarkdown.replace(/^#\s+[^\n]+\n*/m, '').trim();

  // Làm sạch triệt để tiếng Trung / chữ Hán trên toàn bộ các trường
  h1Title = sanitizeChineseCharacters(h1Title);
  metaTitle = sanitizeChineseCharacters(metaTitle);
  metaDescription = sanitizeChineseCharacters(metaDescription);
  contentMarkdown = sanitizeChineseCharacters(contentMarkdown);

  // Sinh clean HTML
  const cleanHtml = convertMarkdownToCleanHtml(contentMarkdown);

  // Đếm từ
  const wordCount = contentMarkdown.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean).length;

  return {
    h1Title,
    metaTitle,
    slug,
    metaDescription,
    primaryKeyword: defaultKeyword,
    contentMarkdown,
    cleanHtml,
    wordCount
  };
}

/**
 * Chuyển đổi Markdown sang Clean HTML tuân thủ quy chuẩn CMS WordPress
 */
function convertMarkdownToCleanHtml(markdownText, options = {}) {
  if (!markdownText) return '';

  let md = sanitizeChineseCharacters(markdownText);

  // 1. Loại bỏ các dấu phân đoạn --- nếu có
  md = md.replace(/^---+$/gm, '');

  // 2. Nếu có tùy chọn forWordPress = true, bỏ hoàn toàn các khối mô tả ảnh [ảnh 1: ...]
  if (options.forWordPress) {
    md = md.replace(/\[ảnh\s*\d*:[^\]]+\]/gi, '');
  }

  // 3. Render HTML qua marked
  let html = marked.parse(md);

  // 4. Loại bỏ thẻ H1 nếu có trong body
  html = html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '');

  // 5. Làm sạch khoảng trắng thừa
  html = html.replace(/\n\s*\n/g, '\n').trim();

  return html;
}

module.exports = {
  parseArticleResponse,
  convertMarkdownToCleanHtml,
  sanitizeChineseCharacters
};
