import { routes } from "./_routes";

// 导入所有处理函数
import { onRequest as feedsHandler } from "./api/feeds";
import { onRequest as updateCacheHandler } from "./api/update-cache";
import { onRequest as cacheHandler } from "./api/cache";

// 处理函数映射
const handlers = {
  "api/feeds": feedsHandler,
  "api/update-cache": updateCacheHandler,
  "api/cache": cacheHandler,
};

// 主处理函数
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // 查找匹配的路由，优先精确匹配
  const route = routes.find((r) => {
    if (r.pattern === path) return true; // 精确匹配
    if (r.pattern === "/*") return true; // 通配符匹配
    return false;
  });

  if (!route) {
    return new Response("Not Found", { status: 404 });
  }

  // 获取对应的处理函数
  const handler = handlers[route.handler];
  if (!handler) {
    return new Response("Handler not found", { status: 500 });
  }

  // 调用处理函数
  return handler(context);
}
