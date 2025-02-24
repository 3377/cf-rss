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

// 导出用于 Pages 的配置函数
export function getRSSConfig(env) {
  return {
    feeds: (() => {
      try {
        if (env?.RSS_FEEDS && env.RSS_FEEDS.trim() !== "") {
          const parsedFeeds = JSON.parse(env.RSS_FEEDS);
          if (Array.isArray(parsedFeeds) && parsedFeeds.length > 0) {
            return parsedFeeds;
          }
        }
      } catch (error) {
        console.error("RSS_FEEDS parsing error:", error);
      }
      return defaultConfig.feeds;
    })(),
    refresh: {
      interval: env?.REFRESH_INTERVAL
        ? parseInt(env.REFRESH_INTERVAL)
        : defaultConfig.refresh.interval,
      cache: env?.CACHE_DURATION
        ? parseInt(env.CACHE_DURATION)
        : defaultConfig.refresh.cache,
    },
    display: {
      itemsPerFeedCompact: env?.ITEMS_PER_FEED_COMPACT
        ? parseInt(env.ITEMS_PER_FEED_COMPACT)
        : defaultConfig.display.itemsPerFeedCompact,
      itemsPerFeedExpanded: env?.ITEMS_PER_FEED_EXPANDED
        ? parseInt(env.ITEMS_PER_FEED_EXPANDED)
        : defaultConfig.display.itemsPerFeedExpanded,
      dateFormat: env?.DATE_FORMAT || defaultConfig.display.dateFormat,
      fontSize: env?.FONT_SIZE
        ? parseInt(env.FONT_SIZE)
        : defaultConfig.display.fontSize,
    },
  };
}

// 导出默认配置用于组件
export const RSS_CONFIG = defaultConfig;
