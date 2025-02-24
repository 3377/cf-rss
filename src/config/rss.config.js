export const RSS_CONFIG = {
  // RSS源配置
  feeds: JSON.parse(process.env.RSS_FEEDS || "[]"),
  // 刷新配置
  refresh: {
    interval: parseInt(process.env.REFRESH_INTERVAL || "30"),
    cache: parseInt(process.env.CACHE_DURATION || "0"),
  },
  // 显示配置
  display: {
    itemsPerFeedCompact: parseInt(process.env.ITEMS_PER_FEED_COMPACT || "10"), // 8个方块时
    itemsPerFeedExpanded: parseInt(process.env.ITEMS_PER_FEED_EXPANDED || "15"), // 4个方块时
    dateFormat: process.env.DATE_FORMAT || "yyyy-MM-dd HH:mm",
  },
};
