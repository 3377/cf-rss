// 去除自动后台更新相关配置，简化缓存设置

export const RSS_CONFIG = {
  refresh: {
    // 单位：秒，UI刷新间隔（2分钟）
    // 这只控制UI倒计时，不再触发后台缓存更新
    interval: 120,

    // 移除缓存自动更新间隔，改由UptimeRobot和环境变量控制
    // cache: 1800, // 此行已删除
  },
  display: {
    // 应用标题
    appTitle: "FY Pages RSS",
    // 默认暗色模式
    defaultDarkMode: false,
    itemsPerFeed: 15, // 每个卡片显示的条目数
    showItemDate: false, // 默认不显示条目日期
    dateFormat: "yyyy-MM-dd HH:mm",
    fontSize: 16, // 条目字体大小
    layout: {
      maxHeight: "98vh", // 控制整体高度在视口范围内
      cardGap: 24, // 调整卡片间距
      sideMargin: "2%", // 两侧留白
      cardPadding: 16, // 卡片内边距
      fixedLayout: true, // 固定布局
      showLayoutToggle: false, // 隐藏布局切换
      containerWidth: "96vw", // 容器宽度
      containerPadding: "16px", // 容器内边距
    },
    tooltip: {
      // 提示框预览内容的最大字数
      maxPreviewLength: 100,
      // 提示框宽度
      width: "300px",
    },
  },
  feeds: [
    {
      title: "36kr",
      url: "https://36kr.com/feed",
    },
    {
      title: "NodeSeek",
      url: "https://rss.nodeseek.com",
    },
    {
      title: "Linux DO",
      url: "https://api.dbot.pp.ua/v1/rss/linuxdo",
    },
    {
      title: "极客优惠",
      url: "https://jike.info/recent.rss",
    },
  ],
};

// 导出一个函数，用于获取配置
export function getRSSConfig(env) {
  // 可以在这里处理环境变量，如果有需要
  return RSS_CONFIG;
}
