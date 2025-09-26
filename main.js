const getTargetUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedUrl = urlParams.get('c') || urlParams.get('url') || urlParams.get('u') || urlParams.get('link');
    if (!encodedUrl) return 'https://www.va9.cn';
    if (encodedUrl.match(/^[A-Za-z0-9+/]+={0,2}$/) && encodedUrl.length % 4 === 0) {
        try {
            return atob(encodedUrl);
        } catch (e) { console.error('Base64 decode failed:', e); }
    }
    if (encodedUrl.startsWith('base64:')) {
        try {
            return atob(encodedUrl.replace('base64:', ''));
        } catch (e) { console.error('Base64 decode failed:', e); }
    }
    return decodeURIComponent(encodedUrl);
};

const tryHttpsUrl = (url) => url.startsWith('http:') ? url.replace('http:', 'https:') : url;

const isWeChat = () => /MicroMessenger/i.test(navigator.userAgent);

const showFallbackUI = () => {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error-container').style.display = 'flex';
};

const renderWatermark = (text = 'cos工具请联系cjeq001') => {
    const container = document.getElementById('watermark-container');
    if (!container) return;

    container.innerHTML = '';
    container.style.display = 'block';
    container.style.pointerEvents = 'none'; // 不阻挡iframe操作

    const countX = 6, countY = 4;
    for (let i = 0; i < countX; i++) {
        for (let j = 0; j < countY; j++) {
            const div = document.createElement('div');
            div.className = 'watermark-text';
            div.style.left = `${i * 20 + 5}%`;
            div.style.top = `${j * 25 + 5}%`;
            div.textContent = text;
            container.appendChild(div);
        }
    }
};

const hideWatermark = () => {
    const container = document.getElementById('watermark-container');
    if (!container) return;
    container.innerHTML = '';
    container.style.display = 'none';
};

// 配置项 - 根据实际情况修改
const config = {
  // 授权接口地址
  authApi: 'https://github.cos.ddkisw.cn/check.php',
  // 水印选择器（支持多个选择器用逗号分隔，根据实际水印元素调整）
  watermarkSelector: '.watermark, [data-watermark], #watermark-container, .wm-text, .bg-watermark',
  // 可能的背景水印容器（如body或特定容器）
  backgroundContainer: 'body'
};

/**
 * 检查授权状态
 * @returns {Promise<boolean>} 是否授权成功
 */
async function checkAuthorization() {
  try {
    // 获取当前域名
    const domain = window.location.host;
    // 调用授权接口（使用正确的link参数）
    const response = await fetch(`${config.authApi}?link=${encodeURIComponent(domain)}`);
    const result = await response.json();
    
    // 根据接口返回判断授权状态（根据实际接口字段调整）
    const isAuthorized = result.code === 200 && result.data;
    
    // 缓存授权状态（有效期24小时）
    if (isAuthorized) {
      localStorage.setItem('authStatus', JSON.stringify({
        authorized: true,
        expire: Date.now() + 86400000 // 24小时后过期
      }));
    }
    
    console.log('授权检查结果:', isAuthorized ? '已授权' : '未授权');
    return isAuthorized;
  } catch (error) {
    console.error('授权检查失败:', error);
    return false;
  }
}

/**
 * 处理所有水印（隐藏/移除）
 */
function handleAllWatermarks() {
  // 1. 处理DOM元素水印（支持多个实例）
  const watermarks = document.querySelectorAll(config.watermarkSelector);
  watermarks.forEach(watermark => {
    // 强制隐藏水印（增加!important确保样式覆盖）
    watermark.style.display = 'none !important';
    watermark.style.visibility = 'hidden !important';
    watermark.style.opacity = '0 !important';
    watermark.style.pointerEvents = 'none !important';
    watermark.style.zIndex = '-1 !important'; // 确保在最底层
    watermark.style.position = 'static !important'; // 防止固定定位水印
  });
  console.log(`已处理 ${watermarks.length} 个DOM水印实例`);
  
  // 2. 处理背景图水印
  const backgroundContainer = document.querySelector(config.backgroundContainer);
  if (backgroundContainer) {
    // 清除可能的背景水印（增加!important）
    backgroundContainer.style.backgroundImage = 'none !important';
    backgroundContainer.style.background = 'none !important';
    backgroundContainer.style.backgroundRepeat = 'no-repeat !important';
    console.log('已清除背景图水印');
  }
  
  // 3. 处理可能的Canvas水印
  const canvasWatermarks = document.querySelectorAll('canvas');
  canvasWatermarks.forEach(canvas => {
    // 判断是否为水印Canvas（根据尺寸、类名或其他特征）
    const isWatermark = canvas.classList.contains('watermark') || 
                       (canvas.width < 600 && canvas.height < 600) ||
                       canvas.getAttribute('data-role') === 'watermark';
    if (isWatermark) {
      canvas.style.display = 'none !important';
      canvas.style.opacity = '0 !important';
    }
  });
  console.log('已处理Canvas类型水印');
}

/**
 * 监控页面新增元素，处理动态生成的水印
 */
function startWatermarkMonitor() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      // 检查新增节点中是否包含水印
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // 元素节点
            // 节点本身是水印或包含水印
            if (node.matches(config.watermarkSelector) || node.querySelector(config.watermarkSelector)) {
              handleAllWatermarks();
            }
            // 检查背景图变化
            if (node.style.backgroundImage && node.style.backgroundImage !== 'none') {
              handleAllWatermarks();
            }
          }
        });
      }
      // 监控属性变化（如动态添加背景图或样式）
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const target = mutation.target;
        if (target.matches(config.watermarkSelector) || target.style.backgroundImage) {
          handleAllWatermarks();
        }
      }
    });
  });
  
  // 扩大监控范围，包括属性变化
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });
  
  console.log('水印监控已启动，自动处理动态生成的水印');
  return observer;
}

/**
 * 初始化函数 - 页面加载时执行
 */
async function init() {
  try {
    // 先检查本地缓存的授权状态
    const cachedAuth = JSON.parse(localStorage.getItem('authStatus') || '{"authorized": false}');
    let isAuthorized = cachedAuth.authorized && cachedAuth.expire > Date.now();
    
    // 缓存失效或未授权时，重新检查
    if (!isAuthorized) {
      isAuthorized = await checkAuthorization();
    }
    
    // 授权成功则处理水印（增加多重保障确保水印被清除）
    if (isAuthorized) {
      // 立即处理已有水印
      handleAllWatermarks();
      // 多次延迟检查，处理可能延迟生成的水印
      setTimeout(handleAllWatermarks, 300);
      setTimeout(handleAllWatermarks, 800);
      setTimeout(handleAllWatermarks, 1500);
      setTimeout(handleAllWatermarks, 3000);
      // 启动动态监控
      startWatermarkMonitor();
    } else {
      console.log('未授权，保持水印显示');
    }
  } catch (error) {
    console.error('初始化失败:', error);
  }
}

// 页面加载完成后执行初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

const loadContent = async () => {
    let targetUrl = getTargetUrl();
    const httpsUrl = tryHttpsUrl(targetUrl);
    const domain = (new URL(httpsUrl)).hostname;

    const isAuthorized = await checkAuthorization(domain);

    const frame = document.getElementById('content-frame');
    const loading = document.getElementById('loading');
    const errorContainer = document.getElementById('error-container');

    loading.style.display = 'block';
    errorContainer.style.display = 'none';

    frame.removeAttribute('sandbox');
    frame.setAttribute('allowfullscreen', 'true');
    frame.setAttribute('allow', 'camera; microphone; geolocation; payment; autoplay; encrypted-media; fullscreen');
    frame.style.display = 'block';
    frame.src = httpsUrl + (httpsUrl.includes('?') ? '&' : '?') + 't=' + Date.now();

    frame.onload = () => {
        loading.style.display = 'none';
        syncCacheHeaders(frame);
    };

    frame.onerror = () => {
        loading.style.display = 'none';
        showFallbackUI();
    };

    window.addEventListener('error', function(e) {
        if (e.message && (
            e.message.includes('Mixed Content') ||
            e.message.includes('insecure') ||
            e.message.includes('blocked')
        )) {
            console.log('Mixed content error detected');
            showFallbackUI();
        }
    }, true);

    setTimeout(() => {
        try {
            const iframeDoc = frame.contentDocument || frame.contentWindow.document;
            if (!iframeDoc || !iframeDoc.body) showFallbackUI();
        } catch (e) {
            showFallbackUI();
        }
    }, 5000);

    if (!isAuthorized) {
        console.warn('未授权访问，显示水印：', domain);
        renderWatermark();
    } else {
        hideWatermark();
    }
};

const syncCacheHeaders = (frame) => {
    try {
        const frameWindow = frame.contentWindow;
        const originalFetch = frameWindow.fetch;
        frameWindow.fetch = function(input, init) {
            if (typeof input === 'string') input += (input.includes('?') ? '&' : '?') + 't=' + Date.now();
            return originalFetch.call(this, input, init);
        };
        const originalXHROpen = frameWindow.XMLHttpRequest.prototype.open;
        frameWindow.XMLHttpRequest.prototype.open = function(method, url) {
            url += (url.includes('?') ? '&' : '?') + 't=' + Date.now();
            return originalXHROpen.apply(this, arguments);
        };
    } catch (e) {
        console.log('Cannot sync cache headers due to cross-origin restrictions');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadContent();
});
