// 配置项 - 请务必根据实际水印元素调整！
const config = {
  authApi: 'https://github.cos.ddkisw.cn/check.php',
  // 请通过开发者工具检查水印元素，将其选择器添加到这里
  watermarkSelectors: [
    '.watermark',          // 常见类名
    '[data-watermark]',    // 带特定属性的元素
    '#watermark',          // ID选择器
    '.wm', '.wm-text',     // 可能的缩写类名
    '.unauthorized-mark',  // 可能的业务相关类名
    'svg.watermark',       // SVG类型水印
    'iframe#watermark-frame' //  iframe嵌入的水印
  ],
  backgroundContainers: ['body', '.app-container', '.content-wrapper'] // 可能包含背景水印的容器
};

/**
 * 检查授权状态（保持原有逻辑）
 */
async function checkAuthorization() {
  try {
    const domain = window.location.host;
    const response = await fetch(`${config.authApi}?link=${encodeURIComponent(domain)}`);
    const result = await response.json();
    const isAuthorized = result.code === 200 && result.data;

    if (isAuthorized) {
      localStorage.setItem('authStatus', JSON.stringify({
        authorized: true,
        expire: Date.now() + 86400000
      }));
    }

    console.log('[授权检查] 结果:', isAuthorized ? '✅ 已授权' : '❌ 未授权');
    return isAuthorized;
  } catch (error) {
    console.error('[授权检查] 失败:', error);
    return false;
  }
}

/**
 * 强制隐藏单个水印元素
 */
function hideWatermarkElement(element) {
  if (!element) return false;

  // 记录找到的水印信息（方便排查）
  console.log('[水印处理] 找到水印元素:', element.tagName, element.className, element.id);

  // 方案1: 强制隐藏（优先使用）
  element.style.cssText += `
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    z-index: -9999 !important;
    position: static !important;
    width: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
  `;

  // 方案2: 直接移除（如果隐藏无效则使用）
  // setTimeout(() => element.remove(), 100);

  return true;
}

/**
 * 处理所有类型的水印
 */
function handleAllWatermarks() {
  let handledCount = 0;

  // 1. 处理DOM元素水印（包括SVG、iframe等）
  config.watermarkSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if (hideWatermarkElement(el)) {
        handledCount++;
      }
    });
  });

  // 2. 处理背景图水印
  config.backgroundContainers.forEach(containerSelector => {
    const container = document.querySelector(containerSelector);
    if (container) {
      const hasBackground = container.style.backgroundImage && container.style.backgroundImage !== 'none';
      if (hasBackground) {
        console.log('[水印处理] 清除背景图水印:', containerSelector);
        container.style.backgroundImage = 'none !important';
        container.style.background = 'none !important';
        handledCount++;
      }
    }
  });

  // 3. 处理动态生成的水印（通过样式类控制）
  const style = document.createElement('style');
  style.id = 'watermark-override-style';
  // 生成强制隐藏所有可能水印的CSS
  const cssRules = config.watermarkSelectors.map(selector => `
    ${selector} {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
    }
  `).join('');
  style.textContent = cssRules;
  document.head.appendChild(style);

  console.log(`[水印处理] 本次共处理 ${handledCount} 个水印相关元素`);
  return handledCount;
}

/**
 * 高级监控：检测并处理所有可能的水印生成
 */
function startAdvancedMonitor() {
  // 1. 监控DOM变化
  const domObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      // 检查新增节点
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // 元素节点
            // 检查是否是水印或包含水印
            const isWatermark = config.watermarkSelectors.some(selector => 
              node.matches(selector) || node.querySelector(selector)
            );
            if (isWatermark) {
              console.log('[监控] 发现新增水印元素，立即处理');
              handleAllWatermarks();
            }
          }
        });
      }
      // 检查样式变化
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const target = mutation.target;
        if (target.style.backgroundImage && target.style.backgroundImage !== 'none') {
          console.log('[监控] 发现背景图变化，可能是水印');
          handleAllWatermarks();
        }
      }
    });
  });

  domObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });

  // 2. 定时检查（作为最后一道保障）
  const intervalCheck = setInterval(() => {
    const count = handleAllWatermarks();
    if (count === 0) {
      // 连续3次未发现水印，减少检查频率
      let idleCount = 0;
      const idleCheck = setInterval(() => {
        if (handleAllWatermarks() === 0) {
          idleCount++;
          if (idleCount >= 3) {
            clearInterval(idleCheck);
            console.log('[监控] 长时间无水印，降低检查频率');
          }
        } else {
          clearInterval(idleCheck);
        }
      }, 5000);
    }
  }, 2000);

  console.log('[监控] 高级水印监控已启动');
  return { domObserver, intervalCheck };
}

/**
 * 初始化函数
 */
async function init() {
  try {
    // 检查授权状态
    const cachedAuth = JSON.parse(localStorage.getItem('authStatus') || '{"authorized": false}');
    let isAuthorized = cachedAuth.authorized && cachedAuth.expire > Date.now();

    if (!isAuthorized) {
      isAuthorized = await checkAuthorization();
    }

    if (isAuthorized) {
      console.log('[初始化] 授权成功，开始清除水印');
      
      // 立即执行一次
      handleAllWatermarks();
      
      // 多次延迟执行（处理延迟生成的水印）
      [500, 1000, 2000, 5000, 10000].forEach(delay => {
        setTimeout(() => {
          console.log(`[延迟处理] ${delay}ms 后再次检查水印`);
          handleAllWatermarks();
        }, delay);
      });
      
      // 启动高级监控
      startAdvancedMonitor();
    } else {
      console.log('[初始化] 未授权，不处理水印');
    }
  } catch (error) {
    console.error('[初始化] 失败:', error);
  }
}

// 页面加载完成后执行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
