<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
    <div class="container mx-auto">
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-200">
            RSS Reader
          </h1>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            Next refresh in: {{ formatCountdown }}
          </div>
        </div>
        <div class="flex items-center gap-4">
          <button
            @click="fetchFeeds"
            class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            :disabled="loading"
          >
            <span v-if="loading">Refreshing...</span>
            <span v-else>Refresh Now</span>
          </button>
          <button
            @click="toggleLayout"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {{ layout === 4 ? "8 Blocks" : "4 Blocks" }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="text-center text-gray-600 dark:text-gray-400">
        Loading feeds...
      </div>
      <div v-else-if="error" class="text-center text-red-500">
        {{ error }}
      </div>
      <FeedGrid v-else :layout="layout" :feeds="feeds" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import FeedGrid from "./components/FeedGrid.vue";
import { RSS_CONFIG } from "./config/rss.config";

const layout = ref(4);
const feeds = ref([]);
const loading = ref(true);
const error = ref(null);
const countdown = ref(RSS_CONFIG.refresh.interval);
let refreshTimer = null;
let countdownTimer = null;

const formatCountdown = computed(() => {
  const minutes = Math.floor(countdown.value / 60);
  const seconds = countdown.value % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
});

const fetchFeeds = async () => {
  try {
    loading.value = true;
    error.value = null;
    const response = await fetch("/api/feeds");
    if (!response.ok) {
      throw new Error("Failed to fetch feeds");
    }
    feeds.value = await response.json();
    // 重置倒计时
    countdown.value = RSS_CONFIG.refresh.interval;
  } catch (err) {
    console.error("Error fetching feeds:", err);
    error.value = "Failed to load feeds. Please try again later.";
  } finally {
    loading.value = false;
  }
};

const toggleLayout = () => {
  layout.value = layout.value === 4 ? 8 : 4;
};

const updateCountdown = () => {
  countdown.value--;
  if (countdown.value <= 0) {
    countdown.value = RSS_CONFIG.refresh.interval;
  }
};

onMounted(async () => {
  await fetchFeeds();
  // 设置定时刷新
  refreshTimer = setInterval(fetchFeeds, RSS_CONFIG.refresh.interval * 1000);
  // 设置倒计时更新
  countdownTimer = setInterval(updateCountdown, 1000);
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
});
</script>
