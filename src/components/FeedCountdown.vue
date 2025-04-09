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
            <div v-if="showCacheDetails" class="cache-details">
              <div class="cache-details-arrow"></div>
              <div class="cache-details-content">
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

/* 缓存详情弹出框 */
.cache-details {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 10px;
  background-color: var(--el-bg-color-overlay);
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 10px;
  width: 280px;
  z-index: 1000;
}

.cache-details-arrow {
  position: absolute;
  top: -6px;
  left: 30px;
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid var(--el-bg-color-overlay);
}

.cache-details-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cache-detail-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.cache-detail-item .label {
  font-weight: 500;
  color: var(--el-text-color-secondary);
}

.cache-detail-item .value {
  color: var(--el-text-color-primary);
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
</style>
