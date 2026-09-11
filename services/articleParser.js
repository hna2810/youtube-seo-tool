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
function parseArticleResponse(rawResponse, defaultKeyword = '', extraContext = {}) {
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

  const rawArticleData = {
    h1Title,
    metaTitle,
    slug,
    metaDescription,
    primaryKeyword: defaultKeyword,
    contentMarkdown,
    cleanHtml,
    wordCount
  };

  // Tự động tối ưu toàn diện đạt chuẩn SEO 95 - 100 điểm ngay sau khi parse
  return autoOptimizeArticleForSeo(rawArticleData, defaultKeyword, extraContext);
}

function escapeRegex(string) {
  return string ? string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
}

/**
 * Tự Động Tối Ưu Toàn Diện Đạt Chuẩn 95 - 100 Điểm SEO theo 16 Tiêu Chí
 */
function autoOptimizeArticleForSeo(articleData, selectedKeyword = '', extraContext = {}) {
  let {
    h1Title = '',
    metaTitle = '',
    slug = '',
    metaDescription = '',
    contentMarkdown = '',
    cleanHtml = ''
  } = articleData;

  const kw = (selectedKeyword || articleData.primaryKeyword || '').trim();
  const kwLower = kw.toLowerCase();
  const videoId = extraContext.videoId || extraContext.youtubeData?.videoId || '';
  const internalLinks = extraContext.internalLinks || [];

  // 1. Tối ưu Tiêu đề H1: Không dấu hai chấm, chứa từ khóa chính
  h1Title = h1Title.replace(/:/g, ' - ').replace(/\s{2,}/g, ' ').trim();
  if (!h1Title.toLowerCase().includes(kwLower)) {
    h1Title = `Hướng dẫn ${kw} an toàn khoa học cho mẹ`;
  }

  // 2. Tối ưu Tiêu đề SEO (metaTitle): Ngắn gọn 50 - 60 ký tự, không dấu hai chấm, chứa từ khóa
  metaTitle = (metaTitle || h1Title).replace(/:/g, ' - ').replace(/\s{2,}/g, ' ').trim();
  if (!metaTitle.toLowerCase().includes(kwLower)) {
    metaTitle = `${kw} chuẩn khoa học`.trim();
  }
  if (metaTitle.length > 60) {
    if (kw.length <= 48) {
      metaTitle = `${kw.charAt(0).toUpperCase() + kw.slice(1)} an toàn tại nhà`;
      if (metaTitle.length > 60) {
        metaTitle = kw.charAt(0).toUpperCase() + kw.slice(1);
      }
    } else {
      metaTitle = metaTitle.substring(0, 58).trim();
    }
  }

  // 3. Tối ưu URL Slug: Ngắn gọn, không dấu, không ký tự lạ
  if (!slug || slug.length > 60 || /[?&=%]/.test(slug)) {
    slug = kwLower
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    if (slug.length > 55) slug = slug.substring(0, 55).replace(/-+$/, '');
  }

  // 4. Tối ưu Thẻ Meta Description: 140 - 160 ký tự, chứa từ khóa chính, có CTA hấp dẫn
  metaDescription = metaDescription ? metaDescription.trim() : '';
  const hasCtaInMeta = /xem ngay|đọc ngay|tìm hiểu|khám phá|trải nghiệm|liên hệ|nhận tư vấn|chi tiết/i.test(metaDescription);
  if (!metaDescription || !metaDescription.toLowerCase().includes(kwLower) || metaDescription.length > 165 || !hasCtaInMeta) {
    metaDescription = `Tìm hiểu ${kw} an toàn, khoa học tại nhà từ chuyên gia Home Care. Khám phá ngay hướng dẫn chi tiết giúp mẹ phục hồi sức khỏe chu đáo nhất!`;
    if (metaDescription.length > 160) {
      metaDescription = `Hướng dẫn ${kw} an toàn, khoa học tại nhà cho mẹ từ Home Care. Khám phá ngay giải pháp phục hồi sức khỏe chu đáo nhất!`;
    }
  }

  // 5. Tối ưu Thân bài Markdown
  let md = contentMarkdown.trim();
  // Loại bỏ H1 khỏi thân bài
  md = md.replace(/^#\s+[^\n]+\n*/m, '').trim();

  let paragraphs = md.split(/\n\n+/).map(p => p.trim()).filter(Boolean);

  // A. Đảm bảo Mở bài (Sapo): Đoạn đầu tiên chứa từ khóa chính in đậm **${kw}**
  if (paragraphs.length > 0) {
    let p0 = paragraphs[0];
    const boldKwRegex = new RegExp(`\\*\\*${escapeRegex(kw)}\\*\\*|<strong>${escapeRegex(kw)}<\\/strong>`, 'i');
    if (!boldKwRegex.test(p0)) {
      const kwRegex = new RegExp(escapeRegex(kw), 'i');
      if (kwRegex.test(p0)) {
        p0 = p0.replace(kwRegex, `**${kw}**`);
      } else {
        p0 = `Tìm hiểu về **${kw}** là một trong những chủ đề quan trọng được nhiều mẹ đặc biệt quan tâm hiện nay. ` + p0;
      }
      paragraphs[0] = p0;
    }
  }

  // Đảm bảo Sapo có ít nhất 2 đoạn văn
  if (paragraphs.length === 1 || (paragraphs.length > 1 && paragraphs[1].startsWith('#'))) {
    paragraphs.splice(1, 0, `Thấu hiểu những băn khoăn đó, bài viết dưới đây từ Home Care sẽ mang đến giải pháp toàn diện, khoa học và dễ áp dụng nhất để mẹ luôn an tâm chăm sóc sức khỏe mỗi ngày.`);
  }

  md = paragraphs.join('\n\n');

  // B. Đảm bảo Khối Ảnh Bìa (Featured Image)
  if (!/\[ảnh bìa|ảnh đại diện|featured image/i.test(md)) {
    const featuredImgBlock = `\n\n> **[Ảnh bìa: Hình ảnh thực tế chất lượng cao minh họa chủ đề ${kw} theo phong cách tự nhiên, ấm áp của Home Care]**\n\n`;
    const firstH2Pos = md.indexOf('## ');
    if (firstH2Pos !== -1) {
      md = md.slice(0, firstH2Pos) + featuredImgBlock + md.slice(firstH2Pos);
    } else {
      md = md + featuredImgBlock;
    }
  }

  // C. Đảm bảo Khối Ảnh Trong Bài (Ít nhất 2 ảnh minh họa)
  const imgMatches = md.match(/\[ảnh\s*\d*:/gi) || [];
  if (imgMatches.length < 2) {
    let h2Indices = [];
    const h2Regex = /##\s+[^\n]+/g;
    let match;
    while ((match = h2Regex.exec(md)) !== null) {
      h2Indices.push(match.index + match[0].length);
    }

    if (h2Indices.length > 0) {
      if (!md.includes('[ảnh 1:')) {
        const pos = h2Indices[0];
        const img1 = `\n\n> **[Ảnh 1: Minh họa các bước thực hành ${kw} chuẩn khoa học và an toàn cho mẹ]**\n`;
        md = md.slice(0, pos) + img1 + md.slice(pos);
      }
      h2Indices = [];
      while ((match = h2Regex.exec(md)) !== null) {
        h2Indices.push(match.index + match[0].length);
      }
      if (!md.includes('[ảnh 2:') && h2Indices.length > 1) {
        const pos = h2Indices[1];
        const img2 = `\n\n> **[Ảnh 2: Chuyên viên Home Care đồng hành và hướng dẫn mẹ tận tâm tại nhà]**\n`;
        md = md.slice(0, pos) + img2 + md.slice(pos);
      }
    }
  }

  // D. Đảm bảo Nhúng Video YouTube (AEO & Multimedia)
  if (videoId && !md.includes('youtube.com/embed') && !md.includes('video-container')) {
    const videoEmbedBlock = `\n\n<div class="video-container" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:25px 0;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.1);">\n  <iframe src="https://www.youtube.com/embed/${videoId}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe>\n</div>\n*Video hướng dẫn thực tế chi tiết về ${kw}.*\n\n`;
    const h2Matches = [...md.matchAll(/##\s+[^\n]+/g)];
    if (h2Matches.length > 0) {
      const targetH2 = h2Matches[Math.min(1, h2Matches.length - 1)];
      const insertPos = targetH2.index + targetH2[0].length;
      md = md.slice(0, insertPos) + videoEmbedBlock + md.slice(insertPos);
    } else {
      md += videoEmbedBlock;
    }
  }

  // E. Đảm bảo Bảng So Sánh / Tổng Hợp Dữ Liệu (AEO & Readability)
  if (!md.includes('| ---') && !md.includes('<table')) {
    const tableBlock = `\n\n### Bảng tổng hợp các tiêu chí quan trọng khi thực hiện\n\n| Tiêu chí | Lưu ý quan trọng | Khuyến nghị từ Home Care |\n| --- | --- | --- |\n| **Thời điểm thích hợp** | Sau khi cơ thể đã ổn định | Thực hiện vào buổi chiều tối hoặc thời gian thư giãn |\n| **Tần suất áp dụng** | 2 - 3 lần mỗi tuần | Tránh áp dụng quá nhiều lần gây mệt mỏi |\n| **Nhiệt độ & môi trường** | Nhiệt độ ấm vừa phải, phòng kín gió | Giữ không gian sạch sẽ, ấm áp và thông thoáng vừa đủ |\n| **Theo dõi cơ thể** | Lắng nghe phản ứng của mẹ | Ngừng ngay nếu cảm thấy khó chịu hoặc mệt mỏi |\n\n`;
    const faqPos = md.search(/##\s+(câu hỏi|thắc mắc|faqs)/i);
    if (faqPos !== -1) {
      md = md.slice(0, faqPos) + tableBlock + md.slice(faqPos);
    } else {
      md += tableBlock;
    }
  }

  // F. Đảm bảo Mục Câu hỏi thường gặp (FAQs)
  if (!/câu hỏi thường gặp|thắc mắc thường gặp|faqs|faq/i.test(md)) {
    const faqBlock = `\n\n## Câu hỏi thường gặp về ${kw}\n\n### Thực hiện ${kw} bao nhiêu lần một tuần là phù hợp?\nTheo lời khuyên từ các chuyên gia chăm sóc mẹ và bé tại Home Care, mẹ chỉ nên thực hiện khoảng 2 đến 3 lần mỗi tuần. Việc duy trì tần suất hợp lý giúp cơ thể có thời gian phục hồi và thích ứng tự nhiên mà không gây cảm giác mệt mỏi.\n\n### Mẹ cần lưu ý điều gì quan trọng nhất khi tự thực hiện tại nhà?\nĐiều quan trọng nhất là luôn giữ yếu tố vệ sinh sạch sẽ, nhiệt độ vừa phải và lắng nghe phản ứng của cơ thể. Tránh thực hiện khi đang cảm thấy mệt mỏi hoặc có những dấu hiệu bất thường.\n\n### Khi nào mẹ nên tìm đến sự hỗ trợ của chuyên viên y tế hoặc dịch vụ chăm sóc chuyên nghiệp?\nNếu mẹ có cơ địa nhạy cảm, vừa trải qua sinh mổ hoặc còn băn khoăn về quy trình chuẩn, mẹ nên liên hệ với các đơn vị chăm sóc uy tín như Home Care để được chuyên viên hướng dẫn trực tiếp và đồng hành an toàn.`;
    md += faqBlock;
  }

  // G. Đảm bảo Đoạn Kết & Lời Kêu Gọi Hành Động (CTA)
  if (!/liên hệ|tư vấn|đặt lịch|trải nghiệm|hotline|website|đăng ký/i.test(md.slice(-1000))) {
    const ctaBlock = `\n\n## Lời nhắn gửi yêu thương và đồng hành cùng mẹ từ Home Care\n\nHành trình làm mẹ luôn thiêng liêng nhưng cũng đầy những vất vả, bỡ ngỡ. Việc tìm hiểu và thực hiện đúng **${kw}** sẽ giúp mẹ giữ gìn sức khỏe, cảm thấy tự tin và thư thái hơn trong từng khoảnh khắc chăm sóc bản thân cùng bé yêu.\n\nNếu mẹ còn bất kỳ thắc mắc nào hoặc muốn được chăm sóc chu đáo, tận tâm nhất ngay tại nhà, hãy **liên hệ ngay** với đội ngũ chuyên viên Home Care qua hotline: **0976.088.002** hoặc truy cập website chính thức để nhận tư vấn miễn phí và đặt lịch trải nghiệm dịch vụ chăm sóc mẹ và bé uy tín hàng đầu!`;
    md += ctaBlock;
  }

  // H. Đảm bảo Đủ Số Lượng Đề Mục H2 (Ít nhất 3 - 5 H2)
  const h2Count = (md.match(/<h2|##\s+/gi) || []).length;
  if (h2Count < 3) {
    const extraH2 = `\n\n## Những lưu ý quan trọng cần ghi nhớ để đạt hiệu quả tốt\n\nĐể giữ an toàn khi áp dụng, mẹ cần chú ý chuẩn bị kỹ càng dụng cụ, kiểm tra nhiệt độ cẩn thận và giữ cho tinh thần luôn thoải mái, thư giãn. Sự kiên trì và lắng nghe cơ thể chính là chìa khóa vàng giúp mẹ phục hồi năng lượng mỗi ngày.`;
    const lastH2Pos = md.lastIndexOf('## ');
    if (lastH2Pos !== -1) {
      md = md.slice(0, lastH2Pos) + extraH2 + '\n\n' + md.slice(lastH2Pos);
    } else {
      md += extraH2;
    }
  }

  // I. Đảm bảo Liên Kết Nội Bộ (Ít nhất 2 links)
  const existingLinks = md.match(/\[([^\]]+)\]\((http[^)]+)\)|<a\s+(?:[^>]*?\s+)?href="([^"]*)"/gi) || [];
  if (existingLinks.length < 2) {
    if (internalLinks && internalLinks.length > 0) {
      for (const link of internalLinks) {
        if (!md.includes(link.url) && link.anchor && link.url) {
          const anchorRegex = new RegExp(escapeRegex(link.anchor), 'i');
          if (anchorRegex.test(md)) {
            md = md.replace(anchorRegex, `[${link.anchor}](${link.url})`);
          }
        }
      }
    }
    const updatedLinks = md.match(/\[([^\]]+)\]\((http[^)]+)\)|<a\s+(?:[^>]*?\s+)?href="([^"]*)"/gi) || [];
    if (updatedLinks.length < 2) {
      if (!md.includes('chamsocmebe.vn')) {
        md = md.replace(/Home Care/i, `[dịch vụ chăm sóc mẹ và bé Home Care](https://chamsocmebe.vn)`);
        md = md.replace(/tư vấn miễn phí/i, `[nhận tư vấn cẩm nang chăm sóc sau sinh](https://chamsocmebe.vn/cam-nang)`);
      }
    }
  }

  // J. Đảm bảo ĐỘ DÀI TOÀN BÀI (>= 1.000 từ, mục tiêu 1.200 - 1.500 từ)
  let words = md.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  if (words.length < 1000) {
    const elaborationBlock = `
## Hướng dẫn chi tiết từng bước thực hiện an toàn và hiệu quả tại nhà

Để giúp mẹ dễ dàng hình dung và thực hành một cách chuẩn xác nhất, các chuyên viên giàu kinh nghiệm tại Home Care xin gửi đến mẹ quy trình từng bước rõ ràng, khoa học dưới đây:

### Bước 1: Chuẩn bị nguyên liệu và dụng cụ chu đáo
- Lựa chọn các loại thảo mộc tươi sạch, có nguồn gốc rõ ràng, không chứa hóa chất bảo quản.
- Rửa sạch từng nguyên liệu dưới vòi nước chảy và ngâm qua nước muối loãng từ 5 đến 10 phút.
- Chuẩn bị khăn bông mềm sạch, trang phục rộng rãi thoáng mát và một ly nước ấm để bù nước sau khi thực hiện.

### Bước 2: Thiết lập không gian thư giãn, kín gió
- Chọn căn phòng sạch sẽ, ấm cúng, tránh gió lùa trực tiếp.
- Giữ nhiệt độ phòng ở mức dễ chịu (khoảng 26 - 28 độ C) để cơ thể mẹ luôn được giữ ấm trong suốt quá trình.
- Mẹ có thể mở một bản nhạc không lời nhẹ nhàng giúp giải tỏa căng thẳng và thả lỏng tâm trí.

### Bước 3: Thực hiện nhẹ nhàng và lắng nghe cơ thể
- Bắt đầu với nhiệt độ ấm dịu, không để nhiệt quá nóng tiếp xúc gần với da.
- Hít thở sâu, thư giãn toàn bộ các nhóm cơ và cảm nhận hơi ấm lan tỏa dịu nhẹ.
- Thời gian lý tưởng kéo dài từ 15 đến 20 phút, không nên kéo dài quá lâu vì có thể gây mất nước hoặc hạ huyết áp tạm thời.

### Bước 4: Chăm sóc cơ thể sau khi hoàn tất
- Dùng khăn khô mềm thấm nhẹ nhàng mồ hôi, tránh tắm lại ngay bằng nước lạnh.
- Mặc trang phục ấm áp, giữ ấm vùng ngực và bàn chân.
- Uống ngay một ly nước ấm hoặc trà thảo mộc nhẹ để phục hồi thể lực và duy trì độ ẩm cho cơ thể.

## Những sai lầm phổ biến mẹ bỉm cần tránh khi áp dụng

Trong quá trình đồng hành cùng hàng ngàn mẹ sau sinh, Home Care nhận thấy nhiều mẹ vì mong muốn hồi phục nhanh mà vô tình mắc phải những sai lầm sau:

1. **Áp dụng quá sớm khi cơ thể chưa sẵn sàng**: Sau khi sinh, cơ thể mẹ cần một khoảng thời gian nghỉ ngơi để vết thương và các cơ quan hồi phục cơ bản. Việc vội vàng áp dụng các biện pháp tác động nhiệt khi chưa có sự đồng ý của bác sĩ có thể gây ảnh hưởng không tốt.
2. **Nhiệt độ nước quá nóng**: Vùng da sau sinh vốn rất nhạy cảm. Hơi nước quá nóng không chỉ gây bỏng rát mà còn làm tổn thương các mô liên kết mềm.
3. **Thực hiện trong phòng có gió lùa**: Khi lỗ chân lông đang giãn nở, gió lùa hoặc nhiệt độ điều hòa quá thấp dễ khiến mẹ bị nhiễm lạnh, đau nhức xương khớp về sau.
4. **Không bù nước và dinh dưỡng**: Quá trình toát mồ hôi làm cơ thể tiêu hao một lượng nước đáng kể. Nếu không uống nước kịp thời, mẹ có thể cảm thấy hoa mắt, chóng mặt hoặc suy giảm lượng sữa mẹ.
`;
    const insertBeforePos = md.search(/### Bảng tổng hợp|## Câu hỏi thường gặp/i);
    if (insertBeforePos !== -1) {
      md = md.slice(0, insertBeforePos) + elaborationBlock + '\n\n' + md.slice(insertBeforePos);
    } else {
      const ctaPos = md.search(/## Lời nhắn gửi yêu thương/i);
      if (ctaPos !== -1) {
        md = md.slice(0, ctaPos) + elaborationBlock + '\n\n' + md.slice(ctaPos);
      } else {
        md += elaborationBlock;
      }
    }
  }

  // K. Tẩy sạch từ cấm vi phạm AGENTS.md và thay thế bằng từ đồng nghĩa an toàn
  md = md.replace(/tuyệt đối không/gi, 'tránh');
  md = md.replace(/tuyệt đối tránh/gi, 'hết sức lưu ý tránh');
  md = md.replace(/tuyệt đối an toàn/gi, 'rất an toàn');
  md = md.replace(/an toàn tuyệt đối/gi, 'an toàn chu đáo');
  md = md.replace(/tuyệt đối/gi, 'rất');
  md = md.replace(/đảm bảo an toàn/gi, 'giữ an toàn');
  md = md.replace(/đảm bảo/gi, 'duy trì');
  md = md.replace(/thiên nhiên/gi, 'tự nhiên');
  md = md.replace(/tốt nhất/gi, 'rất tốt');
  md = md.replace(/số 1/gi, 'hàng đầu');
  md = md.replace(/duy nhất/gi, 'đặc biệt');
  md = md.replace(/100% hiệu quả/gi, 'hiệu quả cao');
  md = md.replace(/khỏi hoàn toàn/gi, 'phục hồi nhanh chóng');
  md = md.replace(/chữa bệnh/gi, 'cải thiện sức khỏe');
  md = md.replace(/chữa trị/gi, 'chăm sóc');
  md = md.replace(/điều trị/gi, 'hỗ trợ chăm sóc');
  md = md.replace(/trị dứt điểm/gi, 'cải thiện triệt để');
  md = md.replace(/chuẩn y khoa/gi, 'chuẩn khoa học');
  md = md.replace(/sản phẩm lành tính/gi, 'sản phẩm an toàn');
  md = md.replace(/thành phần lành tính/gi, 'thành phần an toàn tự nhiên');

  // L. Điều hòa mật độ từ khóa: Tránh lặp lại quá nhiều lần gây phạt keyword stuffing
  const kwRegexAll = new RegExp(escapeRegex(kw), 'gi');
  let matchCount = 0;
  md = md.replace(kwRegexAll, (matched) => {
    matchCount++;
    if (matchCount > 3) {
      return 'phương pháp chăm sóc tự nhiên này';
    }
    return matched;
  });

  // M. Quét sạch triệt để ký tự tiếng Trung
  h1Title = sanitizeChineseCharacters(h1Title);
  metaTitle = sanitizeChineseCharacters(metaTitle);
  metaDescription = sanitizeChineseCharacters(metaDescription);
  md = sanitizeChineseCharacters(md);

  // N. Render lại Clean HTML
  cleanHtml = convertMarkdownToCleanHtml(md);

  const finalWordCount = md.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean).length;

  return {
    h1Title,
    metaTitle,
    slug,
    metaDescription,
    primaryKeyword: kw,
    contentMarkdown: md,
    cleanHtml,
    wordCount: finalWordCount
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
  autoOptimizeArticleForSeo,
  convertMarkdownToCleanHtml,
  sanitizeChineseCharacters
};

