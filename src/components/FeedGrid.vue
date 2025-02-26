<template>
  <div class="feed-container">
    <div
      v-if="!feeds || feeds.length === 0"
      class="flex items-center justify-center h-full"
    >
      <div class="text-gray-500 empty-message">暂无数据</div>
    </div>
    <div v-else class="feed-grid" :style="gridStyle">
      <div v-for="feed in feeds" :key="feed.title" class="feed-card">
        <div class="card-header">
          <h2 class="card-title">{{ feed.title }}</h2>
        </div>
        <div class="card-content">
          <div class="items-list">
            <div v-if="feed.error" class="error-message">
              {{ feed.error }}
            </div>
            <div
              v-else-if="!feed.items || feed.items.length === 0"
              class="empty-message"
            >
              暂无数据
            </div>
            <template v-else>
              <div
                v-for="item in feed.items"
                :key="item.id || item.link"
                class="feed-item"
              >
                <a
                  :href="item.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="item-link"
                  @mouseover="
                    showTooltip(
                      $event,
                      item.pubDate,
                      item.description ||
                        item.content ||
                        item.summary ||
                        item.contentSnippet ||
                        item.contentEncoded ||
                        item.encoded ||
                        (item.content && item.content.encoded)
                    )
                  "
                  @mouseleave="hideTooltip"
                >
                  <div class="item-title">{{ item.title }}</div>
                  <div v-if="showItemDate" class="item-date">
                    {{ formatDate(item.pubDate) }}
                  </div>
                </a>
              </div>
              <!-- 添加额外的填充元素确保内容能滚动 -->
              <div v-if="feed.items.length > 0" class="h-2"></div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 内容预览提示框 -->
    <div
      ref="tooltip"
      class="title-tooltip"
      :style="tooltipStyle"
      v-show="showTooltipText"
    >
      <div v-if="tooltipDate" class="tooltip-date">
        发帖时间：{{ tooltipDate }}
      </div>
      <div v-if="tooltipContent" class="tooltip-content">
        {{ tooltipContent }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watchEffect, watch, nextTick } from "vue";
import { format, parseISO } from "date-fns";
import { RSS_CONFIG } from "../config/rss.config";

const props = defineProps({
  feeds: {
    type: Array,
    default: () => [],
  },
  isDark: {
    type: Boolean,
    default: false,
  },
});

// 获取配置
const showItemDate = ref(RSS_CONFIG.display?.showItemDate || false);
const dateFormat = ref(RSS_CONFIG.display?.dateFormat || "yyyy-MM-dd HH:mm");

// 计算网格样式
const gridStyle = computed(() => {
  const layout = RSS_CONFIG.display?.layout || {};
  const columns = layout.gridColumns || 3;
  const gap = layout.cardGap || 24;
  const sideMargin = layout.sideMargin || "2%";

  return {
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: `${gap}px`,
    margin: `0 ${sideMargin}`,
  };
});

// 处理日期格式化，添加更健壮的错误处理
const formatDate = (dateStr) => {
  if (!dateStr) return "未知时间";

  try {
    // 检查各种可能的日期格式，处理特殊情况
    let date;

    // 检查是否为数字时间戳
    if (typeof dateStr === "number" || /^\d+$/.test(dateStr)) {
      const timestamp = parseInt(dateStr, 10);
      date = new Date(timestamp);
    } else if (typeof dateStr === "string") {
      // 尝试解析常见的日期字符串格式
      date = new Date(dateStr);

      // 针对无效但格式特殊的日期，做额外处理
      if (isNaN(date.getTime())) {
        // 尝试解析其他格式，例如：YYYY.MM.DD
        const parts = dateStr.split(/[.-/]/);
        if (parts.length === 3) {
          // 尝试几种可能的格式
          date = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
        }
      }
    } else {
      // 如果是Date对象，直接使用
      date = dateStr instanceof Date ? dateStr : new Date();
    }

    // 最终检查日期是否有效
    if (isNaN(date.getTime())) {
      console.log("无效日期值:", dateStr, "类型:", typeof dateStr);
      return "无效日期";
    }

    // 使用直接的Date方法格式化
    try {
      return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch (innerError) {
      // 如果toLocaleString失败，使用备用格式化方法
      console.error("本地化日期格式化失败:", innerError);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(date.getDate()).padStart(2, "0")} ${String(
        date.getHours()
      ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    }
  } catch (error) {
    console.error("日期格式化错误:", error, "原始数据:", dateStr);
    return "日期错误";
  }
};

// 获取提示框配置
const tooltipConfig = ref({
  maxPreviewLength: RSS_CONFIG.display?.tooltip?.maxPreviewLength || 100,
  width: RSS_CONFIG.display?.tooltip?.width || "360px",
});

// 修改标题提示功能
const tooltip = ref(null);
const tooltipContent = ref("");
const tooltipDate = ref("");
const tooltipStyle = ref({
  opacity: 0,
  top: "0px",
  left: "0px",
  width: tooltipConfig.value.width,
});
const showTooltipText = ref(false);

// 简化内容预览获取，专注于实用性和性能
const getContentPreview = (content) => {
  if (!content) {
    return "暂无内容预览";
  }

  try {
    let plainText = "";

    // 直接处理字符串内容
    if (typeof content === "string") {
      // 处理CDATA格式 (NodeSeek格式)
      if (content.includes("CDATA[")) {
        const match = content.match(/CDATA\[(.*?)(?:\]\]|$)/s);
        if (match && match[1]) {
          plainText = match[1].trim();
        } else {
          plainText = content;
        }
      } else {
        plainText = content;
      }
    }
    // 处理对象类型内容
    else if (content && typeof content === "object") {
      if (typeof content._ === "string") {
        // 一些RSS使用_字段
        plainText = content._;
      } else if (typeof content.$ === "string") {
        // 一些RSS使用$字段
        plainText = content.$;
      } else {
        // 转换为字符串
        plainText = JSON.stringify(content);
      }
    }
    // 其他类型转为字符串
    else {
      plainText = String(content || "");
    }

    // 移除HTML标签
    plainText = plainText.replace(/<[^>]*>?/gm, "");

    // 处理XML实体
    plainText = plainText
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();

    if (!plainText.trim()) {
      return "暂无文本内容预览";
    }

    // 限制字数
    if (plainText.length <= tooltipConfig.value.maxPreviewLength) {
      return plainText;
    }

    return plainText.substring(0, tooltipConfig.value.maxPreviewLength) + "...";
  } catch (error) {
    console.error("内容处理错误:", error);
    return "暂无内容预览";
  }
};

// 修改提示框的方法 - 性能优化版
const showTooltip = (event, date, content) => {
  // 如果内容已提取过，使用缓存
  const cacheKey =
    date + (typeof content === "string" ? content.substring(0, 20) : "");
  let cachedContent = tooltipCache.get(cacheKey);

  if (cachedContent) {
    tooltipContent.value = cachedContent.content;
    tooltipDate.value = cachedContent.date;
  } else {
    // 首次处理内容
    tooltipContent.value = getContentPreview(content);
    tooltipDate.value = date ? formatDate(date) : "未知时间";

    // 缓存处理结果
    tooltipCache.set(cacheKey, {
      content: tooltipContent.value,
      date: tooltipDate.value,
    });
  }

  showTooltipText.value = true;

  // 延迟计算位置
  nextTick(() => {
    if (!tooltip.value) return;

    const rect = event.target.getBoundingClientRect();
    const tooltipRect = tooltip.value.getBoundingClientRect();

    // 计算位置
    let top = rect.bottom + 8;
    const left = Math.min(
      Math.max(rect.left, 20),
      window.innerWidth - tooltipRect.width - 20
    );

    // 检查是否超出屏幕底部
    if (top + tooltipRect.height > window.innerHeight - 20) {
      top = rect.top - tooltipRect.height - 8;
    }

    tooltipStyle.value = {
      opacity: 1,
      top: `${top}px`,
      left: `${left}px`,
      width: tooltipConfig.value.width,
    };
  });
};

// 添加内容缓存机制
const tooltipCache = new Map();

// 延迟隐藏，优化性能
const hideTooltip = () => {
  tooltipStyle.value.opacity = 0;
  setTimeout(() => {
    showTooltipText.value = false;
  }, 200);
};

// 确保卡片内容在组件挂载后可滚动
onMounted(() => {
  // 给内容区域添加点击事件，用于在移动设备上触发滚动
  const contentElements = document.querySelectorAll(".card-content");
  contentElements.forEach((el) => {
    el.addEventListener("click", (e) => {
      // 防止点击链接时触发
      if (e.target.tagName !== "A" && e.target.parentElement.tagName !== "A") {
        e.currentTarget.style.overflowY = "auto";
      }
    });
  });

  // 添加调试信息，检查feeds数据结构
  watch(
    () => props.feeds,
    (newFeeds) => {
      if (newFeeds && newFeeds.length > 0) {
        console.log("Feeds数据结构示例:");

        // 检查所有feed中的内容字段
        newFeeds.forEach((feed, feedIndex) => {
          console.log(`Feed #${feedIndex + 1}: ${feed.title}`);

          if (feed.items && feed.items.length > 0) {
            // 获取第一项作为示例
            const sampleItem = feed.items[0];
            console.log(`  示例项目: ${sampleItem.title || "无标题"}`);

            // 详细分析内容结构
            console.log("  内容结构详细分析:");
            console.log(
              "  - 完整项目结构:",
              analyzeContentStructure(sampleItem)
            );

            // 分析特定字段
            const importantFields = [
              "description",
              "content",
              "summary",
              "contentSnippet",
              "contentEncoded",
              "encoded",
            ];
            importantFields.forEach((field) => {
              if (sampleItem[field] !== undefined) {
                console.log(
                  `  - ${field}字段分析:`,
                  analyzeContentStructure(sampleItem[field])
                );
              }
            });
          }
        });
      }
    },
    { immediate: true, deep: true }
  );
});
</script>

<style>
/* 卡片容器样式 */
.feed-container {
  padding: 0.5rem 1rem;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* 卡片网格布局 */
.feed-grid {
  display: grid;
  padding: 0.5rem;
  width: 98%;
  height: calc(100vh - 10rem);
  margin: 0 auto;
}

/* 卡片样式 */
.feed-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-radius: 0.75rem;
  transition: all 0.3s ease;
}

/* 卡片头部样式 */
.card-header {
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 0.75rem 0.75rem 0 0;
  position: sticky;
  top: 0;
  z-index: 10;
}

/* 卡片标题样式 */
.card-title {
  font-size: 1.25rem;
  font-weight: bold;
  text-align: center;
}

/* 卡片内容区域样式 */
.card-content {
  flex: 1;
  padding: 0.5rem 0;
  overflow-y: auto;
  overflow-x: hidden;
  height: calc(100% - 3.5rem);
  border-radius: 0 0 0.75rem 0.75rem;
}

/* 隐藏滚动条 */
.card-content::-webkit-scrollbar {
  display: none;
}

.card-content {
  scrollbar-width: none;
  -ms-overflow-style: none;
  scroll-behavior: smooth;
}

/* 项目列表样式 */
.items-list {
  border-top: none;
  padding-bottom: 0.75rem;
}

/* 项目样式 */
.feed-item {
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

/* 最后一个项目不需要底部边框 */
.feed-item:last-child {
  border-bottom: none;
  margin-bottom: 0.5rem;
}

/* 项目链接样式 */
.item-link {
  display: block;
  padding: 0.75rem 1rem;
  position: relative;
}

/* 项目标题样式 */
.item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.3s ease;
  position: relative;
  width: 100%;
  max-width: 100%;
}

/* 项目日期样式 */
.item-date {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  opacity: 1;
  transition: all 0.3s ease;
  white-space: nowrap;
}

/* 错误信息样式 */
.error-message {
  color: #ef4444;
  padding: 1rem;
}

/* 空数据提示样式 */
.empty-message {
  text-align: center;
  padding: 1rem;
}

/* 标题提示框样式 */
.title-tooltip {
  position: fixed;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  max-width: 90%;
  width: v-bind("tooltipConfig.width"); /* 使用v-bind绑定宽度 */
  z-index: 100;
  font-size: 0.875rem;
  line-height: 1.25rem;
  pointer-events: none;
  backdrop-filter: blur(5px);
  transition: opacity 0.2s ease;
  text-align: left; /* 改为左对齐更适合阅读 */
  overflow: hidden;
}

/* 修改提示框日期样式 */
.tooltip-date {
  font-weight: 500;
  font-size: 0.85rem;
  opacity: 1;
  margin-bottom: 0.3rem;
  padding-bottom: 0.3rem;
  border-bottom: 1px dashed rgba(160, 190, 230, 0.5);
  text-align: center;
  display: block !important; /* 确保显示 */
}

/* 亮色模式下的提示框日期样式 */
html body .app-container:not(.dark) .tooltip-date {
  color: #2563eb !important;
}

/* 暗色模式下的提示框日期样式 */
.dark .tooltip-date {
  color: #3b82f6 !important;
  border-bottom-color: rgba(75, 85, 105, 0.5);
}

.tooltip-content {
  line-height: 1.5;
  font-size: 0.85rem;
  max-height: 200px;
  overflow-y: auto;
  text-align: left;
  word-break: break-word;
  white-space: pre-line;
  text-indent: 1em;
}

/* 移动设备适配 */
@media (max-width: 768px) {
  .feed-grid {
    grid-template-columns: 1fr !important;
    gap: 1rem;
    width: 100%;
    padding: 0.5rem;
  }

  .feed-card {
    min-height: 300px;
    margin-bottom: 1rem;
  }

  .card-header {
    padding: 0.75rem;
  }

  .card-title {
    font-size: 1.1rem;
    line-height: 1.4;
  }

  .card-content {
    padding: 0.25rem 0;
    height: calc(100% - 3rem);
  }

  .item-link {
    padding: 0.6rem 0.75rem;
  }

  .item-title {
    font-size: 0.95rem;
    line-height: 1.4;
    padding-right: 0 !important;
  }

  .item-date {
    position: relative;
    display: block;
    right: auto;
    top: auto;
    transform: none;
    margin-top: 0.3rem;
    font-size: 0.7rem;
    opacity: 0.8;
    padding: 0.15rem 0.3rem;
  }

  /* 优化标题提示框在移动端的展示 */
  .title-tooltip {
    max-width: 94%;
    left: 3% !important;
    padding: 0.5rem;
    font-size: 0.8rem;
    line-height: 1.3;
  }
}

/* 适配较小屏幕设备 */
@media (max-width: 480px) {
  .feed-container {
    padding: 0.25rem 0.5rem;
  }

  .feed-grid {
    gap: 0.75rem;
    padding: 0.25rem;
  }

  .feed-card {
    min-height: 250px;
    margin-bottom: 0.75rem;
  }

  .card-header {
    padding: 0.6rem;
  }

  .card-title {
    font-size: 1rem;
  }

  .item-link {
    padding: 0.5rem 0.6rem;
  }
}
</style>
