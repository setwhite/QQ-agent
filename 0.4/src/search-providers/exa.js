// Exa Search API：POST /search，x-api-key 认证；请求 contents.text 以填充摘要。
// 文档：https://docs.exa.ai/reference/search

import { mapResults } from './common.js';

/** 单条摘要上限：够模型判断相关性，又不把响应撑大。 */
const SNIPPET_MAX_CHARS = 300;

export default {
  id: 'exa',
  label: 'Exa',
  envKey: 'EXA_API_KEY',
  defaults: { baseUrl: 'https://api.exa.ai/search', count: 6, timeoutMs: 20000 },
  buildRequest({ query, count, apiKey, baseUrl }) {
    return {
      url: baseUrl,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({
          query,
          numResults: count,
          contents: { text: { maxCharacters: SNIPPET_MAX_CHARS } }
        })
      }
    };
  },
  parseResponse(data, limit) {
    return mapResults(data?.results, (row) => ({
      title: row?.title, url: row?.url, snippet: row?.text ?? row?.summary
    }), limit);
  }
};
