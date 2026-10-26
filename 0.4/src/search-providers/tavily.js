// Tavily Search API：POST /search，Bearer 认证，body { query, max_results }。
// 文档：https://docs.tavily.com/documentation/api-reference/endpoint/search

import { mapResults } from './common.js';

export default {
  id: 'tavily',
  label: 'Tavily',
  envKey: 'TAVILY_API_KEY',
  defaults: { baseUrl: 'https://api.tavily.com/search', count: 6, timeoutMs: 20000 },
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
      title: row?.title, url: row?.url, snippet: row?.content
    }), limit);
  }
};
