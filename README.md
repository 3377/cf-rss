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

1. 准备工作

```bash
# 安装依赖
npm install

# 本地测试构建
npm run build
```

2. Cloudflare Pages 设置

- 登录 Cloudflare Dashboard
- 进入 Pages 页面
- 创建新项目并连接 GitHub 仓库
- 设置构建配置:
  - Framework preset: Vue
  - Build command: `npm run build`
  - Build output directory: `dist`
  - Node.js version: 16
  - 添加环境变量（如上表所示）
- 点击部署

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
