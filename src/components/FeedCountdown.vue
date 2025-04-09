<template>
  <div class="countdown-container">
    <div
      class="countdown flex items-center text-sm text-gray-500 dark:text-gray-400"
    >
      <template v-if="refreshCountdown > 0">
        <div class="flex items-center gap-4">
          <div class="cache-item inline-flex items-center">
            <div
              v-if="activeCache === 'server'"
              class="w-2 h-2 bg-purple-500 rounded-full mr-1 animate-pulse"
            ></div>
            <span 
              class="mr-2 cursor-pointer hover:underline" 
              @click="toggleCacheDetails"
            >
              服务器缓存: {{ serverCacheTimeFormatted }}
            </span>
          </div>
          <div class="cache-item inline-flex items-center">
            <div
              v-if="activeCache === 'fresh'"
              class="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"
            ></div>
            <span class="mr-2">最后自动刷新: {{ lastUpdateTime }}</span>
          </div>
          <span>{{ countdownText }}</span>
        </div>
      </template>
      <span v-else>刷新中...</span>
    </div>
  </div>

  <!-- 缓存详情模态弹窗 -->
  <Teleport to="body">
    <div 
      v-if="showCacheDetails" 
      class="cache-modal-overlay"
      @click="closeModal"
    >
      <div 
        class="cache-modal-container"
        @click.stop
      >
        <div class="cache-modal-header">
          <h3>服务器缓存详情</h3>
          <button 
            class="cache-modal-close" 
            @click="closeModal"
            aria-label="关闭"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg"
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2" 
              stroke-linecap="round" 
              stroke-linejoin="round" 
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="cache-modal-content">
          <div class="cache-detail-item">
            <span class="label">缓存创建时间:</span>
            <span class="value">{{ serverCacheCreatedFormatted }}</span>
          </div>
          <div class="cache-detail-item">
            <span class="label">缓存已存活:</span>
            <span class="value">{{ serverCacheAgeFormatted }}</span>
          </div>
          <div class="cache-detail-item">
            <span class="label">缓存过期时间:</span>
            <span class="value">{{ serverCacheExpiryFormatted }}</span>
          </div>
          <div class="cache-detail-item">
            <span class="label">缓存剩余时间:</span>
            <span class="value">{{ serverCacheTTLFormatted }}</span>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, defineEmits, defineProps } from "vue";
import { format } from "date-fns";

const props = defineProps({
  refreshCountdown: {
    type: Number,
    default: 0,
  },
  activeCache: {
    type: String,
    default: "none", // 'server', 'fresh' 或 'none'
  },
  lastUpdateTime: {
    type: String,
    default: "",
  },
  serverCacheTime: {
    type: Date,
    default: null,
  },
  // 新增的缓存详情属性
  serverCacheCreated: {
    type: [Date, Number, String],
    default: null,
  },
  serverCacheAge: {
    type: [Number, String],
    default: 0,
  },
  serverCacheExpiry: {
    type: [Date, Number, String],
    default: null,
  },
  serverCacheTTL: {
    type: [Number, String],
    default: 0,
  },
});

const showCacheDetails = ref(false);

const toggleCacheDetails = () => {
  showCacheDetails.value = !showCacheDetails.value;
};

const closeModal = () => {
  showCacheDetails.value = false;
};

const emit = defineEmits(["refresh"]);

const countdownText = computed(() => {
  const minutes = Math.floor(props.refreshCountdown / 60);
  const seconds = props.refreshCountdown % 60;
  return `${minutes}分${seconds < 10 ? "0" + seconds : seconds}秒后刷新`;
});

const formatTime = (date) => {
  if (!date) return "无";
  const dateObj = date instanceof Date ? date : new Date(Number(date) || date);
  return format(dateObj, "HH:mm:ss");
};

const formatFullDateTime = (date) => {
  if (!date) return "无";
  const dateObj = date instanceof Date ? date : new Date(Number(date) || date);
  return format(dateObj, "yyyy-MM-dd HH:mm:ss");
};

const formatDuration = (seconds) => {
  if (!seconds) return "无";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}分${secs < 10 ? "0" + secs : secs}秒`;
};

const serverCacheTimeFormatted = computed(() => {
  return formatTime(props.serverCacheTime || props.serverCacheCreated);
});

const serverCacheCreatedFormatted = computed(() => {
  return formatFullDateTime(props.serverCacheCreated);
});

const serverCacheAgeFormatted = computed(() => {
  return formatDuration(props.serverCacheAge);
});

const serverCacheExpiryFormatted = computed(() => {
  return formatFullDateTime(props.serverCacheExpiry);
});

const serverCacheTTLFormatted = computed(() => {
  return formatDuration(props.serverCacheTTL);
});
</script>

<style scoped>
.countdown-container {
  padding: 0.5rem 1rem;
  background-color: var(--el-bg-color-page);
}

.cache-item {
  display: inline-flex;
  align-items: center;
  margin-right: 0.5rem;
  position: relative;
  min-width: 110px; /* 确保空间足够放置小圆点 */
}

/* 新增模态弹窗样式 */
.cache-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(3px);
  animation: fadeIn 0.2s ease-out;
}

.cache-modal-container {
  width: 90%;
  max-width: 400px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease-out;
}

/* 适配亮色模式 */
:root:not(.dark) .cache-modal-container {
  background-color: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(161, 140, 209, 0.8);
}

/* 适配暗色模式 */
.dark .cache-modal-container {
  background-color: rgba(31, 41, 55, 0.95);
  border: 1px solid rgba(75, 85, 101, 0.6);
}

.cache-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

/* 标题样式 - 亮色模式 */
:root:not(.dark) .cache-modal-header {
  background-color: rgba(240, 230, 255, 0.9);
  border-bottom: 1px solid rgba(161, 140, 209, 0.5);
}

:root:not(.dark) .cache-modal-header h3 {
  color: #5a4a8a;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

/* 标题样式 - 暗色模式 */
.dark .cache-modal-header {
  background-color: rgba(55, 65, 81, 0.8);
  border-bottom: 1px solid rgba(75, 85, 101, 0.8);
}

.dark .cache-modal-header h3 {
  color: #e5e7eb;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.cache-modal-close {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 5px;
  line-height: 0;
  border-radius: 50%;
  transition: background-color 0.2s;
}

/* 关闭按钮 - 亮色模式 */
:root:not(.dark) .cache-modal-close {
  color: #7d6ca5;
}

:root:not(.dark) .cache-modal-close:hover {
  background-color: rgba(161, 140, 209, 0.2);
}

/* 关闭按钮 - 暗色模式 */
.dark .cache-modal-close {
  color: #d1d5db;
}

.dark .cache-modal-close:hover {
  background-color: rgba(75, 85, 101, 0.5);
}

.cache-modal-content {
  padding: 20px;
}

.cache-detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px dashed;
}

.cache-detail-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

/* 详情项 - 亮色模式 */
:root:not(.dark) .cache-detail-item {
  border-color: rgba(161, 140, 209, 0.3);
}

:root:not(.dark) .cache-detail-item .label {
  color: #7d6ca5;
  font-weight: 600;
}

:root:not(.dark) .cache-detail-item .value {
  color: #5a4a8a;
  font-weight: 500;
}

/* 详情项 - 暗色模式 */
.dark .cache-detail-item {
  border-color: rgba(75, 85, 101, 0.5);
}

.dark .cache-detail-item .label {
  color: #9ca3af;
  font-weight: 600;
}

.dark .cache-detail-item .value {
  color: #e5e7eb;
  font-weight: 500;
}

/* 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 亮色模式下小圆点颜色 */
html body .app-container:not(.dark) .cache-item .animate-pulse {
  position: absolute;
  left: -8px;
}

html body .app-container:not(.dark) .animate-pulse[class*="bg-purple"] {
  background-color: #a18cd1 !important;
  box-shadow: 0 0 5px rgba(161, 140, 209, 0.7);
}

html body .app-container:not(.dark) .animate-pulse[class*="bg-green"] {
  background-color: #34d399 !important;
  box-shadow: 0 0 5px rgba(16, 185, 129, 0.7);
}

/* 亮色模式下统一文本颜色 */
html body .app-container:not(.dark) .cache-item {
  color: #7d6ca5 !important;
}

/* 亮色模式下刷新倒计时 */
html body .app-container:not(.dark) .countdown {
  color: #7d6ca5 !important;
}

/* 暗色模式下小圆点颜色 */
.dark .cache-item .animate-pulse {
  position: absolute;
  left: -8px;
}

.dark .animate-pulse[class*="bg-purple"] {
  background-color: rgba(220, 200, 255, 0.9) !important;
  box-shadow: 0 0 8px rgba(220, 200, 255, 0.5);
}

.dark .animate-pulse[class*="bg-green"] {
  background-color: rgba(167, 243, 208, 0.9) !important;
  box-shadow: 0 0 8px rgba(167, 243, 208, 0.5);
}

/* 暗色模式下统一文本颜色 */
.dark .cache-item {
  color: rgba(209, 213, 219, 0.9);
}

@keyframes pulse-glow {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

.animate-pulse {
  animation: pulse-glow 1.5s infinite;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .cache-modal-container {
    width: 95%;
    max-width: 350px;
  }
  
  .cache-detail-item {
    flex-direction: column;
    gap: 8px;
  }
  
  .cache-detail-item .value {
    word-break: break-word;
  }
}
</style>
