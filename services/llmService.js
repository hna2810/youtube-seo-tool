const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const { sanitizeChineseCharacters } = require('./articleParser');

/**
 * Lấy OpenRouter API Key và Model dự phòng từ openrouter.yaml, .env hoặc gemini.yaml
 */
function getDefaultApiKey() {
  if (process.env.OPENROUTER_API_KEY) {
    return { key: process.env.OPENROUTER_API_KEY.trim(), model: process.env.OPENROUTER_MODEL || null, provider: 'openrouter' };
  }
  if (process.env.GEMINI_API_KEY) {
    return { key: process.env.GEMINI_API_KEY.trim(), model: null, provider: 'gemini' };
  }

  // Thử đọc từ openrouter.yaml trước (Ưu tiên thư mục dự án)
  const orPaths = [
    path.join(__dirname, '..', 'openrouter.yaml'),
    path.join(process.cwd(), 'openrouter.yaml'),
    path.join(__dirname, '..', '..', 'openrouter.yaml')
  ];

  for (const p of orPaths) {
    try {
      if (fs.existsSync(p)) {
        const fileContent = fs.readFileSync(p, 'utf8');
        const parsed = yaml.parse(fileContent);
        if (parsed && (parsed.api_key || parsed.openrouter_api_key)) {
          return { 
            key: (parsed.api_key || parsed.openrouter_api_key).trim(), 
            model: parsed.model ? parsed.model.trim() : null,
            provider: 'openrouter' 
          };
        }
      }
    } catch (e) {}
  }

  // Thử đọc từ gemini.yaml (Ưu tiên thư mục dự án)
  const geminiPaths = [
    path.join(__dirname, '..', 'gemini.yaml'),
    path.join(process.cwd(), 'gemini.yaml'),
    path.join(__dirname, '..', '..', 'gemini.yaml')
  ];

  for (const p of geminiPaths) {
    try {
      if (fs.existsSync(p)) {
        const fileContent = fs.readFileSync(p, 'utf8');
        const parsed = yaml.parse(fileContent);
        if (parsed && parsed.api_key) {
          return { key: parsed.api_key.trim(), model: null, provider: 'gemini' };
        }
      }
    } catch (e) {}
  }

  return { key: null, model: null, provider: null };
}

/**
 * Kiểm tra trạng thái API key để thông báo cho UI
 */
function getApiKeyStatus(customKey = null) {
  const active = customKey ? { key: customKey.trim(), model: null, provider: detectProvider(customKey) } : getDefaultApiKey();

  if (!active.key) {
    return {
      hasKey: false,
      maskedKey: null,
      provider: 'none',
      source: 'none',
      configuredModel: 'deepseek/deepseek-chat'
    };
  }

  const masked = active.key.length > 8 
    ? `${active.key.substring(0, 7)}...${active.key.substring(active.key.length - 4)}` 
    : '****';

  return {
    hasKey: true,
    maskedKey: masked,
    provider: active.provider,
    source: customKey ? 'user_provided' : 'server_default',
    configuredModel: active.model || 'openai/gpt-4o-mini'
  };
}

function detectProvider(key) {
  if (!key) return 'none';
  if (key.startsWith('sk-or-')) return 'openrouter';
  if (key.startsWith('AIza') || key.startsWith('AQ.')) return 'gemini';
  return 'openrouter'; // Mặc định coi là OpenRouter
}

/**
 * Đệ quy làm sạch 100% ký tự tiếng Trung (CJK characters) trong chuỗi hoặc đối tượng JSON
 */
function deepSanitizeChinese(val) {
  if (!val) return val;
  if (typeof val === 'string') {
    return sanitizeChineseCharacters(val);
  }
  if (Array.isArray(val)) {
    return val.map(deepSanitizeChinese);
  }
  if (typeof val === 'object') {
    const res = {};
    for (const k of Object.keys(val)) {
      res[k] = deepSanitizeChinese(val[k]);
    }
    return res;
  }
  return val;
}

/**
 * Chuẩn hóa ký tự điều khiển và xuống dòng thô bên trong chuỗi JSON
 */
function sanitizeJsonControlChars(str) {
  if (!str) return '';
  let inString = false;
  let escaped = false;
  let result = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (char === '"' && !escaped) {
      inString = !inString;
      result += char;
    } else if (char === '\\' && inString) {
      escaped = !escaped;
      result += char;
    } else {
      if (inString) {
        if (char === '\n') {
          result += '\\n';
        } else if (char === '\r') {
          result += '\\r';
        } else if (char === '\t') {
          result += '\\t';
        } else {
          result += char;
        }
      } else {
        result += char;
      }
      escaped = false;
    }
  }

  // Loại bỏ dấu phẩy thừa trước } hoặc ]
  result = result.replace(/,\s*([\}\]])/g, '$1');
  return result;
}

/**
 * Tự động phục hồi JSON bị cắt ngắn (Truncated JSON do chạm giới hạn Token)
 */
function repairTruncatedJson(jsonString) {
  if (!jsonString) return '{}';
  let str = jsonString.trim();

  // Loại bỏ các thẻ code block thừa nếu có
  str = str.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  const firstBrace = str.indexOf('{');
  const firstBracket = str.indexOf('[');
  if (firstBrace === -1 && firstBracket === -1) return '{}';

  const startIdx = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
  str = str.substring(startIdx);

  let inString = false;
  let escaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"' && !escaped) {
      inString = !inString;
    } else if (char === '\\' && inString) {
      escaped = !escaped;
    } else if (!inString) {
      escaped = false;
    } else {
      escaped = false;
    }
  }

  // Đóng chuỗi nếu đang mở
  if (inString) {
    str += '"';
  }

  // Dọn dẹp các key/property dở dang ở cuối
  str = str.replace(/,\s*"[^"]*"\s*$/, '');
  str = str.replace(/([{\[])\s*"[^"]*"\s*$/, '$1');
  str = str.replace(/:\s*$/, ': null');
  str = str.replace(/,\s*$/, '');
  str = str.replace(/,\s*([\}\]])/g, '$1');

  // Quét lại toàn bộ để tính toán chính xác số lượng ngoặc cần đóng
  const finalStack = [];
  inString = false;
  escaped = false;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"' && !escaped) {
      inString = !inString;
    } else if (char === '\\' && inString) {
      escaped = !escaped;
    } else if (!inString) {
      if (char === '{' || char === '[') {
        finalStack.push(char);
      } else if (char === '}') {
        if (finalStack.length && finalStack[finalStack.length - 1] === '{') finalStack.pop();
      } else if (char === ']') {
        if (finalStack.length && finalStack[finalStack.length - 1] === '[') finalStack.pop();
      }
      escaped = false;
    } else {
      escaped = false;
    }
  }

  if (inString) str += '"';
  str = str.replace(/,\s*$/, '');
  str = str.replace(/:\s*$/, ': null');

  while (finalStack.length > 0) {
    const open = finalStack.pop();
    if (open === '{') str += '}';
    else if (open === '[') str += ']';
  }

  return str;
}

/**
 * Trích xuất và parse JSON an toàn từ phản hồi của LLM (Hỗ trợ reasoning models, tự động sửa lỗi xuống dòng & truncated JSON)
 */
function _internalCleanAndParseJson(rawText) {
  if (!rawText) return null;
  let text = rawText.trim();

  // 1. Loại bỏ khối suy nghĩ <think>...</think> của các model reasoning (DeepSeek R1, QwQ, v.v.)
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2. Bóc tách markdown code block nếu có
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch) {
    text = jsonBlockMatch[1].trim();
  } else {
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
    }
  }

  let firstError = null;
  // 3. Thử parse trực tiếp
  try {
    return JSON.parse(text);
  } catch (err1) {
    firstError = err1;
  }

  // 4. Trích xuất khối {} hoặc []
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let sub = text;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    sub = text.substring(firstBrace);
  } else if (firstBracket !== -1) {
    sub = text.substring(firstBracket);
  }

  // 5. Thử parse sau khi cắt khối
  try {
    return JSON.parse(sub);
  } catch (err2) {}

  // 6. Thử dọn dẹp ký tự điều khiển (unescaped newlines / tabs trong chuỗi)
  try {
    const sanitized = sanitizeJsonControlChars(sub);
    return JSON.parse(sanitized);
  } catch (err3) {}

  // 7. Thử tự động phục hồi nếu JSON bị cắt cụt (Truncated JSON do token limit)
  try {
    const repaired = repairTruncatedJson(sub);
    return JSON.parse(repaired);
  } catch (err4) {}

  // 8. Thử kết hợp vừa dọn dẹp vừa phục hồi cắt cụt
  try {
    const sanitized = sanitizeJsonControlChars(sub);
    const repaired = repairTruncatedJson(sanitized);
    return JSON.parse(repaired);
  } catch (err5) {}

  // 9. Thử trích xuất giữa firstBrace và lastBrace
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const sanitized = sanitizeJsonControlChars(text.substring(firstBrace, lastBrace + 1));
      return JSON.parse(sanitized);
    } catch (e) {}
  }

  // 10. Fallback cứu hộ bóc tách Outline bằng Regex nếu JSON bị lỗi cú pháp nặng
  try {
    const outlineMatch = text.match(/"outline"\s*:\s*\[([\s\S]*)/i);
    if (outlineMatch) {
      const itemBlocks = outlineMatch[1].match(/\{[^{}]*?"level"\s*:\s*"[^"]+?"[^{}]*?\}/gi);
      if (itemBlocks && itemBlocks.length > 0) {
        const fallbackOutline = [];
        for (const block of itemBlocks) {
          try {
            const parsedItem = JSON.parse(block);
            fallbackOutline.push(parsedItem);
          } catch (e) {
            const lvl = block.match(/"level"\s*:\s*"([^"]+)"/i);
            const ttl = block.match(/"title"\s*:\s*"([^"\r\n]+)"/i);
            const gdl = block.match(/"guideline"\s*:\s*"([^"\r\n]+)"/i);
            if (lvl) {
              fallbackOutline.push({
                level: lvl[1],
                title: ttl ? ttl[1] : (gdl ? gdl[1] : ''),
                guideline: gdl ? gdl[1] : ''
              });
            }
          }
        }
        if (fallbackOutline.length > 0) {
          console.warn('[LLM Recovery] Phục hồi thành công outline qua Regex fallback:', fallbackOutline.length, 'mục');
          return {
            contentBrief: {
              searchIntent: 'Informational',
              seoMeta: { seoTitle: '', slug: '', metaDescription: '' }
            },
            outline: fallbackOutline
          };
        }
      }
    }
  } catch (errRegex) {}

  console.error('Không thể parse JSON từ LLM text (length: ' + text.length + '):', text.substring(0, 300));
  throw new Error(`Lỗi định dạng dữ liệu phản hồi từ AI: ${firstError ? firstError.message : 'Unterminated or invalid JSON'}`);
}

/**
 * Trích xuất, parse JSON an toàn và lọc sạch 100% tiếng Trung/chữ Hán
 */
function cleanAndParseJson(rawText) {
  const parsed = _internalCleanAndParseJson(rawText);
  return deepSanitizeChinese(parsed);
}

/**
 * Chuẩn hóa và map các model alias sang endpoint chính xác của OpenRouter
 */
function resolveModelName(model) {
  if (!model) return 'openai/gpt-4o-mini';
  const m = model.trim();
  const lower = m.toLowerCase();

  // Mapping Claude models
  if (lower.includes('claude-3.5-sonnet') || lower.includes('claude-3-5-sonnet') || lower === 'anthropic/claude-3.5-sonnet') {
    return 'anthropic/claude-sonnet-4.5';
  }
  if (lower.includes('claude-3.7-sonnet') || lower.includes('claude-3-7-sonnet')) {
    return 'anthropic/claude-sonnet-4.5';
  }
  if (lower === 'claude-sonnet' || lower === 'sonnet') {
    return 'anthropic/claude-sonnet-4.5';
  }

  // Mapping GPT models
  if (lower === 'gpt-4o' || lower === 'openai/gpt-4o') {
    return 'openai/gpt-4o-2024-11-20';
  }
  if (lower === 'gpt-4o-mini' || lower === 'openai/gpt-4o-mini') {
    return 'openai/gpt-4o-mini';
  }

  // Mapping Gemini models
  if (lower.includes('gemini-2.0-flash') || lower === 'gemini-flash') {
    return 'google/gemini-2.5-flash';
  }

  // Hỗ trợ tất cả các model khác: giữ nguyên định dạng slug của OpenRouter
  return m;
}

/**
 * Cache danh sách model từ OpenRouter
 */
let cachedModels = null;
let lastFetchTime = 0;

async function getAvailableOpenRouterModels(apiKey = null) {
  const now = Date.now();
  if (cachedModels && (now - lastFetchTime < 3600000)) {
    return cachedModels;
  }

  try {
    const key = apiKey || getDefaultApiKey().key;
    const headers = {};
    if (key) {
      headers['Authorization'] = `Bearer ${key}`;
    }
    const res = await fetch('https://openrouter.ai/api/v1/models', { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.data)) {
        const popularSlugs = [
          'openrouter/free',
          'deepseek/deepseek-chat',
          'google/gemini-2.5-flash',
          'openai/gpt-4o-mini',
          'anthropic/claude-sonnet-4.5',
          'openai/gpt-4o',
          'deepseek/deepseek-r1',
          'meta-llama/llama-3.3-70b-instruct',
          'qwen/qwen-2.5-72b-instruct',
          'google/gemma-4-31b-it:free',
          'nvidia/nemotron-3.5-lightning:free'
        ];

        cachedModels = data.data.map(m => {
          const isFree = m.id === 'openrouter/free' || m.id.endsWith(':free') || (m.pricing && m.pricing.prompt === '0' && m.pricing.completion === '0');
          let displayName = m.name || m.id;
          if (m.id === 'openrouter/free') {
            displayName = '✨ OpenRouter Auto Free (100% Miễn phí)';
          } else if (isFree && !displayName.toLowerCase().includes('free') && !displayName.toLowerCase().includes('miễn phí')) {
            displayName += ' [Miễn phí]';
          }
          return {
            id: m.id,
            name: displayName,
            contextLength: m.context_length || 0,
            isPopular: popularSlugs.includes(m.id),
            isFree: isFree
          };
        }).sort((a, b) => {
          if (a.id === 'openrouter/free') return -1;
          if (b.id === 'openrouter/free') return 1;
          if (a.isPopular && !b.isPopular) return -1;
          if (!a.isPopular && b.isPopular) return 1;
          return a.name.localeCompare(b.name);
        });

        lastFetchTime = now;
        return cachedModels;
      }
    }
  } catch (err) {
    console.warn('Không thể tải danh sách model trực tiếp từ OpenRouter:', err.message);
  }

  return [
    { id: 'openrouter/free', name: '✨ OpenRouter Auto Free (100% Miễn phí)', isPopular: true, isFree: true },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek: DeepSeek V3', isPopular: true },
    { id: 'google/gemini-2.5-flash', name: 'Google: Gemini 2.5 Flash', isPopular: true },
    { id: 'openai/gpt-4o-mini', name: 'OpenAI: GPT-4o Mini', isPopular: true },
    { id: 'anthropic/claude-sonnet-4.5', name: 'Anthropic: Claude Sonnet 4.5', isPopular: true },
    { id: 'openai/gpt-4o', name: 'OpenAI: GPT-4o', isPopular: true },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek: DeepSeek R1 (Reasoning)', isPopular: true },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Meta: Llama 3.3 70B Instruct', isPopular: true },
    { id: 'google/gemma-4-31b-it:free', name: 'Google: Gemma 4 31B (Miễn phí)', isPopular: true, isFree: true },
    { id: 'nvidia/nemotron-3.5-lightning:free', name: 'NVIDIA: Nemotron 3.5 Lightning (Miễn phí)', isPopular: true, isFree: true }
  ];
}

/**
 * Gọi OpenRouter API (OpenAI-compatible) - Tương thích mọi model trên OpenRouter
 */
async function callOpenRouter(apiKey, prompt, options = {}) {
  const defConfig = getDefaultApiKey();
  let model = resolveModelName(options.model || defConfig.model || 'openai/gpt-4o-mini');
  const url = 'https://openrouter.ai/api/v1/chat/completions';

  const messages = [];
  if (options.systemInstruction) {
    messages.push({ role: 'system', content: options.systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const payload = {
    model: model,
    messages: messages,
    temperature: options.temperature !== undefined ? options.temperature : 0.7,
    max_tokens: options.maxTokens || 2500
  };

  if (options.isJson) {
    payload.response_format = { type: 'json_object' };
  }

  const maxRetries = options.maxRetries || 2;
  const timeoutMs = options.timeoutMs || 50000;
  let delay = 2000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'YouTube SEO Tool'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error('OpenRouter không trả về nội dung.');
        }

        if (options.isJson) {
          return cleanAndParseJson(content);
        }
        return sanitizeChineseCharacters(content);
      }

      // Xử lý khi model không hỗ trợ response_format (400 Bad Request)
      if (res.status === 400 && payload.response_format) {
        const errBody = await res.text();
        const lowerErr = errBody.toLowerCase();
        if (lowerErr.includes('response_format') || lowerErr.includes('json') || lowerErr.includes('schema') || lowerErr.includes('structured')) {
          console.warn(`[OpenRouter] Model ${payload.model} không hỗ trợ response_format, tự động fallback về prompt JSON thuần...`);
          delete payload.response_format;
          payload.messages[payload.messages.length - 1].content += "\n\nQUAN TRỌNG: Chỉ trả về duy nhất chuỗi JSON hợp lệ không có markdown backticks hay lời giải thích.";
          continue;
        }
        throw new Error(`OpenRouter API Error (400): ${errBody}`);
      }

      // Xử lý khi tài khoản không đủ credit hoặc vượt in-flight budget (402 Payment Required)
      if (res.status === 402) {
        const errBody = await res.text();
        console.warn(`[OpenRouter 402] Model ${payload.model} gặp lỗi hạn mức credit/token: ${errBody}`);

        // 1. Kiểm tra xem OpenRouter có cung cấp số token tối đa mà tài khoản có thể chi trả (can only afford X)
        const matchAfford = errBody.match(/can only afford\s+(\d+)/i);
        if (matchAfford && matchAfford[1]) {
          const affordTokens = parseInt(matchAfford[1], 10);
          if (affordTokens >= 800 && (!payload._affordRetried || payload.max_tokens > affordTokens)) {
            const adjustedTokens = Math.max(750, Math.floor(affordTokens * 0.92));
            console.warn(`[OpenRouter 402 Adaptive Clamping] Giữ nguyên model ${payload.model}, tự động điều chỉnh max_tokens từ ${payload.max_tokens} xuống ${adjustedTokens} (khả dụng: ${affordTokens} tokens) và thử lại...`);
            payload.max_tokens = adjustedTokens;
            payload._affordRetried = true;
            continue;
          }
        }

        throw new Error(`Tài khoản không đủ credit hoặc vượt hạn mức tạm giữ cho model ${payload.model}. Bạn hãy chọn model GPT-4o Mini (siêu nhanh ~2s, tiết kiệm) hoặc model khác để tiếp tục ngay!`);
      }

      // Xử lý khi OpenRouter không tìm thấy endpoint của model (404)
      if (res.status === 404) {
        const errBody = await res.text();
        console.warn(`[OpenRouter 404] Model ${payload.model} không có endpoint khả dụng: ${errBody}`);
        throw new Error(`OpenRouter báo Model không tồn tại hoặc đã ngừng hỗ trợ (${payload.model}). Vui lòng chọn một model khác từ danh sách.`);
      }

      if ([429, 500, 502, 503].includes(res.status)) {
        if (attempt < maxRetries) {
          console.warn(`OpenRouter API gặp mã ${res.status}, thử lại lần ${attempt + 1} sau ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }
      }

      const errBody = await res.text();
      throw new Error(`OpenRouter API Error (${res.status}): ${errBody}`);
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        console.warn(`[OpenRouter Timeout] Model ${payload.model} phản hồi quá ${timeoutMs}ms.`);
        throw new Error(`Model ${payload.model} phản hồi quá lâu (>50 giây). Vui lòng chọn GPT-4o Mini siêu tốc (~2s) và thử lại ngay!`);
      }
      if (attempt >= maxRetries) throw err;
      console.warn(`Lỗi kết nối OpenRouter lần ${attempt}:`, err.message);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

/**
 * Gọi Gemini Trực Tiếp (Fallback nếu key là Google Gemini)
 */
async function callGeminiDirect(apiKey, prompt, options = {}) {
  const model = options.model || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: options.temperature !== undefined ? options.temperature : 0.7,
      maxOutputTokens: options.maxTokens || 8192
    }
  };

  if (options.isJson) {
    payload.generationConfig.responseMimeType = 'application/json';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini API Error (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('AI không trả về nội dung');

  if (options.isJson) {
    return cleanAndParseJson(text);
  }
  return text;
}

/**
 * Hàm LLM trung tâm - Ưu tiên OpenRouter
 */
async function callGemini(prompt, options = {}) {
  let activeKey = options.apiKey && options.apiKey.trim();
  let provider = null;

  if (activeKey) {
    provider = detectProvider(activeKey);
  } else {
    const def = getDefaultApiKey();
    activeKey = def.key;
    provider = def.provider;
  }

  if (!activeKey) {
    throw new Error('Chưa cấu hình OpenRouter API Key. Vui lòng nhập API Key (sk-or-v1-...) trên giao diện hoặc lưu vào openrouter.yaml!');
  }

  console.log(`[LLM Caller] Đang gọi qua Provider: ${provider.toUpperCase()} (Model: ${options.model || 'default'})`);

  if (provider === 'gemini') {
    return await callGeminiDirect(activeKey, prompt, options);
  } else {
    return await callOpenRouter(activeKey, prompt, options);
  }
}

module.exports = {
  getDefaultApiKey,
  getApiKeyStatus,
  getAvailableOpenRouterModels,
  callGemini,
  cleanAndParseJson
};
