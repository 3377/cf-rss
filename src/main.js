import { createApp } from "vue";
import App from "./App.vue";
import "./assets/tailwind.css";
import "./index.css";

// 预加载默认字体
const preloadFont = () => {
  // 从localStorage获取已选择的字体，默认为钉钉进步体
  const selectedFont =
    localStorage.getItem("selectedFont") || "DingTalk JinBuTi";

  // 创建link元素
  const link = document.createElement("link");
  link.rel = "stylesheet";

  // 根据字体名称设置对应的CDN链接
  if (selectedFont === "DingTalk JinBuTi") {
    link.href =
      "https://cdn.jsdelivr.net/npm/cn-fontsource-ding-talk-jin-bu-ti-regular/font.css";
  } else if (selectedFont === "Yozai") {
    link.href = "https://cdn.jsdelivr.net/npm/cn-fontsource-yozai/font.css";
  }

  // 添加到头部
  document.head.appendChild(link);

  // 设置字体
  document.documentElement.style.fontFamily = `Roboto, "${selectedFont}", sans-serif`;
};

// 启动时预加载字体
preloadFont();

const app = createApp(App);
app.mount("#app");
