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
      <div v-for="(item, index) in feed.items" :key="item.id" class="text-sm">
        <span class="text-gray-500 mr-2">{{ index + 1 }}.</span>
        <span class="text-gray-700 dark:text-gray-300">{{ item.title }}</span>
        <span class="text-xs text-gray-500 ml-2">
          {{ formatDate(item.pubDate) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { format } from "date-fns";

const props = defineProps({
  feed: {
    type: Object,
    required: true,
  },
});

const formatDate = (date) => {
  return format(new Date(date), "yyyy-MM-dd HH:mm");
};
</script>
