<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
    <div class="border-b pb-2 mb-3">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
        {{ feed.title }}
      </h2>
      <div class="text-xs text-gray-500">
        Last updated: {{ formatDate(feed.lastUpdate) }}
      </div>
    </div>

    <div class="space-y-2">
      <div v-if="feed.error" class="text-red-500 text-sm">
        Error: {{ feed.error }}
      </div>
      <div v-else-if="feed.items.length === 0" class="text-gray-500 text-sm">
        No items available
      </div>
      <div
        v-else
        v-for="(item, index) in feed.items"
        :key="item.id"
        class="text-sm hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded"
      >
        <span class="text-gray-500 mr-2">{{ index + 1 }}.</span>
        <a
          :href="item.link"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-600 dark:text-blue-400 hover:underline"
        >
          {{ item.title }}
        </a>
        <span class="text-xs text-gray-500 ml-2">
          {{ formatDate(item.pubDate) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { format, parseISO } from "date-fns";

const props = defineProps({
  feed: {
    type: Object,
    required: true,
  },
});

const formatDate = (dateStr) => {
  try {
    if (!dateStr) return "Unknown date";
    const date = parseISO(dateStr);
    return format(date, "yyyy-MM-dd HH:mm");
  } catch (error) {
    console.error("Date formatting error:", error);
    return "Invalid date";
  }
};
</script>

<style scoped>
.hover\:bg-gray-50:hover {
  transition: background-color 0.2s;
}
</style>
