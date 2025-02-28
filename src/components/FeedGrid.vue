<template>
  <div class="feed-container" :class="{ loaded: isLoaded }">
    <div
      v-if="!feeds || feeds.length === 0"
      class="flex items-center justify-center h-full"
    >
      <div class="text-gray-500 empty-message">暂无数据</div>
    </div>
    <div v-else>
      <!-- 移动端视图：滑动卡片 -->
      <div
        v-if="isMobile"
        class="feed-grid-mobile"
        ref="swipeContainer"
        :style="{ height: calcMobileCardHeight }"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <!-- 滑动指示器 -->

        <div class="mobile-cards-container" ref="mobileCardsContainer">
          <div
            v-for="(feed, index) in feeds"
            :key="feed.title"
            class="mobile-card"
            :class="{ active: index === currentCardIndex }"
            :style="{
              transform: `translateX(${(index - currentCardIndex) * 100}%)`,
            }"
          >
            <!-- 标题区域 - 可滑动区域的一部分 -->
            <div class="card-header">
              <h2 class="card-title">{{ feed.title }}</h2>
            </div>

            <!-- 内容区域 - 允许垂直滚动 -->
            <div class="mobile-card-content">
              <div class="items-list">
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
                    class="feed-link-item-mobile"
                  >
                    <a
                      :href="item.link"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="feed-link-mobile"
                    >
                      <div class="item-title">{{ item.title }}</div>
                      <div v-if="showItemDate" class="item-date">
                        {{ formatDate(item.pubDate) }}
                      </div>
                    </a>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- 滑动指示器 -->
        <div class="swipe-indicator" v-if="feeds.length > 1">
          <div
            v-for="(feed, index) in feeds"
            :key="'indicator-' + index"
            class="indicator-dot"
            :class="{ active: index === currentCardIndex }"
          ></div>
        </div>
      </div>

      <!-- 桌面端视图：网格卡片 -->
      <div v-else class="feed-grid" :style="gridStyle">
        <div v-for="feed in feeds" :key="feed.title" class="feed-card">
          <div class="card-header">
            <h2 class="card-title">{{ feed.title }}</h2>
          </div>
          <div class="card-content">
            <div class="items-list">
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
                  class="feed-item"
                >
                  <a
                    :href="item.link"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="item-link"
                    @mouseover="
                      !isMobile &&
                        showTooltip(
                          $event,
                          item.pubDate,
                          item.description || item.content || item.summary
                        )
                    "
                    @mouseleave="!isMobile && hideTooltip()"
                  >
                    <div class="item-title">{{ item.title }}</div>
                    <div v-if="showItemDate" class="item-date">
                      {{ formatDate(item.pubDate) }}
                    </div>
                  </a>
                </div>
                <div v-if="feed.items.length > 0" class="h-2"></div>
              </template>
            </div>
          </div>
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
import {
  ref,
  computed,
  onMounted,
  watchEffect,
  watch,
  onUnmounted,
  nextTick,
} from "vue";
import { format, parseISO } from "date-fns";
import { RSS_CONFIG } from "../config/rss.config";

const props = defineProps({
  feeds: {
    type: Array,
    default: () => [],
  },
  isDark: {
    type: Boolean,
    default: false,
  },
});

// 获取配置
const showItemDate = ref(RSS_CONFIG.display?.showItemDate || false);
const dateFormat = ref(RSS_CONFIG.display?.dateFormat || "yyyy-MM-dd HH:mm");

// 移动端检测和滑动相关状态
const isMobile = ref(false);
const currentCardIndex = ref(0);
const swipeContainer = ref(null);
const mobileCardsContainer = ref(null);
let startX = 0;
let startY = 0;
let resizeObserver = null;

// 添加加载状态
const isLoaded = ref(false);

// 移动端导航方法
const nextCard = () => {
  if (currentCardIndex.value < props.feeds.length - 1) {
    currentCardIndex.value++;
  } else {
    // 到达最后一个时，循环回第一个
    currentCardIndex.value = 0;
  }
};

const prevCard = () => {
  if (currentCardIndex.value > 0) {
    currentCardIndex.value--;
  } else {
    // 到达第一个时，循环到最后一个
    currentCardIndex.value = props.feeds.length - 1;
  }
};

// 检测设备类型
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

// 简单直接的触摸开始事件
const handleTouchStart = (e) => {
  // 只记录水平位置，不关心垂直滚动
  startX = e.touches[0].clientX;
  console.log("触摸开始", startX);
};

// 触摸移动事件 - 保持为空函数
const handleTouchMove = (e) => {
  // 不进行任何处理
};

// 触摸结束事件 - 直接判断是否滑动足够距离
const handleTouchEnd = (e) => {
  // 获取结束位置
  const endX = e.changedTouches[0].clientX;

  // 计算水平移动距离
  const diffX = startX - endX;
  console.log("触摸结束，水平移动", diffX);

  // 简单判断：如果移动足够距离，则切换卡片
  if (Math.abs(diffX) > 50) {
    if (diffX > 0) {
      // 向左滑动 -> 下一页
      nextCard();
      console.log("向左滑动，切换到下一卡片");
    } else if (diffX < 0) {
      // 向右滑动 -> 上一页
      prevCard();
      console.log("向右滑动，切换到上一卡片");
    }
  }
};

// 初始化滑动功能
const initSwipe = () => {
  const container = document.querySelector(".feed-grid-mobile");
  if (!container) {
    console.error("找不到滑动容器");
    return;
  }

  console.log("初始化滑动事件", container);

  // 先移除可能已存在的监听器
  container.removeEventListener("touchstart", handleTouchStart);
  container.removeEventListener("touchmove", handleTouchMove);
  container.removeEventListener("touchend", handleTouchEnd);

  // 添加新的监听器
  container.addEventListener("touchstart", handleTouchStart, { passive: true });
  container.addEventListener("touchmove", handleTouchMove, { passive: true });
  container.addEventListener("touchend", handleTouchEnd, { passive: true });

  // 给内容区域单独绑定滚动处理
  const contentElements = document.querySelectorAll(".mobile-card-content");
  contentElements.forEach((el) => {
    if (el) {
      el.style.overflow = "auto";
      el.style.webkitOverflowScrolling = "touch";
    }
  });
};

// 组件挂载时只进行设备检查
onMounted(() => {
  // 确保 DOM 和样式都已加载
  document.documentElement.style.setProperty(
    "--el-bg-color",
    getComputedStyle(document.documentElement).getPropertyValue("--el-bg-color")
  );

  // 延迟设置加载完成状态
  setTimeout(() => {
    isLoaded.value = true;
  }, 100);

  checkMobile();
  window.addEventListener("resize", checkMobile);

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

// 组件卸载时清理资源
onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
});

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

// 修改显示提示框的方法
const showTooltip = (event, date, content) => {
  // 如果是移动设备，则不显示提示框
  if (isMobile.value) return;

  // 设置内容预览
  tooltipContent.value = getContentPreview(content);

  // 格式化并设置日期，使用更安全的处理方式
  try {
    if (date) {
      tooltipDate.value = formatDate(date);
    } else {
      tooltipDate.value = "未知时间";
    }
  } catch (error) {
    console.error("处理日期时出错:", error);
    tooltipDate.value = "日期错误";
  }

  showTooltipText.value = true;

  // 延迟计算位置，确保DOM已更新
  setTimeout(() => {
    if (!tooltip.value) return;

    const rect = event.target.getBoundingClientRect();
    const tooltipRect = tooltip.value.getBoundingClientRect();

    // 计算最佳位置（优先显示在元素下方）
    let top = rect.bottom + 8;
    const left = Math.min(
      Math.max(rect.left, 20),
      window.innerWidth - tooltipRect.width - 20
    );

    // 检查是否超出屏幕底部，如果是则显示在元素上方
    if (top + tooltipRect.height > window.innerHeight - 20) {
      top = rect.top - tooltipRect.height - 8;
    }

    tooltipStyle.value = {
      opacity: 1,
      top: `${top}px`,
      left: `${left}px`,
      width: tooltipConfig.value.width,
      maxWidth: tooltipConfig.value.width,
    };
  }, 10);
};

const hideTooltip = () => {
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
/* ---------- 初始化样式 ---------- */
:root {
  --feed-transition-duration: 0.3s;
}

/* ---------- 主容器样式 ---------- */
.feed-container {
  height: calc(100vh - 65px);
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 0;
  opacity: 0;
  animation: fadeIn 0.3s ease-out forwards;
  will-change: opacity;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* ---------- 网格布局 ---------- */
.feed-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(min-content, auto);
  gap: 16px;
  flex: 1;
  overflow-y: auto;
  padding: 1.5%;
  height: 100%;
  -webkit-overflow-scrolling: touch;
  opacity: 0;
  animation: fadeIn 0.3s ease-out 0.1s forwards;
  will-change: opacity, transform;
  margin-top: -20px;
}

/* ---------- 卡片样式 ---------- */
.feed-card {
  background: var(--el-bg-color);
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 180px);
  max-height: calc(100vh - 180px);
  overflow: hidden;
  transition: all var(--feed-transition-duration) ease;
  margin: 0;
  border: 1px solid var(--el-border-color-lighter);
  opacity: 0;
  animation: cardFadeIn 0.3s ease-out 0.2s forwards;
  will-change: opacity, transform;
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ---------- 卡片头部 ---------- */
.card-header {
  padding: 0.75rem;
  background: var(--el-bg-color);
  position: sticky;
  top: 0;
  z-index: 10;
  border-radius: 1rem 1rem 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 3.5rem;
}

/* ---------- 卡片内容区域 ---------- */
.card-content {
  flex: 1;
  overflow-y: scroll;
  padding: 0.3rem 0 0 0;
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 0 0 1rem 1rem;
  -webkit-overflow-scrolling: touch;
  height: calc(100% - 60px);
  background: var(--el-bg-color);
}

/* ---------- 链接区域 ---------- */
.feed-links {
  flex: 1;
  overflow-y: auto !important;
}

/* ---------- 项目列表 ---------- */
.items-list {
  padding: 0;
  margin: 0;
  list-style-type: none;
  overflow-y: scroll;
  height: 100%;
  flex: 1;
  -webkit-overflow-scrolling: touch;
}

/* ---------- 链接项样式 ---------- */
.feed-link-item {
  padding: 6px 0;
  margin-bottom: 6px;
  position: relative;
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
}

.feed-link-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.item-link {
  display: block;
  padding: 0.5rem 0.25rem;
  color: var(--el-text-color-primary);
  text-decoration: none;
  position: relative;
  transition: all 0.2s ease;
  width: 100%;
}

.item-link:hover {
  color: var(--el-color-primary);
  background: transparent;
}

/* ---------- 移动设备适配 ---------- */
@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }

  .feed-container {
    height: calc(100vh - 55px);
    padding: 0;
    margin: 0;
  }

  .feed-grid {
    padding-bottom: 1rem;
  }

  .feed-card {
    height: auto;
    min-height: 350px;
    max-height: none;
  }

  .card-header {
    padding: 0.5rem;
    border-radius: 0 !important;
    min-height: 2.5rem;
    margin: 0;
    background: transparent;
  }

  .card-title {
    font-size: 1rem;
    margin: 0;
    padding: 0;
    line-height: 1.3;
  }

  .feed-link-item-mobile {
    padding: 6px 0;
    border-bottom: 1px solid var(--el-border-color-lighter);
    touch-action: pan-y;
    min-height: 32px;
  }

  .feed-link-mobile {
    font-size: 0.95rem;
    line-height: 1.3;
  }

  .mobile-card .card-header {
    margin: 0;
    padding: 0.5rem;
    border-radius: 0 !important;
    background: transparent;
    border-bottom: 1px solid var(--el-border-color-lighter);
    min-height: 2.5rem;
  }

  .mobile-card-content {
    border-radius: 0 !important;
    margin: 0;
    padding: 0.25rem 15px;
  }
}

/* ---------- 移动设备滑动卡片 ---------- */
.feed-grid-mobile {
  width: 100%;
  height: calc(100vh - 70px);
  position: relative;
  margin-top: 0;
  overflow: hidden;
  border-radius: 0.75rem;
}

.mobile-cards-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
  border-radius: 0.75rem;
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
  border-radius: 1.2rem !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
}

.dark .mobile-card {
  background: var(--el-fill-color-darker);
}

/* ---------- 移动端卡片头部 ---------- */
.mobile-card .card-header {
  margin: -12px -15px 0;
  padding: 0.75rem;
  border-radius: 1.2rem 1.2rem 0 0 !important;
  background: var(--el-bg-color);
  border-bottom: none;
  min-height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ---------- 错误和空数据提示 ---------- */
.error-message {
  color: #ef4444;
  padding: 1rem;
}

.empty-message {
  text-align: center;
  padding: 1rem;
}

/* ---------- 全局设置 ---------- */
html,
body,
#app,
.app-container {
  height: 100%;
  width: 100%;
  overflow: hidden;
  overscroll-behavior: none;
  background: var(--el-bg-color);
}

/* 确保全局所有卡片组件都有圆角 */
.card-content,
.mobile-card-content,
.feed-card,
.mobile-card {
  border-radius: 1rem !important;
}

/* 明确设置卡片头部和内容区域的圆角 */
.card-header,
.mobile-card .card-header {
  border-top-left-radius: 1rem !important;
  border-top-right-radius: 1rem !important;
  border-bottom-left-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}

.card-content,
.mobile-card-content {
  border-top-left-radius: 0 !important;
  border-top-right-radius: 0 !important;
  border-bottom-left-radius: 1rem !important;
  border-bottom-right-radius: 1rem !important;
}

/* ---------- 滑动指示器 ---------- */
.swipe-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0;
  margin: 5px 0;
  gap: 8px;
  touch-action: none;
}

.indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--el-text-color-disabled);
  transition: all 0.2s ease;
}

.indicator-dot.active {
  width: 12px;
  height: 12px;
  background-color: var(--el-color-primary);
}

/* ---------- 卡片标题 ---------- */
.card-title {
  font-size: 1.15rem;
  font-weight: 600;
  text-align: center;
  margin: 0;
  padding: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.dark .card-title {
  color: var(--el-text-color-primary);
}

/* ---------- 项目标题 ---------- */
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
  padding-right: 0;
  color: var(--el-text-color-primary);
}

/* ---------- 项目日期 ---------- */
.item-date {
  position: absolute;
  right: 0.25rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  padding: 0.25rem 0;
  opacity: 0.8;
  transition: all 0.3s ease;
  white-space: nowrap;
  color: var(--el-text-color-secondary);
  background: var(--el-bg-color);
}

.item-link:hover .item-date {
  opacity: 1;
}

/* ---------- 项目链接样式 ---------- */
.item-link {
  display: block;
  padding: 0.5rem 0.25rem;
  color: var(--el-text-color-primary);
  text-decoration: none;
  position: relative;
  transition: all 0.2s ease;
  width: 100%;
}

.item-link:hover {
  color: var(--el-color-primary);
  background: transparent;
}

/* ---------- 链接访问状态 ---------- */
.feed-link:visited,
.dark .feed-link:visited {
  color: var(--el-text-color-secondary);
}

.dark .feed-link {
  color: var(--el-text-color-primary);
}

/* ---------- 提示框样式 ---------- */
.title-tooltip {
  position: fixed;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 90%;
  width: auto !important;
  z-index: 100;
  font-size: 0.875rem;
  line-height: 1.25rem;
  pointer-events: none;
  backdrop-filter: blur(5px);
  transition: opacity 0.2s ease;
  text-align: left;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
}

.tooltip-date {
  font-weight: 500;
  font-size: 0.85rem;
  opacity: 1;
  margin-bottom: 0.3rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px solid var(--el-border-color-lighter);
  text-align: center;
  display: block !important;
  color: var(--el-color-primary) !important;
}

html body .app-container:not(.dark) .tooltip-date {
  color: #2563eb !important;
}

.dark .tooltip-date {
  color: #3b82f6 !important;
  border-bottom-color: rgba(75, 85, 105, 0.5);
}

.tooltip-content {
  font-size: 0.85rem;
  max-height: 200px;
  overflow-y: auto;
  text-align: left;
  word-break: break-word;
  white-space: pre-line;
  text-indent: 0;
  padding: 0.25rem 0;
  color: var(--el-text-color-primary);
}

/* ---------- 卡片内的项目 ---------- */
.feed-item {
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-bottom: 0.5rem;
  position: relative;
  padding: 0 0.25rem;
  width: 100%;
}

.feed-item:last-child {
  border-bottom: none;
  margin-bottom: 2rem;
}

/* 移除所有特定于亮色模式的样式覆盖 */
html body .app-container .card-content,
html body .app-container .mobile-card-content,
html body .app-container .items-list,
html body .app-container .feed-grid {
  overflow-y: scroll !important;
  -webkit-overflow-scrolling: touch !important;
}

/* 统一滚动条隐藏 */
.card-content::-webkit-scrollbar,
.mobile-card-content::-webkit-scrollbar,
.items-list::-webkit-scrollbar,
.feed-grid::-webkit-scrollbar,
.feed-links::-webkit-scrollbar {
  display: none;
}

.card-content,
.mobile-card-content,
.items-list,
.feed-grid,
.feed-links {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

/* 预加载状态 */
.feed-container::before {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--el-bg-color);
  z-index: 9999;
  opacity: 1;
  transition: opacity 0.3s ease-out;
  pointer-events: none;
}

.feed-container.loaded::before {
  opacity: 0;
}
</style>
