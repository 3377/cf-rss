<template>
  <div class="feed-container">
    <div
      v-if="!feeds || feeds.length === 0"
      class="flex items-center justify-center h-full"
    >
      <div class="text-gray-500 empty-message">暂无数据</div>
    </div>

    <!-- 移动视图容器 -->
    <div
      v-else-if="isMobile"
      class="mobile-view-container"
      ref="mobileViewContainer"
    >
      <div
        class="mobile-cards-container"
        ref="swipeContainer"
        :style="{ transform: `translateX(${-currentCardIndex * 100}%)` }"
      >
        <!-- 移动端卡片 -->
        <div v-for="(feed, gIndex) in feeds" :key="gIndex" class="mobile-card">
          <div class="card-header">
            <div class="card-header-inner">
              <div class="arrow-btn left-arrow" @click="prevCard">
                <i class="arrow-icon">&#9664;</i>
              </div>
              <h3 class="card-title">{{ feed.title }}</h3>
              <div class="arrow-btn right-arrow" @click="nextCard">
                <i class="arrow-icon">&#9654;</i>
              </div>
            </div>
          </div>
          <!-- 移动卡片内容 -->
          <div class="mobile-card-content">
            <!-- 单个Feed项目 -->
            <div
              v-for="item in feed.items"
              :key="item.link || item.id"
              class="mobile-feed-item"
              @click="openLink(item.link)"
            >
              <div class="item-title" v-html="item.title"></div>
              <div class="item-meta">
                <span class="item-date">{{
                  formatDate(item.pubDate || item.isoDate)
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- 滑动指示器 -->
      <div class="swipe-indicator" v-if="feeds.length > 1">
        <div
          v-for="(_, index) in feeds"
          :key="index"
          class="indicator-dot"
          :class="{ active: currentCardIndex === index }"
        ></div>
      </div>
    </div>

    <!-- 桌面端视图：网格卡片 -->
    <div v-else class="feed-grid" :style="gridStyle">
      <div v-for="feed in feeds" :key="feed.title" class="feed-card">
        <div class="card-header">
          <h2 class="feed-title">{{ feed.title }}</h2>
        </div>
        <div class="feed-links">
          <div v-if="feed.error" class="error-message">
            {{ feed.error }}
          </div>
          <div
            v-else-if="!feed.items || feed.items.length === 0"
            class="empty-message"
          >
            暂无数据
          </div>
          <template v-else>
            <div
              v-for="item in feed.items"
              :key="item.id || item.link"
              class="feed-link-item"
            >
              <a
                :href="item.link"
                target="_blank"
                rel="noopener noreferrer"
                class="feed-link"
                @mouseover="showPreview($event, item)"
                @mouseout="hidePreview"
              >
                {{ item.title }}
                <span v-if="showItemDate" class="item-date">
                  {{ formatDate(item.pubDate || item.isoDate) }}
                </span>
              </a>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 内容预览提示框 (仅桌面端显示) -->
    <div
      v-if="!isMobile"
      ref="tooltip"
      class="title-tooltip"
      :style="tooltipStyle"
      v-show="showTooltipText"
    >
      <div v-if="tooltipDate" class="tooltip-date">
        发帖时间：{{ tooltipDate }}
      </div>
      <div v-if="tooltipContent" class="tooltip-content">
        {{ tooltipContent }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onBeforeUnmount } from "vue";
import { format, parseISO } from "date-fns";
import { RSS_CONFIG } from "../config/rss.config";

// 组件属性定义
const props = defineProps({
  feeds: {
    type: Array,
    required: true,
  },
  isDark: {
    type: Boolean,
    default: false,
  },
});

// 获取配置
const showItemDate = ref(RSS_CONFIG.display?.showItemDate || false);
const dateFormat = ref(RSS_CONFIG.display?.dateFormat || "yyyy-MM-dd HH:mm");

// 响应式状态
const currentCardIndex = ref(0);
const isMobile = ref(false);
const mobileViewContainer = ref(null);
const swipeContainer = ref(null);
const mobileCardsContainer = ref(null);

// 触摸相关变量
let startX = null;
let startY = null;
let touchDeltaX = 0;
let touchDeltaY = 0;
let touchStartTime = 0;
let isScrolling = null;
let resizeObserver = null;

// 移动端导航方法
const nextCard = () => {
  if (currentCardIndex.value < props.feeds.length - 1) {
    currentCardIndex.value++;
  } else {
    // 循环到第一张卡片
    currentCardIndex.value = 0;
  }
};

const prevCard = () => {
  if (currentCardIndex.value > 0) {
    currentCardIndex.value--;
  } else {
    // 循环到最后一张卡片
    currentCardIndex.value = props.feeds.length - 1;
  }
};

// 检测设备类型
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

// 初始化触摸事件
const initTouchEvents = () => {
  if (!isMobile.value || !swipeContainer.value) return;

  // 先移除可能存在的事件监听
  swipeContainer.value.removeEventListener("touchstart", handleTouchStart);
  swipeContainer.value.removeEventListener("touchmove", handleTouchMove);
  swipeContainer.value.removeEventListener("touchend", handleTouchEnd);

  // 添加新的事件监听
  swipeContainer.value.addEventListener("touchstart", handleTouchStart, {
    passive: false,
  });
  swipeContainer.value.addEventListener("touchmove", handleTouchMove, {
    passive: false,
  });
  swipeContainer.value.addEventListener("touchend", handleTouchEnd, {
    passive: false,
  });
};

// 触摸开始事件
const handleTouchStart = (e) => {
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
  touchStartTime = new Date().getTime();
  isScrolling = null;
  touchDeltaX = 0;
  touchDeltaY = 0;
};

// 触摸移动事件
const handleTouchMove = (e) => {
  if (startX === null) return;

  const touchCurrentX = e.touches[0].clientX;
  const touchCurrentY = e.touches[0].clientY;
  touchDeltaX = touchCurrentX - startX;
  touchDeltaY = touchCurrentY - startY;

  // 判断主要滑动方向
  if (isScrolling === null) {
    isScrolling = Math.abs(touchDeltaY) > Math.abs(touchDeltaX);
  }

  // 如果是水平滑动，阻止默认行为，避免页面滚动
  if (!isScrolling) {
    e.preventDefault();

    // 更新卡片容器的变换，添加一些阻尼效果
    const containerWidth = swipeContainer.value.offsetWidth;
    const resistance = 0.4; // 当尝试滑过边界时的阻力
    let translateX = -currentCardIndex.value * 100;

    // 计算位移百分比，考虑边界情况
    if (
      (currentCardIndex.value === 0 && touchDeltaX > 0) ||
      (currentCardIndex.value === props.feeds.length - 1 && touchDeltaX < 0)
    ) {
      // 在边界处添加阻尼效果
      translateX += (touchDeltaX / containerWidth) * 100 * resistance;
    } else {
      // 正常滑动
      translateX += (touchDeltaX / containerWidth) * 100;
    }

    swipeContainer.value.style.transform = `translateX(${translateX}%)`;
    swipeContainer.value.style.transition = "none";
  }
};

// 触摸结束事件
const handleTouchEnd = (e) => {
  if (startX === null || isScrolling) return;

  // 恢复过渡动画
  swipeContainer.value.style.transition = "transform 0.3s ease";

  const touchEndTime = new Date().getTime();
  const touchTime = touchEndTime - touchStartTime;

  // 计算滑动速度和距离百分比
  const containerWidth = swipeContainer.value.offsetWidth;
  const touchPercent = (touchDeltaX / containerWidth) * 100;
  const touchSpeed = Math.abs(touchDeltaX) / touchTime;

  // 降低滑动阈值，增加灵敏度
  // 如果滑动速度快或滑动距离大，则切换卡片
  if (
    (Math.abs(touchPercent) > 10 || touchSpeed > 0.15) &&
    Math.abs(touchDeltaX) > 10
  ) {
    if (touchDeltaX > 0) {
      prevCard();
    } else {
      nextCard();
    }
  } else {
    // 恢复到当前卡片
    swipeContainer.value.style.transform = `translateX(${
      -currentCardIndex.value * 100
    }%)`;
  }

  // 重置触摸相关变量
  startX = null;
  startY = null;
  touchDeltaX = 0;
  touchDeltaY = 0;
  isScrolling = null;
};

// 监听组件挂载
onMounted(() => {
  // 初始化移动端触摸事件
  nextTick(() => {
    initTouchEvents();
  });

  // 监听窗口大小变化
  window.addEventListener("resize", handleResize);
  handleResize();

  // 使用ResizeObserver监控移动端容器大小变化
  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      if (isMobile.value) {
        nextTick(() => {
          initTouchEvents();
        });
      }
    });

    nextTick(() => {
      if (swipeContainer.value) {
        resizeObserver.observe(swipeContainer.value);
      }
    });
  }

  // iOS设备特殊处理
  nextTick(() => {
    // 确保内容区域可以滚动
    const contentElements = document.querySelectorAll(".mobile-card-content");
    contentElements.forEach((el) => {
      if (el) {
        el.style.overflow = "auto";
        el.style.webkitOverflowScrolling = "touch";
      }
    });
  });
});

// 组件卸载前清理
onBeforeUnmount(() => {
  // 移除事件监听器
  window.removeEventListener("resize", handleResize);

  // 移除触摸事件监听器
  if (swipeContainer.value) {
    swipeContainer.value.removeEventListener("touchstart", handleTouchStart);
    swipeContainer.value.removeEventListener("touchmove", handleTouchMove);
    swipeContainer.value.removeEventListener("touchend", handleTouchEnd);
  }

  // 清理ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});

// 窗口大小变化处理
const handleResize = () => {
  isMobile.value = window.innerWidth <= 768;

  nextTick(() => {
    if (isMobile.value) {
      initTouchEvents();
    }
  });
};

// 计算网格样式
const gridStyle = computed(() => {
  const layout = RSS_CONFIG.display?.layout || {};
  const columns = layout.gridColumns || 3;
  const gap = layout.cardGap || 24;
  const sideMargin = layout.sideMargin || "2%";

  return {
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: `${gap}px`,
    margin: `0 ${sideMargin}`,
  };
});

// 处理日期格式化，添加更健壮的错误处理
const formatDate = (dateStr) => {
  if (!dateStr) return "未知时间";

  try {
    // 检查各种可能的日期格式，处理特殊情况
    let date;

    // 检查是否为数字时间戳
    if (typeof dateStr === "number" || /^\d+$/.test(dateStr)) {
      const timestamp = parseInt(dateStr, 10);
      date = new Date(timestamp);
    } else if (typeof dateStr === "string") {
      // 尝试解析常见的日期字符串格式
      date = new Date(dateStr);

      // 针对无效但格式特殊的日期，做额外处理
      if (isNaN(date.getTime())) {
        // 尝试解析其他格式，例如：YYYY.MM.DD
        const parts = dateStr.split(/[.-/]/);
        if (parts.length === 3) {
          // 尝试几种可能的格式
          date = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
        }
      }
    } else {
      // 如果是Date对象，直接使用
      date = dateStr instanceof Date ? dateStr : new Date();
    }

    // 最终检查日期是否有效
    if (isNaN(date.getTime())) {
      console.log("无效日期值:", dateStr, "类型:", typeof dateStr);
      return "无效日期";
    }

    // 使用直接的Date方法格式化
    try {
      return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch (innerError) {
      // 如果toLocaleString失败，使用备用格式化方法
      console.error("本地化日期格式化失败:", innerError);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")} ${String(
        date.getHours()
      ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    }
  } catch (error) {
    console.error("日期格式化错误:", error, "原始数据:", dateStr);
    return "日期错误";
  }
};

// 获取提示框配置
const tooltipConfig = ref({
  maxPreviewLength: RSS_CONFIG.display?.tooltip?.maxPreviewLength || 100,
  width: RSS_CONFIG.display?.tooltip?.width || "360px",
});

// 修改标题提示功能
const tooltip = ref(null);
const tooltipContent = ref("");
const tooltipDate = ref("");
const tooltipStyle = ref({
  opacity: 0,
  top: "0px",
  left: "0px",
  width: tooltipConfig.value.width,
  maxWidth: tooltipConfig.value.width,
});
const showTooltipText = ref(false);

// 获取内容预览
const getContentPreview = (content) => {
  if (!content) return "暂无内容预览";

  // 添加调试日志
  console.log("Content preview raw data:", content);
  console.log("Content type:", typeof content);

  // 检查内容类型，并执行适当的处理
  let plainText = "";

  try {
    if (typeof content === "string") {
      // 移除HTML标签
      plainText = content.replace(/<[^>]*>?/gm, "");

      // 解码HTML实体
      plainText = plainText
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      // 去除多余空格
      plainText = plainText.replace(/\s+/g, " ").trim();
    } else if (typeof content === "object") {
      // 如果是对象（可能是JSON格式的内容），尝试提取文本
      try {
        if (content.textContent) {
          plainText = content.textContent;
        } else if (content._cdata) {
          plainText = content._cdata;
        } else {
          plainText = JSON.stringify(content);
        }
      } catch (err) {
        plainText = "内容格式无法解析";
      }
    } else {
      // 其他类型转为字符串
      plainText = String(content);
    }

    // 调试输出
    console.log(
      "处理后的内容:",
      plainText.substring(0, 50) + (plainText.length > 50 ? "..." : "")
    );
  } catch (error) {
    console.error("内容处理错误:", error);
    return "内容处理错误";
  }

  // 检查移除HTML后是否还有内容
  if (!plainText.trim()) {
    return "暂无文本内容预览";
  }

  // 限制字数
  if (plainText.length <= tooltipConfig.value.maxPreviewLength) {
    return plainText;
  }

  return plainText.substring(0, tooltipConfig.value.maxPreviewLength) + "...";
};

// 打开链接
const openLink = (url) => {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
};

// 显示内容预览
const showPreview = (event, item) => {
  // 如果是移动设备，则不显示提示框
  if (isMobile.value) return;

  // 设置内容预览
  tooltipContent.value = getContentPreview(
    item.description || item.content || item.summary
  );

  // 格式化并设置日期，使用更安全的处理方式
  try {
    if (item.pubDate || item.isoDate) {
      tooltipDate.value = formatDate(item.pubDate || item.isoDate);
    } else {
      tooltipDate.value = "未知时间";
    }
  } catch (e) {
    tooltipDate.value = "日期格式错误";
  }

  // 定位和显示提示框
  showTooltipText.value = true;

  nextTick(() => {
    if (!tooltip.value) return;

    const rect = event.target.getBoundingClientRect();
    const tooltipRect = tooltip.value.getBoundingClientRect();

    // 定位在元素正上方，并在溢出窗口时调整
    const left = Math.min(
      Math.max(rect.left, 10),
      window.innerWidth - tooltipRect.width - 10
    );

    // 设置样式
    tooltipStyle.value = {
      top: `${rect.top - tooltipRect.height - 10}px`,
      left: `${left}px`,
      opacity: 1,
    };
  });
};

// 隐藏内容预览
const hidePreview = () => {
  showTooltipText.value = false;
  tooltipStyle.value.opacity = 0;
};

// 确保卡片内容在组件挂载后可滚动
onMounted(() => {
  // 给内容区域添加点击事件，用于在移动设备上触发滚动
  const contentElements = document.querySelectorAll(".card-content");
  contentElements.forEach((el) => {
    el.addEventListener("click", (e) => {
      // 防止点击链接时触发
      if (e.target.tagName !== "A" && e.target.parentElement.tagName !== "A") {
        e.currentTarget.style.overflowY = "auto";
      }
    });
  });

  // 添加调试信息，检查feeds数据结构
  watch(
    () => props.feeds,
    (newFeeds) => {
      if (newFeeds && newFeeds.length > 0) {
        console.log("Feeds数据结构示例:", {
          feedCount: newFeeds.length,
          firstFeed: {
            title: newFeeds[0].title,
            itemCount: newFeeds[0].items?.length || 0,
            firstItemSample: newFeeds[0].items?.[0]
              ? {
                  title: newFeeds[0].items[0].title,
                  pubDate: newFeeds[0].items[0].pubDate,
                  hasDescription: !!newFeeds[0].items[0].description,
                  hasContent: !!newFeeds[0].items[0].content,
                  hasSummary: !!newFeeds[0].items[0].summary,
                  descriptionPreview: newFeeds[0].items[0].description
                    ? newFeeds[0].items[0].description.substring(0, 50) + "..."
                    : "N/A",
                  contentPreview: newFeeds[0].items[0].content
                    ? typeof newFeeds[0].items[0].content === "string"
                      ? newFeeds[0].items[0].content.substring(0, 50) + "..."
                      : "非字符串内容"
                    : "N/A",
                  summaryPreview: newFeeds[0].items[0].summary
                    ? newFeeds[0].items[0].summary.substring(0, 50) + "..."
                    : "N/A",
                }
              : "No items",
          },
        });
      }
    },
    { immediate: true, deep: true }
  );
});

// 修改计算属性，根据窗口高度设置最佳的卡片高度
const calcMobileCardHeight = computed(() => {
  // 计算合适的高度，确保卡片底部位于适当位置
  const viewportHeight = window.innerHeight;
  // 减去顶部导航栏、标题和底部间距，为内容区域预留空间
  return viewportHeight - 120 + "px";
});
</script>

<style>
/* 卡片容器样式 */
.feed-container {
  padding: 0.5rem 1rem;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 卡片网格布局 */
.feed-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  padding: 0px;
}

/* 桌面卡片样式 */
.feed-card {
  position: relative;
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
  cursor: pointer;
  gap: 0.5rem;
  transition: all 0.3s;
  user-select: none;
  border-radius: 8px;
  background: var(--el-bg-color);
}

.dark .feed-card {
  background: var(--el-fill-color-darker);
}

.feed-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
}

/* 桌面端标题 */
.feed-title {
  font-weight: bold;
  margin: 0;
  padding: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 1.2rem;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

/* 链接列表 */
.feed-links {
  overflow-y: auto;
  max-height: 300px;
  margin-top: auto;
  flex: 1;
}

.feed-links::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.feed-links::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.dark .feed-links::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

.feed-link-item {
  padding: 6px 0;
  margin-bottom: 6px;
  position: relative;
}

.feed-link {
  display: block;
  color: var(--el-text-color-primary);
  text-decoration: none;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 0.95rem;
}

.feed-link:hover {
  color: var(--el-color-primary);
}

.feed-link:visited {
  color: var(--el-text-color-secondary);
}

.link-tooltip {
  padding: 10px 10px;
  line-height: 1.6;
  text-align: left;
  max-width: 400px;
  transition: all 0.2s;
  overflow-y: auto;
  max-height: 200px;
}

.swipe-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0;
  margin-top: 10px;
  margin-bottom: 10px;
  gap: 8px;
}

.indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.dark .indicator-dot {
  background-color: rgba(255, 255, 255, 0.2);
}

.indicator-dot.active {
  width: 12px;
  height: 12px;
  background-color: var(--el-color-primary);
}

.dark .indicator-dot.active {
  background-color: var(--el-color-primary);
}

/* Mobile Styles */
@media screen and (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }

  /* 确保卡片内容可见并可滚动 */
  .feed-link-item-mobile {
    padding: 10px 0;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    touch-action: pan-y; /* 允许垂直滚动 */
    min-height: 44px; /* iOS推荐的最小触摸高度 */
  }

  .dark .feed-link-item-mobile {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .feed-link-mobile {
    display: block;
    color: var(--el-text-color-primary);
    text-decoration: none;
    overflow: hidden;
    white-space: normal;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 1rem;
    line-height: 1.4;
    touch-action: pan-y; /* 允许垂直滚动 */
  }

  .item-title {
    font-weight: normal;
    margin-bottom: 2px;
  }

  /* 隐藏滚动条但允许滚动 */
  .mobile-card-content::-webkit-scrollbar {
    width: 0px;
    background: transparent;
    display: none;
  }

  /* 滚动指示器样式 */
  .swipe-indicator {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 8px 0;
    margin: 5px 0;
    gap: 8px;
    touch-action: none; /* 禁用该区域的默认触摸行为 */
  }
}

/* 卡片头部样式 */
.card-header {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 0.75rem 0.75rem 0 0;
  position: sticky;
  top: 0;
  z-index: 10;
  margin-bottom: 8px;
}

/* 卡片标题样式 */
.card-title {
  font-size: 1.25rem;
  font-weight: bold;
  text-align: center;
  margin: 0;
  padding: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
  margin-top: -5px; /* 减少顶部间距 */
  color: var(--el-text-color-primary);
}

/* 卡片内容区域样式 */
.card-content {
  flex: 1;
  padding: 0.5rem 0;
  overflow-y: auto;
  overflow-x: hidden;
  height: calc(100% - 3.5rem);
  border-radius: 0 0 0.75rem 0.75rem;
}

/* 隐藏滚动条 */
.card-content::-webkit-scrollbar {
  display: none;
}

.card-content {
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-behavior: smooth;
}

/* 项目列表样式 */
.items-list {
  border-top: none;
  padding-bottom: 0.75rem;
}

/* 项目样式 */
.feed-item {
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

/* 最后一个项目不需要底部边框 */
.feed-item:last-child {
  border-bottom: none;
  margin-bottom: 0.5rem;
}

/* 项目链接样式 */
.item-link {
  display: block;
  padding: 0.75rem 1rem;
  position: relative;
}

/* 项目标题样式 */
.item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.3s ease;
  position: relative;
  width: 100%;
  max-width: 100%;
  font-weight: normal;
  margin-bottom: 2px;
}

/* 项目日期样式 */
.item-date {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  opacity: 1;
  transition: all 0.3s ease;
  white-space: nowrap;
}

/* 错误信息样式 */
.error-message {
  color: #ef4444;
  padding: 1rem;
}

/* 空数据提示样式 */
.empty-message {
  text-align: center;
  padding: 1rem;
}

/* 标题提示框样式 */
.title-tooltip {
  position: fixed;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  max-width: 90%;
  width: auto !important; /* 添加 !important 确保内联样式优先级 */
  z-index: 100;
  font-size: 0.875rem;
  line-height: 1.25rem;
  pointer-events: none;
  backdrop-filter: blur(5px);
  transition: opacity 0.2s ease;
  text-align: left; /* 改为左对齐更适合阅读 */
  overflow: hidden;
}

/* 修改提示框日期样式 */
.tooltip-date {
  font-weight: 500;
  font-size: 0.85rem;
  opacity: 1;
  margin-bottom: 0.3rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px dashed rgba(160, 190, 230, 0.5);
  text-align: center;
  display: block !important; /* 确保显示 */
}

/* 亮色模式下的提示框日期样式 */
html body .app-container:not(.dark) .tooltip-date {
  color: #2563eb !important;
}

/* 暗色模式下的提示框日期样式 */
.dark .tooltip-date {
  color: #3b82f6 !important;
  border-bottom-color: rgba(75, 85, 105, 0.5);
}

.tooltip-content {
  line-height: 1.5;
  font-size: 0.85rem;
  max-height: 200px;
  overflow-y: auto;
  text-align: left;
  word-break: break-word;
  white-space: pre-line;
  text-indent: 0;
  padding: 0.25rem 0;
}

/* 移动设备滑动卡片样式 */
.feed-grid-mobile {
  width: 100%;
  height: calc(100vh - 120px);
  position: relative;
  margin-top: -10px;
  overflow: hidden;
}

.mobile-cards-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.mobile-card {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease-out;
  padding: 12px 15px;
  box-sizing: border-box;
  background: var(--el-bg-color);
  border-radius: 8px;
}

.dark .mobile-card {
  background: var(--el-fill-color-darker);
}

.card-header {
  margin-bottom: 10px;
  padding: 5px 0;
}

.card-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

/* 卡片标题 */
.card-title {
  font-weight: bold;
  margin: 0;
  padding: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 1.2rem;
  line-height: 1.4;
  margin-top: -5px;
  color: var(--el-text-color-primary);
  flex: 1;
  text-align: center;
  padding: 0 8px;
}

/* 箭头按钮样式 */
.arrow-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
  z-index: 10;
}

.arrow-btn:hover {
  opacity: 1;
}

.arrow-icon {
  font-style: normal;
  color: var(--el-color-primary);
  font-size: 14px;
}

.left-arrow {
  margin-right: 4px;
}

.right-arrow {
  margin-left: 4px;
}

/* 移动卡片内容区域 */
.mobile-card-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  padding: 0 5px 10px 5px;
  position: relative;
  height: calc(100% - 60px);
}

/* 移动卡片容器 - 处理横向滑动 */
.mobile-cards-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none; /* 由我们自己处理触摸事件 */
}

/* 滑动指示器样式 */
.swipe-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0;
  margin: 5px 0;
  gap: 8px;
  touch-action: none; /* 禁用该区域的默认触摸行为 */
}

/* 移动设备适配 */
@media (max-width: 768px) {
  .feed-container {
    padding: 0.25rem 0.5rem;
    height: calc(100vh - 9rem); /* 缩短容器高度 */
  }

  .feed-card {
    min-height: unset;
    height: 100%;
  }

  .card-header {
    padding: 0.75rem;
  }

  .card-title {
    font-size: 1.1rem;
    line-height: 1.4;
  }

  .card-content {
    padding: 0.25rem 0;
    height: calc(100% - 3rem);
  }

  .item-link {
    padding: 0.6rem 0.75rem;
  }

  .item-title {
    font-size: 0.95rem;
    line-height: 1.4;
    padding-right: 0 !important;
  }

  .item-date {
    position: relative;
    display: block;
    right: auto;
    top: auto;
    transform: none;
    margin-top: 0.3rem;
    font-size: 0.7rem;
    opacity: 0.8;
    padding: 0.15rem 0.3rem;
  }
}

/* 适配较小屏幕设备 */
@media (max-width: 480px) {
  .feed-container {
    padding: 0.15rem 0.35rem;
    height: calc(100vh - 8.5rem); /* 进一步缩短容器高度 */
  }

  .swipe-container {
    height: calc(100vh - 11rem); /* 更小的高度，让底部更靠近版权 */
  }

  .card-header {
    padding: 0.6rem;
  }

  .card-title {
    font-size: 1rem;
  }

  .item-link {
    padding: 0.5rem 0.6rem;
  }
}

/* 滚动指示器 - 内容底部渐变提示 */
.mobile-card-content::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 20px;
  background: linear-gradient(transparent, var(--el-bg-color, white));
  pointer-events: none;
  opacity: 0.8;
  z-index: 10;
}

.dark .mobile-card-content::after {
  background: linear-gradient(transparent, var(--el-fill-color-darker, #333));
}

/* 滑动提示文本 */
.swipe-tip {
  text-align: center;
  padding: 5px 0;
  font-size: 0.85rem;
  color: #909399;
  opacity: 0.8;
  margin-bottom: 8px;
  margin-top: -5px;
}

/* 保证滑动指示样式 */
.swipe-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0;
  margin: 5px 0;
  gap: 8px;
}

.indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.dark .indicator-dot {
  background-color: rgba(255, 255, 255, 0.2);
}

.indicator-dot.active {
  width: 12px;
  height: 12px;
  background-color: var(--el-color-primary);
}

/* 移动视图样式 */
.mobile-view-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.mobile-cards-container {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.3s ease;
}

.mobile-card {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  padding: 15px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative; /* 确保卡片定位正确 */
}

/* 删除重复的移动卡片容器样式 */
.feed-grid-mobile,
.mobile-cards-container:not(.mobile-cards-container:first-of-type) {
  display: none !important;
}

.card-header {
  margin-bottom: 10px;
  padding: 5px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.card-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
}

/* 卡片标题 */
.card-title {
  font-weight: bold;
  margin: 0;
  padding: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 1.2rem;
  line-height: 1.4;
  margin-top: -5px;
  color: var(--el-text-color-primary);
  flex: 1;
  text-align: center;
  padding: 0 8px;
}

/* 箭头按钮样式 */
.arrow-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
  z-index: 10;
}

.arrow-btn:hover {
  opacity: 1;
}

.arrow-icon {
  font-style: normal;
  color: var(--el-color-primary);
  font-size: 14px;
}

.left-arrow {
  margin-right: 4px;
}

.right-arrow {
  margin-left: 4px;
}

.mobile-card-content {
  flex: 1;
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch;
  padding-right: 5px;
  scrollbar-width: none; /* Firefox */
}

.mobile-card-content::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Edge */
}

/* 移动端Feed项目样式 */
.mobile-feed-item {
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding: 10px 0;
  cursor: pointer;
}

.mobile-feed-item:last-child {
  border-bottom: none;
}

.mobile-feed-item .item-title {
  font-size: 14px;
  margin-bottom: 5px;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.mobile-feed-item .item-meta {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
