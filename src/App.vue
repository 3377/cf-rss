<template>
  <div
    :class="['app-container', isDark ? 'dark bg-gray-900' : 'bg-gray-50']"
    :style="
      !isDark
        ? {
            '--card-bg': 'rgba(230, 240, 250, 0.95)',
            '--card-header-bg': 'rgba(220, 235, 248, 0.95)',
            '--card-content-bg': 'rgba(230, 240, 250, 0.75)',
            '--card-border': 'rgba(200, 215, 235, 0.75)',
            '--text-primary': '#3a5075',
            '--text-secondary': '#566a8c',
          }
        : {}
    "
  >
    <div class="header">
      <div class="text-center mb-4">
        <h1 class="text-3xl font-bold text-gray-700 header-title">
          {{ appTitle }}
        </h1>
      </div>

      <div class="flex justify-between items-center">
        <div class="flex-1"></div>
        <div
          class="flex justify-center flex-1 text-base text-gray-600 status-text gap-8"
        >
          <div v-if="loading" class="text-gray-600 font-medium status-text">
            加载中...
          </div>
          <template v-else>
            <div>下次刷新: {{ formatCountdown }}</div>
            <div>最后更新: {{ formatLastUpdate }}</div>
          </template>
        </div>
        <div class="flex items-center gap-4 flex-1 justify-end">
          <button
            @click="toggleTheme"
            class="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
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
            class="px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-sm"
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
      <div class="text-center text-sm text-gray-500 footer-text py-2">
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
/* 颜色变量 */
:root {
  --app-bg: #f7fafc;
  --app-text: #2d3748;
  --app-header-bg: rgba(247, 250, 252, 0.9);
  --app-header-border: #e2e8f0;
  --app-card-bg: rgba(255, 255, 255, 0.9);
  --app-card-hover: rgba(237, 242, 247, 0.85);
  --app-footer-bg: rgba(247, 250, 252, 0.9);
  --app-button-bg: #edf2f7;
  --app-button-text: #4a5568;
  --app-item-hover: #ebf4ff;
}

.dark {
  --app-bg: #1a202c;
  --app-text: #f7fafc;
  --app-header-bg: rgba(26, 32, 44, 0.8);
  --app-header-border: #2d3748;
  --app-card-bg: rgba(26, 32, 44, 0.6);
  --app-card-hover: rgba(45, 55, 72, 0.5);
  --app-footer-bg: rgba(26, 32, 44, 0.8);
  --app-button-bg: #2d3748;
  --app-button-text: #e2e8f0;
  --app-item-hover: #2c5282;
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--app-bg);
  color: var(--app-text);
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* 亮色模式全局样式 */
.app-container:not(.dark) {
  background-color: #f2f4f8 !important;
  color: #3a5075 !important;
}

.app-header {
  background-color: var(--app-header-bg);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--app-header-border);
  padding: 0.75rem 1.5rem;
  position: sticky;
  top: 0;
  z-index: 50;
  transition: all 0.3s ease;
}

.app-container:not(.dark) .app-header {
  background-color: rgba(235, 240, 245, 0.95) !important;
  border-bottom: 1px solid rgba(200, 215, 235, 0.75) !important;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}

.app-container:not(.dark) .app-title {
  color: #3a5075 !important;
}

.header-controls {
  display: flex;
  gap: 0.75rem;
}

.theme-toggle {
  border: none;
  background-color: var(--app-button-bg);
  color: var(--app-button-text);
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.app-container:not(.dark) .theme-toggle {
  background-color: rgba(220, 235, 250, 0.95) !important;
  color: #3a5075 !important;
  border: 1px solid rgba(200, 215, 235, 0.75) !important;
}

.theme-toggle:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.app-content {
  flex: 1;
  width: 100%;
  height: calc(100vh - 4rem);
  overflow: hidden;
}

.app-footer {
  background-color: var(--app-footer-bg);
  backdrop-filter: blur(10px);
  border-top: 1px solid var(--app-header-border);
  padding: 0.75rem;
  text-align: center;
  font-size: 0.875rem;
  position: sticky;
  bottom: 0;
  z-index: 10;
}

.app-container:not(.dark) .app-footer {
  background-color: rgba(235, 240, 245, 0.95) !important;
  border-top: 1px solid rgba(200, 215, 235, 0.75) !important;
  color: #566a8c !important;
}

/* 全局卡片样式优化 */
.app-container:not(.dark) .feed-card {
  background-color: rgba(220, 235, 250, 0.95) !important;
  border: 1px solid rgba(200, 215, 235, 0.75) !important;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05) !important;
}

.app-container:not(.dark) .card-header {
  background-color: rgba(210, 230, 248, 0.98) !important;
  border-bottom: 1px solid rgba(200, 215, 235, 0.8) !important;
}

.app-container:not(.dark) .card-content {
  background-color: rgba(220, 235, 250, 0.95) !important;
}

.app-container:not(.dark) .item-link {
  background-color: rgba(220, 235, 250, 0.95) !important;
  border-bottom: 1px solid rgba(200, 215, 235, 0.4) !important;
}

.app-container:not(.dark) .item-link:hover {
  background: rgba(210, 230, 248, 0.98) !important;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .app-header {
    padding: 0.5rem 1rem;
  }

  .app-title {
    font-size: 1.125rem;
  }

  .app-content {
    height: calc(100vh - 3.5rem);
  }

  .app-footer {
    padding: 0.5rem;
    font-size: 0.75rem;
  }
}
</style>
