// Keenable Search API：POST /v1/search，X-API-Key 认证，body { query, max_results }。
// 文档：https://docs.keenable.ai/api-reference/search

import { mapResults } from './common.js';

export default {
  id: 'keenable',
  label: 'Keenable',
  envKey: 'KEENABLE_API_KEY',
  defaults: { baseUrl: 'https://api.keenable.ai/v1/search', count: 6, timeoutMs: 20000 },
  buildRequest({ query, count, apiKey, baseUrl }) {
    return {
      url: baseUrl,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ query, max_results: count })
      }
    };
  },
  parseResponse(data, limit) {
    // snippet 是正文摘录、description 是短语摘要：模型读前者更有用
    return mapResults(data?.results, (row) => ({
      title: row?.title, url: row?.url, snippet: row?.snippet ?? row?.description
    }), limit);
  }
};
