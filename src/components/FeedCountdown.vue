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
            <span class="mr-2">服务器缓存: {{ serverCacheTimeFormatted }}</span>
          </div>
          <div class="cache-item inline-flex items-center">
            <div
              v-if="activeCache === 'local'"
              class="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"
            ></div>
            <span class="mr-2">本地缓存: {{ localCacheTimeFormatted }}</span>
          </div>
          <div class="cache-item inline-flex items-center">
            <div
              v-if="activeCache === 'fresh'"
              class="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"
            ></div>
            <span class="mr-2">最后更新: {{ lastUpdateTime }}</span>
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
    default: "none", // 'server', 'local', 'fresh' 或 'none'
  },
  lastUpdateTime: {
    type: String,
    default: "",
  },
  serverCacheTime: {
    type: Date,
    default: null,
  },
  localCacheTime: {
    type: Date,
    default: null,
  },
});

const emit = defineEmits(["refresh"]);

const countdownText = computed(() => {
  const minutes = Math.floor(props.refreshCountdown / 60);
  const seconds = props.refreshCountdown % 60;
  return `${minutes}分${seconds < 10 ? "0" + seconds : seconds}秒后刷新`;
});

const formatTime = (date) => {
  if (!date) return "无";
  return format(date, "HH:mm:ss");
};

const serverCacheTimeFormatted = computed(() => {
  return formatTime(props.serverCacheTime);
});

const localCacheTimeFormatted = computed(() => {
  return formatTime(props.localCacheTime);
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

/* 亮色模式下小圆点颜色 */
html body .app-container:not(.dark) .cache-item .animate-pulse {
  position: absolute;
  left: -8px;
}

html body .app-container:not(.dark) .animate-pulse[class*="bg-purple"] {
  background-color: #a18cd1 !important;
  box-shadow: 0 0 5px rgba(161, 140, 209, 0.7);
}

html body .app-container:not(.dark) .animate-pulse[class*="bg-blue"] {
  background-color: #60a5fa !important;
  box-shadow: 0 0 5px rgba(59, 130, 246, 0.7);
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

.dark .animate-pulse[class*="bg-blue"] {
  background-color: rgba(191, 219, 254, 0.9) !important;
  box-shadow: 0 0 8px rgba(191, 219, 254, 0.5);
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
