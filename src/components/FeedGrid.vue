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
// 添加主题切换状态
const isThemeSwitching = ref(false);

// 监听主题变化
watch(
  () => props.isDark,
  (newVal, oldVal) => {
    if (newVal !== oldVal && isLoaded.value) {
      // 主题切换时，添加禁用过渡的类
      isThemeSwitching.value = true;
      document.body.classList.add("theme-switching");

      // 300ms后移除类，恢复过渡效果
      setTimeout(() => {
        document.body.classList.remove("theme-switching");
        isThemeSwitching.value = false;
      }, 300);
    }
  }
);

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

  // 延迟设置加载完成状态，添加平滑过渡
  setTimeout(() => {
    isLoaded.value = true;
  }, 300);

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

    // 修改定位逻辑，将提示框放在元素的左侧
    let left = rect.left - tooltipRect.width - 8; // 默认放在左侧，并留出8px间距
    let top = rect.top;

    // 如果左侧空间不足，则显示在右侧
    if (left < 20) {
      left = rect.right + 8; // 放在右侧，并留出8px间距

      // 如果右侧也没有足够空间，则居中显示在下方
      if (left + tooltipRect.width > window.innerWidth - 20) {
        left = Math.max(20, rect.left + (rect.width - tooltipRect.width) / 2);
        top = rect.bottom + 8;
      }
    }

    // 确保提示框不超出屏幕顶部和底部
    if (top + tooltipRect.height > window.innerHeight - 20) {
      top = Math.max(20, window.innerHeight - tooltipRect.height - 20);
    }

    if (top < 20) {
      top = 20;
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

/* 主题切换时禁用过渡效果，防止闪烁 */
.theme-switching,
.theme-switching * {
  transition: none !important;
}

/* 确保背景色始终不透明 */
.app-container,
.feed-container,
.feed-grid,
.feed-card,
.card-header,
.card-content,
.items-list {
  background: var(--el-bg-color) !important;
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
  background: var(--el-bg-color) !important;
  transition: opacity 0.5s ease;
}

.feed-container.loaded {
  opacity: 1;
}

/* ---------- 网格布局 ---------- */
.feed-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(min-content, auto);
  gap: 24px;
  flex: 1;
  overflow-y: auto;
  padding: 1%;
  height: 100%;
  -webkit-overflow-scrolling: touch;
  background: var(--el-bg-color) !important;
  margin-top: -30px;
  margin-bottom: -30px;
}

/* ---------- 卡片样式 ---------- */
.feed-card {
  background: var(--el-bg-color) !important;
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  height: calc(100vh - 180px);
  max-height: calc(100vh - 180px);
  overflow: hidden;
  margin: 0;
  border: 1px solid var(--el-border-color-lighter);
  position: relative;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.loaded .feed-card {
  opacity: 1;
  transform: translateY(0);
}

/* 添加暗色模式下卡片的紫粉渐变背景 */
.dark .feed-card {
  background-image: linear-gradient(
    to top,
    #a18cd1 0%,
    #fbc2eb 100%
  ) !important;
  background-color: transparent !important;
  border: 1px solid rgba(200, 180, 255, 0.3) !important;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3) !important;
  transition: all 0.3s ease;
}

.dark .feed-card:hover {
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4) !important;
  transform: translateY(-2px);
}

/* 暗色模式下调整卡片内容区域背景，使其半透明以便显示渐变背景 */
.dark .card-content {
  background: rgba(30, 20, 60, 0.75) !important;
  backdrop-filter: blur(5px);
}

/* 暗色模式下调整卡片头部背景，使其半透明以便显示渐变背景 */
.dark .card-header {
  background: rgba(50, 50, 60, 0.85) !important;
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(161, 140, 209, 0.5) !important;
}

/* ---------- 卡片头部 ---------- */
.card-header {
  padding: 0.75rem;
  background: var(--el-bg-color) !important;
  position: sticky;
  top: 0;
  z-index: 10;
  border-radius: 1rem 1rem 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 3.5rem;
  transition: none !important;
  margin: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
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
  background: var(--el-bg-color) !important;
  transition: none !important;
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
    background: var(--el-bg-color);
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
    padding: 0.4rem !important;
    border-radius: 0 !important;
    min-height: 2.5rem !important;
    margin: 0 !important;
  }

  .card-title {
    font-size: 1rem !important;
    margin: 0 !important;
    padding: 0 !important;
    line-height: 1.2 !important;
  }

  .mobile-card-content {
    border-radius: 0 !important;
    padding: 0.25rem 15px !important;
  }

  .feed-link-item-mobile {
    padding: 6px 0 !important;
    border-bottom: 1px solid var(--el-border-color-lighter);
    touch-action: pan-y;
    min-height: 32px !important;
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
    font-size: 0.95rem !important;
    line-height: 1.3 !important;
    touch-action: pan-y;
  }

  .mobile-card {
    padding: 0 !important;
    border-radius: 0 !important;
  }

  .mobile-card .card-header {
    margin: 0 !important;
    padding: 0.4rem !important;
    border-radius: 0 !important;
    background: var(--el-bg-color);
    border-bottom: 1px solid var(--el-border-color-lighter) !important;
    min-height: 2.5rem !important;
  }

  .mobile-card-content {
    margin: 0 !important;
    padding: 0.25rem 15px !important;
    border-radius: 0 !important;
    background: var(--el-bg-color);
  }

  /* 移除所有圆角设置 */
  .card-content,
  .mobile-card-content,
  .feed-card,
  .mobile-card,
  .card-header,
  .mobile-card .card-header {
    border-radius: 0 !important;
  }

  /* 确保标题容器也没有圆角 */
  .mobile-card .card-header,
  .card-header {
    border-top-left-radius: 0 !important;
    border-top-right-radius: 0 !important;
  }

  /* 移动端卡片容器样式重置 */
  .feed-grid-mobile {
    border-radius: 0 !important;
    background: var(--el-bg-color) !important;
  }

  .mobile-cards-container {
    border-radius: 0 !important;
    background: var(--el-bg-color) !important;
  }

  .mobile-card {
    border-radius: 0 !important;
    background: var(--el-bg-color) !important;
  }

  /* 标题区域样式重置 */
  .mobile-card .card-header,
  .card-header {
    border-radius: 0 !important;
    border-top-left-radius: 0 !important;
    border-top-right-radius: 0 !important;
    border-bottom-left-radius: 0 !important;
    border-bottom-right-radius: 0 !important;
    background: var(--el-bg-color) !important;
  }

  /* 内容区域样式重置 */
  .mobile-card-content {
    border-radius: 0 !important;
    background: var(--el-bg-color) !important;
  }

  /* 覆盖任何可能的圆角样式 */
  *[class*="card"],
  *[class*="header"],
  *[class*="content"] {
    border-radius: 0 !important;
  }

  /* 移动端基础样式重置 */
  .feed-grid-mobile,
  .mobile-cards-container,
  .mobile-card,
  .mobile-card-content,
  .mobile-card .card-header,
  .card-header {
    border-radius: 0 !important;
    margin: 0 !important;
    background: var(--el-bg-color) !important;
  }

  /* 移动端卡片头部样式 */
  .mobile-card .card-header {
    padding: 0.4rem !important;
    min-height: 2.5rem !important;
    border-bottom: 1px solid var(--el-border-color-lighter) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  /* 移动端卡片内容样式 */
  .mobile-card-content {
    padding: 0.25rem 15px !important;
    margin: 0 !important;
  }

  /* 移除所有可能的圆角设置 */
  *[class*="card"],
  *[class*="header"],
  *[class*="content"] {
    border-radius: 0 !important;
  }
}

/* ---------- 移动设备滑动卡片 ---------- */
.feed-grid-mobile {
  width: 100%;
  height: calc(100vh - 70px);
  position: relative;
  margin-top: 0;
  overflow: hidden;
  border-radius: 0 !important;
  background: var(--el-bg-color);
}

.mobile-cards-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
  border-radius: 0 !important;
  background: var(--el-bg-color);
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
  padding: 0;
  box-sizing: border-box;
  background: var(--el-bg-color);
  border-radius: 0 !important;
  box-shadow: none;
  overflow: hidden;
  border: none;
}

.dark .mobile-card {
  background: var(--el-fill-color-darker);
}

/* 移动端卡片头部基础样式 */
.mobile-card .card-header {
  padding: 0.4rem;
  min-height: 2.5rem;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0 !important;
  margin: 0 !important;
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
  background: var(--el-bg-color) !important;
}

/* 桌面端卡片圆角设置 */
@media (min-width: 769px) {
  .card-content,
  .feed-card {
    border-radius: 1rem;
    background: var(--el-bg-color) !important;
  }

  .card-header {
    border-radius: 1rem 1rem 0 0;
    border-bottom: 1px solid #94a3b8 !important;
    background: var(--el-bg-color) !important;
    margin: -1px;
    width: calc(100% + 2px);
    position: relative;
    z-index: 1;
  }

  .card-content {
    border-radius: 0 0 1rem 1rem;
    background: var(--el-bg-color) !important;
    margin-top: -1px;
    position: relative;
    z-index: 0;
  }

  /* 亮色模式下的分隔线颜色 */
  html body .app-container:not(.dark) .feed-item {
    border-bottom: 1px solid #94a3b8;
  }

  html body .app-container:not(.dark) .feed-item:last-child {
    border-bottom: none;
  }
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
  color: #ffffff !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
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

/* 暗色模式下调整项目标题颜色 */
.dark .item-title {
  color: rgba(255, 255, 255, 0.95) !important;
}

/* 暗色模式下调整链接和悬停效果 */
.dark .item-link {
  color: rgba(255, 255, 255, 0.9) !important;
}

.dark .item-link:hover {
  color: #ffd1fb !important;
  background: rgba(255, 255, 255, 0.1) !important;
}

.dark .item-link:hover .item-title {
  color: #ffd1fb !important;
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

/* 暗色模式下调整日期样式 */
.dark .item-date {
  color: rgba(255, 255, 255, 0.75) !important;
  background: rgba(30, 20, 60, 0.5) !important;
  padding: 0.25rem 0.5rem !important;
  border-radius: 0.25rem !important;
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

/* 暗色模式下的链接悬停效果 */
.dark .item-link:hover .item-date {
  color: #ffd1fb !important;
  background: rgba(40, 30, 80, 0.7) !important;
  opacity: 1;
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

/* 添加暗色模式下的提示框紫色渐变背景 */
.dark .title-tooltip {
  background-image: none !important;
  background-color: rgba(30, 30, 35, 0.85) !important; /* 暗灰色半透明背景 */
  backdrop-filter: blur(10px) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35) !important;
  color: #ffffff !important;
}

.dark .tooltip-content {
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.15) !important;
  padding: 0.5rem !important;
  border-radius: 0.375rem !important;
  margin-top: 0.25rem !important;
  backdrop-filter: blur(3px) !important;
}

.dark .tooltip-date {
  color: #ffffff !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3) !important;
  padding-bottom: 0.5rem !important;
  font-weight: bold !important;
  text-shadow: 0 1px 0px rgba(0, 0, 0, 0.3) !important;
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
  color: #8566c9 !important;
  border-bottom: 1px dashed rgba(161, 140, 209, 0.5) !important;
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

/* 修改卡片内容的样式 */
html body .app-container:not(.dark) .card-header {
  background: linear-gradient(
    to right,
    rgba(161, 140, 209, 0.8) 0%,
    rgba(251, 194, 235, 0.8) 100%
  ) !important;
  backdrop-filter: blur(8px) !important;
  border-bottom: 2px solid rgba(161, 140, 209, 0.8) !important;
  color: #5a4a8a !important;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5) !important;
}

html body .app-container:not(.dark) .feed-card {
  background: rgba(255, 255, 255, 0.85) !important;
  border: 1px solid rgba(161, 140, 209, 0.8) !important;
  box-shadow: 0 6px 16px rgba(161, 140, 209, 0.2),
    0 3px 6px rgba(161, 140, 209, 0.1) !important;
}

html body .app-container:not(.dark) .item-link:hover {
  background: linear-gradient(
    to right,
    rgba(251, 194, 235, 0.15),
    rgba(161, 140, 209, 0.15)
  ) !important;
  color: #8566c9 !important;
  transition: all 0.3s ease;
}

html body .app-container:not(.dark) .item-title {
  color: #5a4a8a !important;
  transition: color 0.3s ease;
}

html body .app-container:not(.dark) .item-link:hover .item-title {
  color: #8566c9 !important;
}

html body .app-container:not(.dark) .tooltip-date {
  color: #8566c9 !important;
  border-bottom: 1px dashed rgba(161, 140, 209, 0.5) !important;
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

/* 移除预加载状态的透明效果 */
.feed-container::before {
  display: none !important;
}

/* ---------- 暗色模式覆盖样式（强制执行） ---------- */
html body .app-container.dark .card-header,
html body .dark .card-header {
  background: rgba(50, 50, 60, 0.85) !important;
  backdrop-filter: blur(8px) !important;
  border-bottom: 1px solid rgba(161, 140, 209, 0.5) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
}

html body .app-container.dark .title-tooltip,
html body .dark .title-tooltip {
  background-image: none !important;
  background-color: rgba(30, 30, 35, 0.85) !important;
  backdrop-filter: blur(10px) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.35) !important;
}
</style>
