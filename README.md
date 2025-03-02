# CF RSS Reader

一个基于 Cloudflare Pages 的 RSS 阅读器，支持多源 RSS 聚合展示。

## 功能特点

- 支持多个 RSS 源聚合
- 响应式布局，支持移动端和桌面端
- 自动更新 RSS 内容（可配置刷新间隔）
- 支持暗色模式
- 基于 Cloudflare Pages 部署

## 项目结构

项目采用 Vue 3 和 Tailwind CSS 构建，主要文件结构：

- `src/` - 源代码目录
  - `components/` - Vue 组件
  - `config/` - 配置文件，包含 RSS 源配置
  - `App.vue` - 主应用组件
  - `main.js` - 入口文件

## 技术栈

- Vue 3
- Tailwind CSS
- Cloudflare Pages
- RSS Parser

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

### 环境变量配置

部署时可通过 Cloudflare Pages 环境变量自定义 RSS 阅读器的配置，支持以下环境变量：

| 环境变量             | 说明                        | 默认值                          | 示例                                                                                                 |
| -------------------- | --------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `RSS_FEEDS`          | RSS 源配置(JSON 字符串数组) | 预设的 V2EX、NodeSeek、Linux DO | `[{"title":"36kr","url":"https://36kr.com/feed"},{"title":"少数派","url":"https://sspai.com/feed"}]` |
| `REFRESH_INTERVAL`   | 自动刷新间隔(秒)            | 60                              | `300`                                                                                                |
| `CACHE_DURATION`     | 缓存时间(秒)                | 0                               | `300`                                                                                                |
| `APP_TITLE`          | 应用标题                    | FY Pages RSS                    | `我的RSS阅读器`                                                                                      |
| `DEFAULT_DARK_MODE`  | 默认使用暗色模式            | true                            | `false`                                                                                              |
| `SHOW_ITEM_DATE`     | 是否显示条目日期            | false                           | `true`                                                                                               |
| `DATE_FORMAT`        | 日期时间格式                | yyyy-MM-dd HH:mm                | `MM-dd HH:mm`                                                                                        |
| `FONT_SIZE`          | 条目标题字体大小(px)        | 16                              | `18`                                                                                                 |
| `ITEMS_PER_FEED`     | 每个源显示的条目数量        | 15                              | `10`                                                                                                 |
| `CARD_GAP`           | 卡片之间的间距(px)          | 24                              | `32`                                                                                                 |
| `CARD_PADDING`       | 卡片内边距(px)              | 16                              | `20`                                                                                                 |
| `LAYOUT_SIDE_MARGIN` | 页面两侧留白比例            | 2%                              | `5%`                                                                                                 |

> **注意**: 布尔值参数（如 `DEFAULT_DARK_MODE` 和 `SHOW_ITEM_DATE`）需要使用字符串 "true" 或 "false"

### 布局相关配置

布局使用固定的 3 列网格设计，根据屏幕宽度自动调整：

- 大屏幕: 3 列布局（屏幕宽度 > 1200px）
- 中等屏幕: 2 列布局（768px < 屏幕宽度 ≤ 1200px）
- 移动设备: 1 列布局（屏幕宽度 ≤ 768px）

布局使用响应式设计，确保在各种设备上都有良好的阅读体验。

### 配置示例

以下是几个常用配置场景的示例：

#### 1. 个性化 RSS 阅读器

```
APP_TITLE: 我的技术阅读
DEFAULT_DARK_MODE: true
FONT_SIZE: 18
SHOW_ITEM_DATE: true
```

#### 2. 为移动设备优化

```
CARD_GAP: 16
CARD_PADDING: 12
LAYOUT_SIDE_MARGIN: 1%
FONT_SIZE: 14
```

#### 3. 自定义 RSS 源

```
RSS_FEEDS: [
  {"title":"36氪","url":"https://36kr.com/feed"},
  {"title":"少数派","url":"https://sspai.com/feed"},
  {"title":"科技爱好者周刊","url":"https://ruanyf.github.io/weekly/rss.xml"}
]
```

#### 4. 定制刷新频率

```
REFRESH_INTERVAL: 600
CACHE_DURATION: 300
```

#### 5. 完整配置示例

在 Cloudflare Pages 的环境变量设置中添加以下配置：

```
APP_TITLE: 每日科技资讯
DEFAULT_DARK_MODE: true
SHOW_ITEM_DATE: true
FONT_SIZE: 16
ITEMS_PER_FEED: 10
REFRESH_INTERVAL: 300
CARD_GAP: 24
RSS_FEEDS: [{"title":"36氪","url":"https://36kr.com/feed"},{"title":"少数派","url":"https://sspai.com/feed"},{"title":"InfoQ","url":"https://www.infoq.cn/feed"}]
```

这些配置可以根据您的偏好进行组合和调整，满足不同的使用场景需求。

## 部署步骤

### 一键部署到 Cloudflare Pages

1. 点击下方按钮，一键部署到 Cloudflare Pages：

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/3377/cf-rss)

2. 登录你的 Cloudflare 账号（如果还没有，请先注册）
3. 选择或创建要部署的项目
4. 设置你的环境变量（可选，参见上方"环境变量配置"部分）
5. 等待构建和部署完成
6. 访问分配的 \*.pages.dev 域名查看你的 RSS 阅读器

### 手动部署到 Cloudflare Pages

1. 准备工作

```bash
# 克隆仓库
git clone https://github.com/3377/cf-rss.git
cd cf-rss

# 安装依赖
npm install

# 本地测试构建
npm run build
```

2. Cloudflare Pages 设置

- 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
- 在左侧菜单中选择 **Pages**
- 点击 **创建应用程序** 按钮
- 选择 **连接到 Git** 选项
- 授权并选择你的 GitHub/GitLab 仓库
- 配置构建设置:
  - **项目名称**: 输入你喜欢的名称（例如：my-rss-reader）
  - **生产分支**: main（或者你的主分支名称）
  - **框架预设**: Vue
  - **构建命令**: `npm run build`
  - **构建输出目录**: `dist`
  - **Node.js 版本**: 18（或更高）
  - **环境变量**: 添加自定义环境变量（可选，见上方"环境变量配置"部分）

3. 高级设置（可选）

- **自定义域名**: 在项目部署后，可以在 Pages 项目设置中添加自定义域名
- **访问控制**: 可以设置基本身份验证或 Cloudflare Access 保护你的 RSS 阅读器
- **环境分支**: 可以设置预览环境的分支规则

4. 点击 **保存并部署** 按钮

5. 等待构建和部署完成（通常需要 1-2 分钟）

6. 构建完成后，点击分配的 \*.pages.dev 域名查看你的 RSS 阅读器

### 持续集成/持续部署 (CI/CD)

完成上述设置后，每当你推送更改到 Git 仓库，Cloudflare Pages 将自动构建和部署最新版本：

- 推送到主分支（如 main）的更改将部署到生产环境
- 推送到其他分支的更改将创建预览部署（可在 Cloudflare Pages 仪表板中查看）

### 通过 Wrangler 部署（高级）

如果你更喜欢使用命令行，可以使用 Cloudflare Wrangler CLI：

1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

2. 登录 Cloudflare 账号

```bash
wrangler login
```

3. 构建项目

```bash
npm run build
```

4. 部署到 Cloudflare Pages

```bash
wrangler pages publish dist --project-name=my-rss-reader
```

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

# CF-RSS 缓存功能更新

## 新增功能：RSS 缓存机制

最新版本添加了 RSS 缓存机制，使用户在首次访问时可以立即看到之前缓存的内容，而不需要等待刷新。

### 主要特性

1. **自动缓存**: 系统会自动缓存 RSS 内容，默认缓存时间为 1 小时
2. **缓存状态显示**: 界面会显示内容是否来自缓存
3. **强制刷新**: 用户仍然可以通过刷新按钮强制获取最新内容
4. **后台缓存更新**: 系统会在后台定期更新缓存，不影响用户体验

### 配置选项

在`src/config/rss.config.js`中，可以通过以下配置项控制缓存行为：

```js
refresh: {
  interval: 120, // UI自动刷新间隔（秒）
  cache: 3600,   // 缓存更新间隔（秒）
}
```

也可以通过环境变量设置：

- `REFRESH_INTERVAL`: UI 自动刷新间隔
- `CACHE_DURATION`: 缓存更新间隔

## 部署说明

1. 确保代码已提交到 Git 仓库：

   ```bash
   git add .
   git commit -m "添加RSS缓存功能"
   git push
   ```

2. 在本地构建项目：

   ```bash
   npm install
   npm run build
   ```

3. 部署到 Cloudflare Pages：

   - 确保 Cloudflare Pages 项目配置正确
   - 构建命令: `npm run build`
   - 输出目录: `dist`

4. 如果需要本地测试：
   ```bash
   npx wrangler pages dev dist
   ```

## 故障排除

如果遇到缓存相关问题：

1. 检查浏览器控制台是否有错误信息
2. 确认 Cloudflare Workers 是否正常运行
3. 尝试使用强制刷新按钮绕过缓存
4. 检查网络请求中的`X-Cache`头信息，确认缓存状态

## 技术实现

缓存机制使用了 Cloudflare Workers 的 Cache API 实现，主要包括：

1. 在`functions/_middleware.js`中实现缓存逻辑
2. 在`src/App.vue`中添加缓存状态处理
3. 新增`FeedCountdown.vue`组件显示缓存状态
