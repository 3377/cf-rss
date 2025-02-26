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
import { ref, computed, onMounted, watchEffect, watch } from "vue";
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
  maxWidth: tooltipConfig.value.width,
});
const showTooltipText = ref(false);

// 辅助函数：更详细地分析内容结构
const analyzeContentStructure = (content, depth = 0, path = "") => {
  if (depth > 3) return "嵌套过深"; // 限制递归深度

  if (typeof content === "string") {
    // 返回字符串前50个字符
    return content.length > 50 ? content.substring(0, 50) + "..." : content;
  } else if (content === null) {
    return "null";
  } else if (typeof content === "object") {
    if (Array.isArray(content)) {
      return content.length > 0
        ? `数组[${content.length}]: [${analyzeContentStructure(
            content[0],
            depth + 1,
            path + "[0]"
          )}]`
        : "空数组";
    } else {
      // 分析对象的关键字段
      const keys = Object.keys(content);
      if (keys.length === 0) return "空对象";

      // 优先分析可能包含内容的字段
      const contentFields = [
        "content",
        "description",
        "encoded",
        "contentEncoded",
        "text",
        "_",
        "$",
      ];
      const foundFields = {};

      // 先检查重要字段
      contentFields.forEach((field) => {
        if (content[field] !== undefined) {
          foundFields[field] = analyzeContentStructure(
            content[field],
            depth + 1,
            path + "." + field
          );
        }
      });

      // 然后添加其他字段信息
      if (Object.keys(foundFields).length === 0) {
        // 如果没有找到内容字段，则添加前3个字段的信息
        keys.slice(0, 3).forEach((key) => {
          foundFields[key] = analyzeContentStructure(
            content[key],
            depth + 1,
            path + "." + key
          );
        });

        if (keys.length > 3) {
          foundFields["..."] = `还有${keys.length - 3}个字段`;
        }
      }

      // 转换为字符串表示
      return Object.entries(foundFields)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
    }
  } else {
    // 基本类型
    return String(content);
  }
};

// 获取内容预览
const getContentPreview = (content) => {
  if (!content) {
    console.log("未提供内容数据");
    return "暂无内容预览";
  }

  // 检查内容类型，并执行适当的处理
  let plainText = "";

  try {
    console.log("原始内容类型:", typeof content);
    console.log(
      "原始内容预览:",
      typeof content === "string"
        ? content.substring(0, 100)
        : JSON.stringify(content).substring(0, 100)
    );

    if (typeof content === "string") {
      // 处理CDATA标签 - 许多RSS源使用这种格式
      if (content.includes("CDATA")) {
        const cdataRegex = /\<!\[CDATA\[([\s\S]*?)\]\]/;
        const cdataMatch = content.match(cdataRegex);
        if (cdataMatch && cdataMatch[1]) {
          plainText = cdataMatch[1];
          console.log("从CDATA提取的内容:", plainText.substring(0, 50));
        } else {
          // 如果没有匹配到完整的CDATA格式，尝试更宽松的提取
          const relaxedRegex = /CDATA\[([\s\S]*?)(?:\]\]|$)/;
          const relaxedMatch = content.match(relaxedRegex);
          if (relaxedMatch && relaxedMatch[1]) {
            plainText = relaxedMatch[1];
            console.log(
              "从宽松CDATA格式提取的内容:",
              plainText.substring(0, 50)
            );
          }
        }
      }

      // 如果CDATA提取失败或不含CDATA标签，使用原内容
      if (!plainText) {
        plainText = content;
      }

      // 移除HTML标签
      plainText = plainText.replace(/<[^>]*>?/gm, "");
    } else if (typeof content === "object") {
      // 处理特殊的嵌套内容结构
      if (content._) {
        // 一些RSS阅读器使用_字段存储内容
        plainText =
          typeof content._ === "string" ? content._ : JSON.stringify(content._);
        console.log("从对象的 _ 字段提取内容:", plainText.substring(0, 50));
      } else if (content.$) {
        // 一些RSS使用$字段
        plainText =
          typeof content.$ === "string" ? content.$ : JSON.stringify(content.$);
        console.log("从对象的 $ 字段提取内容:", plainText.substring(0, 50));
      } else if (content.content && typeof content.content === "object") {
        // 处理content对象中可能包含的嵌套内容
        if (content.content._ || content.content.$) {
          plainText = content.content._ || content.content.$;
          console.log(
            "从嵌套的content._或$ 字段提取内容:",
            plainText.substring(0, 50)
          );
        } else if (content.content.encoded) {
          plainText = content.content.encoded;
          console.log(
            "从content.encoded字段提取内容:",
            plainText.substring(0, 50)
          );
        }
      } else {
        // 如果是对象（可能是JSON格式的内容），尝试按顺序从可能的字段中提取
        const possibleFields = [
          "description",
          "content",
          "summary",
          "title",
          "text",
          "value",
          "contentSnippet",
          "contentEncoded",
          "encoded",
        ];
        for (const field of possibleFields) {
          if (content[field]) {
            // 如果找到了字段，检查其内容
            if (typeof content[field] === "string") {
              plainText = content[field];
              console.log(
                `从对象的 ${field} 字段提取内容:`,
                plainText.substring(0, 50)
              );
              break;
            } else if (typeof content[field] === "object") {
              // 处理嵌套对象
              if (content[field]._ || content[field].$) {
                plainText = content[field]._ || content[field].$;
                console.log(
                  `从对象的 ${field}._或$ 字段提取内容:`,
                  plainText.substring(0, 50)
                );
                break;
              } else if (content[field].text) {
                plainText = content[field].text;
                console.log(
                  `从对象的 ${field}.text 字段提取内容:`,
                  plainText.substring(0, 50)
                );
                break;
              } else if (content[field].encoded) {
                plainText = content[field].encoded;
                console.log(
                  `从对象的 ${field}.encoded 字段提取内容:`,
                  plainText.substring(0, 50)
                );
                break;
              } else {
                // 尝试将对象转为字符串
                plainText = JSON.stringify(content[field]);
                console.log(
                  `将对象的 ${field} 转换为JSON字符串:`,
                  plainText.substring(0, 50)
                );
                break;
              }
            }
          }
        }
      }

      // 如果没有找到任何内容，将整个对象转为JSON字符串
      if (!plainText) {
        plainText = JSON.stringify(content);
        console.log("将对象转换为JSON字符串:", plainText.substring(0, 50));
      }
    } else {
      // 其他类型转为字符串
      plainText = String(content);
      console.log("转换其他类型为字符串:", plainText.substring(0, 50));
    }

    // 检查移除HTML后是否还有内容
    if (!plainText.trim()) {
      console.log("内容清理后为空");
      return "暂无文本内容预览";
    }

    // 确保是纯文本，移除XML实体和多余空格
    plainText = plainText
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    // 限制字数
    if (plainText.length <= tooltipConfig.value.maxPreviewLength) {
      return plainText;
    }

    return plainText.substring(0, tooltipConfig.value.maxPreviewLength) + "...";
  } catch (error) {
    console.error("内容处理错误:", error, "原始内容:", content);
    return "内容处理错误";
  }
};

// 修改调用方式，尝试从更多字段获取内容
const showTooltip = (event, date, content) => {
  // 设置内容预览，增加对标题的备用支持
  tooltipContent.value = getContentPreview(content);

  // 格式化并设置日期，使用更安全的处理方式
  try {
    if (date) {
      tooltipDate.value = formatDate(date);
    } else {
      tooltipDate.value = "未知时间";
    }
  } catch (error) {
    console.error("处理日期时出错:", error);
    tooltipDate.value = "日期错误";
  }

  showTooltipText.value = true;

  // 延迟计算位置，确保DOM已更新
  setTimeout(() => {
    if (!tooltip.value) return;

    const rect = event.target.getBoundingClientRect();
    const tooltipRect = tooltip.value.getBoundingClientRect();

    // 计算最佳位置（优先显示在元素下方）
    let top = rect.bottom + 8;
    const left = Math.min(
      Math.max(rect.left, 20),
      window.innerWidth - tooltipRect.width - 20
    );

    // 检查是否超出屏幕底部，如果是则显示在元素上方
    if (top + tooltipRect.height > window.innerHeight - 20) {
      top = rect.top - tooltipRect.height - 8;
    }

    tooltipStyle.value = {
      opacity: 1,
      top: `${top}px`,
      left: `${left}px`,
      maxWidth: tooltipConfig.value.width, // 应用宽度设置
    };
  }, 10);
};

const hideTooltip = () => {
  showTooltipText.value = false;
  tooltipStyle.value.opacity = 0;
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
