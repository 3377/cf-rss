// 专用于手动强制更新 KV 缓存的 API 端点
const CACHE_KEY = "RSS_FEEDS_DATA";
const DEFAULT_CACHE_TTL = 7200; // 默认缓存时间 2 小时

export async function onRequest(context) {
  const startTime = Date.now();
  
  try {
    // 检查访问密钥
    const url = new URL(context.request.url);
    const accessKey = url.searchParams.get("key");
    const secretKey = context.env.UPDATE_KEY || "35794406";
    
    // 是否清除缓存（彻底删除而非仅更新）
    const clearCache = url.searchParams.get("clear") === "true";
    
    // 在查询参数中添加自定义请求头，可能由其他设备发起
    const clientId = url.searchParams.get("client") || "unknown";

    if (accessKey !== secretKey) {
      console.error("非法访问，密钥不匹配");
      return new Response(
        JSON.stringify({
          success: false,
          message: "非法访问，密钥不匹配"
        }),
        {
          headers: {
            "Content-Type": "application/json"
          },
          status: 403
        }
      );
    }

    console.log(`开始${clearCache ? '清除并' : ''}手动更新 RSS 缓存...`);
    
    // 从环境变量获取缓存时间（秒）
    const ttl = parseInt(context.env.CACHE_MAX_AGE || String(DEFAULT_CACHE_TTL));

    // 如果请求清除缓存，则先删除KV中的缓存项
    if (clearCache) {
      try {
        console.log("正在清除现有缓存...");
        await context.env.RSS_KV.delete(CACHE_KEY);
        console.log("缓存已成功清除");
      } catch (clearError) {
        console.error("清除缓存时出错:", clearError);
        // 继续执行，尝试获取新数据
      }
    }

    // 获取新数据 - 通过调用原始 API 端点强制刷新
    const feedsUrl = new URL("/api/feeds", url.origin);
    feedsUrl.searchParams.set("forceRefresh", "true");
    feedsUrl.searchParams.set("t", Date.now().toString()); // 防止缓存
    feedsUrl.searchParams.set("updater", clientId); // 标记更新者

    console.log(`向 ${feedsUrl.toString()} 请求最新数据`);

    const response = await fetch(feedsUrl.toString(), {
      headers: {
        "Cache-Control": "no-cache",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(`获取数据失败: ${response.status} ${response.statusText}`);
    }

    // 解析数据
    const responseData = await response.json();
    if (!responseData || !responseData.data || !Array.isArray(responseData.data)) {
      throw new Error("返回的数据格式无效");
    }
    
    const data = responseData.data;
    const cacheStatus = responseData.cacheStatus || {
      isCached: true,
      timestamp: Date.now(),
      lastUpdate: new Date().toISOString(),
      freshlyUpdated: true,
      updatedBy: clientId
    };

    console.log(`成功获取 ${data.length} 个 RSS 源的数据`);
    
    // 验证数据内容, 特别关注NodeSeek
    let nodeseekFound = false;
    let nodeseekItems = 0;
    
    for (const feed of data) {
      if (feed.title && feed.title.includes("NodeSeek") || (feed.link && feed.link.includes("nodeseek"))) {
        nodeseekFound = true;
        nodeseekItems = feed.items ? feed.items.length : 0;
        console.log(`NodeSeek源包含 ${nodeseekItems} 个条目`);
        break;
      }
    }
    
    // 添加缓存更新信息
    cacheStatus.manuallyUpdated = true;
    cacheStatus.updatedBy = clientId;
    cacheStatus.nodeseekStatus = {
      found: nodeseekFound,
      itemCount: nodeseekItems
    };

    // 返回详细的成功信息，包含缓存状态
    return new Response(
      JSON.stringify({
        success: true,
        message: `RSS 缓存已${clearCache ? '清除并' : ''}手动更新`,
        timestamp: Date.now(),
        feeds: data.length,
        cacheStatus: cacheStatus,
        nodeseekStatus: {
          found: nodeseekFound,
          itemCount: nodeseekItems
        },
        clientId: clientId
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "X-Cache-Updated": "true"
        }
      }
    );
  } catch (error) {
    console.error("缓存更新失败:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: `缓存更新失败: ${error.message}`,
        timestamp: Date.now(),
        cacheStatus: {
          isCached: false,
          error: true,
          errorMessage: error.message
        }
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
}
