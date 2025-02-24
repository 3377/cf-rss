<template>
  <div class="h-screen px-8 py-4 w-full">
    <div class="grid gap-8 h-[calc(100vh-4rem)]" :style="gridStyle">
      <div
        v-for="feed in feeds"
        :key="feed.url"
        class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col"
      >
        <!-- 标题区域 -->
        <div class="p-3 border-b dark:border-gray-700">
          <h2
            class="text-xl font-bold text-gray-800 dark:text-gray-200 text-center"
          >
            {{ feed.title }}
          </h2>
        </div>

        <!-- 内容区域 -->
        <div class="flex-1 overflow-y-auto">
          <div v-if="feed.error" class="p-4 text-red-500">
            {{ feed.error }}
          </div>
          <div
            v-else-if="!feed.items.length"
            class="p-4 text-gray-500 dark:text-gray-400 text-center"
          >
            暂无内容
          </div>
          <div v-else class="divide-y divide-gray-100 dark:divide-gray-700">
            <div
              v-for="item in feed.items.slice(
                0,
                config.value?.display?.itemsPerFeed || 15
              )"
              :key="item.id"
              class="group relative"
            >
              <a
                :href="item.link"
                target="_blank"
                rel="noopener noreferrer"
                class="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <h3
                  class="text-gray-800 dark:text-gray-200 group-hover:text-blue-500 dark:group-hover:text-blue-400"
                  :style="{ fontSize: `${fontSize}px` }"
                  :title="item.title"
                >
                  {{ item.title }}
                </h3>
                <!-- 悬浮时显示的时间 -->
                <span
                  class="hidden group-hover:block absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm"
                >
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
const gridStyle = computed(() => ({
  fontSize: `${fontSize.value}px`,
  gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
  margin: "0 auto",
  maxWidth: "1920px",
}));

const fontSize = computed(() => {
  const size = config.value?.display?.fontSize;
  return typeof size === "number" ? size : 16;
});
</script>

<style scoped>
/* 自定义滚动条样式 */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 2px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}

/* 响应式布局调整 */
@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr !important;
  }

  /* 在移动端减小内边距 */
  .h-screen {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

/* 调整卡片间距 */
.gap-8 {
  gap: 2rem;
}

/* 确保内容区域不会溢出 */
.flex-1 {
  min-height: 0;
  height: 0;
}

/* 标题文本省略 */
h3 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 100px; /* 为时间预留空间 */
}
</style>
