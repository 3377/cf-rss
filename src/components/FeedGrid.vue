<template>
  <div class="feed-container">
    <div class="feed-grid" :style="gridStyle">
      <div
        v-for="feed in feeds"
        :key="feed.url"
        class="feed-card"
        :style="{
          background: !isDark
            ? 'rgba(235, 245, 255, 0.85)'
            : 'rgba(31, 41, 55, 0.9)',
          border: !isDark
            ? '1px solid rgba(210, 230, 250, 0.9)'
            : '1px solid rgba(55, 65, 81, 0.5)',
          boxShadow: !isDark
            ? '0 4px 10px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)'
            : 'none',
        }"
      >
        <!-- 标题区域 -->
        <div
          class="card-header"
          :style="{
            backgroundColor: !isDark
              ? 'rgba(225, 240, 255, 0.9)'
              : 'rgba(31, 41, 55, 0.7)',
            borderBottom: !isDark
              ? '1px solid rgba(210, 230, 250, 0.9)'
              : '1px solid #374151',
          }"
        >
          <h2 class="card-title">
            {{ feed.title }}
          </h2>
        </div>

        <!-- 内容区域 -->
        <div
          class="card-content"
          :style="{
            backgroundColor: !isDark
              ? 'rgba(230, 245, 255, 0.5)'
              : 'rgba(31, 41, 55, 1)',
            paddingBottom: '1rem',
          }"
        >
          <div v-if="feed.error" class="error-message">
            {{ feed.error }}
          </div>
          <div v-else-if="!feed.items.length" class="empty-message">
            暂无内容
          </div>
          <div v-else class="items-list">
            <div
              v-for="item in feed.items.slice(
                0,
                config.value?.display?.itemsPerFeed || 15
              )"
              :key="item.id"
              class="feed-item"
            >
              <a
                :href="item.link"
                target="_blank"
                rel="noopener noreferrer"
                class="item-link"
                @mouseenter="showTooltip($event, item.title, item.pubDate)"
                @mouseleave="hideTooltip"
                :style="{
                  marginBottom: '4px',
                }"
              >
                <h3
                  class="item-title"
                  :style="{
                    fontSize: `${fontSize}px`,
                    paddingRight: showItemDate ? '4rem' : '0.5rem',
                    color: !isDark ? '#2d3748' : '#f3f4f6',
                  }"
                >
                  {{ item.title }}
                </h3>
                <span v-if="showItemDate" class="item-date">
                  {{ formatDate(item.pubDate) }}
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 标题弹窗 -->
    <div
      v-show="tooltipVisible"
      class="title-tooltip"
      :style="{
        top: tooltipPosition.top + 'px',
        left: tooltipPosition.left + 'px',
        backgroundColor: !isDark
          ? 'rgba(235, 245, 255, 0.95)'
          : 'rgba(31, 41, 55, 0.95)',
        color: !isDark ? '#2d3748' : '#f3f4f6',
        border: !isDark
          ? '1px solid rgba(210, 230, 250, 0.9)'
          : '1px solid rgba(55, 65, 81, 0.8)',
      }"
    >
      {{ tooltipText }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, nextTick } from "vue";
import { getRSSConfig } from "../config/rss.config";

const props = defineProps({
  feeds: {
    type: Array,
    default: () => [],
    validator: (value) => {
      return value.every((feed) => {
        return (
          feed &&
          typeof feed.title === "string" &&
          typeof feed.url === "string" &&
          Array.isArray(feed.items)
        );
      });
    },
  },
  isDark: Boolean,
});

const config = ref(getRSSConfig(null));
const showItemDate = ref(config.value?.display?.showItemDate || false);

// 标题提示框相关状态
const tooltipVisible = ref(false);
const tooltipText = ref("");
const tooltipPosition = ref({ top: 0, left: 0 });

onMounted(() => {
  if (typeof window !== "undefined" && window.__RSS_CONFIG__) {
    config.value = window.__RSS_CONFIG__;
    showItemDate.value = config.value?.display?.showItemDate || false;
    console.log("Using injected config:", config.value);
  }
});

// 显示标题提示框方法
const showTooltip = (event, text, pubDate) => {
  // 获取标题元素
  const titleEl = event.target.querySelector(".item-title");

  // 只有当标题内容溢出时才显示提示框
  if (titleEl && titleEl.offsetWidth < titleEl.scrollWidth) {
    // 对于溢出的多行标题，添加时间前缀
    tooltipText.value = formatDate(pubDate) + " " + text;

    // 计算提示框位置（上方）
    const rect = titleEl.getBoundingClientRect();
    tooltipPosition.value = {
      top: rect.top + window.scrollY - 40, // 放在上方
      left: rect.left + window.scrollX,
    };

    nextTick(() => {
      tooltipVisible.value = true;
    });
  }
};

// 隐藏标题提示框方法
const hideTooltip = () => {
  tooltipVisible.value = false;
};

const formatDate = (date) => {
  return new Date(date).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// 修改网格样式计算
const gridStyle = computed(() => {
  const layout = config.value?.display?.layout || {};
  return {
    gridTemplateColumns: `repeat(4, 1fr)`,
    gap: `${layout.cardGap || 24}px`,
    maxWidth: layout.containerWidth || "1920px",
    padding: layout.containerPadding || "16px",
    margin: `0 ${layout.sideMargin || "2%"}`,
  };
});

const fontSize = computed(() => {
  const size = config.value?.display?.fontSize;
  return typeof size === "number" ? size : 16;
});
</script>

<style scoped>
.feed-container {
  padding: 0.5rem 1rem;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.feed-grid {
  display: grid;
  margin: 0 auto;
  gap: 10rem;
  padding: 0.5rem;
  width: 98%;
  height: calc(100vh - 1rem);
  overflow: hidden;
}

.feed-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  backdrop-filter: blur(5px);
  transition: all 0.3s ease;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 0.75rem;
  background: rgba(235, 245, 255, 0.85) !important;
  border: 1px solid rgba(210, 230, 250, 0.9) !important;
}

/* 使用极高优先级选择器 */
body:not(.dark) .feed-card,
html:not(.dark) .feed-card,
:root:not(.dark) .feed-card,
body:not(.dark) .app-container .feed-card,
html .app-container:not(.dark) .feed-card {
  background: rgba(235, 245, 255, 0.85) !important;
  border: 1px solid rgba(210, 230, 250, 0.9) !important;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1) !important;
}

.dark .feed-card {
  background: rgba(31, 41, 55, 0.9) !important;
  border-color: rgba(55, 65, 81, 0.5) !important;
}

.card-header {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  background-color: rgba(225, 240, 255, 0.9);
  border-bottom: 1px solid rgba(210, 230, 250, 0.9);
}

/* 使用极高优先级选择器 */
body:not(.dark) .card-header,
html:not(.dark) .card-header,
:root:not(.dark) .card-header,
body:not(.dark) .app-container .card-header,
html .app-container:not(.dark) .card-header {
  background-color: rgba(225, 240, 255, 0.9) !important;
  border-bottom: 1px solid rgba(210, 230, 250, 0.9) !important;
}

.card-title {
  font-size: 1.25rem;
  font-weight: bold;
  text-align: center;
}

html body .app-container:not(.dark) .card-title {
  color: #2d3748 !important;
}

.dark .card-title {
  color: #f3f4f6;
}

.card-content {
  flex: 1;
  padding: 0.5rem 0;
  overflow-y: auto;
  background-color: rgba(230, 245, 255, 0.5);
}

html body .app-container:not(.dark) .card-content {
  background-color: rgba(230, 245, 255, 0.5) !important;
}

.dark .card-content {
  background-color: rgba(31, 41, 55, 1);
}

.items-list {
  border-top: none;
}

.dark .items-list {
  border-color: #374151;
}

.feed-item {
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

.dark .feed-item {
  border-color: #374151;
}

.item-link {
  display: block;
  padding: 0.75rem 1rem;
  position: relative;
}

html body .app-container:not(.dark) .item-link:hover {
  background: rgba(225, 240, 255, 0.8) !important;
}

.dark .item-link:hover {
  background: rgba(55, 65, 81, 0.7);
}

.item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.3s ease;
  position: relative;
  width: 100%;
  max-width: 100%;
}

html body .app-container:not(.dark) .item-title {
  color: #2d3748 !important;
}

.dark .item-title {
  color: #f3f4f6;
}

html body .app-container:not(.dark) .item-link:hover .item-title {
  color: #3b82f6 !important;
}

.dark .item-link:hover .item-title {
  color: #3b82f6;
}

.item-date {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  opacity: 1;
  transition: all 0.3s ease;
  white-space: nowrap;
}

html body .app-container:not(.dark) .item-date {
  color: #5a6171 !important;
  background: rgba(230, 245, 255, 0.9) !important;
}

html body .app-container:not(.dark) .item-link:hover .item-date {
  background: rgba(225, 240, 255, 0.95) !important;
}

.dark .item-date {
  background: #1f2937;
  color: #9ca3af;
}

.dark .item-link:hover .item-date {
  background: rgba(55, 65, 81, 0.9);
}

.error-message {
  color: #ef4444;
  padding: 1rem;
}

.empty-message {
  text-align: center;
  padding: 1rem;
}

html body .app-container:not(.dark) .empty-message {
  color: #5a6171 !important;
}

.dark .empty-message {
  color: #9ca3af;
}

/* 标题弹窗样式 */
.title-tooltip {
  position: fixed;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  max-width: 90%;
  z-index: 100;
  font-size: 0.875rem;
  line-height: 1.25rem;
  pointer-events: none;
  backdrop-filter: blur(5px);
  transition: opacity 0.2s ease;
  text-align: left;
}

html body .app-container:not(.dark) .title-tooltip {
  background: rgba(245, 247, 250, 0.95) !important;
  color: #2d3748 !important;
  border: 1px solid rgba(230, 235, 242, 0.8) !important;
}

.dark .title-tooltip {
  background: rgba(31, 41, 55, 0.95);
  color: #f3f4f6;
  border-color: rgba(55, 65, 81, 0.8);
}

/* 自定义滚动条 */
.card-content {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.card-content::-webkit-scrollbar {
  width: 4px;
}

.card-content::-webkit-scrollbar-track {
  background: transparent;
}

.card-content::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 2px;
}

.card-content::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}

/* 响应式布局 */
@media (max-width: 768px) {
  .feed-grid {
    grid-template-columns: 1fr !important;
    gap: 1rem;
    width: 100%;
    padding: 0.5rem;
    height: calc(100vh - 7rem);
    overflow-y: auto;
  }

  .feed-card {
    height: auto;
    min-height: 300px;
    max-height: 90vh;
    margin-bottom: 1rem;
  }

  .card-header {
    padding: 0.75rem;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .card-title {
    font-size: 1.1rem;
    line-height: 1.4;
  }

  .card-content {
    padding: 0.25rem 0;
    max-height: none;
    overflow-y: auto;
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

  /* 优化标题提示框在移动端的展示 */
  .title-tooltip {
    max-width: 94%;
    left: 3% !important;
    padding: 0.5rem;
    font-size: 0.8rem;
    line-height: 1.3;
  }

  html body .app-container:not(.dark) .feed-card {
    background: rgba(235, 245, 255, 0.85) !important;
    border: 1px solid rgba(210, 230, 250, 0.9) !important;
  }

  html body .app-container:not(.dark) .item-link:active {
    background: rgba(220, 238, 255, 0.9) !important;
  }

  html body .app-container:not(.dark) .item-link:active .item-title {
    color: #3b82f6 !important;
  }
}

/* 适配中等屏幕 */
@media (min-width: 769px) and (max-width: 1200px) {
  .feed-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 1.5rem;
  }
}

/* 优化小型移动设备 */
@media (max-width: 480px) {
  .feed-container {
    padding: 0.25rem 0.5rem;
  }

  .feed-grid {
    gap: 0.75rem;
    padding: 0.25rem;
    height: calc(100vh - 6.5rem);
  }

  .feed-card {
    min-height: 250px;
    margin-bottom: 0.75rem;
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

  /* 改进小屏幕上的滚动条 */
  .card-content::-webkit-scrollbar {
    width: 3px;
  }

  html body .app-container:not(.dark) .feed-card {
    background: rgba(235, 238, 242, 0.9) !important;
  }
}

.dark .card-header {
  border-color: #374151;
  background-color: rgba(31, 41, 55, 0.7);
}

/* 暗色模式下的内容区域 */
.card-content {
  flex: 1;
  padding: 0.5rem 0;
  overflow-y: auto;
  background-color: rgba(230, 245, 255, 0.5);
}

/* 使用极高优先级选择器 */
body:not(.dark) .card-content,
html:not(.dark) .card-content,
:root:not(.dark) .card-content,
body:not(.dark) .app-container .card-content,
html .app-container:not(.dark) .card-content {
  background-color: rgba(230, 245, 255, 0.5) !important;
}

.dark .card-content {
  background-color: rgba(31, 41, 55, 1);
}
</style>
