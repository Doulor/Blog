/**
 * Cloudflare Worker to handle GitHub OAuth for Decap CMS
 *
 * Environment Variables needed:
 * - GITHUB_CLIENT_ID: Your GitHub OAuth App Client ID
 * - GITHUB_CLIENT_SECRET: Your GitHub OAuth App Client Secret
 */

// 配置常量
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_AUTH_BASE = 'https://github.com';

// 存储令牌的简单实现（在实际部署中，您应该使用 KV 存储）
let tempTokenStore = {};

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // OAuth 回调端点
  if (url.pathname === '/api/callback') {
    return handleOAuthCallback(request);
  }

  // API Gateway 端点用于处理 CMS 请求
  if (url.pathname.startsWith('/api/gateway')) {
    return handleProxyRequest(request);
  }

  // 如果是其他请求，返回错误
  return new Response('Not Found', { status: 404 });
}

async function handleProxyRequest(request) {
  try {
    // 从 URL 参数或请求头获取令牌
    const originalUrl = new URL(request.url);
    const token = originalUrl.searchParams.get('token') || request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      // 如果没有令牌，返回需要认证的响应
      return new Response(JSON.stringify({
        error: 'Authentication required',
        redirect: `${GITHUB_AUTH_BASE}/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${originalUrl.origin}/api/callback&scope=repo`
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 获取请求路径（去掉 /api/gateway 前缀）
    let path = originalUrl.pathname.replace('/api/gateway', '');
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    // 构建 GitHub API 请求 URL
    const githubApiUrl = GITHUB_API_BASE + path;

    // 代理请求到 GitHub API
    const githubRequest = new Request(githubApiUrl, {
      method: request.method,
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Decap-CMS-Proxy',
        'Accept': 'application/vnd.github.v3+json',
        ...(request.method !== 'GET' ? {'Content-Type': 'application/json'} : {})
      },
      body: request.body
    });

    const response = await fetch(githubRequest);
    return response;

  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleOAuthCallback(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Authorization code not provided', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  try {
    // 使用授权码交换访问令牌
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: url.origin + '/api/callback'
      })
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return new Response('Failed to obtain access token', {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 将用户重定向回 CMS 管理界面，带有访问令牌的 URL 参数
    const redirectUrl = `https://blog.firef.dpdns.org/admin/#access_token=${accessToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Authentication Successful</title>
      </head>
      <body>
        <h1>Authentication Successful</h1>
        <p>Setting up your session and redirecting...</p>
        <script>
          // 将令牌存储在本地存储中，模拟 Decap CMS 存储格式
          localStorage.setItem('decap-cms-user', JSON.stringify({
            backend_token: '${accessToken}'
          }));

          // 重定向回 CMS 管理界面
          window.location = '${redirectUrl}';
        </script>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response('Authentication failed', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}