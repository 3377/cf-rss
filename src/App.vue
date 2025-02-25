<template>
  <div :class="['app-container', isDark ? 'dark bg-gray-900' : 'bg-gray-50']">
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
          <div
            v-if="loading"
            class="text-gray-600 font-medium status-text"
          >
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
.app-container {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  /* 亮色模式背景样式 */
  background-image: linear-gradient(to bottom right, rgba(240, 245, 252, 0.8), rgba(248, 250, 252, 0.8));
  background-attachment: fixed;
}

.header {
  padding: 0.75rem 1rem 0.25rem;
  flex-shrink: 0;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 0;
  background-color: rgba(241, 245, 249, 0.85);
  backdrop-filter: blur(5px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.dark .header {
  border-color: #374151;
  background-color: rgba(17, 24, 39, 0.6);
}

.content-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin-top: 0;
  margin-bottom: 0.75rem;
  background-color: transparent;
}

.dark .content-area {
  background-color: rgba(17, 24, 39, 0.3);
}

.footer {
  flex-shrink: 0;
  border-top: 1px solid #e2e8f0;
  background-color: rgba(241, 245, 249, 0.85);
  backdrop-filter: blur(8px);
  padding-top: 0.25rem;
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.03);
}

.dark .footer {
  border-color: #374151;
  background-color: rgba(17, 24, 39, 0.6);
}

/* 移除全局滚动条 */
html,
body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  height: 100vh;
  background-color: #edf2f7;
  color: #334155;
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

.header-title {
  color: #334155 !important;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.5);
}

.dark .header-title {
  color: #f3f4f6 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.status-text {
  color: #475569 !important;
}

.dark .status-text {
  color: #f3f4f6 !important;
}

.footer-text {
  color: #475569 !important;
}

.dark .footer-text {
  color: #f3f4f6 !important;
}

.bg-gray-50 {
  background-color: #edf2f7 !important;
}

.bg-gray-900 {
  background-color: #111827 !important;
}

.text-gray-700 {
  color: #334155 !important;
}

button {
  transition: all 0.2s ease-in-out;
}

/* 自定义按钮样式 */
button.px-3 {
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

button.px-3:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

/* 添加轻微的背景纹理 */
.app-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23a0aec0' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  opacity: 0.4;
  z-index: -1;
  pointer-events: none;
}

.dark .app-container::before {
  opacity: 0.15;
}
</style>
