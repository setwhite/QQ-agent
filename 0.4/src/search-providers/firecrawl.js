// Firecrawl Search API：POST /v2/search，Bearer 认证；网页结果在 data.web[]。
// 参数错误与额度问题会以 200 + success:false 返回，不能当"没有结果"吞掉。
// 文档：https://docs.firecrawl.dev/api-reference/endpoint/search

import { mapResults } from './common.js';

export default {
  id: 'firecrawl',
  label: 'Firecrawl',
  envKey: 'FIRECRAWL_API_KEY',
  defaults: { baseUrl: 'https://api.firecrawl.dev/v2/search', count: 6, timeoutMs: 30000 },
  buildRequest({ query, count, apiKey, baseUrl }) {
    return {
      url: baseUrl,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ query, limit: count, sources: ['web'] })
      }
    };
  },
  parseResponse(data, limit) {
    if (data?.success === false) throw new Error(`Firecrawl 搜索失败：${data?.error ?? '未知错误'}`);
    // v2 响应：data.web[]（另有 images / news / tools，本提供方不取）
    return mapResults(data?.data?.web, (row) => ({
      title: row?.title, url: row?.url, snippet: row?.description
    }), limit);
  }
};
