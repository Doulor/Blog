/**
 * GitHub OAuth Worker - 统一入口
 * 现在支持 /api/auth 作为认证入口点
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event));
});

async function handleRequest(event) {
  const request = event.request;
  const url = new URL(request.url);
  
  // 处理 OAuth 认证入口点
  if (url.pathname === '/api/auth') {
    // 构造 GitHub 授权 URL 并重定向
    const redirectUri = 'https://eblog.firef.dpdns.org/api/callback';
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=repo`;
    
    // 简单地重定向到 GitHub
    return Response.redirect(authUrl, 302);
  }
  
  // 处理 OAuth 回调
  if (url.pathname === '/api/callback') {
    return handleOAuthCallback(request);
  }
  
  // 处理 API 代理请求
  if (url.pathname === '/api/github') {
    return handleGitHubAPIProxy(request);
  }
  
  // 默认：返回错误
  return new Response('Not Found', { status: 404 });
}

async function handleOAuthCallback(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  
  // 检查是否有错误
  if (error) {
    const errorMsg = url.searchParams.get('error_description') || 'GitHub 认证失败';
    return new Response(
      `<!DOCTYPE html>
       <html>
         <head><title>认证失败</title></head>
         <body><h1>❌ ${errorMsg}</h1><p><a href="/">返回</a></p></body>
       </html>`, 
       { status: 400, headers: { 'Content-Type': 'text/html' } }
    );
  }
  
  // 检查是否有 code
  if (!code) {
    return new Response('Missing authorization code', { status: 400 });
  }
  
  try {
    // 交换授权码为访问令牌
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
        redirect_uri: 'https://eblog.firef.dpdns.org/api/callback'
      })
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${await tokenResponse.text()}`);
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    
    if (!accessToken) {
      throw new Error('No access token in response');
    }
    
    // 成功获得令牌，返回页面存储令牌并跳转
    return new Response(
      `<!DOCTYPE html>
       <html>
         <head>
           <title>认证成功</title>
           <style>
             body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f0f8ff; }
             .container { max-width: 500px; margin: 0 auto; padding: 30px; background: white; border-radius: 10px; }
           </style>
         </head>
         <body>
           <div class="container">
             <h1 style="color: #28a745;">✓ 认证成功！</h1>
             <p>令牌已存储，正在跳转...</p>
           </div>
           <script>
             // 存储令牌到本地存储
             const tokenData = {
               backend_token: '${accessToken}',
               name: 'GitHub User',
               login: 'github-user',
               exp: Date.now() + (60 * 60 * 1000) // 1小时后过期
             };
             
             localStorage.setItem('decap-cms-user', JSON.stringify(tokenData));
             console.log('Token stored successfully');
             
             // 跳转到编辑器
             setTimeout(() => {
               window.location.href = 'https://blog.firef.dpdns.org/my-editor/';
             }, 1000);
           </script>
         </body>
       </html>`, 
       { headers: { 'Content-Type': 'text/html' } }
    );
    
  } catch (error) {
    return new Response(
      `<!DOCTYPE html>
       <html>
         <head><title>认证失败</title></head>
         <body><h1>❌ 认证失败</h1><p>${error.message}</p></body>
       </html>`, 
       { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

async function handleGitHubAPIProxy(request) {
  // 提取访问令牌
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Authentication required', { status: 401 });
  }
  
  const token = authHeader.substring(7); // 移除 'Bearer ' 前缀
  
  try {
    // 获取请求路径
    const originalUrl = new URL(request.url);
    const path = originalUrl.pathname.replace('/api/github', '') || '/';
    
    // 代理请求到 GitHub API
    const githubResponse = await fetch('https://api.github.com' + path, {
      method: request.method,
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Decap-CMS-Proxy',
        'Accept': 'application/vnd.github.v3+json',
        ...(request.method !== 'GET' ? {'Content-Type': 'application/json'} : {})
      },
      body: request.body
    });
    
    return githubResponse;
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}