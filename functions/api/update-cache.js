// 专用于外部服务触发缓存更新的 API 端点
export async function onRequest(context) {
  try {
    // 简单的安全检查（可选）- 使用查询参数中的密钥
    const url = new URL(context.request.url);
    const key = url.searchParams.get("key");
    const secretKey = context.env.UPDATE_SECRET || "your-secret-key"; // 建议通过环境变量设置

    // 检查密钥（可选）
    if (key && key !== secretKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized access",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // 构建强制刷新的 feeds API 请求 URL
    const feedsUrl = new URL(context.request.url);
    feedsUrl.pathname = "/api/feeds";
    feedsUrl.searchParams.set("t", Date.now().toString());
    feedsUrl.searchParams.set("forceRefresh", "true");

    console.log(`正在更新 RSS 缓存: ${feedsUrl.toString()}`);

    // 发送内部请求以强制刷新缓存
    const response = await fetch(feedsUrl.toString(), {
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (!response.ok) {
      throw new Error(
        `缓存更新失败: ${response.status} ${response.statusText}`
      );
    }

    // 获取响应数据
    const data = await response.json();

    // 返回成功响应
    return new Response(
      JSON.stringify({
        success: true,
        message: "RSS 缓存已成功更新",
        timestamp: new Date().toISOString(),
        feedsCount: Array.isArray(data) ? data.length : 0,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store", // 确保这个响应不被缓存
        },
      }
    );
  } catch (error) {
    console.error("缓存更新失败:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
