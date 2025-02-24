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
              >
                <h3
                  class="item-title"
                  :style="{ fontSize: `${fontSize}px` }"
                  :title="item.title"
                >
                  {{ item.title }}
                </h3>
                <span class="item-date">
                  {{ formatDate(item.pubDate) }}
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from "vue";
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

onMounted(() => {
  if (typeof window !== "undefined" && window.__RSS_CONFIG__) {
    config.value = window.__RSS_CONFIG__;
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
  padding: 1rem;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.feed-grid {
  display: grid;
  margin: 0 auto;
  gap: 10rem;
  padding: 1rem;
  width: 98%;
  height: calc(100vh - 2rem);
  overflow: hidden;
}

.feed-card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.dark .feed-card {
  background: #1f2937;
}

.card-header {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.dark .card-header {
  border-color: #374151;
}

.card-title {
  font-size: 1.25rem;
  font-weight: bold;
  color: #1f2937;
  text-align: center;
}

.dark .card-title {
  color: #e5e7eb;
}

.card-content {
  flex: 1;
  padding: 0.5rem 0;
  overflow-y: auto;
}

.items-list {
  border-top: 1px solid #e5e7eb;
}

.dark .items-list {
  border-color: #374151;
}

.feed-item {
  border-bottom: 1px solid #e5e7eb;
}

.dark .feed-item {
  border-color: #374151;
}

.item-link {
  display: block;
  padding: 0.75rem 1rem;
  position: relative;
}

.item-link:hover {
  background: #f3f4f6;
}

.dark .item-link:hover {
  background: #374151;
}

.item-title {
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 4rem;
  transition: all 0.3s ease;
  position: relative;
}

.dark .item-title {
  color: #e5e7eb;
}

.item-link:hover .item-title {
  color: #3b82f6;
  white-space: normal;
  overflow: visible;
  padding-right: 0;
}

.item-date {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  color: #6b7280;
  background: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  opacity: 1;
  transition: all 0.3s ease;
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

.dark .item-date {
  background: #1f2937;
  color: #9ca3af;
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
    gap: 3rem;
    width: 100%;
    padding: 0.5rem;
    height: calc(100vh - 1rem);
  }

  .feed-card {
    height: 100%;
  }
}
</style>
