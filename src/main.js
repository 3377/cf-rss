import { createApp } from "vue";
import App from "./App.vue";
import "./assets/tailwind.css";

// 创建一个插件来添加全局样式
const lightModePlugin = {
  install(app) {
    // 检查当前主题并应用相应的样式
    const isDarkMode = localStorage.getItem("theme") === "dark";

    // 添加内联样式到头部
    const styleElement = document.createElement("style");
    styleElement.id = "app-light-mode-styles";
    styleElement.innerHTML = `
      body:not(.dark), html:not(.dark) {
        background-color: #f0f2f5 !important;
        color: #4b5563 !important;
      }
      
      .app-container:not(.dark) {
        background: #f0f2f5 !important;
        background-image: linear-gradient(to bottom, rgba(240, 242, 245, 0.8), rgba(240, 242, 245, 0.8)), 
          url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2U1ZTdlYiIgc3Ryb2tlLXdpZHRoPSIxIiBvcGFjaXR5PSIwLjIiLz4KICAgIDwvcGF0dGVybj4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIgLz4KPC9zdmc+') !important;
      }
    `;
    document.head.appendChild(styleElement);

    // 添加类名到body
    if (!isDarkMode) {
      document.body.classList.add("light-mode");
      document.documentElement.classList.add("light-mode");
    }

    // 设置一个MutationObserver来监控DOM变化
    setTimeout(() => {
      const observer = new MutationObserver((mutations) => {
        const appContainer = document.querySelector(".app-container");
        if (appContainer && !appContainer.classList.contains("dark")) {
          appContainer.classList.add("light-mode");
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    }, 0);
  },
};

const app = createApp(App);
app.use(lightModePlugin);
app.mount("#app");
