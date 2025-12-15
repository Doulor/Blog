// Cloudflare Worker for GitHub OAuth Authentication and GitHub API Proxy

export default {
  async fetch(request, env, ctx) {
    // 从环境变量获取配置
    const CLIENT_ID = env.GITHUB_CLIENT_ID;
    const CLIENT_SECRET = env.GITHUB_CLIENT_SECRET;
    const REDIRECT_URI = env.GITHUB_REDIRECT_URI || `${new URL(request.url).origin}/callback`;

    if (!CLIENT_ID || !CLIENT_SECRET) {
      return new Response('Missing GitHub OAuth credentials. Please configure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // 处理CORS预检请求
    if (method === 'OPTIONS') {
      return handleOptions(request);
    }

    // 处理认证相关路由
    if (path === '/api/auth') {
      if (method === 'GET') {
        return handleAuthRequest(url, CLIENT_ID, REDIRECT_URI);
      }
    } else if (path === '/callback') {
      if (method === 'GET') {
        return handleCallback(request, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
      }
    } else if (path.startsWith('/api/github')) {
      // 代理GitHub API请求
      return handleGitHubAPI(request, env);
    } else if (path === '/api/test') {
      // 测试端点
      return new Response(JSON.stringify({
        message: 'Worker is running!',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 根路径返回帮助信息
    if (path === '/') {
      return new Response(`
        <h1>GitHub OAuth Worker</h1>
        <ul>
          <li><strong>GET /api/auth</strong> - Initiate GitHub OAuth flow</li>
          <li><strong>GET /callback</strong> - GitHub OAuth callback endpoint</li>
          <li><strong>GET/POST/PUT/DELETE /api/github/*</strong> - GitHub API proxy</li>
          <li><strong>GET /api/test</strong> - Test endpoint</li>
        </ul>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // 默认响应
    return new Response('Not Found', { status: 404 });
  }
};

// 处理认证请求 - 重定向到GitHub授权页面
function handleAuthRequest(url, clientId, redirectUri) {
  // 检查是否提供了前端回调URL
  let frontendCallback = url.searchParams.get('callback');
  if (!frontendCallback) {
    // 默认回调到前端认证回调页面
    frontendCallback = 'https://blog.firef.dpdns.org/auth-callback.html';
  }

  // 保存前端回调URL到state参数，以便在认证完成后重定向回去
  const state = btoa(JSON.stringify({
    callback: frontendCallback,
    timestamp: Date.now(),
    nonce: Math.random().toString(36).substring(2, 15) // 额外的安全措施
  }));

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', clientId);
  githubAuthUrl.searchParams.set('redirect_uri', redirectUri);
  githubAuthUrl.searchParams.set('scope', 'repo,user'); // 根据需要调整权限
  githubAuthUrl.searchParams.set('state', state); // 用于防止CSRF攻击并传递回调信息

  return Response.redirect(githubAuthUrl.toString(), 302);
}

// 处理GitHub回调 - 交换授权码为访问令牌
async function handleCallback(request, clientId, clientSecret, redirectUri) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  if (error) {
    console.error('OAuth Error:', error, errorDescription);

    // 创建错误页面
    const errorPage = `
      <html>
        <head><title>Authentication Failed</title></head>
        <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h1 style="color: #d32f2f;">Authentication Failed</h1>
          <p><strong>Error:</strong> ${error}</p>
          ${errorDescription ? `<p><strong>Description:</strong> ${errorDescription}</p>` : ''}
          <p>Please try again or contact the site administrator.</p>
          <a href="/" style="color: #1976d2; text-decoration: none; margin-top: 20px; display: inline-block;">Go Back</a>
        </body>
      </html>
    `;

    return new Response(errorPage, {
      headers: { 'Content-Type': 'text/html' },
      status: 400
    });
  }

  if (!code) {
    const errorPage = `
      <html>
        <head><title>No Authorization Code</title></head>
        <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h1 style="color: #d32f2f;">No Authorization Code</h1>
          <p>No authorization code was provided in the callback.</p>
          <a href="/" style="color: #1976d2; text-decoration: none; margin-top: 20px; display: inline-block;">Go Back</a>
        </body>
      </html>
    `;

    return new Response(errorPage, {
      headers: { 'Content-Type': 'text/html' },
      status: 400
    });
  }

  try {
    // 交换授权码获取访问令牌
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorData}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('No access token received from GitHub');
    }

    // 验证令牌并获取用户信息
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Cloudflare-Worker-GitHub-OAuth'
      }
    });

    if (!userResponse.ok) {
      throw new Error(`User info request failed: ${userResponse.status} - ${await userResponse.text()}`);
    }

    const userData = await userResponse.json();
    console.log('Successfully authenticated user:', userData.login);

    // 解析state参数获取前端回调URL
    let frontendCallback = 'https://blog.firef.dpdns.org/auth-callback.html'; // 默认回调URL

    if (state) {
      try {
        const stateData = JSON.parse(atob(state));
        if (stateData && stateData.callback && typeof stateData.callback === 'string' && stateData.callback.startsWith('http')) {
          frontendCallback = stateData.callback;
        }
      } catch (e) {
        console.warn('Could not parse state parameter:', e);
        // 使用默认回调URL
      }
    }

    // 构建最终回调URL，将令牌和其他用户信息作为URL参数传递
    const callbackUrl = new URL(frontendCallback);
    callbackUrl.searchParams.set('access_token', accessToken);
    callbackUrl.searchParams.set('username', userData.login);
    callbackUrl.searchParams.set('avatar_url', userData.avatar_url || '');
    callbackUrl.searchParams.set('name', userData.name || userData.login);
    callbackUrl.searchParams.set('token_type', 'Bearer');

    console.log(`Redirecting to frontend callback: ${callbackUrl.toString()}`);
    return Response.redirect(callbackUrl.toString(), 302);

  } catch (error) {
    console.error('OAuth callback error:', error);

    const errorPage = `
      <html>
        <head><title>Authentication Error</title></head>
        <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h1 style="color: #d32f2f;">Authentication Error</h1>
          <p>${error.message}</p>
          <a href="/" style="color: #1976d2; text-decoration: none; margin-top: 20px; display: inline-block;">Go Back</a>
        </body>
      </html>
    `;

    return new Response(errorPage, {
      headers: { 'Content-Type': 'text/html' },
      status: 500
    });
  }
}

// 处理GitHub API代理请求
async function handleGitHubAPI(request, env) {
  const originalUrl = new URL(request.url);

  // 从请求URL构建GitHub API URL，去掉我们的前缀
  const githubApiPath = originalUrl.pathname.replace('/api/github', '');
  const githubUrl = `https://api.github.com${githubApiPath}${originalUrl.search}`;

  // 从请求头获取访问令牌
  let accessToken = null;

  // 尝试从Authorization头获取
  const authHeader = request.headers.get('Authorization');
  if (authHeader && (authHeader.startsWith('Bearer ') || authHeader.startsWith('token '))) {
    accessToken = authHeader.split(' ')[1];
  }

  if (!accessToken) {
    return new Response(JSON.stringify({
      error: 'No access token provided in Authorization header',
      message: 'Please provide a valid GitHub access token in the Authorization header (format: "Bearer <token>" or "token <token>")'
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  // 验证令牌有效性
  try {
    const validateResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Cloudflare-Worker-GitHub-Proxy'
      }
    });

    if (!validateResponse.ok) {
      return new Response(JSON.stringify({
        error: 'Invalid or expired access token',
        status: validateResponse.status
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Token validation failed',
      details: error.message
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }

  // 构建GitHub API请求
  const githubRequest = new Request(githubUrl, {
    method: request.method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': 'Cloudflare-Worker-GitHub-Proxy',
      'Accept': request.headers.get('Accept') || 'application/vnd.github.v3+json',
      'Content-Type': request.headers.get('Content-Type') || 'application/json',
    },
    body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.text() : null
  });

  try {
    const response = await fetch(githubRequest);

    // 创建响应副本，以便我们可以添加CORS头
    const modifiedResponse = new Response(response.body, response);
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
    modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    modifiedResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return modifiedResponse;
  } catch (error) {
    console.error('GitHub API proxy error:', error);
    return new Response(JSON.stringify({
      error: 'GitHub API request failed',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
}

// 处理CORS预检请求
function handleOptions(request) {
  // 跨域预检请求处理
  if (request.headers.get('Origin') !== null &&
      request.headers.get('Access-Control-Request-Method') !== null &&
      request.headers.get('Access-Control-Request-Headers') !== null) {

    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400' // 24小时
      },
    });
  } else {
    // 简单的OPTIONS请求
    return new Response(null, {
      headers: {
        Allow: 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
      },
    });
  }
}