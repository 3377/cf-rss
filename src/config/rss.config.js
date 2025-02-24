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
    cardHeight: 800, // 卡片高度(px)
    cardWidth: 400, // 卡片宽度(px)
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
    if (env.CARD_HEIGHT) {
      config.display.cardHeight = parseInt(env.CARD_HEIGHT);
    }
    if (env.CARD_WIDTH) {
      config.display.cardWidth = parseInt(env.CARD_WIDTH);
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
