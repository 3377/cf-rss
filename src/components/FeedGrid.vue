<template>
  <div :class="['grid gap-4', layout === 4 ? 'grid-cols-2' : 'grid-cols-4']">
    <div
      v-for="feed in feeds"
      :key="feed.url"
      class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
    >
      <div class="p-4 border-b dark:border-gray-700">
        <h2 class="text-xl font-bold text-gray-800 dark:text-gray-200">
          {{ feed.title }}
        </h2>
      </div>
      <div class="p-4">
        <div v-if="feed.error" class="text-red-500">
          {{ feed.error }}
        </div>
        <div
          v-else-if="!feed.items.length"
          class="text-gray-500 dark:text-gray-400"
        >
          暂无内容
        </div>
        <div v-else class="space-y-4">
          <div
            v-for="item in feed.items.slice(0, itemsToShow)"
            :key="item.id"
            class="group"
          >
            <a
              :href="item.link"
              target="_blank"
              rel="noopener noreferrer"
              class="block"
            >
              <div class="flex justify-between items-start gap-2">
                <h3
                  class="text-gray-800 dark:text-gray-200 group-hover:text-blue-500 dark:group-hover:text-blue-400 line-clamp-2"
                >
                  {{ item.title }}
                </h3>
                <span
                  class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
                >
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
  feeds: Array,
  layout: Number,
  isDark: Boolean,
});

// 获取配置
const config = ref(getRSSConfig(null)); // 初始使用默认配置

onMounted(() => {
  // 在组件挂载后获取注入的配置
  if (typeof window !== "undefined" && window.__RSS_CONFIG__) {
    config.value = window.__RSS_CONFIG__;
    console.log("Using injected config:", config.value);
  }
});

// 使用配置
const itemsToShow = computed(() => {
  return props.layout === 4
    ? config.value.display.itemsPerFeedExpanded
    : config.value.display.itemsPerFeedCompact;
});

const formatDate = (date) => {
  return new Date(date).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fontSize = computed(() => `${config.value.display.fontSize}px`);
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
