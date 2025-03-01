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
    interval: 60, // 默认刷新间隔为60秒
    cache: 0, // 默认缓存时间为0秒
  },
  display: {
    appTitle: "FY Pages RSS", // 应用标题
    defaultDarkMode: true, // 确保默认使用暗色模式
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
      gridColumns: 4, // 3列布局
      showLayoutToggle: false, // 隐藏布局切换
      containerWidth: "96vw", // 容器宽度
      containerPadding: "16px", // 容器内边距
    },
    tooltip: {
      // 提示框预览内容的最大字数
      maxPreviewLength: 100,
      // 提示框宽度（像素或百分比）
      width: "500px",
    },
  },
};

// 导出配置获取函数
export function getRSSConfig(env) {
  console.log("Getting RSS config with env:", env); // 调试日志
  if (env) {
    console.log("环境变量类型检查:", {
      refreshInterval:
        env.REFRESH_INTERVAL !== undefined
          ? {
              value: env.REFRESH_INTERVAL,
              type: typeof env.REFRESH_INTERVAL,
            }
          : "未定义",
      cacheTime:
        env.CACHE_DURATION !== undefined
          ? {
              value: env.CACHE_DURATION,
              type: typeof env.CACHE_DURATION,
            }
          : "未定义",
    });
  }

  // 创建新的配置对象，避免修改默认配置
  const config = JSON.parse(JSON.stringify(defaultConfig));
  console.log("初始默认配置:", {
    refreshInterval: config.refresh.interval,
    cacheTime: config.refresh.cache,
  });

  try {
    // 如果没有环境变量，直接返回默认配置
    if (!env) {
      console.log("No env provided, using default config");
      return config;
    }

    // 处理 RSS feeds
    if (env.RSS_FEEDS) {
      try {
        const feedsStr = env.RSS_FEEDS.trim();
        console.log("RSS_FEEDS string:", feedsStr);

        const parsedFeeds = JSON.parse(feedsStr);
        if (Array.isArray(parsedFeeds) && parsedFeeds.length > 0) {
          config.feeds = parsedFeeds;
          console.log("Successfully parsed RSS feeds:", parsedFeeds);
        } else {
          console.warn("Parsed RSS_FEEDS is not a valid array");
        }
      } catch (parseError) {
        console.error("Error parsing RSS_FEEDS:", parseError);
      }
    }

    // 处理环境变量
    // 注意: 环境变量可能是字符串，需要转换为数字
    if (env.REFRESH_INTERVAL) {
      const parseInterval = parseInt(env.REFRESH_INTERVAL, 10);
      if (!isNaN(parseInterval)) {
        config.refresh.interval = parseInterval;
        console.log(`成功设置刷新间隔为: ${parseInterval}秒`);
      } else {
        console.warn(
          `无法解析刷新间隔 "${env.REFRESH_INTERVAL}" 为整数，使用默认值: ${config.refresh.interval}秒`
        );
      }
    } else {
      console.log(`未提供刷新间隔，使用默认值: ${config.refresh.interval}秒`);
    }

    if (env.CACHE_DURATION) {
      const parseCacheDuration = parseInt(env.CACHE_DURATION, 10);
      if (!isNaN(parseCacheDuration)) {
        config.refresh.cache = parseCacheDuration;
        console.log(`成功设置缓存时间为: ${parseCacheDuration}秒`);
      } else {
        console.warn(
          `无法解析缓存时间 "${env.CACHE_DURATION}" 为整数，使用默认值: ${config.refresh.cache}秒`
        );
      }
    } else {
      console.log(`未提供缓存时间，使用默认值: ${config.refresh.cache}秒`);
    }

    // 处理显示配置
    if (env.APP_TITLE) {
      config.display.appTitle = env.APP_TITLE;
    }
    if (env.DEFAULT_DARK_MODE !== undefined) {
      config.display.defaultDarkMode = env.DEFAULT_DARK_MODE === "true";
    }
    if (env.SHOW_ITEM_DATE !== undefined) {
      config.display.showItemDate = env.SHOW_ITEM_DATE === "true";
    }
    if (env.DATE_FORMAT) {
      config.display.dateFormat = env.DATE_FORMAT;
    }
    if (env.FONT_SIZE) {
      config.display.fontSize = parseInt(env.FONT_SIZE);
    }
    if (env.ITEMS_PER_FEED) {
      config.display.itemsPerFeed = parseInt(env.ITEMS_PER_FEED);
    }

    // 处理布局配置
    if (env.LAYOUT_SIDE_MARGIN) {
      config.display.layout.sideMargin = env.LAYOUT_SIDE_MARGIN;
    }
    if (env.CARD_GAP) {
      config.display.layout.cardGap = parseInt(env.CARD_GAP);
    }
    if (env.CARD_PADDING) {
      config.display.layout.cardPadding = parseInt(env.CARD_PADDING);
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

    // 最终日志输出
    console.log("最终配置结果:", {
      refreshInterval: config.refresh.interval,
      cacheTime: config.refresh.cache,
      intervalType: typeof config.refresh.interval,
      cacheType: typeof config.refresh.cache,
    });

    return config;
  } catch (error) {
    console.error("处理配置时出错:", error);
    return config; // 出错时返回默认配置
  }
}

// 通过环境变量读取配置，如果没有则使用默认值
export const RSS_CONFIG = getRSSConfig(
  typeof window !== "undefined" && window.__RSS_CONFIG__
    ? window.__RSS_CONFIG__
    : null
);

// 添加一个重新初始化配置的函数，用于前端动态更新配置
export function reinitConfig() {
  console.log("reinitConfig 被调用 - 开始检查配置更新");

  console.log("当前配置状态 (调用前):", {
    refreshInterval: RSS_CONFIG.refresh?.interval,
    cacheTime: RSS_CONFIG.refresh?.cache,
    refreshType: typeof RSS_CONFIG.refresh?.interval,
    cacheType: typeof RSS_CONFIG.refresh?.cache,
  });

  // 检查是否有新的配置数据
  const hasWindowConfig =
    typeof window !== "undefined" && window.__RSS_CONFIG__;
  console.log("浏览器环境检查:", {
    isInBrowser: typeof window !== "undefined",
    hasWindowConfig: hasWindowConfig,
    windowConfigType: hasWindowConfig ? typeof window.__RSS_CONFIG__ : "N/A",
  });

  if (hasWindowConfig) {
    const windowConfig = window.__RSS_CONFIG__;

    // 如果是字符串，尝试解析为JSON
    let configObj = windowConfig;
    if (typeof windowConfig === "string") {
      try {
        configObj = JSON.parse(windowConfig);
        console.log("成功从字符串解析window.__RSS_CONFIG__为对象");
      } catch (e) {
        console.error("window.__RSS_CONFIG__解析为JSON失败:", e);
      }
    }

    console.log("检测到 window.__RSS_CONFIG__", {
      rawType: typeof windowConfig,
      parsedType: typeof configObj,
      hasRefresh: !!configObj.refresh,
      refreshInterval: configObj.refresh?.interval,
      cacheTime: configObj.refresh?.cache,
      refreshType: typeof configObj.refresh?.interval,
      cacheType: typeof configObj.refresh?.cache,
      refreshObject: configObj.refresh,
      summary: JSON.stringify(configObj).slice(0, 100) + "...", // 展示部分配置内容
    });

    // 将更新的配置应用到 RSS_CONFIG
    const newConfig = getRSSConfig(configObj);

    // 打印配置信息用于调试
    console.log("getRSSConfig返回的新配置:", {
      refreshInterval: newConfig.refresh?.interval,
      cacheTime: newConfig.refresh?.cache,
      refreshType: typeof newConfig.refresh?.interval,
      cacheType: typeof newConfig.refresh?.cache,
    });

    // 如果配置有变化，打印详细信息
    if (newConfig.refresh?.interval !== RSS_CONFIG.refresh?.interval) {
      console.log("刷新间隔已更新:", {
        oldValue: RSS_CONFIG.refresh?.interval,
        newValue: newConfig.refresh?.interval,
        oldType: typeof RSS_CONFIG.refresh?.interval,
        newType: typeof newConfig.refresh?.interval,
      });
    }

    if (newConfig.refresh?.cache !== RSS_CONFIG.refresh?.cache) {
      console.log("缓存时间已更新:", {
        oldValue: RSS_CONFIG.refresh?.cache,
        newValue: newConfig.refresh?.cache,
        oldType: typeof RSS_CONFIG.refresh?.cache,
        newType: typeof newConfig.refresh?.cache,
      });
    }

    // 更新本模块导出的 RSS_CONFIG
    Object.assign(RSS_CONFIG, newConfig);
    console.log("RSS_CONFIG 已更新 (调用后):", {
      refreshInterval: RSS_CONFIG.refresh?.interval,
      cacheTime: RSS_CONFIG.refresh?.cache,
      refreshType: typeof RSS_CONFIG.refresh?.interval,
      cacheType: typeof RSS_CONFIG.refresh?.cache,
    });

    return newConfig;
  }

  console.log("未检测到新配置数据，返回当前配置:", {
    refreshInterval: RSS_CONFIG.refresh?.interval,
    cacheTime: RSS_CONFIG.refresh?.cache,
  });

  return RSS_CONFIG;
}
