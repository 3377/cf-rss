export const RSS_CONFIG = {
  // RSS源配置
  feeds:
    typeof ENV !== "undefined" && ENV.RSS_FEEDS
      ? JSON.parse(ENV.RSS_FEEDS)
      : [
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
  // 刷新配置
  refresh: {
    interval:
      typeof ENV !== "undefined" ? parseInt(ENV.REFRESH_INTERVAL || "30") : 30,
    cache: typeof ENV !== "undefined" ? parseInt(ENV.CACHE_DURATION || "0") : 0,
  },
  // 显示配置
  display: {
    itemsPerFeedCompact:
      typeof ENV !== "undefined"
        ? parseInt(ENV.ITEMS_PER_FEED_COMPACT || "10")
        : 10,
    itemsPerFeedExpanded:
      typeof ENV !== "undefined"
        ? parseInt(ENV.ITEMS_PER_FEED_EXPANDED || "15")
        : 15,
    dateFormat:
      typeof ENV !== "undefined"
        ? ENV.DATE_FORMAT || "yyyy-MM-dd HH:mm"
        : "yyyy-MM-dd HH:mm",
  },
};
