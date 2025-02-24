// 默认配置
const defaultConfig = {
  feeds: [
    {
      title: "V2EX",
      url: "https://www.v2ex.com/index.xml",
    },
    {
      title: "NodeSeek",
      url: "https://rss.nodeseek.com",
    },
    {
      title: "Linux DO",
      url: "https://linux.do/latest.rss",
    },
  ],
  refresh: {
    interval: 30,
    cache: 0,
  },
  display: {
    itemsPerFeed: 15, // 每个卡片显示的条目数
    dateFormat: "yyyy-MM-dd HH:mm",
    fontSize: 16,
    layout: {
      maxHeight: "98vh", // 控制整体高度在视口范围内
      cardGap: 24, // 调整卡片间距
      sideMargin: "2%", // 两侧留白
      cardPadding: 16, // 卡片内边距
      fixedLayout: true, // 固定布局
      gridColumns: 3, // 3列布局
      showLayoutToggle: false, // 隐藏布局切换
      containerWidth: "96vw", // 容器宽度
      containerPadding: "16px", // 容器内边距
    },
  },
};

// 导出配置获取函数
export function getRSSConfig(env) {
  console.log("Getting RSS config with env:", env); // 调试日志

  // 创建新的配置对象，避免修改默认配置
  const config = JSON.parse(JSON.stringify(defaultConfig));

  try {
    // 如果没有环境变量，直接返回默认配置
    if (!env) {
      console.log("No env provided, using default config");
      return config;
    }

    // 处理 RSS feeds
    if (env.RSS_FEEDS) {
      try {
        const feedsStr = env.RSS_FEEDS.trim();
        console.log("RSS_FEEDS string:", feedsStr);

        const parsedFeeds = JSON.parse(feedsStr);
        if (Array.isArray(parsedFeeds) && parsedFeeds.length > 0) {
          config.feeds = parsedFeeds;
          console.log("Successfully parsed RSS feeds:", parsedFeeds);
        } else {
          console.warn("Parsed RSS_FEEDS is not a valid array");
        }
      } catch (parseError) {
        console.error("Error parsing RSS_FEEDS:", parseError);
      }
    }

    // 处理刷新配置
    if (env.REFRESH_INTERVAL) {
      config.refresh.interval = parseInt(env.REFRESH_INTERVAL);
    }
    if (env.CACHE_DURATION) {
      config.refresh.cache = parseInt(env.CACHE_DURATION);
    }

    // 处理显示配置
    if (env.DATE_FORMAT) {
      config.display.dateFormat = env.DATE_FORMAT;
    }
    if (env.FONT_SIZE) {
      config.display.fontSize = parseInt(env.FONT_SIZE);
    }
    if (env.ITEMS_PER_FEED) {
      config.display.itemsPerFeed = parseInt(env.ITEMS_PER_FEED);
    }

    // 处理布局配置
    if (env.LAYOUT_SIDE_MARGIN) {
      config.display.layout.sideMargin = env.LAYOUT_SIDE_MARGIN;
    }
    if (env.CARD_GAP) {
      config.display.layout.cardGap = parseInt(env.CARD_GAP);
    }
    if (env.CARD_PADDING) {
      config.display.layout.cardPadding = parseInt(env.CARD_PADDING);
    }
  } catch (error) {
    console.error("Error in getRSSConfig:", error);
  }

  console.log("Final config:", config);
  return config;
}

// 修改默认导出逻辑
export const RSS_CONFIG = getRSSConfig(
  typeof window !== "undefined" && window.__RSS_CONFIG__
    ? window.__RSS_CONFIG__
    : null
);
