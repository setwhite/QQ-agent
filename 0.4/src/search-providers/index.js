// 搜索 API 提供方注册表：provider id → 请求形状与响应解析。
// 新增一家 = 新加一个 <id>.js 并在 SEARCH_API_PROVIDERS 登记；配置默认值、
// Key 环境变量、条数与超时口径都由这里统一供给，调用方只认 id。

import { countOf, text, timeoutOf } from './common.js';
import { requestJson } from './http.js';
import brave from './brave.js';
import exa from './exa.js';
import firecrawl from './firecrawl.js';
import keenable from './keenable.js';
import parallel from './parallel.js';
import perplexity from './perplexity.js';
import tavily from './tavily.js';

export const SEARCH_API_PROVIDERS = Object.freeze({
  tavily, brave, exa, firecrawl, perplexity, parallel, keenable
});

/** 除 Bing 与自定义服务（custom / custom:<id>）以外的内置 API 型提供方 id。 */
export const SEARCH_API_PROVIDER_IDS = Object.freeze(Object.keys(SEARCH_API_PROVIDERS));

export function isApiProvider(id) {
  return Object.hasOwn(SEARCH_API_PROVIDERS, String(id ?? ''));
}

/** config.js 的 webSearch 默认值：每家一个块，字段与 deepseek/zhipu 等既有内置项一致。 */
export function apiProviderConfigDefaults() {
  return Object.fromEntries(SEARCH_API_PROVIDER_IDS
    .map((id) => [id, { apiKey: '', ...SEARCH_API_PROVIDERS[id].defaults }]));
}

/**
 * 按 provider id 发一次搜索，返回 { query, results }（results 形状见 common.mapResults）。
 * webSearch 传整块 webSearch 配置：输出条数取 webSearch.maxResults，其余取 webSearch.<id>。
 */
export async function searchApiProvider(id, query, { webSearch = {}, fetchImpl } = {}) {
  const provider = SEARCH_API_PROVIDERS[id];
  if (!provider) throw new Error(`未知搜索服务：${id}`);
  const conf = { ...provider.defaults, ...(webSearch?.[id] ?? {}) };
  const apiKey = text(conf.apiKey) || text(process.env[provider.envKey]);
  if (!apiKey) throw new Error(`${provider.label} 搜索需要 API Key（设置里填，或环境变量 ${provider.envKey}）`);
  const limit = countOf(webSearch?.maxResults, 6, { max: 10 });
  const count = countOf(conf.count, limit);
  const { url, init } = provider.buildRequest({
    query,
    count,
    apiKey,
    conf,
    baseUrl: text(conf.baseUrl) || provider.defaults.baseUrl
  });
  const data = await requestJson({
    url, init, label: provider.label, fetchImpl,
    timeoutMs: timeoutOf(conf.timeoutMs, provider.defaults.timeoutMs)
  });
  const results = provider.parseResponse(data, limit);
  if (!results.length) throw new Error(`${provider.label} 搜索没有返回有效结果（检查 API Key 或接口地址）`);
  return { query, results };
}
