// 导出一个函数而不是直接的配置对象
export function getRSSConfig(env) {
  return {
    // RSS源配置
    feeds: (() => {
      console.log("env available:", !!env);
      console.log("RSS_FEEDS value:", env?.RSS_FEEDS);
      try {
        // 使用传入的 env 参数
        if (env?.RSS_FEEDS && env.RSS_FEEDS.trim() !== "") {
          const parsedFeeds = JSON.parse(env.RSS_FEEDS);
          if (Array.isArray(parsedFeeds) && parsedFeeds.length > 0) {
            return parsedFeeds;
          }
        }
      } catch (error) {
        console.error("RSS_FEEDS parsing error:", error);
      }
      return [
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
      ];
    })(),
    // 刷新配置
    refresh: {
      interval: env?.REFRESH_INTERVAL ? parseInt(env.REFRESH_INTERVAL) : 30,
      cache: env?.CACHE_DURATION ? parseInt(env.CACHE_DURATION) : 0,
    },
    // 显示配置
    display: {
      itemsPerFeedCompact: env?.ITEMS_PER_FEED_COMPACT
        ? parseInt(env.ITEMS_PER_FEED_COMPACT)
        : 10,
      itemsPerFeedExpanded: env?.ITEMS_PER_FEED_EXPANDED
        ? parseInt(env.ITEMS_PER_FEED_EXPANDED)
        : 15,
      dateFormat: env?.DATE_FORMAT || "yyyy-MM-dd HH:mm",
      fontSize: env?.FONT_SIZE ? parseInt(env.FONT_SIZE) : 16,
    },
  };
}
