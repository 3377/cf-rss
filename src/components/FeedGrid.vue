<template>
  <div
    class="grid gap-6 p-6 w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
    :style="gridStyle"
  >
    <div
      v-for="feed in feeds"
      :key="feed.url"
      class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col"
      :style="cardStyle"
    >
      <div class="p-6 border-b dark:border-gray-700">
        <h2
          class="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center"
        >
          {{ feed.title }}
        </h2>
      </div>
      <div class="p-6 flex-1 overflow-y-auto">
        <div v-if="feed.error" class="text-red-500">
          {{ feed.error }}
        </div>
        <div
          v-else-if="!feed.items.length"
          class="text-gray-500 dark:text-gray-400 text-center"
        >
          暂无内容
        </div>
        <div v-else class="space-y-5">
          <div
            v-for="item in feed.items.slice(
              0,
              config.value.display.itemsPerFeed
            )"
            :key="item.id"
            class="group"
          >
            <a
              :href="item.link"
              target="_blank"
              rel="noopener noreferrer"
              class="block hover:bg-gray-50 dark:hover:bg-gray-700 p-3 rounded"
            >
              <div class="flex flex-col gap-3">
                <h3
                  class="text-gray-800 dark:text-gray-200 group-hover:text-blue-500 dark:group-hover:text-blue-400 text-ellipsis overflow-hidden whitespace-nowrap"
                  :style="{ fontSize: `${fontSize}px` }"
                >
                  {{ item.title }}
                </h3>
                <span class="text-sm text-gray-500 dark:text-gray-400">
                  {{ formatDate(item.pubDate) }}
                </span>
              </div>
            </a>
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

// 计算样式
const gridStyle = computed(() => ({
  fontSize: `${fontSize.value}px`,
  "--card-width": `${config.value.display.cardWidth}px`,
  gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${config.value.display.cardWidth}px), 1fr))`,
}));

const cardStyle = computed(() => ({
  minHeight: `${config.value.display.cardHeight}px`,
  maxWidth: `${config.value.display.cardWidth}px`,
  margin: "0 auto",
  width: "100%",
}));

const fontSize = computed(() => {
  const size = config.value.display.fontSize;
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
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}

/* 确保内容区域有足够的高度 */
.flex-1 {
  min-height: 0;
}

/* 响应式布局调整 */
@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr !important;
  }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}

@media (min-width: 1025px) {
  .grid {
    grid-template-columns: repeat(
      auto-fit,
      minmax(min(100%, var(--card-width)), 1fr)
    ) !important;
  }
}
</style>
