// 搜索 API 的 JSON 请求：统一超时、HTTP 错误与非 JSON 响应。
// 端点来自本机配置（管理员自伤面），与 web-search.js 里其余 API 型提供方同口径走普通 fetch。

export async function requestJson({ url, init, timeoutMs, label, fetchImpl = fetch }) {
  const res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${label} 搜索 HTTP ${res.status}：${body.slice(0, 300)}`);
  }
  try {
    return await res.json();
  } catch {
    throw new Error(`${label} 搜索返回了无法解析的 JSON`);
  }
}
