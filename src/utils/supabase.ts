import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database'; // 可选，如果你有数据库类型定义

// 从环境变量获取配置
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

// 检查必要的环境变量
if (!supabaseUrl || !supabaseAnonKey) {
  // 在开发环境提供更友好的错误提示
  if (import.meta.env.DEV) {
    console.error(`
      缺少 Supabase 环境变量配置！
      请在项目根目录的 .env 文件中添加：
      PUBLIC_SUPABASE_URL=你的Supabase项目URL
      PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名密钥
    `);
  }
  throw new Error('Supabase 配置不完整，请检查环境变量');
}

// 创建 Supabase 客户端
export const supabase = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey,
  {
    // 可选配置
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

// 导出一个安全的客户端实例，在没有配置时返回null而非抛出错误
export const safeSupabase = (() => {
  try {
    return createClient<Database>(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.warn('Supabase 配置未完成，部分功能可能无法使用');
    return null;
  }
})();
