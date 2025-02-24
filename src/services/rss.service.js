import { RSS_CONFIG } from "../config/rss.config.js";

export async function fetchRSSFeeds() {
  try {
    const response = await fetch("/api/feeds");
    if (!response.ok) {
      throw new Error("Failed to fetch RSS feeds");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching RSS feeds:", error);
    return [];
  }
}
