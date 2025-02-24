export const RSS_CONFIG = {
  // RSS源配置
  feeds: [
    {
      title: "V2EX",
      url: "https://www.v2ex.com/feed/tab/tech.xml",
    },
    {
      title: "NodeSeek",
      url: "https://www.nodeseek.com/feed",
    },
    {
      title: "Linux DO",
      url: "https://linux.do/feed",
    },
  ],
  // 刷新配置
  refresh: {
    interval: 5 * 60, // 刷新间隔(秒)
    cache: 300, // 缓存时间(秒)
  },
  // 显示配置
  display: {
    itemsPerFeed: 10, // 每个源显示的条目数
    dateFormat: "yyyy-MM-dd HH:mm", // 日期格式
  },
};
