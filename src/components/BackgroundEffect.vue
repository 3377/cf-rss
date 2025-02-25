<template>
  <div class="background-effect" :class="{ 'dark-mode': isDark }">
    <div class="shape shape-1"></div>
    <div class="shape shape-2"></div>
    <div class="shape shape-3"></div>
  </div>
</template>

<script setup>
defineProps({
  isDark: {
    type: Boolean,
    default: false,
  },
});
</script>

<style scoped>
.background-effect {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
  overflow: hidden;
  opacity: 0.5;
}

.dark-mode {
  display: none;
}

.shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
}

.shape-1 {
  width: 600px;
  height: 600px;
  left: -200px;
  top: -100px;
  background: radial-gradient(
    circle,
    rgba(224, 242, 254, 0.5) 0%,
    rgba(186, 230, 253, 0.2) 50%,
    transparent 70%
  );
  animation: float1 25s infinite ease-in-out;
}

.shape-2 {
  width: 500px;
  height: 500px;
  right: -100px;
  bottom: -50px;
  background: radial-gradient(
    circle,
    rgba(249, 250, 251, 0.5) 0%,
    rgba(224, 231, 255, 0.2) 50%,
    transparent 70%
  );
  animation: float2 30s infinite ease-in-out;
}

.shape-3 {
  width: 450px;
  height: 450px;
  right: 30%;
  top: 30%;
  background: radial-gradient(
    circle,
    rgba(236, 253, 245, 0.4) 0%,
    rgba(209, 250, 229, 0.15) 50%,
    transparent 70%
  );
  animation: float3 20s infinite ease-in-out;
}

@keyframes float1 {
  0% {
    transform: translateY(0) translateX(0) rotate(0);
  }
  33% {
    transform: translateY(-40px) translateX(40px) rotate(5deg);
  }
  66% {
    transform: translateY(20px) translateX(-20px) rotate(-2deg);
  }
  100% {
    transform: translateY(0) translateX(0) rotate(0);
  }
}

@keyframes float2 {
  0% {
    transform: translateY(0) translateX(0) rotate(0);
  }
  33% {
    transform: translateY(50px) translateX(-30px) rotate(-5deg);
  }
  66% {
    transform: translateY(-30px) translateX(20px) rotate(3deg);
  }
  100% {
    transform: translateY(0) translateX(0) rotate(0);
  }
}

@keyframes float3 {
  0% {
    transform: translateY(0) translateX(0) rotate(0);
  }
  33% {
    transform: translateY(-30px) translateX(-30px) rotate(-3deg);
  }
  66% {
    transform: translateY(30px) translateX(30px) rotate(3deg);
  }
  100% {
    transform: translateY(0) translateX(0) rotate(0);
  }
}
</style>
