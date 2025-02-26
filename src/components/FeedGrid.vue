<template>
  <div class="feed-container">
    <div
      v-if="!feeds || feeds.length === 0"
      class="flex items-center justify-center h-full"
    >
      <div class="text-gray-500 empty-message">暂无数据</div>
    </div>
    <div v-else>
      <!-- 移动端视图：滑动卡片 -->
      <div v-if="isMobile" class="swipe-container" ref="swipeContainer">
        <!-- 滑动指示器 -->
        <div class="swipe-indicator" v-if="feeds.length > 1">
          <div
            v-for="(feed, index) in feeds"
            :key="'indicator-' + index"
            class="indicator-dot"
            :class="{ active: index === currentCardIndex }"
          ></div>
        </div>

        <div class="mobile-cards-container" ref="mobileCardsContainer">
          <div
            v-for="(feed, index) in feeds"
            :key="feed.title"
            class="feed-card mobile-card"
            :class="{ active: index === currentCardIndex }"
            :style="{
              transform: `translateX(${(index - currentCardIndex) * 100}%)`,
            }"
          >
            <div class="card-header">
              <h2 class="card-title">{{ feed.title }}</h2>
            </div>
            <div class="card-content mobile-card-content">
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
                    @mouseleave="!isMobile && hideTooltip"
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
import { ref, computed, onMounted, watchEffect, watch, onUnmounted } from "vue";
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
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;
let touchStartTime = 0;
let isScrolling = false;
let isHorizontalSwipe = false;
let resizeObserver = null;

// 移动端导航方法
const nextCard = () => {
  if (currentCardIndex.value < props.feeds.length - 1) {
    currentCardIndex.value++;
  }
};

const prevCard = () => {
  if (currentCardIndex.value > 0) {
    currentCardIndex.value--;
  }
};

// 检测设备类型
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

// 处理触摸事件
const handleTouchStart = (e) => {
  if (!isMobile.value) return;

  try {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
    isScrolling = false;
    isHorizontalSwipe = false;
  } catch (error) {
    console.error("触摸事件处理错误:", error);
  }
};

const handleTouchMove = (e) => {
  if (!isMobile.value) return;

  try {
    touchEndX = e.touches[0].clientX;
    touchEndY = e.touches[0].clientY;

    // 确定滑动方向
    const deltaX = Math.abs(touchEndX - touchStartX);
    const deltaY = Math.abs(touchEndY - touchStartY);

    // 如果垂直滑动明显大于水平滑动，标记为垂直滚动
    if (!isHorizontalSwipe && deltaY > deltaX && deltaY > 10) {
      isScrolling = true;
      return;
    }

    // 如果水平滑动明显大于垂直滑动，标记为水平滑动
    if (!isScrolling && deltaX > deltaY && deltaX > 10) {
      isHorizontalSwipe = true;

      // 阻止页面滚动
      if (e.cancelable) {
        e.preventDefault();
      }

      // 计算滑动距离百分比
      const swipeDist = touchEndX - touchStartX;
      const maxDist = window.innerWidth * 0.5; // 最大滑动距离为屏幕宽度的一半
      const percentage =
        Math.min(Math.abs(swipeDist) / maxDist, 1) * (swipeDist < 0 ? -1 : 1);

      // 如果滑动距离足够大，应用动态位移
      if (Math.abs(percentage) > 0.05) {
        const cards = document.querySelectorAll(".mobile-card");
        cards.forEach((card, index) => {
          card.style.transform = `translateX(calc(${
            (index - currentCardIndex.value) * 100
          }% + ${percentage * 50}px))`;
        });
      }
    }
  } catch (error) {
    console.error("触摸移动处理错误:", error);
  }
};

const handleTouchEnd = (e) => {
  if (!isMobile.value) return;

  try {
    // 计算滑动速度和距离
    const touchTime = Date.now() - touchStartTime;
    const swipeDistance = touchEndX - touchStartX;
    const swipeSpeed = Math.abs(swipeDistance) / touchTime;

    // 只有在水平滑动且不是内容滚动的情况下才处理翻页
    if (isHorizontalSwipe && !isScrolling) {
      // 滑动阈值：较慢滑动需要更长距离，快速滑动只需短距离
      const swipeThreshold = swipeSpeed > 0.5 ? 30 : 80;

      if (
        swipeDistance < -swipeThreshold &&
        currentCardIndex.value < props.feeds.length - 1
      ) {
        // 向左滑动，下一页
        nextCard();
      } else if (swipeDistance > swipeThreshold && currentCardIndex.value > 0) {
        // 向右滑动，上一页
        prevCard();
      }
    }

    // 无论如何，重置所有卡片位置
    setTimeout(() => {
      const cards = document.querySelectorAll(".mobile-card");
      cards.forEach((card, index) => {
        card.style.transform = `translateX(${
          (index - currentCardIndex.value) * 100
        }%)`;
      });
    }, 50);

    // 重置状态
    touchStartX = 0;
    touchEndX = 0;
    touchStartY = 0;
    touchEndY = 0;
    isScrolling = false;
    isHorizontalSwipe = false;
  } catch (error) {
    console.error("触摸结束处理错误:", error);
  }
};

// 监听窗口大小变化
onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);

  // 添加触摸事件监听 - 使用更可靠的初始化方法
  const addTouchEvents = () => {
    if (swipeContainer.value) {
      swipeContainer.value.removeEventListener("touchstart", handleTouchStart);
      swipeContainer.value.removeEventListener("touchmove", handleTouchMove);
      swipeContainer.value.removeEventListener("touchend", handleTouchEnd);

      swipeContainer.value.addEventListener("touchstart", handleTouchStart, {
        passive: true,
      });
      swipeContainer.value.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      swipeContainer.value.addEventListener("touchend", handleTouchEnd, {
        passive: true,
      });

      console.log("移动端触摸事件已初始化");
    }
  };

  // 初始设置和窗口大小变化时添加事件
  addTouchEvents();
  window.addEventListener("resize", addTouchEvents);

  // 使用ResizeObserver监听容器大小变化
  resizeObserver = new ResizeObserver(() => {
    checkMobile();
    addTouchEvents();
  });

  if (swipeContainer.value) {
    resizeObserver.observe(swipeContainer.value);
  }
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);

  if (swipeContainer.value) {
    swipeContainer.value.removeEventListener("touchstart", handleTouchStart);
    swipeContainer.value.removeEventListener("touchmove", handleTouchMove);
    swipeContainer.value.removeEventListener("touchend", handleTouchEnd);
  }

  if (resizeObserver) {
    resizeObserver.disconnect();
  }
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
  padding: 0.5rem;
  width: 98%;
  height: calc(100vh - 10rem);
  margin: 0 auto;
}

/* 卡片样式 */
.feed-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-radius: 0.75rem;
  transition: all 0.3s ease;
}

/* 卡片头部样式 */
.card-header {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 0.75rem 0.75rem 0 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

/* 卡片标题样式 */
.card-title {
  font-size: 1.25rem;
  font-weight: bold;
  text-align: center;
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
.swipe-container {
  width: 100%;
  height: calc(100vh - 12rem); /* 减少高度，使卡片底部靠近版权位置 */
  position: relative;
  touch-action: pan-x;
  display: flex;
  flex-direction: column;
}

/* 滑动指示器样式 */
.swipe-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.25rem 0 0;
  margin-bottom: 0.5rem;
  gap: 0.5rem;
}

.indicator-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background-color: rgba(229, 231, 235, 0.6);
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.dark .indicator-dot {
  background-color: rgba(75, 85, 99, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.indicator-dot.active {
  background-color: #3b82f6;
  width: 0.75rem;
  height: 0.75rem;
  transform: scale(1.1);
}

.dark .indicator-dot.active {
  background-color: #60a5fa;
}

/* 移动端卡片内容滚动样式 */
.mobile-card-content {
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch;
  height: 100%;
  position: relative;
  padding: 0.5rem 0 0.25rem;
  box-sizing: border-box;
}

.mobile-card-content::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.mobile-card-content {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.mobile-card .items-list {
  padding-bottom: 1rem;
  height: auto;
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
  transition: transform 0.3s ease;
}

/* 允许移动端卡片标题不被截断，支持两行显示 */
@media (max-width: 768px) {
  .item-title {
    white-space: normal;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .feed-item {
    padding: 0.1rem 0;
  }

  .item-link {
    padding: 0.6rem 0.75rem;
    min-height: 2.5rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
}

/* 添加内容滚动提示 */
.mobile-card-content::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 20px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.05), transparent);
  pointer-events: none;
}

.dark .mobile-card-content::after {
  background: linear-gradient(to top, rgba(255, 255, 255, 0.05), transparent);
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
</style>
