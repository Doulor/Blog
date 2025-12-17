// GitHub内容获取服务
export class GitHubContentService {
  constructor(token) {
    this.token = token;
    this.baseUrl = 'https://api.github.com';
    this.repo = 'Doulor/Blog'; // 根据您的仓库调整
  }

  // 获取仓库内容
  async getContent(path = '') {
    const response = await fetch(`${this.baseUrl}/repos/${this.repo}/contents/${path}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API请求失败: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  // 获取特定文件内容
  async getFileContent(path) {
    const response = await fetch(`${this.baseUrl}/repos/${this.repo}/contents/${path}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`获取文件失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    // 正确解码Base64内容，支持UTF-8编码
    const binaryString = atob(data.content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const content = new TextDecoder('utf-8').decode(bytes);
    return content;
  }

  // 提交文件到GitHub
  async submitFile(path, content, message = '通过CMS更新文件', sha = null) {
    // 正确编码内容，支持UTF-8编码
    const uint8Array = new TextEncoder().encode(content);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Content = btoa(binary);

    const data = {
      message: message,
      content: base64Content,
      branch: 'main'
    };

    // 如果提供了SHA，说明是更新现有文件
    if (sha) {
      data.sha = sha;
    }

    const response = await fetch(`${this.baseUrl}/repos/${this.repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `提交失败: ${response.status}`);
    }

    return await response.json();
  }

  // 删除文件
  async deleteFile(path, message = '通过CMS删除文件', sha) {
    const data = {
      message: message,
      sha: sha,
      branch: 'main'
    };

    const response = await fetch(`${this.baseUrl}/repos/${this.repo}/contents/${path}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `删除失败: ${response.status}`);
    }

    return await response.json();
  }

  // 获取posts目录下的所有文章
  async getPosts() {
    try {
      const content = await this.getContent('src/content/posts');
      if (Array.isArray(content)) {
        // 过滤出.md文件
        const mdFiles = content.filter(item => item.name.endsWith('.md'));
        const posts = [];
        
        for (const file of mdFiles) {
          const fileContent = await this.getFileContent(file.path);
          posts.push({
            slug: file.name.replace('.md', ''),
            content: fileContent,
            sha: file.sha,
            path: file.path
          });
        }
        
        return posts;
      }
      return [];
    } catch (error) {
      console.error('获取posts失败:', error);
      return [];
    }
  }

  // 获取diary目录下的所有日记
  async getDiaryEntries() {
    try {
      const content = await this.getContent('src/content/diary');
      if (Array.isArray(content)) {
        // 过滤出.md文件
        const mdFiles = content.filter(item => item.name.endsWith('.md'));
        const diaryEntries = [];
        
        for (const file of mdFiles) {
          const fileContent = await this.getFileContent(file.path);
          diaryEntries.push({
            slug: file.name.replace('.md', ''),
            content: fileContent,
            sha: file.sha,
            path: file.path
          });
        }
        
        return diaryEntries;
      }
      return [];
    } catch (error) {
      console.error('获取diary失败:', error);
      return [];
    }
  }

  // 获取albums目录下的所有相册
  async getAlbums() {
    try {
      const content = await this.getContent('src/content/albums');
      if (Array.isArray(content)) {
        // 过滤出.md文件
        const mdFiles = content.filter(item => item.name.endsWith('.md'));
        const albums = [];
        
        for (const file of mdFiles) {
          const fileContent = await this.getFileContent(file.path);
          albums.push({
            id: file.name.replace('.md', ''),
            content: fileContent,
            sha: file.sha,
            path: file.path
          });
        }
        
        return albums;
      }
      return [];
    } catch (error) {
      console.error('获取albums失败:', error);
      return [];
    }
  }

  // 获取单个内容项
  async getContentItem(type, slug) {
    let path;
    switch(type) {
      case 'post':
        path = `src/content/posts/${slug}.md`;
        break;
      case 'diary':
        path = `src/content/diary/${slug}.md`;
        break;
      case 'album':
        path = `src/content/albums/${slug}.md`;
        break;
      default:
        throw new Error('未知的内容类型');
    }

    const content = await this.getFileContent(path);
    return {
      content,
      path,
      slug
    };
  }
}