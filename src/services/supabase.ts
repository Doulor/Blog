import { createClient } from '@supabase/supabase-js';

// 从环境变量创建Supabase客户端
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('缺少Supabase环境变量');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 留言相关类型定义
export interface GuestbookEntry {
  id: string; // UUID类型
  content: string;
  created_at: string; // ISO 8601格式的时间戳
  ip_hash?: string; // IP哈希
  user_agent?: string; // 用户代理
}