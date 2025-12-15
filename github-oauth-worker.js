/**
 * Cloudflare Worker to handle Decap CMS Proxy for GitHub
 * 
 * Environment Variables needed:
 * - GITHUB_CLIENT_ID: Your GitHub OAuth App Client ID
 * - GITHUB_CLIENT_SECRET: Your GitHub OAuth App Client Secret
 */

// 配置常量
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_AUTH_BASE = 'https://github.com';

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

async function handleProxyRequest(request) {
  try {
    // 获取请求路径（去掉 /api/gateway 前缀）
    const originalUrl = new URL(request.url);
    let path = originalUrl.pathname.replace('/api/gateway', '');
    
    // 确保路径以 / 开头
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    // 检查是否已经有认证信息（从请求头中获取）
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 如果没有认证头，重定向到 OAuth 流程
      const oauthUrl = new URL(`${GITHUB_AUTH_BASE}/login/oauth/authorize`);
      oauthUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
      oauthUrl.searchParams.set('redirect_uri', `${originalUrl.origin}/api/callback`);
      oauthUrl.searchParams.set('scope', 'repo,user:email');
      
      return Response.redirect(oauthUrl.toString());
    }
    
    // 构建 GitHub API 请求 URL
    let githubApiUrl = GITHUB_API_BASE + path;
    
    // 代理请求到 GitHub API
    const githubRequest = new Request(githubApiUrl, {
      method: request.method,
      headers: {
        'Authorization': authHeader,
        'User-Agent': 'Decap-CMS-Proxy',
        'Accept': 'application/vnd.github.v3+json',
        ...(request.method !== 'GET' ? {'Content-Type': 'application/json'} : {})
      },
      body: request.body
    });
    
    const response = await fetch(githubRequest);
    
    // 检查响应是否为认证错误
    if (response.status === 401) {
      // 如果认证失败，重定向到 OAuth 流程
      const oauthUrl = new URL(`${GITHUB_AUTH_BASE}/login/oauth/authorize`);
      oauthUrl.searchParams.set('client_id', GITHUB_CLIENT_ID);
      oauthUrl.searchParams.set('redirect_uri', `${originalUrl.origin}/api/callback`);
      oauthUrl.searchParams.set('scope', 'repo,user:email');
      
      return Response.redirect(oauthUrl.toString());
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

    // 将用户重定向回 CMS 管理界面，带有访问令牌
    // 这里我们创建一个 HTML 页面来设置令牌并重定向
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
          
          // 清除任何可能的旧认证状态
          localStorage.removeItem('netlify-cms-user');
          
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