export const RSS_CONFIG = {
  // RSS源配置
  feeds: (() => {
    console.log("ENV available:", typeof ENV !== "undefined");
    console.log("RSS_FEEDS value:", ENV?.RSS_FEEDS);
    try {
      // 检查 ENV 和 RSS_FEEDS 是否存在且不为空
      if (
        typeof ENV !== "undefined" &&
        ENV.RSS_FEEDS &&
        ENV.RSS_FEEDS.trim() !== ""
      ) {
        const parsedFeeds = JSON.parse(ENV.RSS_FEEDS);
        // 确保解析后的结果是数组且不为空
        if (Array.isArray(parsedFeeds) && parsedFeeds.length > 0) {
          return parsedFeeds;
        }
      }
    } catch (error) {
      console.error("RSS_FEEDS parsing error:", error);
    }
    // 如果上述任何条件不满足，返回默认值
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
    interval:
      typeof ENV !== "undefined" && ENV.REFRESH_INTERVAL
        ? parseInt(ENV.REFRESH_INTERVAL)
        : 30,
    cache:
      typeof ENV !== "undefined" && ENV.CACHE_DURATION
        ? parseInt(ENV.CACHE_DURATION)
        : 0,
  },
  // 显示配置
  display: {
    itemsPerFeedCompact:
      typeof ENV !== "undefined" && ENV.ITEMS_PER_FEED_COMPACT
        ? parseInt(ENV.ITEMS_PER_FEED_COMPACT)
        : 10,
    itemsPerFeedExpanded:
      typeof ENV !== "undefined" && ENV.ITEMS_PER_FEED_EXPANDED
        ? parseInt(ENV.ITEMS_PER_FEED_EXPANDED)
        : 15,
    dateFormat:
      typeof ENV !== "undefined" && ENV.DATE_FORMAT
        ? ENV.DATE_FORMAT
        : "yyyy-MM-dd HH:mm",
    fontSize:
      typeof ENV !== "undefined" && ENV.FONT_SIZE
        ? parseInt(ENV.FONT_SIZE)
        : 16,
  },
};
