// 搜索 API 提供方的共享规则：字符串清洗、条数/超时夹取、结果归一化。
// 各提供方文件只描述"请求形状 + 响应字段"，这三件事不重复实现。

/** 转字符串、折叠空白、去首尾空白。 */
export function text(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

/** 配置里的条数夹到 [min, max]；非法值用 fallback。 */
export function countOf(value, fallback, { min = 1, max = 50 } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}

/** 配置里的超时夹到 ≥5 秒；非法值用 fallback。 */
export function timeoutOf(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.max(5000, Math.floor(number));
}

/**
 * 统一结果形状 [{ title, url, snippet }]：
 * 缺 url 的行丢弃 —— 模型拿到没有链接的"结果"只会去猜；
 * 缺标题时用 url 顶替，摘要压成一行。pick 负责把各家字段名映射到这三个位置。
 */
export function mapResults(rows, pick, limit) {
  const out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const picked = pick(row) ?? {};
    const url = text(picked.url);
    if (!url) continue;
    out.push({ title: text(picked.title) || url, url, snippet: text(picked.snippet) });
    if (out.length >= limit) break;
  }
  return out;
}
