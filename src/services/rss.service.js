import { RSS_CONFIG } from "../config/rss.config.js";

/**
 * 获取RSS源数据
 * 兼容新旧API响应格式
 * 新格式: { data: [...feeds], cache: {...} }
 * 旧格式: [...feeds]
 */
export async function fetchRSSFeeds() {
  try {
    const response = await fetch("/api/feeds");
    if (!response.ok) {
      throw new Error("Failed to fetch RSS feeds");
    }
    
    const responseData = await response.json();
    
    // 检查响应格式并返回适当的数据
    if (responseData && responseData.data && Array.isArray(responseData.data)) {
      // 新格式: 返回数据部分
      return responseData.data;
    } else if (Array.isArray(responseData)) {
      // 旧格式: 直接返回数组
      return responseData;
    } else {
      console.error("Invalid API response format:", responseData);
      return [];
    }
  } catch (error) {
    console.error("Error fetching RSS feeds:", error);
    return [];
  }
}
