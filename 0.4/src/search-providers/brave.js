// Brave Web Search API：GET /res/v1/web/search，x-subscription-token 认证。
// 文档：https://api-dashboard.search.brave.com/app/documentation/web-search/get-started

import { mapResults } from './common.js';

export default {
  id: 'brave',
  label: 'Brave',
  envKey: 'BRAVE_SEARCH_API_KEY',
  defaults: { baseUrl: 'https://api.search.brave.com/res/v1/web/search', count: 6, timeoutMs: 20000 },
  buildRequest({ query, count, apiKey, baseUrl }) {
    const url = new URL(baseUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('count', String(count));
    return {
      url: url.toString(),
      init: { headers: { accept: 'application/json', 'x-subscription-token': apiKey } }
    };
  },
  parseResponse(data, limit) {
    return mapResults(data?.web?.results, (row) => ({
      title: row?.title, url: row?.url, snippet: row?.description
    }), limit);
  }
};
