<template>
  <div
    :class="['app-container', isDark ? 'dark' : 'bg-gray-50']"
    :style="
      isDark
        ? { backgroundColor: '#111827', color: '#f3f4f6' }
        : {
            backgroundColor: 'rgba(225, 235, 252, 0.98)',
            color: '#2d4a7a',
            backgroundImage:
              'linear-gradient(to bottom, rgba(225, 235, 252, 0.95), rgba(230, 240, 250, 0.98))',
          }
    "
  >
    <div
      class="header"
      :style="
        isDark
          ? {}
          : {
              backgroundColor: 'rgba(210, 225, 245, 0.98)',
              borderBottom: '1px solid rgba(190, 210, 235, 0.9)',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
            }
      "
    >
      <div class="header-left">
        <h1
          class="header-title"
          :style="isDark ? {} : { color: '#2d4a7a', fontWeight: '600' }"
        >
          CF RSS
        </h1>
      </div>

      <div class="header-right">
        <button
          :style="
            isDark
              ? {}
              : {
                  backgroundColor: 'rgba(210, 225, 245, 0.98)',
                  border: '1px solid rgba(190, 210, 235, 0.9)',
                  color: '#2d4a7a',
                }
          "
          class="refresh-btn"
          @click="refreshFeeds"
          :disabled="isRefreshing"
        >
          <svg
            class="refresh-icon"
            :class="{ rotating: isRefreshing }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path
              d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
            />
          </svg>
        </button>

        <button
          :style="
            isDark
              ? {}
              : {
                  backgroundColor: 'rgba(210, 225, 245, 0.98)',
                  border: '1px solid rgba(190, 210, 235, 0.9)',
                  color: '#2d4a7a',
                }
          "
          class="settings-btn"
          @click="toggleSettings"
        >
          <svg
            class="settings-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
            />
          </svg>
        </button>

        <button
          class="theme-btn"
          :style="
            isDark
              ? {}
              : {
                  backgroundColor: 'rgba(210, 225, 245, 0.98)',
                  border: '1px solid rgba(190, 210, 235, 0.9)',
                  color: '#2d4a7a',
                }
          "
          @click="toggleDarkMode"
        >
          <svg
            v-if="isDark"
            class="theme-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <svg
            v-else
            class="theme-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </button>
      </div>
    </div>

    <div
      class="content-area"
      :style="isDark ? {} : { backgroundColor: 'rgba(230, 240, 250, 0.95)' }"
    >
      <router-view />
    </div>

    <div
      class="footer"
      :style="
        isDark
          ? {}
          : {
              backgroundColor: 'rgba(210, 225, 245, 0.98)',
              borderTop: '1px solid rgba(190, 210, 235, 0.9)',
              color: '#4d6990',
            }
      "
    >
      <div class="footer-left">
        <span class="footer-text" :style="isDark ? {} : { color: '#4d6990' }">
          {{ feedsStatus }}
        </span>
      </div>
      <div class="footer-right">
        <span class="version-text" :style="isDark ? {} : { color: '#4d6990' }"
          >v{{ version }}</span
        >
        <a
          href="https://github.com/xxchenxx/cf-rss"
          target="_blank"
          class="github-link"
          :style="isDark ? {} : { color: '#2d4a7a' }"
        >
          <svg
            class="github-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
            />
          </svg>
        </a>
      </div>
    </div>

    <div
      v-if="showSettings"
      :style="
        isDark
          ? {}
          : {
              backgroundColor: 'rgba(225, 235, 252, 0.98)',
              border: '1px solid rgba(190, 210, 235, 0.9)',
              boxShadow:
                '0 8px 24px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.05)',
            }
      "
      class="settings-panel"
    >
      <div class="settings-header">
        <h2 class="settings-title" :style="isDark ? {} : { color: '#2d4a7a' }">
          设置
        </h2>
        <button
          class="close-btn"
          :style="isDark ? {} : { color: '#4d6990' }"
          @click="toggleSettings"
        >
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="settings-content">
        <div
          v-for="settingsGroup in settingsGroups"
          :key="settingsGroup.name"
          class="settings-group"
        >
          <h3 class="group-title" :style="isDark ? {} : { color: '#2d4a7a' }">
            {{ t(settingsGroup.title) }}
          </h3>
          <div class="group-content">
            <component
              v-for="(setting, index) in settingsGroup.settings"
              :key="index"
              :is="setting.component"
              v-bind="setting.props"
            />
          </div>
        </div>
      </div>

      <div class="settings-footer">
        <button
          class="bg-green-500 text-white px-4 py-2 rounded save-btn"
          :style="
            isDark
              ? {}
              : {
                  backgroundColor: '#4d6990',
                  boxShadow: '0 2px 4px rgba(77, 105, 144, 0.2)',
                }
          "
          @click="saveSettings"
        >
          {{ t("Save") }}
        </button>
      </div>
    </div>

    <div v-if="showSettings" class="overlay" @click="toggleSettings"></div>
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
/* Global styles */
:root {
  --bright-bg-color: rgba(225, 235, 252, 0.98);
  --bright-element-bg: rgba(210, 225, 245, 0.98);
  --bright-content-bg: rgba(230, 240, 250, 0.95);
  --bright-text-primary: #2d4a7a;
  --bright-text-secondary: #4d6990;
  --bright-border-color: rgba(190, 210, 235, 0.9);
  --bright-hover-color: rgba(215, 230, 250, 0.9);

  --dark-bg-color: #111827;
  --dark-element-bg: rgba(31, 41, 55, 0.95);
  --dark-content-bg: rgba(28, 37, 49, 0.95);
  --dark-text-primary: #f3f4f6;
  --dark-text-secondary: #d1d5db;
  --dark-border-color: rgba(55, 65, 81, 0.5);
  --dark-hover-color: rgba(55, 65, 81, 0.5);
}

body {
  margin: 0;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  transition: all 0.3s ease;
  z-index: 10;
}

.header-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: bold;
  transition: color 0.3s ease;
}

.header-right {
  display: flex;
  gap: 0.5rem;
}

.refresh-btn,
.settings-btn,
.theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
  cursor: pointer;
}

.refresh-icon,
.settings-icon,
.theme-icon,
.github-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.content-area {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
  transition: background-color 0.3s ease;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  transition: all 0.3s ease;
  z-index: 10;
}

.footer-text,
.version-text {
  font-size: 0.875rem;
  transition: color 0.3s ease;
}

.github-link {
  display: flex;
  align-items: center;
  margin-left: 0.5rem;
  transition: color 0.3s ease;
}

.settings-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  border-radius: 0.75rem;
  transition: all 0.3s ease;
  z-index: 30;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid;
  transition: border-color 0.3s ease;
}

.settings-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: bold;
  transition: color 0.3s ease;
}

.close-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.3s ease;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.settings-group {
  margin-bottom: 1.5rem;
}

.group-title {
  margin-top: 0;
  margin-bottom: 0.75rem;
  font-size: 1rem;
  font-weight: medium;
  transition: color 0.3s ease;
}

.settings-footer {
  padding: 1rem;
  border-top: 1px solid;
  display: flex;
  justify-content: flex-end;
  transition: border-color 0.3s ease;
}

.save-btn {
  transition: background-color 0.3s ease, transform 0.1s ease,
    box-shadow 0.2s ease;
}

.save-btn:hover {
  transform: translateY(-1px);
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 20;
}

/* Dark mode styles */
.dark .header {
  background-color: rgba(31, 41, 55, 0.8);
  border-bottom: 1px solid rgba(55, 65, 81, 0.5);
}

.dark .header-title {
  color: #f3f4f6;
}

.dark .refresh-btn,
.dark .settings-btn,
.dark .theme-btn {
  background-color: rgba(55, 65, 81, 0.8);
  border: 1px solid rgba(75, 85, 99, 0.5);
  color: #e5e7eb;
}

.dark .refresh-btn:hover,
.dark .settings-btn:hover,
.dark .theme-btn:hover {
  background-color: rgba(75, 85, 99, 0.8);
}

.dark .content-area {
  background-color: rgba(17, 24, 39, 0.95);
}

.dark .footer {
  background-color: rgba(31, 41, 55, 0.8);
  border-top: 1px solid rgba(55, 65, 81, 0.5);
  color: #d1d5db;
}

.dark .footer-text,
.dark .version-text {
  color: #9ca3af;
}

.dark .github-link {
  color: #e5e7eb;
}

.dark .settings-panel {
  background-color: #1f2937;
  border: 1px solid rgba(55, 65, 81, 0.8);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.dark .settings-header {
  border-bottom-color: rgba(55, 65, 81, 0.8);
}

.dark .settings-title {
  color: #f3f4f6;
}

.dark .close-btn {
  color: #9ca3af;
}

.dark .close-btn:hover {
  color: #e5e7eb;
}

.dark .group-title {
  color: #e5e7eb;
}

.dark .settings-footer {
  border-top-color: rgba(55, 65, 81, 0.8);
}

.dark .save-btn {
  background-color: #3b82f6;
}

.dark .save-btn:hover {
  background-color: #2563eb;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* Responsive styles */
@media (max-width: 768px) {
  .header-title {
    font-size: 1.25rem;
  }

  .refresh-btn,
  .settings-btn,
  .theme-btn {
    width: 2.25rem;
    height: 2.25rem;
  }

  .settings-panel {
    width: 95%;
    max-height: 90vh;
  }
}
</style>
