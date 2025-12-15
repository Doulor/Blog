// 测试脚本：验证Netlify CMS配置是否有效
console.log('Netlify CMS 集成验证脚本');

// 检查是否在浏览器环境中
if (typeof window !== 'undefined') {
    // 检查Netlify Identity是否可用
    if (typeof netlifyIdentity !== 'undefined') {
        console.log('✅ Netlify Identity 已加载');
        
        // 初始化Identity
        netlifyIdentity.init();
        
        // 监听身份验证状态
        netlifyIdentity.on('init', (user) => {
            if (user) {
                console.log('👤 用户已登录:', user.email);
            } else {
                console.log('🔓 未登录用户，可访问CMS');
            }
        });
    } else {
        console.log('⚠️ Netlify Identity 未加载，但仍可通过Git Gateway使用CMS');
    }
    
    // 检查当前页面是否为CMS管理页面
    if (window.location.pathname.includes('/admin/')) {
        console.log('🌐 当前位于CMS管理页面');
    }
    
    console.log('✅ Netlify CMS 集成验证完成');
} else {
    console.log('⚠️ 此脚本应在浏览器环境中运行');
}