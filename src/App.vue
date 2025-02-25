<template>
  <div
    :class="['app-container', isDark ? 'dark bg-gray-900' : 'bg-gray-50']"
    :style="
      !isDark
        ? {
            '--card-bg': 'rgba(210, 230, 250, 1)',
            '--card-header-bg': 'rgba(200, 225, 248, 1)',
            '--card-content-bg': 'rgba(210, 230, 250, 1)',
            '--card-border': 'rgba(180, 205, 240, 0.85)',
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
import { getRSSConfig, RSS_CONFIG } from "./config/rss.config";

const feeds = ref([]);
const loading = ref(true);
const error = ref(null);
const countdown = ref(RSS_CONFIG.refresh?.interval || 300);
const isDark = ref(
  localStorage.getItem("theme") === null
    ? RSS_CONFIG.display?.defaultDarkMode
    : localStorage.getItem("theme") === "dark"
);
const appTitle = ref(RSS_CONFIG.display?.appTitle || "CF RSS");
let refreshTimer = null;
let countdownTimer = null;

const formatCountdown = computed(() => {
  const minutes = Math.floor(countdown.value / 60);
  const seconds = countdown.value % 60;
  return `${minutes}分${seconds.toString().padStart(2, "0")}秒`;
});

const formatLastUpdate = computed(() => {
  if (!feeds.value.length) return "暂无";
  const date = new Date(feeds.value[0].lastUpdate || new Date());
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

    // 由于没有实际的 API 调用或 parseRSSFeeds 函数
    // 这里使用模拟数据
    setTimeout(() => {
      feeds.value = [
        {
          title: "示例RSS源",
          url: "https://example.com/rss",
          lastUpdate: new Date().toISOString(),
          items: [
            {
              id: "1",
              title: "示例新闻1",
              link: "https://example.com/news/1",
              pubDate: new Date().toISOString(),
            },
            {
              id: "2",
              title: "示例新闻2",
              link: "https://example.com/news/2",
              pubDate: new Date().toISOString(),
            },
          ],
        },
      ];
      countdown.value = RSS_CONFIG.refresh?.interval || 300;
      loading.value = false;
    }, 500);
  } catch (err) {
    console.error("Error fetching feeds:", err);
    error.value = "加载失败，请稍后重试";
    loading.value = false;
  }
};

const updateCountdown = () => {
  countdown.value--;
  if (countdown.value <= 0) {
    countdown.value = RSS_CONFIG.refresh?.interval || 300;
  }
};

onMounted(async () => {
  await fetchFeeds();
  // 设置定时刷新
  refreshTimer = setInterval(
    fetchFeeds,
    (RSS_CONFIG.refresh?.interval || 300) * 1000
  );
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

/* 亮色模式样式 - 更高优先级 */
html body .app-container.bg-gray-50 {
  background-color: #f2f4f8 !important;
  background-image: linear-gradient(
      to bottom,
      rgba(242, 244, 248, 0.8),
      rgba(242, 244, 248, 0.85)
    ),
    url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2U1ZTdlYiIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjE1Ii8+CiAgICA8L3BhdHRlcm4+KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIgLz4KPC9zdmc+") !important;
}

.header {
  padding: 0.75rem 1rem 0.25rem;
  flex-shrink: 0;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

html body .app-container.bg-gray-50 .header {
  background-color: rgba(242, 244, 248, 0.8) !important;
  backdrop-filter: blur(8px) !important;
  border-bottom: 1px solid rgba(230, 235, 242, 0.5) !important;
}

.dark .header {
  border-color: #374151;
  background-color: rgba(17, 24, 39, 0.6);
}

html body .app-container.bg-gray-50 .header-title {
  color: #3a5075 !important;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.3) !important;
}

html body .app-container.bg-gray-50 button:not(.bg-green-500) {
  background-color: rgba(230, 240, 250, 0.5) !important;
  border: 1px solid rgba(200, 215, 235, 0.5) !important;
}

html body .app-container.bg-gray-50 button.bg-green-500 {
  background-color: #5cbc7d !important;
  box-shadow: 0 2px 4px rgba(92, 188, 125, 0.12) !important;
}

html body .app-container.bg-gray-50 button.bg-green-500:hover {
  background-color: #52a871 !important;
  box-shadow: 0 3px 6px rgba(92, 188, 125, 0.15) !important;
}

.content-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin-top: 0;
  margin-bottom: 0.75rem;
}

html body .app-container.bg-gray-50 .content-area {
  background-color: rgba(242, 244, 248, 0.35) !important;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.01) !important;
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

html body .app-container.bg-gray-50 .footer {
  background-color: rgba(242, 244, 248, 0.75) !important;
  border-top: 1px solid rgba(230, 235, 242, 0.5) !important;
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
}

body {
  background-color: #f2f4f8;
  color: #445163;
}

.dark body,
.dark html {
  background-color: #111827;
  color: #f3f4f6;
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

.text-gray-700 {
  color: #4b5563;
}

html body .app-container.bg-gray-50 .text-gray-600 {
  color: #566a8c !important;
}

html body .app-container.bg-gray-50 .text-gray-500 {
  color: #6b7f9e !important;
}

button {
  transition: all 0.2s ease-in-out;
}

/* 应用CSS变量到卡片 */
.app-container:not(.dark) .feed-card {
  background: var(--card-bg, rgba(210, 230, 250, 1)) !important;
  border: 1px solid var(--card-border, rgba(180, 205, 240, 0.85)) !important;
}

.app-container:not(.dark) .card-header {
  background: var(--card-header-bg, rgba(200, 225, 248, 1)) !important;
  border-bottom: 1px solid var(--card-border, rgba(180, 205, 240, 0.85)) !important;
}

.app-container:not(.dark) .card-content {
  background: var(--card-content-bg, rgba(210, 230, 250, 1)) !important;
}

.app-container:not(.dark) .card-title {
  color: var(--text-primary, #3a5075) !important;
}

.app-container:not(.dark) .item-title {
  color: var(--text-primary, #3a5075) !important;
}

.app-container:not(.dark) .item-date {
  color: var(--text-secondary, #566a8c) !important;
  background: var(--card-bg, rgba(210, 230, 250, 1)) !important;
}

/* 移动端优化样式 */
@media (max-width: 768px) {
  .header {
    padding: 0.5rem 0.75rem 0.25rem;
  }

  .header-title {
    font-size: 1.5rem !important;
    margin-bottom: 0.5rem;
  }

  .status-text {
    font-size: 0.8rem;
    gap: 0.5rem !important;
  }

  .footer {
    padding: 0.25rem 0;
  }

  .footer-text {
    font-size: 0.75rem;
  }

  button.bg-green-500 {
    padding: 0.35rem 0.75rem !important;
    font-size: 0.8rem !important;
  }

  button:not(.bg-green-500) {
    padding: 0.35rem !important;
  }

  button svg {
    width: 1.25rem;
    height: 1.25rem;
  }
}

/* 小型移动设备优化 */
@media (max-width: 480px) {
  .app-container {
    overflow-x: hidden;
  }

  .header {
    padding: 0.4rem 0.5rem 0.2rem;
  }

  .header-title {
    font-size: 1.25rem !important;
    margin-bottom: 0.4rem;
  }

  .status-text {
    font-size: 0.75rem;
    flex-direction: column;
    gap: 0.1rem !important;
    line-height: 1.3;
  }

  /* 移动端状态显示优化 */
  .flex.justify-between.items-center {
    flex-direction: column;
    gap: 0.5rem;
  }

  .flex.justify-between.items-center > div {
    width: 100%;
    justify-content: center;
    text-align: center;
  }

  .flex.items-center.gap-4.flex-1.justify-end {
    justify-content: center;
    margin-top: 0.2rem;
  }

  .footer-text {
    font-size: 0.7rem;
    padding: 0.25rem 0;
    display: flex;
    flex-direction: column;
    line-height: 1.4;
  }
}

@media (prefers-color-scheme: light) {
  :root {
    color-scheme: light;
    --app-background: #f2f4f8;
    --card-background: rgba(210, 230, 250, 1);
    --card-border: rgba(180, 205, 240, 0.85);
    --card-header: rgba(200, 225, 248, 1);
    --text-primary: #3a5075;
    --text-secondary: #566a8c;
  }
}
</style>
