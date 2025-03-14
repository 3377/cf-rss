export async function onRequest(context) {
  try {
    // 获取缓存时间戳
    const cacheTimestamp = context.request.headers.get("X-Cache-Timestamp");
    const cacheTime = cacheTimestamp
      ? new Date(parseInt(cacheTimestamp))
      : null;

    // 获取当前北京时间
    const now = new Date();
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const beijingTimeStr = beijingTime.toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
    });

    // 构建响应
    return new Response(
      JSON.stringify({
        当前时间: beijingTimeStr,
        服务器缓存: cacheTime
          ? cacheTime.toLocaleString("zh-CN", {
              timeZone: "Asia/Shanghai",
            })
          : "无",
        状态: "正常",
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error.message,
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
