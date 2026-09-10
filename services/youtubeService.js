const { YoutubeTranscript } = require('youtube-transcript');

/**
 * Trích xuất YouTube Video ID từ nhiều định dạng URL khác nhau
 */
function extractVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  
  // Các định dạng:
  // https://www.youtube.com/watch?v=XXXX
  // https://youtu.be/XXXX
  // https://www.youtube.com/embed/XXXX
  // https://www.youtube.com/shorts/XXXX
  // https://music.youtube.com/watch?v=XXXX
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i,
    /^[a-zA-Z0-9_-]{11}$/
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1] || match[0];
  }
  return null;
}

/**
 * Lấy Metadata qua YouTube Data API v3 (nếu có API Key)
 */
async function fetchMetadataWithApiKey(videoId, apiKey) {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`YouTube API Error (${res.status}): ${errText}`);
  }
  const data = await res.json();
  if (!data.items || data.items.length === 0) {
    throw new Error('Không tìm thấy video với ID cung cấp');
  }
  const item = data.items[0];
  const snippet = item.snippet || {};
  const stats = item.statistics || {};

  return {
    videoId,
    title: snippet.title || '',
    description: snippet.description || '',
    channelTitle: snippet.channelTitle || '',
    publishedAt: snippet.publishedAt || '',
    tags: snippet.tags || [],
    thumbnails: snippet.thumbnails || {},
    thumbnailUrl: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    viewCount: stats.viewCount || '0',
    likeCount: stats.likeCount || '0',
    duration: item.contentDetails?.duration || ''
  };
}

/**
 * Lấy Metadata dự phòng (Không cần API Key) qua oEmbed & Web Scraping
 */
async function fetchMetadataWithoutApiKey(videoId) {
  let title = '';
  let channelTitle = '';
  let description = '';
  let tags = [];
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  try {
    // 1. oEmbed
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    const oembedRes = await fetch(oembedUrl);
    if (oembedRes.ok) {
      const oembedData = await oembedRes.json();
      title = oembedData.title || '';
      channelTitle = oembedData.author_name || '';
    }
  } catch (e) {
    console.warn('oEmbed fetch warning:', e.message);
  }

  try {
    // 2. Fetch watch page để lấy description & keywords
    const pageRes = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      
      if (!title) {
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) title = titleMatch[1].replace(' - YouTube', '').trim();
      }
      
      const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) ||
                        html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
      if (descMatch) description = descMatch[1].trim();

      const keywordsMatch = html.match(/<meta\s+name="keywords"\s+content="([^"]*)"/i);
      if (keywordsMatch) {
        tags = keywordsMatch[1].split(',').map(t => t.trim()).filter(Boolean);
      }
    }
  } catch (e) {
    console.warn('Page scraper warning:', e.message);
  }

  return {
    videoId,
    title: title || `YouTube Video (${videoId})`,
    description: description || '',
    channelTitle: channelTitle || 'YouTube Channel',
    tags,
    thumbnailUrl,
    publishedAt: '',
    viewCount: 'N/A',
    likeCount: 'N/A',
    duration: 'N/A'
  };
}

/**
 * Lấy Transcript / Phụ đề tiếng Việt hoặc đa ngôn ngữ
 */
async function fetchTranscript(videoId) {
  // Thử các ngôn ngữ theo thứ tự ưu tiên: vi (tiếng Việt), sau đó en, sau đó bất kỳ ngôn ngữ nào
  const langPreferences = ['vi', 'en', undefined];
  
  for (const lang of langPreferences) {
    try {
      const options = lang ? { lang } : {};
      const transcriptList = await YoutubeTranscript.fetchTranscript(videoId, options);
      if (transcriptList && transcriptList.length > 0) {
        const fullText = transcriptList.map(item => item.text).join(' ');
        const timeline = transcriptList.map(item => ({
          offsetMs: item.offset,
          durationMs: item.duration,
          timestamp: formatTimestamp(item.offset / 1000),
          text: item.text
        }));
        return {
          hasTranscript: true,
          language: lang || 'auto',
          fullText,
          timeline
        };
      }
    } catch (err) {
      // Tiếp tục thử ngôn ngữ khác
    }
  }

  return {
    hasTranscript: false,
    language: null,
    fullText: '',
    timeline: [],
    warning: 'Không thể tự động tải phụ đề của video này (video có thể chưa bật phụ đề hoặc có giới hạn bản quyền). Bạn có thể tự nhập hoặc dán nội dung tóm tắt.'
  };
}

/**
 * Chuyển đổi giây thành format mm:ss hoặc hh:mm:ss
 */
function formatTimestamp(seconds) {
  const sec = Math.floor(seconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * Hàm gom toàn bộ dữ liệu YouTube
 */
async function getYouTubeData(url, apiKey = null) {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Đường dẫn URL YouTube không hợp lệ. Vui lòng kiểm tra lại!');
  }

  let metadata;
  if (apiKey) {
    try {
      metadata = await fetchMetadataWithApiKey(videoId, apiKey);
    } catch (err) {
      console.warn('Fallback sang scraper do YouTube API Key lỗi:', err.message);
      metadata = await fetchMetadataWithoutApiKey(videoId);
    }
  } else {
    metadata = await fetchMetadataWithoutApiKey(videoId);
  }

  const transcript = await fetchTranscript(videoId);

  return {
    url,
    videoId,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    metadata,
    transcript
  };
}

module.exports = {
  extractVideoId,
  getYouTubeData,
  fetchTranscript
};
