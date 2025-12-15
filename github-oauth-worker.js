/**
 * Cloudflare Worker to handle GitHub OAuth for Decap CMS
 * 
 * Environment Variables needed:
 * - GITHUB_CLIENT_ID: Your GitHub OAuth App Client ID
 * - GITHUB_CLIENT_SECRET: Your GitHub OAuth App Client Secret
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  try {
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
  } catch (error) {
    console.error('Request handler error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

async function handleProxyRequest(request) {
  try {
    // 从 URL 参数或请求头获取令牌
    const originalUrl = new URL(request.url);
    const token = originalUrl.searchParams.get('token') || 
                  request.headers.get('authorization')?.replace('Bearer ', '') ||
                  (request.headers.get('authorization')?.startsWith('token ') ? 
                   request.headers.get('authorization').substring(6) : null);
    
    if (!token) {
      // 如果没有令牌，返回需要认证的响应
      return new Response(JSON.stringify({
        error: 'Authentication required',
        message: 'Please authenticate with GitHub first'
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
    const githubApiUrl = 'https://api.github.com' + path;
    
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
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    
    if (!code) {
      return new Response('Authorization code not provided', { 
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

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

    if (!tokenResponse.ok) {
      console.error('Token response not OK:', tokenResponse.status, await tokenResponse.text());
      return new Response('Failed to obtain access token', { 
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('No access token in response:', tokenData);
      return new Response('Failed to obtain access token', { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 将用户重定向回 CMS 管理界面，带有访问令牌的 URL 参数
    const redirectUrl = `https://blog.firef.dpdns.org/admin/#access_token=${accessToken}`;
    const editorUrl = `https://blog.firef.dpdns.org/my-editor/`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Authentication Successful</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 20px; background-color: #f0f8ff; }
          .container { max-width: 500px; margin: 0 auto; padding: 30px; background: white; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
          .message { margin: 20px 0; }
          .redirect-link { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
          .token-display { font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 15px 0; word-break: break-all; font-size: 0.8em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✓ 认证成功！</div>
          <h2>GitHub 账户认证完成</h2>
          <div class="message">
            <p>您的访问令牌已安全存储</p>
            <div class="token-display">令牌已获取并存储到浏览器</div>
            <p>即将跳转到内容管理界面...</p>
            <div>
              <a href="${editorUrl}" class="redirect-link">直接进入编辑器</a>
              <a href="${redirectUrl}" class="redirect-link">进入管理面板</a>
            </div>
          </div>
        </div>
        <script>
          // 将令牌存储在本地存储中，使用正确的 Decap CMS 格式
          const tokenObj = {
            backend_token: '${accessToken}',
            name: 'GitHub User',
            login: 'github-user',
            avatar_url: '',
            exp: Date.now() + (60 * 60 * 1000) // 1小时后过期
          };

          // 存储到 localStorage
          localStorage.setItem('decap-cms-user', JSON.stringify(tokenObj));
          localStorage.setItem('netlify-cms-user', JSON.stringify(tokenObj)); // 兼容性处理

          console.log('Token stored for user:', tokenObj.name);
          console.log('Access token (first 10 chars):', '${accessToken}'.substring(0, 10));

          // 添加延迟以显示成功消息
          setTimeout(function() {
            window.location = '${editorUrl}'; // 直接跳转到编辑器，避免admin页面的问题
          }, 2000); // 2秒后跳转
        </script>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    return new Response('Authentication failed: ' + error.message, { 
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}