<template>
  <div
    :class="['app-container', isDark ? 'dark bg-gray-900' : 'bg-gray-50']"
    :style="
      !isDark
        ? {
            '--card-bg': 'rgba(255, 255, 255, 0.85)',
            '--card-header-bg': 'rgba(240, 230, 255, 0.9)',
            '--card-content-bg': 'rgba(255, 255, 255, 0.85)',
            '--card-border': 'rgba(180, 160, 220, 0.8)',
            '--text-primary': '#5a4a8a',
            '--text-secondary': '#7d6ca5',
            '--link-color': '#8566c9',
            '--link-hover-color': '#6f4ebf',
          }
        : {}
    "
  >
    <div class="header">
      <div class="text-center mobile-title-container">
        <h1 class="text-3xl font-bold text-gray-700 header-title">
          {{ appTitle }}
        </h1>
      </div>

      <div class="flex justify-between items-center mobile-header">
        <div class="flex-1"></div>
        <div
          class="flex justify-center flex-1 text-base text-gray-600 status-text gap-8"
        >
          <FeedCountdown
            :refresh-countdown="countdown"
            :from-cache="isFromCache"
            :last-update-time="formatLastUpdate"
            @refresh="handleRefreshClick"
          />
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

          <!-- 字体选择下拉菜单 -->
          <div class="font-selector">
            <select
              v-model="selectedFont"
              @change="changeFont"
              class="px-2 py-1.5 text-sm rounded border focus:outline-none mobile-font-selector"
              :class="
                isDark
                  ? 'bg-gray-700 text-gray-200 border-gray-600'
                  : 'bg-white text-gray-700 border-gray-300'
              "
            >
              <option value="DingTalk JinBuTi">钉钉进步体</option>
              <option value="Yozai">悠哉字体</option>
            </select>
          </div>

          <button
            @click="handleRefreshClick"
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
        <div class="mobile-footer">
          <span>© {{ new Date().getFullYear() }}</span>
          <span>&nbsp;</span>
          <a
            href="https://github.com/3377/cf-rss"
            target="_blank"
            rel="noopener noreferrer"
            class="text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300"
            >cf-rss</a
          >
          <span>&nbsp;</span>
          <span
            >Powered by Drfy &
            <a
              href="https://ll.sd"
              target="_blank"
              rel="noopener noreferrer"
              class="text-purple-500 hover:text-purple-600 dark:text-purple-400 dark:hover:text-purple-300"
              >ll.sd</a
            >
          </span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from "vue";
import FeedGrid from "./components/FeedGrid.vue";
import { getRSSConfig, RSS_CONFIG } from "./config/rss.config";
import FeedCountdown from "./components/FeedCountdown.vue";

const feeds = ref([]);
const loading = ref(false);
const error = ref(null);
const countdown = ref(RSS_CONFIG.refresh?.interval || 300);
const isDark = ref(
  localStorage.getItem("theme") === null
    ? RSS_CONFIG.display?.defaultDarkMode
    : localStorage.getItem("theme") === "dark"
);
const appTitle = ref(RSS_CONFIG.display?.appTitle || "CF RSS");
const selectedFont = ref("");
const lastUpdateTime = ref(new Date());
let refreshTimer = null;
let countdownTimer = null;

// 添加字体选择相关状态
const fontLoaded = ref({
  "DingTalk JinBuTi": false,
  Yozai: false,
});

// 完全重写字体加载和切换逻辑
// 加载字体
const loadFont = async (fontName) => {
  console.log(`准备加载字体: ${fontName}`);
  if (fontLoaded.value[fontName]) {
    console.log(`字体 ${fontName} 已加载过，直接应用`);
    applyFont(fontName);
    return;
  }

  try {
    let fontCss = "";
    if (fontName === "DingTalk JinBuTi") {
      fontCss =
        "https://cdn.jsdelivr.net/npm/cn-fontsource-ding-talk-jin-bu-ti-regular/font.css";
    } else if (fontName === "Yozai") {
      fontCss = "https://cdn.jsdelivr.net/npm/cn-fontsource-yozai/font.css";
    }

    // 使用动态导入加载CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = fontCss;
    document.head.appendChild(link);

    // 设置加载状态标记
    fontLoaded.value[fontName] = true;
    console.log(`字体 ${fontName} 加载成功`);

    // 立即应用字体
    applyFont(fontName);
  } catch (error) {
    console.error(`加载字体 ${fontName} 失败:`, error);
  }
};

// 应用字体到页面
const applyFont = (fontName) => {
  console.log(`正在应用字体: ${fontName}`);

  // 保存用户选择
  localStorage.setItem("selectedFont", fontName);

  // 应用字体到根元素和所有重要元素
  document.documentElement.style.fontFamily = `"${fontName}", Roboto, sans-serif`;
  document.body.style.fontFamily = `"${fontName}", Roboto, sans-serif`;

  // 添加一个带有新字体的类到body，强制重新渲染
  document.body.classList.remove("font-dingtalk", "font-yozai");

  if (fontName === "DingTalk JinBuTi") {
    document.body.classList.add("font-dingtalk");
  } else if (fontName === "Yozai") {
    document.body.classList.add("font-yozai");
  }

  // 强制DOM重绘
  const currentHeight = document.body.style.height;
  document.body.style.height = document.body.offsetHeight + 1 + "px";
  setTimeout(() => {
    document.body.style.height = currentHeight;
  }, 10);

  console.log(`已应用字体: ${fontName}`);
};

// 切换字体
const changeFont = () => {
  console.log(`字体选择变更为: ${selectedFont.value}`);
  loadFont(selectedFont.value);
};

// 监视字体变化
watch(selectedFont, () => {
  changeFont();
});

// 格式化时间的计算属性
const formatLastUpdate = computed(() => {
  const date = lastUpdateTime.value;
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
});

const formatCountdown = computed(() => {
  const minutes = Math.floor(countdown.value / 60);
  const seconds = countdown.value % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
});

const toggleTheme = () => {
  isDark.value = !isDark.value;
  localStorage.setItem("theme", isDark.value ? "dark" : "light");
};

// 在script setup部分添加缓存状态变量
const isFromCache = ref(false);

// 修改fetchFeeds函数，检查并更新缓存状态
const fetchFeeds = async (forceRefresh = false) => {
  if (loading.value) return;

  loading.value = true;
  error.value = null;

  try {
    console.log(`开始获取RSS内容，强制刷新: ${forceRefresh}`);
    const timestamp = new Date().getTime();

    // 用户第一次访问页面时允许使用缓存，后续刷新均使用最新内容
    const isInitialLoad = feeds.value.length === 0 && !forceRefresh;
    const shouldUseCache = isInitialLoad;

    // 构建请求URL，非初次加载时始终强制刷新
    const url = `/api/feeds?t=${timestamp}${
      !shouldUseCache ? "&forceRefresh=true" : ""
    }`;

    console.log(`请求URL: ${url}, 是否使用缓存: ${shouldUseCache}`);

    // 设置请求头
    const headers = {
      Accept: "application/json",
    };

    // 如果不使用缓存，添加no-cache头
    if (!shouldUseCache) {
      headers["Cache-Control"] = "no-cache";
      headers["Pragma"] = "no-cache";
    }

    const response = await fetch(url, { headers });

    // 检查缓存状态
    const cacheStatus = response.headers.get("X-Cache");
    isFromCache.value = cacheStatus === "HIT";

    if (isFromCache.value) {
      const cacheTime = response.headers.get("X-Cache-Timestamp");
      if (cacheTime) {
        console.log(
          "内容来自缓存，缓存时间:",
          new Date(parseInt(cacheTime)).toLocaleString()
        );
      }
    } else {
      console.log("获取了新内容");
      // 更新最后刷新时间
      lastUpdateTime.value = new Date();
    }

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("获取的RSS数据:", data);

    // 验证数据是否为数组
    if (!Array.isArray(data)) {
      console.error("API返回的数据不是数组:", data);
      throw new Error("无效的数据格式");
    }

    feeds.value = data;
    countdown.value = RSS_CONFIG.refresh?.interval || 300;
  } catch (err) {
    console.error("获取RSS内容失败:", err);
    error.value = `获取内容失败: ${err.message}`;
  } finally {
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
  // 初始化加载选定的字体并强制应用
  const savedFont = localStorage.getItem("selectedFont") || "DingTalk JinBuTi";
  selectedFont.value = savedFont;
  loadFont(savedFont);

  // 首次加载时，尝试使用缓存
  await fetchFeeds(false);

  // 如果配置了缓存时间，创建一个自动更新缓存的定时器
  // 这个定时器负责在后台定期更新缓存，但不会更新UI
  if (RSS_CONFIG.refresh?.cache > 0) {
    console.log(`设置缓存自动更新，间隔: ${RSS_CONFIG.refresh.cache}秒`);
    const cacheUpdateTimer = setInterval(async () => {
      try {
        console.log("后台自动更新缓存中...");
        // 使用fetch直接请求API更新缓存
        const timestamp = new Date().getTime();
        await fetch(`/api/feeds?t=${timestamp}&forceRefresh=true`, {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
        console.log("缓存更新完成");
      } catch (err) {
        console.error("缓存自动更新失败:", err);
      }
    }, RSS_CONFIG.refresh.cache * 1000);

    // 在组件卸载时清除定时器
    onUnmounted(() => {
      if (cacheUpdateTimer) clearInterval(cacheUpdateTimer);
    });
  }

  // 设置UI显示的定时刷新 - 这个刷新会更新UI
  refreshTimer = setInterval(
    () => fetchFeeds(true), // 强制刷新，不使用缓存
    (RSS_CONFIG.refresh?.interval || 300) * 1000
  );

  // 设置倒计时更新
  countdownTimer = setInterval(updateCountdown, 1000);
});

// 修改刷新按钮点击函数，使用强制刷新
const handleRefreshClick = () => {
  fetchFeeds(true); // 强制刷新，不使用缓存
};

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
/* 全局基础设置 */
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
}

/* 应用容器样式 */
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 亮色模式样式 - 更高优先级 */
html body .app-container.bg-gray-50 {
  background-color: #f5ebff !important;
  background-image: linear-gradient(
    to top,
    #e0d5f3 0%,
    #fbc2eb 100%
  ) !important;
  background-size: 100% 100% !important;
  background-attachment: fixed !important;
}

/* 确保内容区域可以滚动 */
.content-area {
  flex: 1;
  overflow: visible !important;
  display: flex;
  flex-direction: column;
  margin-top: 0;
  margin-bottom: 5px;
}

html body .app-container.bg-gray-50 .content-area {
  background-color: rgba(255, 255, 255, 0.15) !important;
  backdrop-filter: blur(5px) !important;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02) !important;
}

.dark .content-area {
  background-color: rgba(17, 24, 39, 0.3);
}

/* 确保内容区域滚动时不显示滚动条 */
.content-area::-webkit-scrollbar {
  width: 0;
  background: transparent;
  display: none;
}

.content-area {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

/* 确保页面中的所有卡片底部有圆角 */
.feed-card {
  border-radius: 0.75rem !important;
  overflow: hidden !important;
  display: flex;
  flex-direction: column;
  background-clip: padding-box;
  position: relative;
}

/* 确保卡片内容区域有底部圆角和滚动功能 */
.card-content {
  height: calc(100vh - 200px); /* 减去头部和其他固定元素的高度 */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch; /* 为 iOS 设备添加平滑滚动 */
}

/* 确保卡片标题区域有顶部圆角 */
.card-header {
  flex-shrink: 0;
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
  width: 100%;
  box-sizing: border-box;
  align-self: stretch;
}

/* 确保亮色模式下卡片内容可以滚动 */
html body .app-container:not(.dark) .card-content,
html body .app-container:not(.dark) .mobile-card-content {
  background: var(--card-content-bg, rgba(255, 255, 255, 0.85)) !important;
  overflow-y: auto !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

/* 隐藏亮色模式下的滚动条 */
html body .app-container:not(.dark) .card-content::-webkit-scrollbar,
html body .app-container:not(.dark) .mobile-card-content::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  background: transparent !important;
}

/* 确保暗色模式下卡片内容可以滚动 */
html body .app-container.dark .card-content,
html body .app-container.dark .mobile-card-content {
  overflow-y: auto !important;
}

/* 移动优化 */
@media (max-width: 768px) {
  ::-webkit-scrollbar-button {
    width: 20px;
    height: 20px;
  }
}

.header {
  padding: 0.75rem 1rem 0.25rem;
  flex-shrink: 0;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

html body .app-container.bg-gray-50 .header {
  background-color: rgba(255, 255, 255, 0.7) !important;
  backdrop-filter: blur(10px) !important;
  border-bottom: 2px solid rgba(161, 140, 209, 0.5) !important;
}

.dark .header {
  border-color: #374151;
  background-color: rgba(17, 24, 39, 0.6);
}

html body .app-container.bg-gray-50 .header-title {
  color: #5a4a8a !important;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5) !important;
}

html body .app-container.bg-gray-50 button:not(.bg-green-500) {
  background-color: rgba(230, 220, 255, 0.7) !important;
  border: 1px solid rgba(161, 140, 209, 0.5) !important;
}

html body .app-container.bg-gray-50 button.bg-green-500 {
  background-color: #9d7ee1 !important;
  box-shadow: 0 2px 4px rgba(161, 140, 209, 0.3) !important;
}

html body .app-container.bg-gray-50 button.bg-green-500:hover {
  background-color: #8566c9 !important;
  box-shadow: 0 3px 6px rgba(161, 140, 209, 0.4) !important;
}

.footer {
  flex-shrink: 0;
  border-top: none;
  backdrop-filter: blur(8px);
  padding-top: 0.35rem;
  box-shadow: 0 -1px 1px rgba(0, 0, 0, 0.01);
  margin-top: 0;
}

html body .app-container.bg-gray-50 .footer {
  background-color: rgba(255, 255, 255, 0.92) !important;
  backdrop-filter: blur(10px) !important;
  border-top: none !important;
  box-shadow: 0 -1px 1px rgba(161, 140, 209, 0.07) !important;
}

.dark .footer {
  border-color: #374151;
  border-top: 1px solid rgba(55, 65, 81, 0.5);
  background-color: rgba(17, 24, 39, 0.75);
  box-shadow: 0 -1px 1px rgba(0, 0, 0, 0.1);
}

/* 移除全局滚动条 */
html,
body,
#app,
.app-container {
  margin: 0;
  padding: 0;
  overflow: hidden;
  height: 100%;
}

body {
  background-color: #f0f4fa;
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
  color: #5a4a8a !important;
}

html body .app-container.bg-gray-50 .text-gray-500 {
  color: #7d6ca5 !important;
}

button {
  transition: all 0.2s ease-in-out;
}

/* 确保卡片本身无空白 */
.app-container:not(.dark) .feed-card {
  background: var(--card-bg, rgba(255, 255, 255, 0.85)) !important;
  border: 1px solid var(--card-border, rgba(161, 140, 209, 0.8)) !important;
  box-shadow: 0 6px 16px rgba(161, 140, 209, 0.2),
    0 3px 6px rgba(161, 140, 209, 0.1) !important;
  isolation: isolate; /* 创建新的层叠上下文 */
}

/* 亮色模式卡片头部特定样式 */
.app-container:not(.dark) .card-header {
  background: var(--card-header-bg, rgba(240, 230, 255, 0.9)) !important;
  border-bottom: 1px solid var(--card-border, rgba(161, 140, 209, 0.8)) !important;
  margin: -1px;
  margin-bottom: 0;
  padding: 12px 16px;
  position: relative;
  z-index: 3; /* 确保内容在最上层 */
}

/* 卡片标题内容应当在最上层 */
.app-container:not(.dark) .card-header > * {
  position: relative;
  z-index: 4;
}

/* 修复亮色模式下卡片头部圆角空白问题 */
.app-container:not(.dark) .feed-card::before {
  content: "";
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  height: 6px;
  background: var(--card-header-bg, rgba(240, 230, 255, 0.9));
  z-index: 2;
  border-top-left-radius: 0.75rem;
  border-top-right-radius: 0.75rem;
}

/* 完全消除卡片头部圆角空白的辅助元素 */
.app-container:not(.dark) .feed-card::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: 8px;
  background: var(--card-header-bg, rgba(240, 230, 255, 0.9));
  z-index: 1;
}

/* 卡片顶部四角填充 */
.app-container:not(.dark) .card-header::before {
  content: "";
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  height: 10px;
  background: var(--card-header-bg, rgba(240, 230, 255, 0.9));
  z-index: 0;
  border-top-left-radius: 0.75rem;
  border-top-right-radius: 0.75rem;
}

.app-container:not(.dark) .card-body {
  background: var(--card-content-bg, rgba(255, 255, 255, 0.85)) !important;
  overflow-y: auto !important;
}

.app-container:not(.dark) .card-title {
  color: var(--text-primary, #5a4a8a) !important;
}

.app-container:not(.dark) .item-title {
  color: var(--text-primary, #5a4a8a) !important;
}

.app-container:not(.dark) .item-date {
  color: var(--text-secondary, #7d6ca5) !important;
  background: var(--card-bg, rgba(240, 230, 255, 0.7)) !important;
}

/* 移动端样式优化 */
@media (max-width: 768px) {
  .footer {
    background: var(--el-bg-color) !important;
    border-top: none !important;
    box-shadow: 0 -1px 1px rgba(0, 0, 0, 0.015) !important;
    margin: 0 !important;
    padding: 10px 0 !important;
  }

  .content-area {
    background: var(--el-bg-color) !important;
  }

  .mobile-footer {
    padding: 0 15px !important;
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
    gap: 0.5rem !important;
  }

  /* 更紧凑的字体选择器 */
  .font-selector select {
    padding: 0.25rem 0.35rem !important;
    font-size: 0.7rem !important;
    max-width: 75px;
  }

  .footer-text {
    font-size: 0.7rem;
    padding: 0.25rem 0;
    display: flex;
    flex-direction: column;
    line-height: 1.4;
  }

  .content-area {
    margin-bottom: 0.25rem;
  }
}

@media (prefers-color-scheme: light) {
  :root {
    color-scheme: light;
    --app-background: #f0f4fa;
    --card-background: rgba(255, 255, 255, 0.85);
    --card-border: rgba(161, 140, 209, 0.8);
    --card-header: rgba(240, 230, 255, 0.9);
    --text-primary: #5a4a8a;
    --text-secondary: #7d6ca5;
  }
}

/* 添加箭头圆角样式 */
::-webkit-scrollbar-button {
  border-radius: 12px !important;
  background-color: rgba(230, 220, 255, 0.9);
  border: 1px solid rgba(161, 140, 209, 0.5);
  transition: all 0.2s ease;
}

.dark ::-webkit-scrollbar-button {
  background-color: rgba(55, 65, 81, 0.8);
  border: 1px solid rgba(75, 85, 101, 0.7);
}

::-webkit-scrollbar-button:hover {
  background-color: rgba(220, 200, 255, 1);
}

.dark ::-webkit-scrollbar-button:hover {
  background-color: rgba(75, 85, 101, 0.9);
}

/* 提示框样式 */
.title-tooltip {
  text-align: center !important;
  min-width: 180px;
  padding: 0.75rem 1rem !important;
}

/* 提示框日期样式 */
.tooltip-date {
  font-weight: 500 !important;
  margin-bottom: 0.3rem !important;
  padding-bottom: 0.3rem !important;
  text-align: center !important;
}

/* 亮色模式下的提示框样式 */
.app-container:not(.dark) .tooltip-date {
  color: #8566c9 !important;
  border-bottom: 1px dashed rgba(161, 140, 209, 0.5) !important;
}

/* 暗色模式下的提示框样式 */
.dark .tooltip-date {
  color: #3b82f6 !important;
  border-bottom: 1px dashed rgba(75, 85, 105, 0.5) !important;
}

/* 提示框内容居中 */
.tooltip-content {
  text-align: center !important;
}

/* 字体选择器样式 - 调整间距 */
.font-selector {
  margin-right: 0.5rem;
  margin-left: 0.5rem;
}

.font-selector select {
  transition: all 0.2s ease;
  border-radius: 0.375rem;
}

html body .app-container.bg-gray-50 .font-selector select {
  background-color: rgba(230, 220, 255, 0.8) !important;
  border: 1px solid rgba(161, 140, 209, 0.5) !important;
  color: #5a4a8a !important;
}

html body .app-container.bg-gray-50 .font-selector select:hover {
  background-color: rgba(240, 230, 255, 1) !important;
  border: 1px solid rgba(161, 140, 209, 0.8) !important;
}

.dark .font-selector select {
  background-color: rgba(31, 41, 55, 0.8) !important;
  border-color: rgba(55, 65, 81, 0.6) !important;
  color: #e5e7eb !important;
}

.dark .font-selector select:hover {
  background-color: rgba(55, 65, 81, 0.9) !important;
  border-color: rgba(75, 85, 101, 0.8) !important;
}

/* 加载字体 */
@font-face {
  font-display: swap;
}

/* 针对移动设备优化字体选择器 */
@media (max-width: 768px) {
  .font-selector {
    margin-left: 0.25rem;
    margin-right: 0.25rem;
  }
}

/* 添加强制字体应用的样式 */
.font-dingtalk * {
  font-family: "DingTalk JinBuTi", Roboto, sans-serif !important;
}

.font-yozai * {
  font-family: "Yozai", Roboto, sans-serif !important;
}

/* 确保特定元素也应用字体 */
.app-container.font-dingtalk .card-title,
.app-container.font-dingtalk .item-title {
  font-family: "DingTalk JinBuTi", Roboto, sans-serif !important;
}

.app-container.font-yozai .card-title,
.app-container.font-yozai .item-title {
  font-family: "Yozai", Roboto, sans-serif !important;
}

@media screen and (max-width: 768px) {
  .mobile-title-container {
    margin-bottom: 0.25rem !important;
  }
  .mobile-header {
    margin-bottom: 0.5rem !important;
  }
  .status-text {
    font-size: 0.875rem;
    gap: 0.5rem !important;
  }
  .mobile-font-selector {
    min-width: 90px;
    width: auto;
  }
  .mobile-footer {
    display: inline-flex !important;
    flex-wrap: nowrap !important;
    justify-content: center;
    align-items: center;
    white-space: nowrap !important;
    width: 100%;
    font-size: 0.75rem;
  }
  .mobile-footer > * {
    flex-shrink: 0;
  }
  .footer {
    overflow: hidden;
  }
}

/* 全局确保内容区域可以滚动 */
.content-area {
  flex: 1;
  overflow: visible !important;
  display: flex;
  flex-direction: column;
  margin-top: 0;
  margin-bottom: 5px;
}

/* 重置可能阻止滚动的全局设置 */
html,
body,
#app,
.app-container {
  height: 100%;
  overflow: hidden;
}

/* 确保卡片内容在任何情况下都可以滚动 */
.card-content,
.mobile-card-content,
html body .app-container .card-content,
html body .app-container .mobile-card-content,
html body .app-container:not(.dark) .card-content,
html body .app-container:not(.dark) .mobile-card-content,
html body .app-container.dark .card-content,
html body .app-container.dark .mobile-card-content {
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch !important;
}

/* 全局确保网格区域可以滚动 */
.feed-grid {
  display: grid;
  gap: 24px;
  padding: 2%;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 400px), 1fr));
  align-items: start;
}

/* 全局滚动设置 */
.feed-grid,
.content-area,
.card-content,
.mobile-card-content {
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch;
}

/* 仅在主容器上限制溢出 */
html,
body,
#app,
.app-container {
  overflow: hidden;
}

.card {
  display: flex;
  flex-direction: column;
  background: var(--card-bg, #ffffff);
  border-radius: 0.75rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  height: 600px; /* 固定卡片高度 */
}

.card-header {
  background: var(--card-header-bg, #f8fafc);
  border-bottom: 1px solid var(--card-border-color, #e2e8f0);
  flex-shrink: 0; /* 防止头部被压缩 */
}

.card-content {
  flex: 1;
  overflow-y: auto !important; /* 强制显示滚动条 */
  height: calc(100% - 60px); /* 减去头部高度 */
}

/* 自定义滚动条样式 */
.card-content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.card-content::-webkit-scrollbar-track {
  background: transparent;
}

.card-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.dark .card-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
}

/* 确保内容区域的链接列表样式正确 */
.link-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.link-list li {
  margin-bottom: 0.75rem;
}

.link-list li:last-child {
  margin-bottom: 0;
}

/* 暗色模式下的滚动条 */
.dark .card-content::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
}

.app-container:not(.dark) .item-link {
  color: var(--text-primary, #5a4a8a) !important;
}

.app-container:not(.dark) .item-link:hover {
  color: var(--link-color, #8566c9) !important;
}

.app-container:not(.dark) a:not(.item-link) {
  color: var(--link-color, #8566c9) !important;
}

.app-container:not(.dark) a:not(.item-link):hover {
  color: var(--link-hover-color, #6f4ebf) !important;
}
</style>
