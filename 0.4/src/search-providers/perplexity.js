// Perplexity Search API：POST /search，Bearer 认证，body { query, max_results }。
// 用的是返回原始排名的 Search API，不是产出模型答案的 Agent/Sonar 接口。
// 文档：https://docs.perplexity.ai/api-reference/search-post

import { mapResults } from './common.js';

export default {
  id: 'perplexity',
  label: 'Perplexity',
  envKey: 'PERPLEXITY_API_KEY',
  defaults: { baseUrl: 'https://api.perplexity.ai/search', count: 6, timeoutMs: 20000 },
  buildRequest({ query, count, apiKey, baseUrl }) {
    return {
      url: baseUrl,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ query, max_results: count })
      }
    };
  },
  parseResponse(data, limit) {
    return mapResults(data?.results, (row) => ({
      title: row?.title, url: row?.url, snippet: row?.snippet ?? row?.description
    }), limit);
  }
};
