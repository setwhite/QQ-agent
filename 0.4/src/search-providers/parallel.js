// Parallel Search API：POST /v1/search，x-api-key 认证。
// 只发 search_queries：调用方给的是检索式，objective 要自包含的自然语言目标。
// mode 缺省是 advanced（约 3 秒）；官方把 fast（约 700ms）列为 agent 工具调用的推荐档。
// 文档：https://docs.parallel.ai/search/modes

import { mapResults } from './common.js';

export default {
  id: 'parallel',
  label: 'Parallel',
  envKey: 'PARALLEL_API_KEY',
  defaults: {
    baseUrl: 'https://api.parallel.ai/v1/search',
    mode: 'fast',
    count: 6,
    timeoutMs: 20000
  },
  buildRequest({ query, count, apiKey, baseUrl, conf }) {
    return {
      url: baseUrl,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({
          mode: conf.mode || 'fast',
          search_queries: [query],
          advanced_settings: { max_results: count }
        })
      }
    };
  },
  parseResponse(data, limit) {
    return mapResults(data?.results, (row) => ({
      title: row?.title,
      url: row?.url,
      snippet: Array.isArray(row?.excerpts) ? row.excerpts.join(' ') : row?.excerpts
    }), limit);
  }
};
