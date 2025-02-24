# CF RSS Reader

一个基于 Cloudflare Pages 的 RSS 阅读器，支持多源 RSS 聚合展示。

## 功能特点

- 支持多个 RSS 源聚合
- 响应式布局，支持 4 块和 8 块两种展示模式
- 自动更新 RSS 内容（可配置刷新间隔）
- 支持暗色模式
- 基于 Cloudflare Pages 部署

## 项目结构

## 技术栈

- Vue 3
- Tailwind CSS
- Cloudflare Pages
- RSS Parser

## 部署说明

### 1. 克隆项目

```bash
git clone https://github.com/你的用户名/cf-rss.git
cd cf-rss
```

### 2. 安装依赖

```bash
npm install
```

### 3. 本地开发

```bash
npm run dev
```

### 4. 构建部署

```bash
# 构建项目
npm run build

# 推送到 GitHub
git add .
git commit -m "Update: 描述更新内容"
git push
```

### 5. Cloudflare Pages 设置

1. 登录 Cloudflare Dashboard
2. 进入 Pages 页面
3. 创建新项目并连接 GitHub 仓库
4. 设置构建配置:
   - Framework preset: Vue
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node.js version: 16
5. 部署完成后，可以通过分配的域名访问

## 配置说明

RSS 源和刷新间隔可以在 `src/config/rss.config.js` 中配置：

```javascript
export const RSS_CONFIG = {
  feeds: [
    // 添加或修改 RSS 源
    {
      title: "源名称",
      url: "RSS URL",
    },
  ],
  refresh: {
    interval: 300, // 刷新间隔(秒)
    cache: 300, // 缓存时间(秒)
  },
};
```

## 部署步骤

1. 准备工作

```bash
# 安装依赖
npm install

# 本地测试构建
npm run build
```

2. GitHub 设置

- 访问 https://github.com/new
- 创建新仓库 `cf-rss`
- 不要初始化 README
- 复制仓库地址

3. 本地代码推送

```bash
# 初始化 Git
cd cf-rss
git init

# 添加 .gitignore
echo "node_modules/
dist/
.DS_Store
*.log" > .gitignore

# 提交代码
git add .
git commit -m "Initial commit: CF RSS Reader"

# 设置远程仓库并推送
git remote add origin https://github.com/你的用户名/cf-rss.git
git branch -M main
git push -u origin main
```

4. Cloudflare Pages 设置

- 登录 Cloudflare Dashboard
- 进入 Pages 页面
- 点击 "Create a project"
- 选择 "Connect to Git"
- 选择你的 GitHub 仓库
- 设置构建配置:
  - Framework preset: Vue
  - Build command: `npm run build`
  - Build output directory: `dist`
  - Environment variables (如需要):
    - NODE_VERSION: 16
- 点击 "Save and Deploy"

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## License

MIT
