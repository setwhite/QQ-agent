// 搜索 API 提供方（Tavily / Brave / Exa / Firecrawl / Perplexity / Parallel / Keenable）：
// 请求形状、响应映射与错误口径。全部用 fetch 桩，不发真实请求。
import assert from 'node:assert/strict';
import {
  SEARCH_API_PROVIDERS,
  SEARCH_API_PROVIDER_IDS,
  apiProviderConfigDefaults,
  isApiProvider,
  searchApiProvider
} from '../src/search-providers/index.js';

let pass = 0;
let fail = 0;

async function test(name, fn) {
  try {
    await fn();
    pass++;
    console.log(`  PASS ${name}`);
  } catch (error) {
    fail++;
    console.error(`  FAIL ${name}: ${error.message}`);
  }
}

/** fetch 桩：记录请求，按给定响应回放。 */
function stubFetch(response = {}) {
  const captured = {};
  const fetchImpl = async (url, init = {}) => {
    captured.url = String(url);
    captured.init = init;
    return {
      ok: response.ok !== false,
      status: response.status ?? 200,
      text: async () => response.body ?? '',
      json: async () => {
        if (response.badJson) throw new Error('Unexpected token');
        return response.json ?? {};
      }
    };
  };
  fetchImpl.captured = captured;
  return fetchImpl;
}

const KEY = 'test-key';

/** 每家的最小配置：只换 baseUrl，其余取默认值。 */
function confOf(id, extra = {}) {
  return { [id]: { apiKey: KEY, ...extra } };
}

// ── 注册表 ──────────────────────────────────────────────────────────────

await test('注册表登记 7 家 API 提供方', () => {
  assert.deepEqual([...SEARCH_API_PROVIDER_IDS].sort(),
    ['brave', 'exa', 'firecrawl', 'keenable', 'parallel', 'perplexity', 'tavily']);
});

await test('isApiProvider 只认注册过的 id', () => {
  assert.equal(isApiProvider('tavily'), true);
  for (const other of ['bing', 'custom', 'custom:sp_1', 'metaso', '', undefined, null, 'toString']) {
    assert.equal(isApiProvider(other), false, String(other));
  }
});

await test('apiProviderConfigDefaults 给出与既有内置项同形的默认块', () => {
  const defaults = apiProviderConfigDefaults();
  for (const id of SEARCH_API_PROVIDER_IDS) {
    const block = defaults[id];
    assert.equal(block.apiKey, '');
    assert.match(block.baseUrl, /^https:\/\//);
    assert.equal(typeof block.count, 'number');
    assert.equal(typeof block.timeoutMs, 'number');
  }
});

// ── 请求形状 ────────────────────────────────────────────────────────────

const REQUEST_CASES = [
  {
    id: 'tavily',
    baseUrl: 'https://api.tavily.com/search',
    check: ({ url, headers, body, init }) => {
      assert.equal(url, 'https://api.tavily.com/search');
      assert.equal(init.method, 'POST');
      assert.equal(headers.authorization, `Bearer ${KEY}`);
      assert.deepEqual(body, { query: 'qq agent', max_results: 6 });
    }
  },
  {
    id: 'brave',
    baseUrl: 'https://api.search.brave.com/res/v1/web/search',
    check: ({ url, headers, body, init }) => {
      const parsed = new URL(url);
      assert.equal(parsed.origin + parsed.pathname, 'https://api.search.brave.com/res/v1/web/search');
      assert.equal(parsed.searchParams.get('q'), 'qq agent');
      assert.equal(parsed.searchParams.get('count'), '6');
      assert.equal(init.method, undefined);
      assert.equal(headers['x-subscription-token'], KEY);
      assert.equal(headers.accept, 'application/json');
      assert.equal(body, undefined);
    }
  },
  {
    id: 'exa',
    baseUrl: 'https://api.exa.ai/search',
    check: ({ url, headers, body, init }) => {
      assert.equal(url, 'https://api.exa.ai/search');
      assert.equal(init.method, 'POST');
      assert.equal(headers['x-api-key'], KEY);
      assert.deepEqual(body, {
        query: 'qq agent',
        numResults: 6,
        contents: { text: { maxCharacters: 300 } }
      });
    }
  },
  {
    id: 'firecrawl',
    baseUrl: 'https://api.firecrawl.dev/v2/search',
    check: ({ url, headers, body, init }) => {
      assert.equal(url, 'https://api.firecrawl.dev/v2/search');
      assert.equal(init.method, 'POST');
      assert.equal(headers.authorization, `Bearer ${KEY}`);
      assert.deepEqual(body, { query: 'qq agent', limit: 6, sources: ['web'] });
    }
  },
  {
    id: 'perplexity',
    baseUrl: 'https://api.perplexity.ai/search',
    check: ({ url, headers, body, init }) => {
      assert.equal(url, 'https://api.perplexity.ai/search');
      assert.equal(init.method, 'POST');
      assert.equal(headers.authorization, `Bearer ${KEY}`);
      assert.deepEqual(body, { query: 'qq agent', max_results: 6 });
    }
  },
  {
    id: 'parallel',
    baseUrl: 'https://api.parallel.ai/v1/search',
    check: ({ url, headers, body, init }) => {
      assert.equal(url, 'https://api.parallel.ai/v1/search');
      assert.equal(init.method, 'POST');
      assert.equal(headers['x-api-key'], KEY);
      // 没有顶层条数参数，条数走 advanced_settings.max_results
      assert.deepEqual(body, {
        mode: 'fast',
        search_queries: ['qq agent'],
        advanced_settings: { max_results: 6 }
      });
    }
  },
  {
    id: 'keenable',
    baseUrl: 'https://api.keenable.ai/v1/search',
    check: ({ url, headers, body, init }) => {
      assert.equal(url, 'https://api.keenable.ai/v1/search');
      assert.equal(init.method, 'POST');
      assert.equal(headers['x-api-key'], KEY);
      assert.deepEqual(body, { query: 'qq agent', max_results: 6 });
    }
  }
];

for (const item of REQUEST_CASES) {
  await test(`${item.id} 请求形状`, async () => {
    const fetchImpl = stubFetch({ json: {} });
    await searchApiProvider(item.id, 'qq agent', {
      webSearch: confOf(item.id, { baseUrl: item.baseUrl }),
      fetchImpl
    }).catch(() => {});
    const { url, init } = fetchImpl.captured;
    const headers = init.headers ?? {};
    item.check({
      url,
      init,
      headers,
      body: init.body === undefined ? undefined : JSON.parse(init.body)
    });
  });
}

// ── 响应映射 ────────────────────────────────────────────────────────────

const RESPONSE_CASES = [
  {
    id: 'tavily',
    json: {
      results: [
        { title: '  First  ', url: 'https://a.test/1', content: '  about\n\nthe first  ' },
        { title: 'no url', content: 'dropped' },
        { url: 'https://b.test/2', content: 'untitled' }
      ]
    }
  },
  {
    id: 'brave',
    json: {
      web: {
        results: [
          { title: 'First', url: 'https://a.test/1', description: 'brave snippet' },
          { title: 'no url', description: 'dropped' },
          { url: 'https://b.test/2', description: 'untitled' }
        ]
      }
    }
  },
  {
    id: 'exa',
    json: {
      results: [
        { title: 'First', url: 'https://a.test/1', text: 'exa text' },
        { url: 'https://b.test/2', summary: 'summary fallback' },
        { title: 'no url', text: 'dropped' }
      ]
    }
  },
  {
    id: 'firecrawl',
    json: {
      success: true,
      data: {
        web: [
          { title: 'First', url: 'https://a.test/1', description: 'firecrawl description' },
          { url: 'https://b.test/2', description: 'untitled' },
          { title: 'no url', description: 'dropped' }
        ]
      }
    }
  },
  {
    id: 'perplexity',
    json: {
      results: [
        { title: 'First', url: 'https://a.test/1', snippet: 'perplexity snippet' },
        { url: 'https://b.test/2', description: 'untitled' },
        { title: 'no url', snippet: 'dropped' }
      ]
    }
  },
  {
    id: 'parallel',
    json: {
      results: [
        { title: 'First', url: 'https://a.test/1', excerpts: ['hello', 'world'] },
        { url: 'https://b.test/2' },
        { title: 'no url', excerpts: ['dropped'] }
      ]
    }
  },
  {
    id: 'keenable',
    json: {
      results: [
        { title: 'First', url: 'https://a.test/1', snippet: 'long excerpt', description: 'short' },
        { title: 'Second', url: 'https://b.test/2', description: 'only description' },
        { title: 'no url', snippet: 'dropped' }
      ]
    }
  }
];

const EXPECTED_RESULTS = {
  tavily: [
    { title: 'First', url: 'https://a.test/1', snippet: 'about the first' },
    { title: 'https://b.test/2', url: 'https://b.test/2', snippet: 'untitled' }
  ],
  brave: [
    { title: 'First', url: 'https://a.test/1', snippet: 'brave snippet' },
    { title: 'https://b.test/2', url: 'https://b.test/2', snippet: 'untitled' }
  ],
  exa: [
    { title: 'First', url: 'https://a.test/1', snippet: 'exa text' },
    { title: 'https://b.test/2', url: 'https://b.test/2', snippet: 'summary fallback' }
  ],
  firecrawl: [
    { title: 'First', url: 'https://a.test/1', snippet: 'firecrawl description' },
    { title: 'https://b.test/2', url: 'https://b.test/2', snippet: 'untitled' }
  ],
  perplexity: [
    { title: 'First', url: 'https://a.test/1', snippet: 'perplexity snippet' },
    { title: 'https://b.test/2', url: 'https://b.test/2', snippet: 'untitled' }
  ],
  parallel: [
    { title: 'First', url: 'https://a.test/1', snippet: 'hello world' },
    { title: 'https://b.test/2', url: 'https://b.test/2', snippet: '' }
  ],
  keenable: [
    { title: 'First', url: 'https://a.test/1', snippet: 'long excerpt' },
    { title: 'Second', url: 'https://b.test/2', snippet: 'only description' }
  ]
};

for (const item of RESPONSE_CASES) {
  await test(`${item.id} 响应映射`, async () => {
    const fetchImpl = stubFetch({ json: item.json });
    const result = await searchApiProvider(item.id, 'qq agent', {
      webSearch: confOf(item.id),
      fetchImpl
    });
    assert.deepEqual(result, { query: 'qq agent', results: EXPECTED_RESULTS[item.id] });
  });
}

await test('exa 缺 text 时回退 summary、两者都缺时摘要为空', async () => {
  const fetchImpl = stubFetch({
    json: { results: [{ title: 'A', url: 'https://a.test/1' }] }
  });
  const result = await searchApiProvider('exa', 'q', { webSearch: confOf('exa'), fetchImpl });
  assert.deepEqual(result.results, [{ title: 'A', url: 'https://a.test/1', snippet: '' }]);
});

await test('firecrawl 200 + success:false 报错而不当空结果', async () => {
  const fetchImpl = stubFetch({ json: { success: false, error: 'Insufficient credits' } });
  await assert.rejects(
    () => searchApiProvider('firecrawl', 'q', { webSearch: confOf('firecrawl'), fetchImpl }),
    /Firecrawl 搜索失败：Insufficient credits/
  );
});

// ── 取数口径 ────────────────────────────────────────────────────────────

await test('输出条数取 webSearch.maxResults', async () => {
  const fetchImpl = stubFetch({
    json: {
      results: [
        { title: 'A', url: 'https://a.test/1', content: '1' },
        { title: 'B', url: 'https://a.test/2', content: '2' },
        { title: 'C', url: 'https://a.test/3', content: '3' }
      ]
    }
  });
  const result = await searchApiProvider('tavily', 'q', {
    webSearch: { maxResults: 2, ...confOf('tavily') },
    fetchImpl
  });
  assert.equal(result.results.length, 2);
});

await test('config 里的 apiKey 优先于环境变量', async () => {
  const envKey = SEARCH_API_PROVIDERS.tavily.envKey;
  const saved = process.env[envKey];
  process.env[envKey] = 'env-key';
  try {
    const fetchImpl = stubFetch({ json: { results: [] } });
    await searchApiProvider('tavily', 'q', { webSearch: confOf('tavily'), fetchImpl }).catch(() => {});
    assert.equal(fetchImpl.captured.init.headers.authorization, `Bearer ${KEY}`);
  } finally {
    if (saved === undefined) delete process.env[envKey];
    else process.env[envKey] = saved;
  }
});

await test('config 没填 Key 时回退环境变量', async () => {
  const envKey = SEARCH_API_PROVIDERS.brave.envKey;
  const saved = process.env[envKey];
  process.env[envKey] = 'env-brave';
  try {
    const fetchImpl = stubFetch({ json: { web: { results: [] } } });
    await searchApiProvider('brave', 'q', { webSearch: {}, fetchImpl }).catch(() => {});
    assert.equal(fetchImpl.captured.init.headers['x-subscription-token'], 'env-brave');
  } finally {
    if (saved === undefined) delete process.env[envKey];
    else process.env[envKey] = saved;
  }
});

await test('缺 Key 时报错并写明环境变量名', async () => {
  const envKey = SEARCH_API_PROVIDERS.keenable.envKey;
  const saved = process.env[envKey];
  delete process.env[envKey];
  try {
    await assert.rejects(
      () => searchApiProvider('keenable', 'q', { webSearch: { keenable: { apiKey: '' } } }),
      new RegExp(`Keenable 搜索需要 API Key（设置里填，或环境变量 ${envKey}）`)
    );
  } finally {
    if (saved !== undefined) process.env[envKey] = saved;
  }
});

await test('自定义 baseUrl 生效（自建网关/测试桩）', async () => {
  const fetchImpl = stubFetch({ json: { results: [{ title: 'A', url: 'https://a.test/1' }] } });
  await searchApiProvider('perplexity', 'q', {
    webSearch: confOf('perplexity', { baseUrl: 'https://gateway.test/search' }),
    fetchImpl
  });
  assert.equal(fetchImpl.captured.url, 'https://gateway.test/search');
});

await test('HTTP 失败带状态码与响应片段', async () => {
  const fetchImpl = stubFetch({ ok: false, status: 401, body: '{"error":"bad key"}' });
  await assert.rejects(
    () => searchApiProvider('tavily', 'q', { webSearch: confOf('tavily'), fetchImpl }),
    /Tavily 搜索 HTTP 401：\{"error":"bad key"\}/
  );
});

await test('响应不是 JSON 时报错', async () => {
  const fetchImpl = stubFetch({ badJson: true });
  await assert.rejects(
    () => searchApiProvider('exa', 'q', { webSearch: confOf('exa'), fetchImpl }),
    /Exa 搜索返回了无法解析的 JSON/
  );
});

await test('没有有效结果时报错', async () => {
  const fetchImpl = stubFetch({ json: { results: [{ title: 'no url' }] } });
  await assert.rejects(
    () => searchApiProvider('tavily', 'q', { webSearch: confOf('tavily'), fetchImpl }),
    /Tavily 搜索没有返回有效结果/
  );
});

await test('未知 provider id 直接报错', async () => {
  await assert.rejects(() => searchApiProvider('bing', 'q'), /未知搜索服务：bing/);
});

if (fail) {
  console.error(`失败 ${fail} 项，通过 ${pass} 项`);
  process.exit(1);
}
console.log(`全部 ${pass} 项通过`);
