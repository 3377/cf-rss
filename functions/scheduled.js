/**
 * Cloudflare 定时任务 - 每30分钟自动更新RSS缓存
 * 定时触发，无需人工干预
 */

const CACHE_KEY = "RSS_FEEDS_DATA";
const DEFAULT_CACHE_TTL = 7200; // 默认缓存时间 2 小时

/**
 * 执行定时任务
 * 触发方式: Cloudflare Cron Triggers
 */
export async function scheduled(event, env, ctx) {
  const startTime = Date.now();
  console.log(`[定时任务] 开始执行自动缓存更新任务 - ${new Date().toISOString()}`);

  try {
    // 获取缓存TTL
    const ttl = parseInt(env.CACHE_MAX_AGE || String(DEFAULT_CACHE_TTL));
    
    // 检查当前缓存状态
    const currentCache = await env.RSS_KV.getWithMetadata(CACHE_KEY, { type: "json" });
    const metadata = currentCache?.metadata || {};
    const timestamp = metadata.timestamp || 0;
    const cacheAge = (Date.now() - timestamp) / 1000; // 转换为秒
    
    console.log(`[定时任务] 当前缓存年龄: ${Math.floor(cacheAge)}秒，最大缓存时间: ${ttl}秒`);
    
    // 如果缓存尚未过期的40%，跳过更新
    // 这是为了防止过于频繁的更新，即使是定时任务也应该尊重缓存
    if (currentCache && currentCache.value && cacheAge < ttl * 0.4) {
      console.log(`[定时任务] 缓存仍然较新，跳过更新（${Math.floor(cacheAge)}秒 < ${ttl * 0.4}秒）`);
      return;
    }
    
    // 构建API URL
    const appDomain = env.APP_DOMAIN || "你的域名"; // 需要在Cloudflare中设置此环境变量
    const apiUrl = `https://${appDomain}/api/feeds?forceRefresh=true&t=${Date.now()}`;
    
    console.log(`[定时任务] 请求新数据: ${apiUrl}`);
    
    // 获取最新数据
    const response = await fetch(apiUrl, {
      headers: {
        "Cache-Control": "no-cache",
        "User-Agent": "CloudflareScheduler/1.0"
      }
    });
    
    if (!response.ok) {
      throw new Error(`获取数据失败: ${response.status} ${response.statusText}`);
    }
    
    // 解析数据
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("返回的数据格式无效，不是数组");
    }
    
    console.log(`[定时任务] 成功获取 ${data.length} 个RSS源的数据`);
    
    // 更新缓存
    const newMetadata = {
      timestamp: Date.now(),
      lastUpdate: new Date().toISOString(),
      updateMethod: "scheduled",
      updateDuration: Date.now() - startTime
    };
    
    await env.RSS_KV.put(CACHE_KEY, JSON.stringify(data), {
      expirationTtl: ttl,
      metadata: newMetadata
    });
    
    console.log(`[定时任务] 缓存已成功更新，过期时间: ${ttl}秒，耗时: ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error(`[定时任务] 自动更新缓存失败:`, error);
  }
} 