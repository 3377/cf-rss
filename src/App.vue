<template>
  <div :class="['app-container', isDark ? 'dark bg-gray-900' : 'bg-gray-100']">
    <div class="header">
      <div class="text-center mb-4">
        <h1
          class="text-3xl font-bold dark:text-gray-200 text-gray-700 app-title"
        >
          {{ appTitle }}
        </h1>
      </div>

      <div class="flex justify-between items-center">
        <div class="flex-1"></div>
        <div
          class="flex justify-center flex-1 text-base text-gray-600 dark:text-gray-400 gap-8"
        >
          <div
            v-if="loading"
            class="text-gray-600 dark:text-gray-400 font-medium status-info"
          >
            加载中...
          </div>
          <template v-else>
            <div class="status-info">下次刷新: {{ formatCountdown }}</div>
            <div class="status-info">最后更新: {{ formatLastUpdate }}</div>
          </template>
        </div>
        <div class="flex items-center gap-4 flex-1 justify-end">
          <button
            @click="toggleTheme"
            class="theme-toggle-btn p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            :title="isDark ? '切换到亮色模式' : '切换到暗色模式'"
          >
            <svg
              v-if="isDark"
              class="w-6 h-6 text-gray-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <svg
              v-else
              class="w-6 h-6 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          </button>
          <button
            @click="fetchFeeds"
            class="refresh-btn px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
            :disabled="loading"
          >
            <span v-if="loading">刷新中...</span>
            <span v-else>立即刷新</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-area">
      <div v-if="error" class="text-center text-red-500">
        {{ error }}
      </div>
      <FeedGrid v-else :feeds="feeds" :isDark="isDark" class="flex-1" />
    </div>

    <!-- 底部版权信息 -->
    <footer class="footer">
      <div class="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
        <span>© {{ new Date().getFullYear() }} </span>
        <a
          href="https://github.com/3377/cf-rss"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-500"
          >RSS Reader</a
        >.
        <span>Powered by Drfy & hstz.com. </span>
        <span>All rights reserved.</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import FeedGrid from "./components/FeedGrid.vue";
import { RSS_CONFIG } from "./config/rss.config";

const feeds = ref([]);
const loading = ref(true);
const error = ref(null);
const countdown = ref(RSS_CONFIG.refresh.interval);
const isDark = ref(
  localStorage.getItem("theme") === null
    ? RSS_CONFIG.display.defaultDarkMode
    : localStorage.getItem("theme") === "dark"
);
const appTitle = ref(RSS_CONFIG.display.appTitle);
let refreshTimer = null;
let countdownTimer = null;

const formatCountdown = computed(() => {
  const minutes = Math.floor(countdown.value / 60);
  const seconds = countdown.value % 60;
  return `${minutes}分${seconds.toString().padStart(2, "0")}秒`;
});

const formatLastUpdate = computed(() => {
  if (!feeds.value.length) return "暂无";
  const date = new Date(feeds.value[0].lastUpdate);
  return date.toLocaleString("zh-CN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
});

const toggleTheme = () => {
  isDark.value = !isDark.value;
  localStorage.setItem("theme", isDark.value ? "dark" : "light");
};

const fetchFeeds = async () => {
  try {
    loading.value = true;
    error.value = null;
    const timestamp = new Date().getTime();
    const response = await fetch(`/api/feeds?t=${timestamp}`, {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    feeds.value = await response.json();
    countdown.value = RSS_CONFIG.refresh.interval;
  } catch (err) {
    console.error("Error fetching feeds:", err);
    error.value = "加载失败，请稍后重试";
  } finally {
    loading.value = false;
  }
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

<style>
.app-container {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-image: linear-gradient(
    to bottom right,
    rgba(255, 255, 255, 0.3),
    rgba(249, 250, 251, 0.5)
  );
}

.dark.app-container {
  background-image: linear-gradient(
    to bottom right,
    rgba(17, 24, 39, 0.5),
    rgba(31, 41, 55, 0.8)
  );
}

.app-title {
  color: #4b5563;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.9);
  letter-spacing: 0.025em;
}

.dark .app-title {
  color: #e5e7eb;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.status-info {
  color: #6b7280;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  background: rgba(249, 250, 251, 0.7);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.dark .status-info {
  color: #9ca3af;
  background: rgba(31, 41, 55, 0.6);
}

.theme-toggle-btn {
  background: rgba(249, 250, 251, 0.8);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.dark .theme-toggle-btn {
  background: rgba(31, 41, 55, 0.7);
}

.refresh-btn {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: none;
  background: linear-gradient(to bottom, #10b981, #059669);
  transition: all 0.2s ease;
}

.refresh-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
  background: linear-gradient(to bottom, #059669, #047857);
}

.dark .refresh-btn {
  background: linear-gradient(to bottom, #059669, #047857);
}

.dark .refresh-btn:hover {
  background: linear-gradient(to bottom, #047857, #065f46);
}

.header {
  padding: 0.75rem 1rem 0.25rem;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(229, 231, 235, 0.5);
  margin-bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.dark .header {
  border-color: rgba(55, 65, 81, 0.5);
  background-color: rgba(17, 24, 39, 0.7);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.content-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin-top: 0;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0;
}

.footer {
  flex-shrink: 0;
  border-top: 1px solid rgba(229, 231, 235, 0.5);
  background-color: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
  padding-top: 0.25rem;
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.02);
}

.dark .footer {
  border-color: rgba(55, 65, 81, 0.5);
  background-color: rgba(17, 24, 39, 0.7);
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.1);
}

/* 移除全局滚动条 */
html,
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
}

#app {
  height: 100vh;
  overflow: hidden;
}

.dark {
  @apply text-gray-100;
}
</style>
