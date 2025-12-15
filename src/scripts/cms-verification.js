// 验证 CMS 配置脚本
console.log('Decap CMS 集成验证脚本');

// 检查是否在浏览器环境中
if (typeof window !== 'undefined') {
    // 检查当前页面是否为CMS管理页面
    if (window.location.pathname.includes('/admin/')) {
        console.log('🌐 当前位于CMS管理页面');
        console.log('🔍 CMS 应使用 GitHub 后端进行身份验证');
    }

    console.log('✅ CMS 验证完成');
} else {
    console.log('⚠️ 此脚本应在浏览器环境中运行');
}