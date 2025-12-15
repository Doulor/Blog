/**
 * Cloudflare Worker to handle Decap CMS Proxy
 * 
 * Environment Variables needed:
 * - GITHUB_CLIENT_ID: Your GitHub OAuth App Client ID
 * - GITHUB_CLIENT_SECRET: Your GitHub OAuth App Client Secret
 * - REPO_FULL_NAME: GitHub repository in format 'username/repo'
 */

// 配置常量
const GITHUB_API_BASE = 'https://api.github.com';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // API Gateway 端点用于处理 CMS 请求
  if (url.pathname.startsWith('/api/gateway')) {
    return handleProxyRequest(request);
  }
  
  // OAuth 回调端点
  if (url.pathname === '/api/callback') {
    return handleOAuthCallback(request);
  }
  
  // 如果是其他请求，返回错误
  return new Response('Not Found', { status: 404 });
}

async function handleOAuthFlow(request) {
  const originalUrl = new URL(request.url);
  const oauthUrl = new URL('https://github.com/login/oauth/authorize');
  oauthUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
  oauthUrl.searchParams.set('redirect_uri', `${originalUrl.origin}/api/callback`);
  oauthUrl.searchParams.set('scope', 'repo');
  
  return Response.redirect(oauthUrl.toString());
}

async function handleProxyRequest(request) {
  // 检查是否已经有认证信息
  const token = await getAccessToken();
  if (!token) {
    // 如果没有访问令牌，启动 OAuth 流程
    return handleOAuthFlow(request);
  }

  try {
    // 获取请求路径（去掉 /api/gateway 前缀）
    const originalUrl = new URL(request.url);
    let path = originalUrl.pathname.replace('/api/gateway', '');
    
    // 确保路径以 / 开头
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
    
    // 检查响应是否为认证错误
    if (response.status === 401) {
      // 令牌可能已过期，清除它并重新开始 OAuth 流程
      await clearAccessToken();
      return handleOAuthFlow(request);
    }
    
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

    // 将访问令牌存储在 KV 或通过其他方式管理（这里简化处理）
    // 在实际应用中，您可能需要使用 KV 或其他存储
    // 目前我们将在重定向 URL 中包含令牌参数
    
    // 将用户重定向回 CMS 管理界面，带有访问令牌
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Authentication Successful</title>
      </head>
      <body>
        <h1>Authentication Successful</h1>
        <p>Redirecting back to CMS...</p>
        <script>
          // 将令牌存储在本地存储中
          localStorage.setItem('decap-cms-user', JSON.stringify({
            backend_token: '${accessToken}'
          }));
          
          // 重定向回 CMS 管理界面
          window.location = 'https://blog.firef.dpdns.org/admin/';
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

// 简化版的令牌管理函数
// 在实际部署中，您应该使用 Cloudflare Workers KV 来存储令牌
async function getAccessToken() {
  // 此实现简化了令牌获取，实际应用中需要适当的令牌存储和管理
  console.log('Note: This is a simplified implementation. In production, use Cloudflare Workers KV for token storage.');
  // 这里我们返回一个占位符; 实际上需要从持久存储中获取
  return null; // 为了测试，我们强制执行 OAuth 流程
}

async function clearAccessToken() {
  // 简化实现
  console.log('Clearing access token');
}