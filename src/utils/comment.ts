import { supabase } from './supabase';

// 获取某篇文章的评论
export const getPostComments = async (postId: string) => {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: false }); // 按时间倒序
  if (error) throw new Error(error.message);
  return data;
};

// 提交匿名评论
export const submitAnonymousComment = async (comment: {
  postId: string;
  nickname: string;
  content: string;
  email?: string;
}) => {
  const { error } = await supabase
    .from('comments')
    .insert([{
      post_id: comment.postId,
      nickname: comment.nickname,
      content: comment.content,
      email: comment.email
    }]);
  if (error) throw new Error(error.message);
  return true;
};

// 管理员删除评论（需登录验证）
export const deleteComment = async (commentId: string) => {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);
  if (error) throw new Error(error.message);
  return true;
};