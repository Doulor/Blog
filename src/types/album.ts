// 相册类型定义
export type AlbumGroup = {
  id: string;
  title: string;
  description: string;
  cover: string;
  date: string;
  location?: string;
  tags: string[];
  layout: string;
  columns: number;
  photos: Photo[];
  hidden?: boolean;
  mode?: string;
};

export type Photo = {
  id: string;
  src: string;
  alt: string;
  title?: string;
  description?: string;
  tags?: string[];
  date?: string;
  location?: string;
  width?: number;
  height?: number;
  thumbnail?: string;
  camera?: string;
  lens?: string;
  settings?: string;
};