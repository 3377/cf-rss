/**
 * RSS缓存状态检测和显示工具
 */

// 缓存状态元素ID
const CACHE_STATUS_ELEMENT_ID = 'server-cache-status';

/**
 * 格式化时间差
 * @param {number} ms - 毫秒数
 * @returns {string} 格式化后的时间
 */
function formatTimeDiff(ms) {
  if (!ms) return '未知';
  
  const seconds = Math.floor(ms / 1000);
  
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时`;
  return `${Math.floor(seconds / 86400)}天`;
}

/**
 * 获取RSS数据并更新缓存状态显示
 * @param {string} apiUrl - API端点URL
 * @param {boolean} forceRefresh - 是否强制刷新
 */
async function fetchRSSDataAndUpdateStatus(apiUrl = '/api/feeds', forceRefresh = false) {
  try {
    // 创建或获取缓存状态显示元素
    let statusElement = document.getElementById(CACHE_STATUS_ELEMENT_ID);
    if (!statusElement) {
      statusElement = document.createElement('div');
      statusElement.id = CACHE_STATUS_ELEMENT_ID;
      statusElement.className = 'cache-status';
      document.body.appendChild(statusElement);
    }
    
    // 显示加载状态
    statusElement.innerHTML = '正在获取数据...';
    
    // 构建URL
    const url = new URL(apiUrl, window.location.origin);
    if (forceRefresh) {
      url.searchParams.set('forceRefresh', 'true');
    }
    url.searchParams.set('t', Date.now()); // 防止浏览器缓存
    
    // 发送请求
    const response = await fetch(url.toString());
    const data = await response.json();
    
    // 检查响应数据结构
    if (!data) {
      throw new Error('获取数据失败');
    }
    
    // 处理新的数据结构
    const feedsData = data.data || data;
    const cacheStatus = data.cacheStatus || null;
    
    // 更新缓存状态显示
    let statusHtml = '';
    
    if (cacheStatus) {
      const isCached = cacheStatus.isCached === true;
      const age = cacheStatus.age ? formatTimeDiff(cacheStatus.age) : '未知';
      const ttl = cacheStatus.ttl ? formatTimeDiff(cacheStatus.ttl * 1000) : '未知';
      const lastUpdate = cacheStatus.lastUpdate ? new Date(cacheStatus.lastUpdate).toLocaleString() : '未知';
      
      statusHtml = `
        <div class="cache-info ${isCached ? 'cached' : 'not-cached'}">
          <div class="cache-status-header">服务器缓存状态</div>
          <div class="cache-status-row">
            <span class="label">状态:</span>
            <span class="value">${isCached ? '已缓存' : '未缓存'}</span>
          </div>
          ${isCached ? `
            <div class="cache-status-row">
              <span class="label">缓存时间:</span>
              <span class="value">${age}</span>
            </div>
            <div class="cache-status-row">
              <span class="label">过期时间:</span>
              <span class="value">${ttl}</span>
            </div>
            <div class="cache-status-row">
              <span class="label">最后更新:</span>
              <span class="value">${lastUpdate}</span>
            </div>
            ${cacheStatus.updating ? '<div class="updating">正在后台更新...</div>' : ''}
            ${cacheStatus.freshlyUpdated ? '<div class="fresh-update">刚刚更新</div>' : ''}
            ${cacheStatus.manuallyUpdated ? `<div class="manual-update">由 ${cacheStatus.updatedBy || '未知设备'} 手动更新</div>` : ''}
          ` : ''}
          ${cacheStatus.nodeseekStatus ? `
            <div class="cache-status-row">
              <span class="label">NodeSeek:</span>
              <span class="value">${cacheStatus.nodeseekStatus.found ? `找到 ${cacheStatus.nodeseekStatus.itemCount} 项` : '未找到'}</span>
            </div>
          ` : ''}
        </div>
      `;
    } else {
      statusHtml = `
        <div class="cache-info not-cached">
          <div class="cache-status-header">服务器缓存状态</div>
          <div class="cache-status-row">
            <span class="label">状态:</span>
            <span class="value">未知</span>
          </div>
        </div>
      `;
    }
    
    // 更新显示
    statusElement.innerHTML = statusHtml;
    
    // 添加基本样式
    if (!document.getElementById('cache-status-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'cache-status-styles';
      styleEl.textContent = `
        .cache-status {
          margin: 10px 0;
          padding: 10px;
          border-radius: 4px;
          font-family: sans-serif;
        }
        .cache-info {
          background-color: #f8f9fa;
          border: 1px solid #ddd;
          padding: 8px;
          border-radius: 4px;
        }
        .cache-info.cached {
          border-left: 4px solid #28a745;
        }
        .cache-info.not-cached {
          border-left: 4px solid #dc3545;
        }
        .cache-status-header {
          font-weight: bold;
          margin-bottom: 8px;
          color: #333;
        }
        .cache-status-row {
          display: flex;
          margin: 4px 0;
        }
        .cache-status-row .label {
          flex: 0 0 100px;
          font-weight: 500;
        }
        .updating {
          margin-top: 8px;
          color: #007bff;
          font-style: italic;
        }
        .fresh-update {
          margin-top: 4px;
          color: #28a745;
          font-weight: bold;
        }
        .manual-update {
          margin-top: 4px;
          color: #6610f2;
          font-style: italic;
        }
      `;
      document.head.appendChild(styleEl);
    }
    
    return {
      feeds: feedsData,
      cacheStatus: cacheStatus
    };
  } catch (error) {
    console.error('获取数据失败:', error);
    const statusElement = document.getElementById(CACHE_STATUS_ELEMENT_ID);
    if (statusElement) {
      statusElement.innerHTML = `<div class="cache-error">获取缓存状态失败: ${error.message}</div>`;
    }
    return null;
  }
}

/**
 * 手动更新缓存
 * @param {string} apiUrl - 更新缓存API端点
 * @param {string} key - 授权密钥
 * @param {boolean} clear - 是否清除缓存
 */
async function updateCache(apiUrl = '/api/update-cache', key, clear = false) {
  try {
    if (!key) {
      throw new Error('需要提供授权密钥');
    }
    
    const statusElement = document.getElementById(CACHE_STATUS_ELEMENT_ID);
    if (statusElement) {
      statusElement.innerHTML = '<div class="updating">正在更新缓存...</div>';
    }
    
    // 获取设备标识
    let clientId = localStorage.getItem('rss_client_id');
    if (!clientId) {
      clientId = `device_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem('rss_client_id', clientId);
    }
    
    // 构建URL
    const url = new URL(apiUrl, window.location.origin);
    url.searchParams.set('key', key);
    url.searchParams.set('clear', clear.toString());
    url.searchParams.set('client', clientId);
    url.searchParams.set('t', Date.now());
    
    // 发送请求
    const response = await fetch(url.toString());
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || '更新失败');
    }
    
    // 更新成功后获取最新数据
    await fetchRSSDataAndUpdateStatus('/api/feeds');
    
    return result;
  } catch (error) {
    console.error('更新缓存失败:', error);
    const statusElement = document.getElementById(CACHE_STATUS_ELEMENT_ID);
    if (statusElement) {
      statusElement.innerHTML = `<div class="cache-error">更新缓存失败: ${error.message}</div>`;
    }
    return null;
  }
}

// 导出函数
window.RSSCacheManager = {
  fetchDataAndUpdateStatus: fetchRSSDataAndUpdateStatus,
  updateCache: updateCache
};

// 页面加载时自动检查缓存状态
document.addEventListener('DOMContentLoaded', () => {
  fetchRSSDataAndUpdateStatus();
}); 