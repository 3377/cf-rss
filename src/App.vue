<template>
  <div
    :class="['app-container', isDark ? 'dark bg-gray-900' : 'bg-gray-50']"
    :data-theme="isDark ? 'dark' : 'light'"
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

  // 同步更新文档根元素类
  if (isDark.value) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
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
  // 在文档根元素上设置暗色模式类，确保全局样式正确应用
  if (isDark.value) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

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
}

html body #app div.app-container:not(.dark) {
  background-color: #f5f7fa !important;
  color: #2d3748 !important;
}

html body #app div.app-container:not(.dark) {
  background-image: linear-gradient(
      to bottom,
      rgba(245, 247, 250, 0.8),
      rgba(245, 247, 250, 0.8)
    ),
    url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2U1ZTdlYiIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjIiLz4KICAgIDwvcGF0dGVybj4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIgLz4KPC9zdmc+") !important;
}

.header {
  padding: 0.75rem 1rem 0.25rem;
  flex-shrink: 0;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

html body #app div.app-container:not(.dark) .header {
  background-color: rgba(240, 242, 247, 0.9) !important;
  backdrop-filter: blur(5px) !important;
  border-bottom: 1px solid rgba(230, 235, 242, 0.8) !important;
}

.dark .header {
  border-color: #374151;
  background-color: rgba(17, 24, 39, 0.6);
}

html body #app div.app-container:not(.dark) .header-title {
  color: #2d3748 !important;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5) !important;
}

html body #app div.app-container:not(.dark) button:not(.bg-green-500) {
  background-color: rgba(240, 242, 247, 0.6) !important;
  border: 1px solid rgba(230, 235, 242, 0.8) !important;
}

html body #app div.app-container:not(.dark) button.bg-green-500 {
  background-color: #4caf50 !important;
  box-shadow: 0 2px 4px rgba(76, 175, 80, 0.2) !important;
}

html body #app div.app-container:not(.dark) button.bg-green-500:hover {
  background-color: #43a047 !important;
  box-shadow: 0 3px 6px rgba(76, 175, 80, 0.3) !important;
}

.content-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin-top: 0;
  margin-bottom: 0.75rem;
}

html body #app div.app-container:not(.dark) .content-area {
  background-color: rgba(240, 242, 247, 0.4) !important;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02) !important;
}

.dark .content-area {
  background-color: rgba(17, 24, 39, 0.3);
}

.footer {
  flex-shrink: 0;
  border-top: 1px solid #e5e7eb;
  backdrop-filter: blur(8px);
  padding-top: 0.25rem;
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.03);
}

html body #app div.app-container:not(.dark) .footer {
  background-color: rgba(240, 242, 247, 0.85) !important;
  border-top: 1px solid rgba(230, 235, 242, 0.8) !important;
}

.dark .footer {
  border-color: #374151;
  background-color: rgba(17, 24, 39, 0.6);
}

/* 全局卡片样式覆盖 */
html body #app div.app-container:not(.dark) .feed-card {
  background: rgba(245, 247, 250, 0.75) !important;
  border: 1px solid rgba(230, 235, 242, 0.8) !important;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.07) !important;
}

html body #app div.app-container:not(.dark) .card-header {
  background-color: rgba(240, 242, 247, 0.9) !important;
  border-bottom: 1px solid rgba(230, 235, 242, 0.9) !important;
}

html body #app div.app-container:not(.dark) .card-title {
  color: #2d3748 !important;
}

html body #app div.app-container:not(.dark) .card-content {
  background-color: rgba(240, 242, 247, 0.5) !important;
}

html body #app div.app-container:not(.dark) .item-link:hover {
  background: rgba(240, 242, 247, 0.8) !important;
}

html body #app div.app-container:not(.dark) .item-title {
  color: #2d3748 !important;
}

html body #app div.app-container:not(.dark) .item-link:hover .item-title {
  color: #3182ce !important;
}

html body #app div.app-container:not(.dark) .item-date {
  color: #5a6171 !important;
  background: rgba(240, 244, 248, 0.9) !important;
}

html body #app div.app-container:not(.dark) .item-link:hover .item-date {
  background: rgba(236, 240, 244, 0.95) !important;
}

html body #app div.app-container:not(.dark) .empty-message {
  color: #5a6171 !important;
}

html body #app div.app-container:not(.dark) .title-tooltip {
  background: rgba(245, 247, 250, 0.95) !important;
  color: #2d3748 !important;
  border: 1px solid rgba(230, 235, 242, 0.8) !important;
}

/* 移除全局滚动条 */
html,
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  height: 100vh;
}

body {
  background-color: #f5f7fa;
  color: #2d3748;
}

.dark body,
.dark html {
  background-color: #111827;
}

#app {
  height: 100vh;
  overflow: hidden;
}

.dark {
  color: #f3f4f6;
}

.dark .header-title {
  color: #f3f4f6;
}

.dark .status-text {
  color: #f3f4f6;
}

.dark .footer-text {
  color: #f3f4f6;
}

html body #app div.app-container:not(.dark) .text-gray-700 {
  color: #2d3748 !important;
}

html body #app div.app-container:not(.dark) .text-gray-600,
html body #app div.app-container:not(.dark) .status-text {
  color: #4a5568 !important;
}

html body #app div.app-container:not(.dark) .text-gray-500,
html body #app div.app-container:not(.dark) .footer-text {
  color: #5a6986 !important;
}

button {
  transition: all 0.2s ease-in-out;
}

@media (prefers-color-scheme: light) {
  :root {
    color-scheme: light;
    --app-background: #f5f7fa;
    --card-background: rgba(245, 247, 250, 0.75);
    --card-border: rgba(230, 235, 242, 0.8);
    --card-header: rgba(240, 242, 247, 0.9);
    --text-primary: #2d3748;
    --text-secondary: #4a5568;
  }
}
</style>
