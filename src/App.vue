<template>
  <div
    class="app-container"
    :class="{ dark: isDark, 'bg-gray-50': !isDark }"
    :style="!isDark ? { backgroundColor: '#f2f4f8', color: '#3a5075' } : {}"
  >
    <div
      class="app-header"
      :style="
        !isDark ? { borderBottom: '1px solid rgba(180, 205, 240, 0.9)' } : {}
      "
    >
      <h1 class="text-2xl font-bold">CF RSS</h1>
      <div class="header-controls">
        <div class="search-box" v-if="config.features.search">
          <input
            v-model="searchTerm"
            type="text"
            placeholder="搜索内容..."
            class="search-input"
            :style="
              !isDark
                ? {
                    backgroundColor: 'rgba(210, 230, 250, 0.9)',
                    border: '1px solid rgba(180, 205, 240, 0.7)',
                  }
                : {}
            "
          />
        </div>
        <button
          @click="toggleTheme"
          class="theme-toggle"
          :title="isDark ? '切换为亮色模式' : '切换为暗色模式'"
          :style="
            !isDark
              ? {
                  backgroundColor: 'rgba(210, 230, 250, 0.9)',
                  border: '1px solid rgba(180, 205, 240, 0.7)',
                }
              : {}
          "
        >
          {{ isDark ? "🌞" : "🌙" }}
        </button>
        <button
          v-if="config.features.configEditable"
          @click="toggleConfigModal"
          class="config-button"
          :style="
            !isDark
              ? {
                  backgroundColor: 'rgba(210, 230, 250, 0.9)',
                  border: '1px solid rgba(180, 205, 240, 0.7)',
                }
              : {}
          "
        >
          ⚙️
        </button>
      </div>
    </div>

    <div class="app-content">
      <FeedGrid :feeds="filteredFeeds" :isDark="isDark" />
    </div>

    <div
      class="app-footer"
      :style="
        !isDark ? { borderTop: '1px solid rgba(180, 205, 240, 0.9)' } : {}
      "
    >
      <span>CF RSS 阅读器</span>
      <span>已加载 {{ feeds.length }} 个RSS源</span>
    </div>

    <div v-if="showConfigModal" class="modal-overlay">
      <div
        class="modal-content"
        :style="
          !isDark
            ? {
                backgroundColor: 'rgba(210, 230, 250, 0.95)',
                border: '1px solid rgba(180, 205, 240, 0.9)',
              }
            : {}
        "
      >
        <h2 class="modal-title">配置设置</h2>
        <textarea
          v-model="configJson"
          class="config-textarea"
          :style="
            !isDark
              ? {
                  backgroundColor: 'rgba(210, 230, 250, 0.9)',
                  border: '1px solid rgba(180, 205, 240, 0.7)',
                  color: '#3a5075',
                }
              : {}
          "
        ></textarea>
        <div class="modal-buttons">
          <button
            @click="saveConfig"
            class="save-button"
            :style="
              !isDark
                ? {
                    backgroundColor: 'rgba(49, 130, 206, 0.9)',
                    border: '1px solid rgba(49, 130, 206, 0.7)',
                  }
                : {}
            "
          >
            保存
          </button>
          <button
            @click="closeConfigModal"
            class="cancel-button"
            :style="
              !isDark
                ? {
                    backgroundColor: 'rgba(210, 230, 250, 0.9)',
                    border: '1px solid rgba(180, 205, 240, 0.7)',
                  }
                : {}
            "
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import FeedGrid from "./components/FeedGrid.vue";
import { getRSSConfig, parseRSSFeeds } from "./config/rss.config";

// 获取存储的主题和配置
const storedTheme = localStorage.getItem("theme");
const isDark = ref(storedTheme === "dark");
const config = ref(getRSSConfig(null));
const feeds = ref([]);
const searchTerm = ref("");
const showConfigModal = ref(false);
const configJson = ref("");

// 计算过滤后的 RSS 源
const filteredFeeds = computed(() => {
  if (!searchTerm.value || !config.value.features.search) return feeds.value;
  return feeds.value.filter((feed) => {
    const searchLower = searchTerm.value.toLowerCase();
    // 搜索标题
    if (feed.title.toLowerCase().includes(searchLower)) return true;
    // 搜索项目标题
    return feed.items.some((item) =>
      item.title.toLowerCase().includes(searchLower)
    );
  });
});

// 切换主题
const toggleTheme = () => {
  isDark.value = !isDark.value;
  localStorage.setItem("theme", isDark.value ? "dark" : "light");
};

// 配置模态框控制
const toggleConfigModal = () => {
  if (showConfigModal.value) {
    closeConfigModal();
  } else {
    configJson.value = JSON.stringify(config.value, null, 2);
    showConfigModal.value = true;
  }
};

const closeConfigModal = () => {
  showConfigModal.value = false;
};

// 保存配置
const saveConfig = () => {
  try {
    const newConfig = JSON.parse(configJson.value);
    config.value = newConfig;
    localStorage.setItem("rssConfig", configJson.value);
    closeConfigModal();
    // 刷新RSS源
    loadRSSFeeds();
  } catch (e) {
    alert("配置格式错误: " + e.message);
  }
};

// 加载 RSS 源
const loadRSSFeeds = async () => {
  try {
    feeds.value = await parseRSSFeeds(config.value);
  } catch (error) {
    console.error("加载RSS源失败:", error);
  }
};

// 组件挂载时初始化
onMounted(async () => {
  // 从localStorage或者默认配置加载
  const storedConfig = localStorage.getItem("rssConfig");
  if (storedConfig) {
    try {
      config.value = JSON.parse(storedConfig);
    } catch (e) {
      console.error("解析存储的配置失败:", e);
    }
  }

  // 如果浏览器支持媒体查询，并且用户未设置过主题偏好，则自动检测系统主题
  if (
    localStorage.getItem("theme") === null &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    isDark.value = true;
    localStorage.setItem("theme", "dark");
  }

  // 注入配置到window对象，以便其他组件访问
  window.__RSS_CONFIG__ = config.value;

  // 加载RSS源
  await loadRSSFeeds();
});

// 监听主题变化
watch(isDark, () => {
  document.body.classList.toggle("dark", isDark.value);
});
</script>

<style>
/* 全局样式 */
body {
  margin: 0;
  padding: 0;
  font-family: "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI",
    Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  line-height: 1.5;
  height: 100vh;
  overflow: hidden;
}

/* 亮色模式基础样式 */
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-height: 100vh;
  transition: all 0.3s ease;
}

/* 暗色模式基础样式 */
.dark {
  background-color: #111827;
  color: #f3f4f6;
}

/* 标题栏样式 */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  height: 3rem;
}

.dark .app-header {
  border-color: #374151;
  background-color: rgba(17, 24, 39, 0.8);
}

/* 标题栏控件容器 */
.header-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* 搜索框样式 */
.search-box {
  position: relative;
}

.search-input {
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
  background-color: #f9fafb;
  width: 250px;
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.dark .search-input {
  background-color: #1f2937;
  border-color: #374151;
  color: #f3f4f6;
}

.search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.dark .search-input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2);
}

/* 主题切换按钮 */
.theme-toggle,
.config-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
  background-color: #f9fafb;
  font-size: 1.25rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.dark .theme-toggle,
.dark .config-button {
  background-color: #1f2937;
  border-color: #374151;
  color: #f3f4f6;
}

.theme-toggle:hover,
.config-button:hover {
  background-color: #f3f4f6;
  border-color: #d1d5db;
}

.dark .theme-toggle:hover,
.dark .config-button:hover {
  background-color: #374151;
  border-color: #4b5563;
}

/* 主内容区域 */
.app-content {
  flex: 1;
  overflow: hidden;
  height: calc(100vh - 7rem);
}

/* 页脚样式 */
.app-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  font-size: 0.875rem;
  color: #6b7280;
  height: 3rem;
}

.dark .app-footer {
  border-color: #374151;
  color: #9ca3af;
  background-color: rgba(17, 24, 39, 0.8);
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  backdrop-filter: blur(2px);
}

.modal-content {
  background-color: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  width: 90%;
  max-width: 600px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-height: 80vh;
  overflow: auto;
}

.dark .modal-content {
  background-color: #1f2937;
  border: 1px solid #374151;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
  text-align: center;
}

.config-textarea {
  width: 100%;
  height: 300px;
  border-radius: 0.375rem;
  border: 1px solid #e5e7eb;
  padding: 0.75rem;
  font-family: monospace;
  resize: vertical;
  margin-bottom: 1rem;
}

.dark .config-textarea {
  background-color: #111827;
  border-color: #374151;
  color: #f3f4f6;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.save-button,
.cancel-button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  border: 1px solid transparent;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.save-button {
  background-color: #3b82f6;
  color: white;
}

.dark .save-button {
  background-color: #2563eb;
}

.save-button:hover {
  background-color: #2563eb;
}

.dark .save-button:hover {
  background-color: #1d4ed8;
}

.cancel-button {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  color: #1f2937;
}

.dark .cancel-button {
  background-color: #374151;
  border-color: #4b5563;
  color: #f3f4f6;
}

.cancel-button:hover {
  background-color: #e5e7eb;
}

.dark .cancel-button:hover {
  background-color: #4b5563;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .app-header {
    padding: 0.5rem 1rem;
  }

  .search-input {
    width: 150px;
  }

  .app-content {
    height: calc(100vh - 7rem);
  }

  .modal-content {
    width: 95%;
    padding: 1rem;
  }

  .config-textarea {
    height: 250px;
  }
}

@media (max-width: 480px) {
  .search-input {
    width: 120px;
  }

  .theme-toggle,
  .config-button {
    width: 2.25rem;
    height: 2.25rem;
  }
}
</style>
