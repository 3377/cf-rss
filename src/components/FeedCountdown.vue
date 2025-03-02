<template>
  <div class="countdown-container">
    <div
      class="countdown flex items-center text-sm text-gray-500 dark:text-gray-400"
    >
      <span v-if="fromCache" class="mr-2 from-cache inline-flex items-center">
        <div class="w-2 h-2 bg-blue-500 rounded-full mr-1 animate-pulse"></div>
        从缓存加载
      </span>
      <template v-if="refreshCountdown > 0">
        <span class="mr-2">上次更新: {{ lastUpdateTime }}</span>
        {{ countdownText }}
      </template>
      <span v-else>刷新中...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineEmits, defineProps } from "vue";

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
});

const emit = defineEmits(["refresh"]);

const countdownText = computed(() => {
  const minutes = Math.floor(props.refreshCountdown / 60);
  const seconds = props.refreshCountdown % 60;
  return `${minutes}分${seconds < 10 ? "0" + seconds : seconds}秒后刷新`;
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
}

/* 亮色模式下从缓存加载的动画球 */
html body .app-container:not(.dark) .from-cache .animate-pulse {
  background-color: #a18cd1 !important;
}

/* 亮色模式下刷新倒计时 */
html body .app-container:not(.dark) .countdown {
  color: #7d6ca5 !important;
}
</style>
