import { RSS_CONFIG } from "../../src/config/rss.config.js";

export async function onRequest(context) {
  try {
    const feedResults = await Promise.all(
      RSS_CONFIG.feeds.map(async (source) => {
        try {
          const response = await fetch(source.url);
          const text = await response.text();

          // 改进的标签内容获取方法
          const getTagContent = (xml, tag) => {
            // 支持 CDATA 和普通内容
            const pattern = `<${tag}[^>]*>(?:<\\!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`;
            const regex = new RegExp(pattern, 'g');
            const matches = [...xml.matchAll(regex)];
            return matches.map(match => match[1].trim());
          };

          // 获取链接的方法
          const getLink = (itemContent) => {
            // 尝试获取 link 标签内容
            const linkMatch = /<link[^>]*>([^<]+)<\/link>/.exec(itemContent);
            if (linkMatch) return linkMatch[1].trim();
            
            // 尝试获取 link 标签的 href 属性
            const hrefMatch = /<link[^>]*href="([^"]+)"[^>]*\/>/.exec(itemContent);
            if (hrefMatch) return hrefMatch[1];
            
            return '';
          };

          // 获取所有文章条目
          const itemPattern = /<item[^>]*>([\\s\\S]*?)<\\/item>|<entry[^>]*>([\\s\\S]*?)<\\/entry>/g;
          const items = [];
          let match;

          // 使用循环来处理每个匹配项
          while ((match = itemPattern.exec(text)) !== null) {
            const itemContent = match[1] || match[2];
            if (!itemContent) continue;

            const title = getTagContent(itemContent, "title")[0] || "No title";
            const link = getLink(itemContent);
            const pubDate = (
              getTagContent(itemContent, "pubDate")[0] ||
              getTagContent(itemContent, "published")[0] ||
              getTagContent(itemContent, "updated")[0] ||
              ""
            );

            let formattedDate;
            try {
              formattedDate = pubDate
                ? new Date(pubDate).toISOString()
                : new Date().toISOString();
            } catch (e) {
              formattedDate = new Date().toISOString();
            }

            items.push({
              id: items.length,
              title: title,
              link: link,
              pubDate: formattedDate,
            });
          }

          // 如果没有找到条目，尝试其他格式
          if (items.length === 0) {
            const titles = getTagContent(text, "title");
            const links = text.match(/<link[^>]*href="([^"]+)"[^>]*>/g)?.map(l => {
              const match = /href="([^"]+)"/.exec(l);
              return match ? match[1] : '';
            }) || [];
            const dates = getTagContent(text, "updated") || getTagContent(text, "published");

            // 跳过第一个标题（通常是 feed 标题）
            for (let i = 1; i < titles.length; i++) {
              items.push({
                id: i - 1,
                title: titles[i],
                link: links[i] || '',
                pubDate: dates[i] ? new Date(dates[i]).toISOString() : new Date().toISOString(),
              });
            }
          }

          return {
            title: source.title,
            url: source.url,
            lastUpdate: new Date().toISOString(),
            items: items.slice(0, RSS_CONFIG.display.itemsPerFeed),
          };
        } catch (error) {
          console.error(`Error fetching ${source.url}:`, error);
          return {
            title: source.title,
            url: source.url,
            lastUpdate: new Date().toISOString(),
            items: [],
            error: error.message,
          };
        }
      })
    );

    return new Response(JSON.stringify(feedResults), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${RSS_CONFIG.refresh.cache}`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
