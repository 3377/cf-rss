import { createApp } from "vue";
import App from "./App.vue";
import "./assets/tailwind.css";
import "./index.css";

// 预加载默认字体
const preloadFont = () => {
  // 从localStorage获取已选择的字体，默认为钉钉进步体
  const selectedFont =
    localStorage.getItem("selectedFont") || "DingTalk JinBuTi";
  console.log(`初始化字体: ${selectedFont}`);

  try {
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

    // 立即应用字体
    document.documentElement.style.fontFamily = `"${selectedFont}", Roboto, sans-serif`;
    document.body.style.fontFamily = `"${selectedFont}", Roboto, sans-serif`;

    // 添加特定字体的类
    document.body.classList.remove("font-dingtalk", "font-yozai");
    if (selectedFont === "DingTalk JinBuTi") {
      document.body.classList.add("font-dingtalk");
    } else if (selectedFont === "Yozai") {
      document.body.classList.add("font-yozai");
    }

    // 添加样式元素以确保字体应用
    const style = document.createElement("style");
    style.textContent = `
      .font-dingtalk * { font-family: "DingTalk JinBuTi", Roboto, sans-serif !important; }
      .font-yozai * { font-family: "Yozai", Roboto, sans-serif !important; }
    `;
    document.head.appendChild(style);

    console.log(`初始字体 ${selectedFont} 已应用`);
  } catch (error) {
    console.error(`初始化字体失败:`, error);
  }
};

// 启动时预加载字体
preloadFont();

const app = createApp(App);
app.mount("#app");
