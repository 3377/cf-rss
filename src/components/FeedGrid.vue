<template>
  <div class="grid gap-4 p-4 w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
    <div
      v-for="feed in feeds"
      :key="feed.url"
      class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col h-[calc(100vh-2rem)] sm:h-[600px]"
    >
      <div class="p-4 border-b dark:border-gray-700">
        <h2
          class="text-xl font-bold text-gray-800 dark:text-gray-200 text-center"
        >
          {{ feed.title }}
        </h2>
      </div>
      <div class="p-4 flex-1 overflow-y-auto">
        <div v-if="feed.error" class="text-red-500">
          {{ feed.error }}
        </div>
        <div
          v-else-if="!feed.items.length"
          class="text-gray-500 dark:text-gray-400 text-center"
        >
          暂无内容
        </div>
        <div v-else class="space-y-4">
          <div v-for="item in feed.items" :key="item.id" class="group">
            <a
              :href="item.link"
              target="_blank"
              rel="noopener noreferrer"
              class="block hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
            >
              <div class="flex flex-col gap-2">
                <h3
                  class="text-gray-800 dark:text-gray-200 group-hover:text-blue-500 dark:group-hover:text-blue-400 text-ellipsis overflow-hidden whitespace-nowrap"
                >
                  {{ item.title }}
                </h3>
                <span class="text-xs text-gray-500 dark:text-gray-400">
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

const fontSize = computed(() => config.value.display.fontSize);
</script>

<style scoped>
/* 自定义滚动条样式 */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.7);
}
</style>
