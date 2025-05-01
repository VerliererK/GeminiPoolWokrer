const GEMINI_URL = 'https://generativelanguage.googleapis.com';

async function createGeminiResponse(url, method, headers, body, apikey) {
  const gHeaders = { 'Content-Type': headers.get('Content-Type') };
  if (url.pathname.startsWith('/v1beta/openai')) {
    gHeaders['Authorization'] = `Bearer ${apikey}`;
  } else {
    url.searchParams.set('key', apikey);
  }
  const request = new Request(url, { method, headers: gHeaders, body });

  try {
    const response = await fetch(request);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    return new Response('Failed to fetch Gemini API', { status: 502 });
  }
}

function maskApiKey(apikey, count = 6) {
  return `${apikey.slice(0, count)}***${apikey.slice(-count)}`;
}

async function getApiKeyUsage(env, apikey) {
  const key = `apikey:usage:${maskApiKey(apikey)}`;
  const usage = await env.KV_BINDING.get(key, { type: 'json' });
  return usage || { count: 0, lastUsed: 0 };
}

async function updateApiKeyUsage(env, apikey) {
  const key = `apikey:usage:${maskApiKey(apikey)}`;
  const usage = await getApiKeyUsage(env, apikey);
  usage.count += 1;
  usage.lastUsed = Date.now();
  await env.KV_BINDING.put(key, JSON.stringify(usage));
}

async function getSortedApiKeys(env, apiKeys) {
  const usages = await Promise.all(apiKeys.map(async (apikey) => {
    const usage = await getApiKeyUsage(env, apikey);
    return { apikey, count: usage.count, lastUsed: usage.lastUsed };
  }));
  usages.sort((a, b) => {
    if (a.count !== b.count) {
      return a.count - b.count;
    } else {
      return a.lastUsed - b.lastUsed;
    }
  });
  return usages.map(item => item.apikey);
}

export default {
  async fetch(request, env, ctx) {
    const { pathname, search, searchParams } = new URL(request.url);
    if (pathname === '/') {
      return new Response('Hello World!');
    }

    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '') || (searchParams.get('key') || request.headers.get('x-goog-api-key'));
    const validApiKey = env.VALID_API_KEY;
    if (apiKey !== validApiKey) {
      return new Response('Unauthorized: Invalid API Key', { status: 401 });
    }

    const url = new URL(GEMINI_URL);
    url.pathname = pathname;
    url.search = search;

    const { method, headers } = request;
    let body = null;
    if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method.toUpperCase())) {
      body = await request.arrayBuffer();
    }

    const API_KEYS = env.API_KEYS?.split(',').map(key => key.trim()).filter(key => key.length > 0);
    if (!API_KEYS || API_KEYS.length === 0) {
      return new Response('No API keys available', { status: 500 });
    }
    const apiKeys = await getSortedApiKeys(env, API_KEYS);

    try {
      const maxAttempts = apiKeys.length;
      let response = null;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const apikey = apiKeys[attempt];
        console.log(`Attempt ${attempt + 1}/${maxAttempts}: ${method} ${pathname} with API Key ${maskApiKey(apikey)}`);

        response = await createGeminiResponse(url, method, headers, body, apikey);
        if (response.status === 429) continue;

        await updateApiKeyUsage(env, apikey);
        break;
      }
      return response;
    } catch (error) {
      console.error("Internal Server Error:", error);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
