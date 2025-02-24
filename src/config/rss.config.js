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
    itemsPerFeedCompact: 10,
    itemsPerFeedExpanded: 15,
    dateFormat: "yyyy-MM-dd HH:mm",
    fontSize: 16,
  },
};

// 导出配置获取函数
export function getRSSConfig(env) {
  console.log("Getting RSS config with env:", env); // 调试日志

  // 如果没有传入 env，返回默认配置
  if (!env) {
    console.log("No env provided, using default config");
    return defaultConfig;
  }

  const config = {
    feeds: defaultConfig.feeds,
    refresh: { ...defaultConfig.refresh },
    display: { ...defaultConfig.display },
  };

  try {
    // 处理 RSS feeds
    if (env.RSS_FEEDS && env.RSS_FEEDS.trim()) {
      const parsedFeeds = JSON.parse(env.RSS_FEEDS);
      if (Array.isArray(parsedFeeds) && parsedFeeds.length > 0) {
        config.feeds = parsedFeeds;
        console.log("Using custom RSS feeds:", parsedFeeds);
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
    if (env.ITEMS_PER_FEED_COMPACT) {
      config.display.itemsPerFeedCompact = parseInt(env.ITEMS_PER_FEED_COMPACT);
    }
    if (env.ITEMS_PER_FEED_EXPANDED) {
      config.display.itemsPerFeedExpanded = parseInt(
        env.ITEMS_PER_FEED_EXPANDED
      );
    }
    if (env.DATE_FORMAT) {
      config.display.dateFormat = env.DATE_FORMAT;
    }
    if (env.FONT_SIZE) {
      config.display.fontSize = parseInt(env.FONT_SIZE);
    }
  } catch (error) {
    console.error("Error parsing RSS config:", error);
  }

  console.log("Final config:", config); // 调试日志
  return config;
}

// 导出默认配置（仅用于开发环境）
export const RSS_CONFIG = getRSSConfig(typeof ENV !== "undefined" ? ENV : null);
