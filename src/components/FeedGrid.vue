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
                @mouseenter="showTooltip($event, item.title, item.pubDate)"
                @mouseleave="hideTooltip"
              >
                <h3
                  class="item-title"
                  :style="{
                    fontSize: `${fontSize}px`,
                    paddingRight: showItemDate ? '4rem' : '0.5rem',
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
  background: rgba(242, 245, 250, 0.9);
  border-radius: 0.6rem;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(226, 232, 240, 0.7);
  transition: all 0.3s ease;
}

.feed-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 4px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.dark .feed-card {
  background: rgba(31, 41, 55, 0.9);
  border-color: rgba(55, 65, 81, 0.5);
}

.card-header {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  background-color: rgba(248, 250, 252, 0.8);
  position: relative;
  overflow: hidden;
}

.card-header::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(203, 213, 225, 0.5),
    transparent
  );
}

.dark .card-header {
  border-color: #374151;
  background-color: rgba(31, 41, 55, 0.7);
}

.dark .card-header::after {
  background: linear-gradient(
    to right,
    transparent,
    rgba(55, 65, 81, 0.6),
    transparent
  );
}

.card-title {
  font-size: 1.25rem;
  font-weight: bold;
  color: #334155;
  text-align: center;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.5);
}

.dark .card-title {
  color: #f3f4f6;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.card-content {
  flex: 1;
  padding: 0.5rem 0;
  overflow-y: auto;
  background-color: rgba(248, 250, 252, 0.7);
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
  border-bottom: 1px solid #e2e8f0;
  position: relative;
}

.feed-item:last-child {
  border-bottom: none;
}

.feed-item::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 15%;
  right: 15%;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(203, 213, 225, 0.5),
    transparent
  );
}

.feed-item:last-child::after {
  display: none;
}

.dark .feed-item {
  border-color: #374151;
}

.dark .feed-item::after {
  background: linear-gradient(
    to right,
    transparent,
    rgba(55, 65, 81, 0.6),
    transparent
  );
}

.item-link {
  display: block;
  padding: 0.75rem 1rem;
  position: relative;
  transition: all 0.2s ease;
}

.item-link:hover {
  background: rgba(241, 245, 249, 0.7);
}

.dark .item-link:hover {
  background: rgba(55, 65, 81, 0.7);
}

.item-title {
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.3s ease;
  position: relative;
  width: 100%;
  max-width: 100%;
  font-weight: 500;
}

.dark .item-title {
  color: #f3f4f6;
}

.item-link:hover .item-title {
  color: #3b82f6;
}

.item-date {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  color: #64748b;
  background: rgba(248, 250, 252, 0.9);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  opacity: 1;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.item-link:hover .item-date {
  background: rgba(241, 245, 249, 0.95);
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
  color: #64748b;
  text-align: center;
  padding: 1rem;
}

.dark .empty-message {
  color: #9ca3af;
}

/* 标题弹窗样式 */
.title-tooltip {
  position: fixed;
  background: rgba(248, 250, 252, 0.97);
  color: #334155;
  padding: 0.6rem 0.9rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05);
  max-width: 90%;
  z-index: 100;
  font-size: 0.875rem;
  line-height: 1.4;
  pointer-events: none;
  border: 1px solid rgba(226, 232, 240, 0.8);
  backdrop-filter: blur(8px);
  transition: opacity 0.2s ease, transform 0.2s ease;
  text-align: left;
  transform: translateY(0);
  animation: tooltipFade 0.2s ease-out;
}

@keyframes tooltipFade {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dark .title-tooltip {
  background: rgba(31, 41, 55, 0.97);
  color: #f3f4f6;
  border-color: rgba(55, 65, 81, 0.8);
}

/* 自定义滚动条 */
.card-content {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.4) transparent;
}

.card-content::-webkit-scrollbar {
  width: 4px;
}

.card-content::-webkit-scrollbar-track {
  background: transparent;
}

.card-content::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.4);
  border-radius: 2px;
}

.card-content::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.6);
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
