/**
 * 简化的 Cloudflare Worker GitHub OAuth 处理器
 * 专注于最小化的 OAuth 代理功能
 */

// GitHub API 基础 URL
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_AUTH_BASE = 'https://github.com';

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // OAuth 回调端点 - 处理 GitHub 授权码
  if (url.pathname === '/api/callback') {
    return handleOAuthCallback(request);
  }
  
  // 代理请求到 GitHub API
  if (url.pathname.startsWith('/api/proxy/')) {
    return handleProxyRequest(request);
  }
  
  // 如果是其他请求，返回错误
  return new Response('Not Found', { status: 404 });
}

async function handleProxyRequest(request) {
  // 检查认证令牌
  const token = getAuthToken(request);
  if (!token) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // 构造转发到 GitHub 的请求
    const path = new URL(request.url).pathname.replace('/api/proxy/', '/');
    const githubUrl = GITHUB_API_BASE + path;
    
    const githubRequest = new Request(githubUrl, {
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleOAuthCallback(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  
  // 如果有错误参数，显示错误
  if (error) {
    const errorDescription = url.searchParams.get('error_description') || 'OAuth 认证失败';
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>认证失败</title>
        <style>body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }</style>
      </head>
      <body>
        <h1>❌ 认证失败</h1>
        <p>${errorDescription}</p>
        <p><a href="/">返回首页</a></p>
      </body>
      </html>
    `, {
      status: 400,
      headers: { 'Content-Type': 'text/html' }
    });
  }
  
  // 如果没有授权码，返回错误
  if (!code) {
    return new Response('Missing authorization code', { status: 400 });
  }
  
  try {
    // 向 GitHub 服务器请求访问令牌
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

    if (!tokenResponse.ok) {
      throw new Error(`GitHub token request failed: ${await tokenResponse.text()}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      throw new Error('Failed to obtain access token');
    }

    // 返回一个页面，用 JS 将令牌存储到 localStorage 并跳转
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>认证成功</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f0f8ff; }
          .container { max-width: 500px; margin: 0 auto; padding: 30px; background: white; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✓ 认证成功！</div>
          <h2>GitHub 账户认证完成</h2>
          <p>正在存储令牌并跳转...</p>
        </div>
        <script>
          // 存储令牌
          const tokenObj = {
            backend_token: '${accessToken}',
            name: 'GitHub User',
            login: 'github-user',
            avatar_url: '',
            exp: Date.now() + (60 * 60 * 1000) // 1小时后过期
          };
          
          localStorage.setItem('decap-cms-user', JSON.stringify(tokenObj));
          console.log('Token stored successfully');
          
          // 跳转到内容编辑器
          window.location = 'https://blog.firef.dpdns.org/my-editor/';
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>认证失败</title>
        <style>body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }</style>
      </head>
      <body>
        <h1>❌ 认证失败</h1>
        <p>Error: ${error.message}</p>
        <p><a href="/">返回首页</a></p>
      </body>
      </html>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// 从请求中提取认证令牌
function getAuthToken(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || 
                request.headers.get('Authorization')?.replace('Bearer ', '') ||
                request.headers.get('Authorization')?.replace('token ', '');
  return token;
}