<template>
  <div class="feed-container">
    <div class="feed-grid" :style="gridStyle">
      <div v-for="feed in feeds" :key="feed.url" class="feed-card">
        <!-- 标题区域 -->
        <div class="card-header">
          <h2 class="card-title">
            {{ feed.title }}
          </h2>
        </div>

        <!-- 内容区域 -->
        <div class="card-content">
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
                @mouseenter="showTooltip($event, item.title)"
                @mouseleave="hideTooltip"
              >
                <h3
                  class="item-title"
                  :style="{
                    fontSize: `${fontSize}px`,
                    paddingRight: showItemDate ? '4rem' : '0.5rem',
                  }"
                  :title="item.title"
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
    <!-- 全局浮动提示框 -->
    <div
      v-show="tooltipVisible"
      ref="tooltip"
      class="global-tooltip"
      :style="tooltipStyle"
    >
      {{ tooltipContent }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from "vue";
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

// 添加tooltip相关状态
const tooltipVisible = ref(false);
const tooltipContent = ref("");
const tooltipStyle = ref({
  top: "0px",
  left: "0px",
});
const tooltip = ref(null);

// 显示tooltip的方法
const showTooltip = (event, content) => {
  tooltipContent.value = content;
  tooltipVisible.value = true;

  // 计算位置 - 确保不超出视窗
  nextTick(() => {
    const rect = event.target.getBoundingClientRect();
    const tooltipEl = tooltip.value;

    if (tooltipEl) {
      const tooltipWidth = tooltipEl.offsetWidth;
      const tooltipHeight = tooltipEl.offsetHeight;

      // 默认显示在链接下方
      let top = rect.bottom + window.scrollY + 10;
      let left = rect.left + window.scrollX;

      // 调整避免超出右侧
      if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth - 20;
      }

      // 调整避免超出底部
      if (top + tooltipHeight > window.innerHeight) {
        top = rect.top + window.scrollY - tooltipHeight - 10;
      }

      tooltipStyle.value = {
        top: `${top}px`,
        left: `${left}px`,
      };
    }
  });
};

// 隐藏tooltip的方法
const hideTooltip = () => {
  tooltipVisible.value = false;
};

// 添加nextTick方法
const nextTick = (callback) => {
  setTimeout(callback, 0);
};

onMounted(() => {
  if (typeof window !== "undefined" && window.__RSS_CONFIG__) {
    config.value = window.__RSS_CONFIG__;
    showItemDate.value = config.value?.display?.showItemDate || false;
    console.log("Using injected config:", config.value);
  }
});

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
  background: rgba(249, 250, 251, 0.9);
  border-radius: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(229, 231, 235, 0.3);
  transition: all 0.3s ease;
}

.dark .feed-card {
  background: rgba(31, 41, 55, 0.9);
  border-color: rgba(55, 65, 81, 0.5);
}

.card-header {
  padding: 1rem;
  border-bottom: 1px solid rgba(229, 231, 235, 0.5);
  background: rgba(249, 250, 251, 0.6);
}

.dark .card-header {
  border-color: #374151;
  background: rgba(31, 41, 55, 0.6);
}

.card-title {
  font-size: 1.25rem;
  font-weight: bold;
  color: #4b5563;
  text-align: center;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);
}

.dark .card-title {
  color: #e5e7eb;
  text-shadow: none;
}

.card-content {
  flex: 1;
  padding: 0.5rem 0;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.5);
}

.dark .card-content {
  background: rgba(17, 24, 39, 0.3);
}

.items-list {
  border-top: none;
}

.dark .items-list {
  border-color: #374151;
}

.feed-item {
  border-bottom: 1px solid rgba(229, 231, 235, 0.7);
}

.dark .feed-item {
  border-color: #374151;
}

.item-link {
  display: block;
  padding: 0.75rem 1rem;
  position: relative;
  overflow: hidden;
}

.item-link:hover {
  background: rgba(243, 244, 246, 0.8);
  overflow: visible;
  z-index: 10;
}

.dark .item-link:hover {
  background: rgba(55, 65, 81, 0.5);
}

.item-title {
  color: #4b5563;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.3s ease;
  position: relative;
  width: 100%;
  max-width: 100%;
}

.dark .item-title {
  color: #e5e7eb;
}

.item-link:hover .item-title {
  color: #3b82f6;
  white-space: nowrap;
}

/* 全局浮动提示框 */
.global-tooltip {
  position: fixed;
  z-index: 1000;
  background: white;
  color: #374151;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15), 0 0 1px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  white-space: normal;
  line-height: 1.6;
  border: 1px solid rgba(229, 231, 235, 0.8);
  font-weight: normal;
  font-size: 14px;
  animation: fadeIn 0.2s ease;
  pointer-events: none; /* 允许鼠标穿透 */
  text-align: left;
  word-break: break-word;
}

.dark .global-tooltip {
  background: #1f2937;
  color: #e5e7eb;
  border-color: #374151;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), 0 0 1px rgba(0, 0, 0, 0.3);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.item-date {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  color: #6b7280;
  background: rgba(249, 250, 251, 0.9);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  opacity: 1;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.dark .item-date {
  background: #1f2937;
  color: #9ca3af;
}

.item-link:hover .item-date {
  position: relative;
  display: inline-block;
  right: auto;
  top: auto;
  transform: none;
  margin-left: 0.5rem;
  vertical-align: middle;
}

.error-message {
  color: #ef4444;
  padding: 1rem;
}

.empty-message {
  color: #6b7280;
  text-align: center;
  padding: 1rem;
}

.dark .empty-message {
  color: #9ca3af;
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
    gap: 1.5rem;
    width: 100%;
    padding: 0.5rem;
    height: calc(100vh - 1rem);
  }

  .feed-card {
    height: 100%;
  }

  .card-content {
    max-height: calc(100vh - 10rem);
  }

  .item-title {
    /* 这里的内联样式已经通过:style绑定了，不需要在CSS中重复设置 */
  }
}

/* 适配中等屏幕 */
@media (min-width: 769px) and (max-width: 1200px) {
  .feed-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 2rem;
  }
}
</style>
