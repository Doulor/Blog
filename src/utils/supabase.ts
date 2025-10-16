import { createClient } from '@supabase/supabase-js';

// 从环境变量获取配置
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string;

// 初始化客户端aa
export const supabase = createClient(supabaseUrl, supabaseAnonKey);