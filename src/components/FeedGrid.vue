<template>
  <div :class="gridClass">
    <FeedBlock v-for="feed in feeds" :key="feed.url" :feed="feed" />
  </div>
</template>

<script setup>
import { computed } from "vue";
import FeedBlock from "./FeedBlock.vue";

const props = defineProps({
  layout: {
    type: Number,
    default: 4,
  },
  feeds: {
    type: Array,
    default: () => [],
  },
});

const gridClass = computed(() => ({
  "grid gap-4": true,
  "grid-cols-2 md:grid-cols-2": props.layout === 4,
  "grid-cols-2 md:grid-cols-4": props.layout === 8,
}));
</script>
