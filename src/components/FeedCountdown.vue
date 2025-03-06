<template>
  <div class="countdown-container">
    <div
      class="countdown flex items-center text-sm text-gray-500 dark:text-gray-400"
    >
      <template v-if="refreshCountdown > 0">
        <div class="flex items-center gap-4">
          <div v-if="fromCache" class="from-cache inline-flex items-center">
            <div
              class="w-2 h-2 bg-purple-500 rounded-full mr-1 animate-pulse"
            ></div>
            <span class="mr-2">缓存时间: {{ cacheTimeFormatted }}</span>
          </div>
          <span class="mr-2">上次更新: {{ lastUpdateTime }}</span>
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
  fromCache: {
    type: Boolean,
    default: false,
  },
  lastUpdateTime: {
    type: String,
    default: "",
  },
  cacheTime: {
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
  if (!date) return "";
  return format(date, "HH:mm:ss");
};

const cacheTimeFormatted = computed(() => {
  return props.cacheTime ? formatTime(props.cacheTime) : "";
});
</script>

<style scoped>
.countdown-container {
  padding: 0.5rem 1rem;
  background-color: var(--el-bg-color-page);
}
.from-cache {
  color: #8566c9;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  margin-right: 0.5rem;
}

/* 亮色模式下从缓存加载的动画球 */
html body .app-container:not(.dark) .from-cache .animate-pulse {
  background-color: #a18cd1 !important;
  box-shadow: 0 0 5px rgba(161, 140, 209, 0.7);
}

/* 亮色模式下从缓存加载的文本 */
html body .app-container:not(.dark) .from-cache {
  color: #8566c9 !important;
}

/* 亮色模式下刷新倒计时 */
html body .app-container:not(.dark) .countdown {
  color: #7d6ca5 !important;
}

/* 暗色模式下从缓存加载的动画 */
.dark .from-cache {
  color: rgba(220, 200, 255, 0.9);
}

.dark .from-cache .animate-pulse {
  background-color: rgba(220, 200, 255, 0.9) !important;
  box-shadow: 0 0 8px rgba(220, 200, 255, 0.5);
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

.from-cache .animate-pulse {
  animation: pulse-glow 1.5s infinite;
}
</style>
