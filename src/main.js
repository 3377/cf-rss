import { createApp } from "vue";
import App from "./App.vue";
import "./assets/tailwind.css";
import "./index.css";

// 初始化主题
const initTheme = () => {
  const isDark = localStorage.getItem("theme") === "dark";
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
};

// 初始化主题
initTheme();

const app = createApp(App);
app.mount("#app");
