// 默认配置
const DEFAULT_CONFIG = {
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
      url: "https://linux.do/latest.rss",
    },
  ],
  refresh: {
    interval: 300, // 刷新间隔(秒)
    cache: 300, // 缓存时间(秒)
  },
  display: {
    appTitle: "RSS Reader",
    defaultDarkMode: true,
    showItemDate: true,
    dateFormat: "yyyy-MM-dd HH:mm",
    fontSize: 16,
    itemsPerFeed: 15,
    cardGap: 24,
    cardPadding: 16,
    layoutSideMargin: "2%",
  },
};

// 导出配置获取函数
export function getRSSConfig(env) {
  console.log("Getting RSS config with env:", env); // 调试日志

  const config = { ...DEFAULT_CONFIG };

  try {
    // 从环境变量更新配置
    if (env.RSS_FEEDS) {
      try {
        config.feeds = JSON.parse(env.RSS_FEEDS);
      } catch (e) {
        console.error("RSS_FEEDS环境变量解析失败:", e);
      }
    }

    if (env.REFRESH_INTERVAL) {
      config.refresh.interval =
        parseInt(env.REFRESH_INTERVAL, 10) || config.refresh.interval;
    }

    if (env.CACHE_DURATION) {
      config.refresh.cache =
        parseInt(env.CACHE_DURATION, 10) || config.refresh.cache;
    }

    if (env.APP_TITLE) {
      config.display.appTitle = env.APP_TITLE;
    }

    if (env.DEFAULT_DARK_MODE) {
      config.display.defaultDarkMode = env.DEFAULT_DARK_MODE === "true";
    }

    if (env.SHOW_ITEM_DATE) {
      config.display.showItemDate = env.SHOW_ITEM_DATE === "true";
    }

    if (env.DATE_FORMAT) {
      config.display.dateFormat = env.DATE_FORMAT;
    }

    if (env.FONT_SIZE) {
      config.display.fontSize =
        parseInt(env.FONT_SIZE, 10) || config.display.fontSize;
    }

    if (env.ITEMS_PER_FEED) {
      config.display.itemsPerFeed =
        parseInt(env.ITEMS_PER_FEED, 10) || config.display.itemsPerFeed;
    }

    if (env.CARD_GAP) {
      config.display.cardGap =
        parseInt(env.CARD_GAP, 10) || config.display.cardGap;
    }

    if (env.CARD_PADDING) {
      config.display.cardPadding =
        parseInt(env.CARD_PADDING, 10) || config.display.cardPadding;
    }

    if (env.LAYOUT_SIDE_MARGIN) {
      config.display.layoutSideMargin = env.LAYOUT_SIDE_MARGIN;
    }

    // 处理布局配置
    if (env.LAYOUT_MAX_HEIGHT) {
      config.display.layout.maxHeight = env.LAYOUT_MAX_HEIGHT;
    }
    if (env.LAYOUT_FIXED_LAYOUT) {
      config.display.layout.fixedLayout = env.LAYOUT_FIXED_LAYOUT === "true";
    }
    if (env.LAYOUT_GRID_COLUMNS) {
      config.display.layout.gridColumns = parseInt(env.LAYOUT_GRID_COLUMNS);
    }
    if (env.LAYOUT_SHOW_LAYOUT_TOGGLE) {
      config.display.layout.showLayoutToggle =
        env.LAYOUT_SHOW_LAYOUT_TOGGLE === "true";
    }
    if (env.LAYOUT_CONTAINER_WIDTH) {
      config.display.layout.containerWidth = env.LAYOUT_CONTAINER_WIDTH;
    }
    if (env.LAYOUT_CONTAINER_PADDING) {
      config.display.layout.containerPadding = env.LAYOUT_CONTAINER_PADDING;
    }

    // 处理提示框配置
    if (env.TOOLTIP_MAX_PREVIEW_LENGTH) {
      config.display.tooltip.maxPreviewLength = parseInt(
        env.TOOLTIP_MAX_PREVIEW_LENGTH
      );
    }
    if (env.TOOLTIP_WIDTH) {
      config.display.tooltip.width = env.TOOLTIP_WIDTH;
    }
  } catch (error) {
    console.error("Error in getRSSConfig:", error);
  }

  console.log("Final config:", config);
  return config;
}

// 通过环境变量读取配置，如果没有则使用默认值
export const RSS_CONFIG = getRSSConfig(
  typeof window !== "undefined" && window.__RSS_CONFIG__
    ? window.__RSS_CONFIG__
    : null
);

export default DEFAULT_CONFIG;
