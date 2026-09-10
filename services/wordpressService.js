const { convertMarkdownToCleanHtml } = require('./articleParser');

/**
 * Đẩy bài viết lên WordPress thông qua REST API (Chuẩn quy cách CMS)
 */
async function publishToWordPress({ siteUrl, apiKey, username, appPassword, postStatus = 'draft', articleData, selectedKeyword }) {
  if (!siteUrl) {
    throw new Error('Vui lòng nhập địa chỉ website WordPress (ví dụ: https://yourwebsite.com)');
  }
  const key = (apiKey || appPassword || '').trim();
  if (!key && !username) {
    throw new Error('Vui lòng nhập API Key hoặc Application Password của WordPress');
  }

  const cleanSiteUrl = siteUrl.trim().replace(/\/+$/, '');
  const apiUrl = `${cleanSiteUrl}/wp-json/wp/v2/posts`;

  // 1. Chuyển đổi Markdown sang Clean HTML cho WordPress
  // Bỏ hoàn toàn [ảnh ...], bỏ H1 trong body, bỏ ---
  const cleanHtmlForWp = convertMarkdownToCleanHtml(articleData.contentMarkdown, { forWordPress: true });

  // 2. Chuẩn bị Payload tuân thủ nghiêm ngặt quy trình chuẩn
  const payload = {
    title: articleData.h1Title || 'Bài Viết Chuẩn SEO',
    content: cleanHtmlForWp,
    slug: articleData.slug || '',
    status: postStatus === 'publish' ? 'publish' : 'draft',
    excerpt: '', // Bắt buộc rỗng theo quy tắc CMS
    meta: {
      _yoast_wpseo_focuskw: selectedKeyword || '',
      _yoast_wpseo_title: articleData.metaTitle || articleData.h1Title || '',
      _yoast_wpseo_metadesc: articleData.metaDescription || ''
    }
  };

  // 3. Chuẩn bị Authentication linh hoạt
  let authHeader = '';
  if (key.includes(':')) {
    // Nhập dạng username:password (ví dụ: admin:abcd efgh 1234)
    authHeader = 'Basic ' + Buffer.from(key).toString('base64');
  } else if (username && key) {
    authHeader = 'Basic ' + Buffer.from(`${username.trim()}:${key}`).toString('base64');
  } else if (key.toLowerCase().startsWith('bearer ') || key.toLowerCase().startsWith('basic ')) {
    authHeader = key;
  } else {
    // Thử Bearer token trước
    authHeader = `Bearer ${key}`;
  }

  console.log(`[WordPress] Đang đẩy bài viết tới: ${apiUrl} (Trạng thái: ${payload.status})`);

  let response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify(payload)
  });

  // Nếu 401 và đang dùng Bearer token cho application password thô, thử fallback sang Basic auth
  if (response.status === 401 && !key.includes(':') && !username && authHeader.startsWith('Bearer ')) {
    const fallbackAuth = 'Basic ' + Buffer.from(key).toString('base64');
    const retryRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': fallbackAuth
      },
      body: JSON.stringify(payload)
    });
    if (retryRes.ok) {
      response = retryRes;
    }
  }

  if (!response.ok) {
    const errText = await response.text();
    let parsedErr = errText;
    try {
      const j = JSON.parse(errText);
      parsedErr = j.message || errText;
    } catch (e) {}

    throw new Error(`Lỗi từ WordPress API (${response.status}): ${parsedErr}`);
  }

  const result = await response.json();

  return {
    success: true,
    postId: result.id,
    postUrl: result.link,
    editUrl: `${cleanSiteUrl}/wp-admin/post.php?post=${result.id}&action=edit`,
    status: result.status,
    title: result.title?.rendered || payload.title
  };
}

module.exports = {
  publishToWordPress
};
