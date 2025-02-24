export const RSS_CONFIG = {
  // RSS源配置
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
  // 刷新配置
  refresh: {
    interval: 30, // 降低到30秒以提高响应性
    cache: 0, // 禁用缓存
  },
  // 显示配置
  display: {
    itemsPerFeed: 10, // 每个源显示的条目数
    dateFormat: "yyyy-MM-dd HH:mm", // 日期格式
  },
};
