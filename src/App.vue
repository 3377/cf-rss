<template>
  <div
    class="app-container"
    :class="{ dark: isDark, 'bg-gray-50': !isDark }"
    :style="
      !isDark
        ? {
            backgroundColor: 'rgba(242, 244, 248, 0.95)',
            color: '#3a5075',
          }
        : {}
    "
  >
    <header
      class="app-header"
      :style="
        !isDark
          ? {
              backgroundColor: 'rgba(226, 238, 250, 0.98)',
              borderBottom: '1px solid rgba(200, 215, 235, 0.75)',
            }
          : {}
      "
    >
      <div class="header-content">
        <h1 class="app-title" :style="!isDark ? { color: '#3a5075' } : {}">
          {{ appTitle }}
        </h1>
        <div class="app-actions">
          <button
            class="theme-toggle"
            :class="isDark ? 'text-gray-400' : 'text-gray-600'"
            @click="toggleTheme"
          >
            <svg
              v-if="isDark"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              class="w-6 h-6"
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
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              class="w-6 h-6"
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
            class="action-button bg-blue-500 hover:bg-blue-600 text-white"
            @click="showSettings = true"
          >
            <span>设置</span>
          </button>
        </div>
      </div>
    </header>

    <main class="app-content">
      <FeedGrid :isDark="isDark" />
    </main>

    <footer
      class="app-footer"
      :style="
        !isDark
          ? {
              backgroundColor: 'rgba(226, 238, 250, 0.98)',
              color: '#566a8c',
              borderTop: '1px solid rgba(200, 215, 235, 0.75)',
            }
          : {}
      "
    >
      <div class="footer-content">
        <span>{{ footerText }}</span>
        <a
          href="https://github.com/3377/cf-rss"
          target="_blank"
          rel="noopener noreferrer"
          :style="!isDark ? { color: '#3b82f6' } : {}"
        >
          RSS Reader
        </a>
      </div>
    </footer>

    <Transition name="fade">
      <div v-if="showSettings" class="modal-overlay">
        <div
          class="settings-modal"
          :class="{ dark: isDark }"
          :style="
            !isDark
              ? {
                  backgroundColor: 'rgba(226, 238, 250, 0.98)',
                  borderColor: 'rgba(200, 215, 235, 0.8)',
                  color: '#3a5075',
                }
              : {}
          "
        >
          <div class="modal-header">
            <h2 :style="!isDark ? { color: '#3a5075' } : {}">设置</h2>
            <button
              class="close-button"
              @click="showSettings = false"
              :style="!isDark ? { color: '#566a8c' } : {}"
            >
              &times;
            </button>
          </div>
          <div class="modal-body">
            <div class="settings-section">
              <h3 :style="!isDark ? { color: '#3a5075' } : {}">RSS 源</h3>
              <div class="feed-list">
                <div class="feed-input-container">
                  <div
                    class="feed-input-group"
                    :style="
                      !isDark ? { borderColor: 'rgba(200, 215, 235, 0.8)' } : {}
                    "
                  >
                    <input
                      v-model="newFeedUrl"
                      type="text"
                      placeholder="输入 RSS 链接..."
                      :style="
                        !isDark
                          ? {
                              backgroundColor: 'rgba(242, 244, 248, 0.9)',
                              color: '#3a5075',
                              borderColor: 'rgba(200, 215, 235, 0.8)',
                            }
                          : {}
                      "
                    />
                    <button
                      class="add-feed-button"
                      @click="addFeed"
                      :style="
                        !isDark
                          ? {
                              backgroundColor: '#3b82f6',
                              color: 'white',
                            }
                          : {}
                      "
                    >
                      添加
                    </button>
                  </div>
                </div>

                <div
                  v-for="(feed, index) in config.feeds"
                  :key="index"
                  class="feed-item"
                  :style="
                    !isDark
                      ? {
                          borderColor: 'rgba(200, 215, 235, 0.8)',
                          backgroundColor: 'rgba(242, 244, 248, 0.9)',
                        }
                      : {}
                  "
                >
                  <div class="feed-details">
                    <input
                      v-model="feed.url"
                      type="text"
                      class="feed-url"
                      :style="
                        !isDark
                          ? {
                              color: '#3a5075',
                              backgroundColor: 'rgba(242, 244, 248, 0.9)',
                            }
                          : {}
                      "
                    />
                  </div>
                  <button
                    class="remove-feed-button"
                    @click="removeFeed(index)"
                    :style="!isDark ? { color: '#ef4444' } : {}"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>

            <div class="settings-section">
              <h3 :style="!isDark ? { color: '#3a5075' } : {}">显示设置</h3>
              <div
                class="settings-option"
                :style="
                  !isDark ? { borderColor: 'rgba(200, 215, 235, 0.8)' } : {}
                "
              >
                <label :style="!isDark ? { color: '#566a8c' } : {}">
                  每个源显示条目数量
                </label>
                <select
                  v-model="config.display.itemsPerFeed"
                  :style="
                    !isDark
                      ? {
                          backgroundColor: 'rgba(242, 244, 248, 0.9)',
                          color: '#3a5075',
                          borderColor: 'rgba(200, 215, 235, 0.8)',
                        }
                      : {}
                  "
                >
                  <option v-for="n in 30" :key="n" :value="n">{{ n }}</option>
                </select>
              </div>
              <div
                class="settings-option"
                :style="
                  !isDark ? { borderColor: 'rgba(200, 215, 235, 0.8)' } : {}
                "
              >
                <label :style="!isDark ? { color: '#566a8c' } : {}">
                  栏目布局
                </label>
                <select
                  v-model="config.display.columns"
                  :style="
                    !isDark
                      ? {
                          backgroundColor: 'rgba(242, 244, 248, 0.9)',
                          color: '#3a5075',
                          borderColor: 'rgba(200, 215, 235, 0.8)',
                        }
                      : {}
                  "
                >
                  <option v-for="n in [1, 2, 3, 4, 5, 6]" :key="n" :value="n">
                    {{ n }} 列
                  </option>
                </select>
              </div>
              <div
                class="settings-option"
                :style="
                  !isDark ? { borderColor: 'rgba(200, 215, 235, 0.8)' } : {}
                "
              >
                <label :style="!isDark ? { color: '#566a8c' } : {}">
                  显示日期
                </label>
                <label
                  class="switch"
                  :style="
                    !isDark ? { borderColor: 'rgba(200, 215, 235, 0.8)' } : {}
                  "
                >
                  <input type="checkbox" v-model="config.display.showDate" />
                  <span
                    class="slider"
                    :style="
                      !isDark
                        ? {
                            backgroundColor: config.display.showDate
                              ? '#3b82f6'
                              : '#cbd5e1',
                          }
                        : {}
                    "
                  ></span>
                </label>
              </div>
              <div
                class="settings-option"
                :style="
                  !isDark ? { borderColor: 'rgba(200, 215, 235, 0.8)' } : {}
                "
              >
                <label :style="!isDark ? { color: '#566a8c' } : {}">
                  字体大小
                </label>
                <div class="range-container">
                  <input
                    type="range"
                    v-model="config.display.fontSize"
                    min="10"
                    max="20"
                    step="1"
                    class="range-input"
                    :style="
                      !isDark
                        ? { backgroundColor: 'rgba(200, 215, 235, 0.4)' }
                        : {}
                    "
                  />
                  <span :style="!isDark ? { color: '#566a8c' } : {}"
                    >{{ config.display.fontSize }}px</span
                  >
                </div>
              </div>
            </div>

            <div class="settings-section">
              <h3 :style="!isDark ? { color: '#3a5075' } : {}">更新设置</h3>
              <div
                class="settings-option"
                :style="
                  !isDark ? { borderColor: 'rgba(200, 215, 235, 0.8)' } : {}
                "
              >
                <label :style="!isDark ? { color: '#566a8c' } : {}">
                  自动刷新间隔 (分钟)
                </label>
                <select
                  v-model="config.update.interval"
                  :style="
                    !isDark
                      ? {
                          backgroundColor: 'rgba(242, 244, 248, 0.9)',
                          color: '#3a5075',
                          borderColor: 'rgba(200, 215, 235, 0.8)',
                        }
                      : {}
                  "
                >
                  <option :value="0">不自动刷新</option>
                  <option :value="5">5 分钟</option>
                  <option :value="15">15 分钟</option>
                  <option :value="30">30 分钟</option>
                  <option :value="60">1 小时</option>
                  <option :value="180">3 小时</option>
                  <option :value="360">6 小时</option>
                </select>
              </div>
            </div>
          </div>
          <div
            class="modal-footer"
            :style="
              !isDark
                ? {
                    borderTop: '1px solid rgba(200, 215, 235, 0.8)',
                  }
                : {}
            "
          >
            <button
              class="cancel-button"
              @click="showSettings = false"
              :style="
                !isDark
                  ? {
                      backgroundColor: 'rgba(242, 244, 248, 0.9)',
                      color: '#566a8c',
                      borderColor: 'rgba(200, 215, 235, 0.8)',
                    }
                  : {}
              "
            >
              取消
            </button>
            <button
              class="save-button"
              @click="saveSettings"
              :style="
                !isDark
                  ? {
                      backgroundColor: '#3b82f6',
                      color: 'white',
                    }
                  : {}
              "
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
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
const showSettings = ref(false);
const newFeedUrl = ref("");

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

  // 检查本地存储中的主题设置
  const savedTheme = localStorage.getItem("theme");
  if (
    savedTheme === "dark" ||
    (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
  ) {
    isDark.value = true;
  }

  // 加载保存的配置
  const savedConfig = localStorage.getItem("rssConfig");
  if (savedConfig) {
    try {
      const parsedConfig = JSON.parse(savedConfig);
      config.value = { ...RSS_CONFIG, ...parsedConfig };
    } catch (e) {
      console.error("无法解析保存的配置:", e);
    }
  }

  // 监听系统主题变化
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      if (localStorage.getItem("theme") === null) {
        isDark.value = e.matches;
      }
    });
});

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }
});

// 监听主题变化并保存
watch(isDark, (value) => {
  localStorage.setItem("theme", value ? "dark" : "light");
});

const config = ref(RSS_CONFIG);

const addFeed = () => {
  if (
    newFeedUrl.value.trim() &&
    !config.value.feeds.some((f) => f.url === newFeedUrl.value.trim())
  ) {
    config.value.feeds.push({ url: newFeedUrl.value.trim() });
    newFeedUrl.value = "";
  }
};

const removeFeed = (index) => {
  config.value.feeds.splice(index, 1);
};

const saveSettings = () => {
  localStorage.setItem("rssConfig", JSON.stringify(config.value));
  showSettings.value = false;
  // 重新加载数据
  window.location.reload();
};
</script>

<style>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

.dark {
  background-color: #111827;
  color: #f3f4f6;
}

.app-header {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(8px);
}

.dark .app-header {
  border-color: #374151;
  background-color: rgba(17, 24, 39, 0.8);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.app-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0;
}

.dark .app-title {
  color: #f3f4f6;
}

.app-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.theme-toggle {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
}

.theme-toggle:hover {
  background-color: rgba(229, 231, 235, 0.3);
}

.dark .theme-toggle:hover {
  background-color: rgba(55, 65, 81, 0.5);
}

.action-button {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 1rem;
}

.app-footer {
  border-top: 1px solid #e5e7eb;
  padding: 1rem;
  text-align: center;
  position: relative;
  z-index: 10;
}

.dark .app-footer {
  border-color: #374151;
  background-color: rgba(17, 24, 39, 0.8);
  color: #9ca3af;
}

.footer-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}

.footer-content a {
  color: #3b82f6;
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-content a:hover {
  color: #2563eb;
  text-decoration: underline;
}

.dark .footer-content a {
  color: #60a5fa;
}

.dark .footer-content a:hover {
  color: #93c5fd;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
  backdrop-filter: blur(2px);
}

.settings-modal {
  width: 90%;
  max-width: 600px;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  overflow: hidden;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.dark .settings-modal {
  background: #1f2937;
  border-color: #374151;
}

.modal-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dark .modal-header {
  border-color: #374151;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.dark .modal-header h2 {
  color: #f3f4f6;
}

.close-button {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.25rem;
  color: #6b7280;
  transition: all 0.2s ease;
}

.close-button:hover {
  background-color: rgba(229, 231, 235, 0.3);
}

.dark .close-button {
  color: #9ca3af;
}

.dark .close-button:hover {
  background-color: rgba(55, 65, 81, 0.5);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}

.settings-section {
  margin-bottom: 2rem;
}

.settings-section:last-child {
  margin-bottom: 0;
}

.settings-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  font-weight: 500;
  color: #111827;
}

.dark .settings-section h3 {
  color: #f3f4f6;
}

.feed-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.feed-input-container {
  margin-bottom: 1rem;
}

.feed-input-group {
  display: flex;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  overflow: hidden;
}

.dark .feed-input-group {
  border-color: #374151;
}

.feed-input-group input {
  flex: 1;
  padding: 0.75rem;
  border: none;
  outline: none;
  font-size: 0.95rem;
  background-color: #f9fafb;
  color: #1f2937;
}

.dark .feed-input-group input {
  background-color: #1f2937;
  color: #f3f4f6;
}

.add-feed-button {
  padding: 0.75rem 1.25rem;
  border: none;
  background-color: #3b82f6;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-feed-button:hover {
  background-color: #2563eb;
}

.dark .add-feed-button {
  background-color: #3b82f6;
}

.dark .add-feed-button:hover {
  background-color: #2563eb;
}

.feed-item {
  display: flex;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  overflow: hidden;
  background-color: #f9fafb;
}

.dark .feed-item {
  border-color: #374151;
  background-color: #1f2937;
}

.feed-details {
  flex: 1;
  overflow: hidden;
}

.feed-url {
  width: 100%;
  padding: 0.75rem;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.95rem;
  color: #1f2937;
}

.dark .feed-url {
  color: #f3f4f6;
}

.remove-feed-button {
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #ef4444;
  font-weight: 500;
  transition: all 0.2s ease;
}

.remove-feed-button:hover {
  background-color: rgba(239, 68, 68, 0.1);
}

.dark .remove-feed-button {
  color: #f87171;
}

.dark .remove-feed-button:hover {
  background-color: rgba(248, 113, 113, 0.1);
}

.settings-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.dark .settings-option {
  border-color: #374151;
}

.settings-option:last-child {
  border-bottom: none;
}

.settings-option label {
  font-size: 0.95rem;
  color: #4b5563;
}

.dark .settings-option label {
  color: #d1d5db;
}

.settings-option select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.25rem;
  background-color: #f9fafb;
  color: #1f2937;
  font-size: 0.9rem;
  outline: none;
}

.dark .settings-option select {
  background-color: #1f2937;
  border-color: #374151;
  color: #f3f4f6;
}

.switch {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 24px;
  border: 1px solid #e5e7eb;
  border-radius: 34px;
}

.dark .switch {
  border-color: #374151;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.4s;
  border-radius: 34px;
}

.dark .slider {
  background-color: #4b5563;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 2px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #3b82f6;
}

.dark input:checked + .slider {
  background-color: #3b82f6;
}

input:checked + .slider:before {
  transform: translateX(21px);
}

.range-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.range-input {
  width: 150px;
  height: 6px;
  background: #e5e7eb;
  outline: none;
  border-radius: 3px;
  -webkit-appearance: none;
}

.dark .range-input {
  background: #4b5563;
}

.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
}

.range-input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
}

.modal-footer {
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  border-top: 1px solid #e5e7eb;
}

.dark .modal-footer {
  border-color: #374151;
}

.cancel-button,
.save-button {
  padding: 0.6rem 1.25rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-button {
  background-color: #f9fafb;
  color: #4b5563;
  border: 1px solid #e5e7eb;
}

.cancel-button:hover {
  background-color: #f3f4f6;
}

.dark .cancel-button {
  background-color: #1f2937;
  color: #d1d5db;
  border-color: #374151;
}

.dark .cancel-button:hover {
  background-color: #111827;
}

.save-button {
  background-color: #3b82f6;
  color: white;
  border: none;
}

.save-button:hover {
  background-color: #2563eb;
}

/* 动画效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-header {
    padding: 0.75rem;
  }

  .app-title {
    font-size: 1.25rem;
  }

  .action-button {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  }

  .app-content {
    padding: 0.75rem;
  }

  .settings-modal {
    width: 95%;
    max-height: 80vh;
  }

  .modal-header {
    padding: 0.75rem 1rem;
  }

  .modal-body {
    padding: 1rem;
  }

  .modal-footer {
    padding: 0.75rem 1rem;
  }
}
</style>
