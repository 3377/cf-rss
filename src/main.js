import { createApp } from "vue";
import App from "./App.vue";
import "./assets/tailwind.css";

// 添加全局样式
const style = document.createElement("style");
style.textContent = `
  /* 全局样式设置 */
  :root {
    --text-primary: #334155;
    --bg-primary: #edf2f7;
    --card-bg: rgba(242, 245, 250, 0.9);
    --header-bg: rgba(248, 250, 252, 0.8);
    --border-color: #e2e8f0;
    --highlight: #3b82f6;
  }
  
  body.loading * {
    transition: none !important;
  }

  ::selection {
    background-color: rgba(59, 130, 246, 0.15);
    color: var(--text-primary);
  }

  .dark ::selection {
    background-color: rgba(59, 130, 246, 0.3);
    color: #f3f4f6;
  }
`;
document.head.appendChild(style);

const app = createApp(App);
app.mount("#app");
