/**
 * GitHub OAuth 令牌交换中转（Pages Function）
 *
 * 为什么需要它：GitHub 的令牌接口（login/oauth/access_token）不给浏览器发
 * Access-Control-Allow-Origin，纯前端 fetch 会被 CORS 拦死（已实测确认）。
 *
 * 安全设计：
 *   - client_secret 只存在 Pages 环境变量里，永远不下发给浏览器；
 *   - PKCE 的 code_verifier 由浏览器生成并在 sessionStorage 校验，防止 code 被截获；
 *   - state 校验在浏览器端完成，这里不参与。
 *
 * 环境变量（用 wrangler 或 Pages 仪表盘配置，不要写进仓库）：
 *   GITHUB_CLIENT_SECRET  OAuth App 的 Client Secret
 *
 * 路由：POST /api/github-exchange
 * 请求体：{ client_id, code, code_verifier, redirect_uri }
 */

const TOKEN_URL = 'https://github.com/login/oauth/access_token';

export async function onRequestPost(context) {
  const { request, env } = context;

  const clientSecret = env?.GITHUB_CLIENT_SECRET;
  if (!clientSecret) {
    return json({ error: '服务端未配置 GITHUB_CLIENT_SECRET' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求体必须是 JSON' }, 400);
  }

  const { client_id, code, code_verifier, redirect_uri } = body || {};
  if (!client_id || !code || !code_verifier) {
    return json({ error: '缺少 client_id / code / code_verifier' }, 400);
  }

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id,
      client_secret: clientSecret,
      code,
      code_verifier,
      redirect_uri,
    }),
  });

  // 原样透回：GitHub 的错误体也带 error/error_description，客户端已有解析逻辑
  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
