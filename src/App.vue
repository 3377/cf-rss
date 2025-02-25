<template>
  <div
    class="app-container"
    :class="{ dark: isDark, 'bg-gray-50': !isDark }"
    :style="
      !isDark
        ? {
            backgroundColor: 'rgba(240, 245, 252, 0.95)',
            color: '#3a5075',
          }
        : {}
    "
  >
    <header
      class="app-header header"
      :style="
        !isDark
          ? {
              backgroundColor: 'rgba(230, 240, 250, 0.98)',
              borderBottom: '1px solid rgba(200, 215, 235, 0.8)',
            }
          : {}
      "
    >
      <div class="text-center mb-4">
        <h1 class="text-3xl font-bold text-gray-700 header-title">
          {{ projectName }} RSS阅读器
        </h1>
        <div class="flex justify-center items-center mb-2">
          <button
            @click="toggleDarkMode"
            class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mr-2"
          >
            {{ isDark ? "亮色" : "暗色" }}模式
          </button>
          <button
            @click="refreshFeeds"
            class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            刷新
          </button>
        </div>
      </div>
    </header>

    <main
      class="app-content content-area"
      :style="!isDark ? { backgroundColor: 'rgba(240, 245, 252, 0.95)' } : {}"
    >
      <div v-if="error" class="text-center text-red-500">
        {{ error }}
      </div>
      <FeedGrid v-else :feeds="feeds" :isDark="isDark" class="flex-1" />
    </main>

    <footer
      class="app-footer footer"
      :style="
        !isDark
          ? {
              backgroundColor: 'rgba(230, 240, 250, 0.98)',
              borderTop: '1px solid rgba(200, 215, 235, 0.8)',
              color: '#566a8c',
            }
          : {}
      "
    >
      <div class="text-center text-sm text-gray-500 footer-text py-2">
        <span>© {{ new Date().getFullYear() }} </span>
        <a
          href="https://github.com/xxxx/xxx-rss"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {{ projectName }} RSS
        </a>
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
const projectName = ref(RSS_CONFIG.display.projectName);
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

const toggleDarkMode = () => {
  isDark.value = !isDark.value;
  localStorage.setItem("theme", isDark.value ? "dark" : "light");
};

const refreshFeeds = async () => {
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
  await refreshFeeds();
  // 设置定时刷新
  refreshTimer = setInterval(refreshFeeds, RSS_CONFIG.refresh.interval * 1000);
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

/* 亮色模式全局样式增强 */
.app-container.bg-gray-50 {
  background-color: rgba(240, 245, 252, 0.95) !important;
  color: #3a5075 !important;
}

.app-container.bg-gray-50 .app-header {
  background-color: rgba(230, 240, 250, 0.98) !important;
  border-bottom: 1px solid rgba(200, 215, 235, 0.8) !important;
}

.app-container.bg-gray-50 .app-content {
  background-color: rgba(240, 245, 252, 0.95) !important;
}

.app-container.bg-gray-50 .app-footer {
  background-color: rgba(230, 240, 250, 0.98) !important;
  border-top: 1px solid rgba(200, 215, 235, 0.8) !important;
  color: #566a8c !important;
}

/* 全局按钮和链接样式增强 */
.app-container.bg-gray-50 button,
.app-container.bg-gray-50 .btn {
  background-color: rgba(220, 235, 250, 0.98) !important;
  border: 1px solid rgba(200, 215, 235, 0.8) !important;
  color: #3a5075 !important;
  transition: all 0.2s ease !important;
}

.app-container.bg-gray-50 button:hover,
.app-container.bg-gray-50 .btn:hover {
  background-color: rgba(210, 230, 248, 0.98) !important;
  border-color: rgba(180, 200, 225, 0.9) !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
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
  background: var(--card-bg, rgba(230, 240, 250, 0.95)) !important;
  border: 1px solid var(--card-border, rgba(200, 215, 235, 0.75)) !important;
}

.app-container:not(.dark) .card-header {
  background: var(--card-header-bg, rgba(220, 235, 248, 0.95)) !important;
  border-bottom: 1px solid var(--card-border, rgba(200, 215, 235, 0.75)) !important;
}

.app-container:not(.dark) .card-content {
  background: var(--card-content-bg, rgba(230, 240, 250, 0.75)) !important;
}

.app-container:not(.dark) .card-title {
  color: var(--text-primary, #3a5075) !important;
}

.app-container:not(.dark) .item-title {
  color: var(--text-primary, #3a5075) !important;
}

.app-container:not(.dark) .item-date {
  color: var(--text-secondary, #566a8c) !important;
  background: var(--card-bg, rgba(230, 240, 250, 0.95)) !important;
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
    --card-background: rgba(230, 240, 250, 0.95);
    --card-border: rgba(200, 215, 235, 0.75);
    --card-header: rgba(220, 235, 248, 0.95);
    --text-primary: #3a5075;
    --text-secondary: #566a8c;
  }
}
</style>
