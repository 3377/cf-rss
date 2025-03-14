// 路由配置
export const routes = [
  {
    pattern: "/cache",
    handler: "api/cache",
  },
  {
    pattern: "/api/feeds",
    handler: "api/feeds",
  },
  {
    pattern: "/api/update-cache",
    handler: "api/update-cache",
  },
  {
    pattern: "/",
    handler: "index",
  },
  {
    pattern: "/*",
    handler: "index",
  },
];
