// 路由配置
export const routes = [
  {
    pattern: "/api/feeds",
    handler: "api/feeds",
  },
  {
    pattern: "/api/update-cache",
    handler: "api/update-cache",
  },
  {
    pattern: "/cache",
    handler: "api/cache",
  },
  {
    pattern: "/*",
    handler: "index",
  },
];
