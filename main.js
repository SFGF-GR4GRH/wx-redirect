<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!--<link rel="shortcut icon" href="favicon.ico" type="image/x-icon">-->
  <!--<link rel="icon" href="favicon.png" type="image/png">-->
  <title>正在加载...</title>
  <style>
    /* 加载动画样式 */
    .loading-container {
      width: 100px;
      height: 100px;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1000;
    }
    .loading-dot {
      width: 15px;
      height: 15px;
      border-radius: 50%;
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      margin: auto;
    }
    .dot-1 { background-color: #ffe386; animation: dot-move 2s ease infinite 0s; }
    .dot-2 { background-color: #10beae; animation: dot-move 2s ease infinite 0.2s; }
    .dot-3 { background-color: #f74d75; animation: dot-move 2s ease infinite 0.4s; }
    
    @keyframes dot-move {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(0.5); opacity: 0.5; }
    }
    
    /* 透明水印样式 */
    .watermark {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: transparent;
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      pointer-events: none;
    }
    
    .watermark-content {
      background: rgba(0,0,0,0.3);
      padding: 20px 40px;
      border-radius: 10px;
      color: white;
      font-size: 24px;
      text-align: center;
      flex-direction: column;
      box-shadow: 0 0 20px rgba(0,0,0,0.5);
      pointer-events: auto;
    }
    
    .watermark a {
      color: #f74d75;
      text-decoration: none;
      margin-top: 20px;
      font-weight: bold;
      display: inline-block;
    }
    
    /* 内容样式 */
    .content-frame {
      height: 100%;
      width: 100%;
      position: fixed;
      left: 0;
      top: 0;
      border: none;
      z-index: 1;
    }
    
    /* 错误提示样式 */
    .error-message {
      color: #ff6b6b;
      font-size: 14px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <!-- 加载动画 -->
  <div class="loading-container" id="loading">
    <div class="loading-dot dot-1"></div>
    <div class="loading-dot dot-2"></div>
    <div class="loading-dot dot-3"></div>
  </div>


  <!-- 内容容器 -->
  <iframe class="content-frame" id="contentFrame"></iframe>

  <script>
    // 配置授权检查API地址
    const AUTH_API_URL = 'https://github.cos.ddkisw.cn/check.php';
    
    // 备选CORS代理服务器列表
    const CORS_PROXIES = [
      'https://api.allorigins.win/get?url=',
      'https://corsproxy.io/?',
      'https://thingproxy.freeboard.io/fetch/'
    ];

    // 获取URL参数
    function getUrlParam(name) {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(name);
    }

    // 检查授权状态
    async function checkAuth(url) {
      try {
        const response = await fetch(`${AUTH_API_URL}?link=${encodeURIComponent(url)}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.code === 200;
        }
        return false;
      } catch (error) {
        console.error('授权检查失败:', error);
        return false;
      }
    }

    // 显示水印
    function showWatermark(errorMessage = '') {
      if (errorMessage) {
        document.getElementById('errorDetail').textContent = errorMessage;
      }
      document.getElementById('watermark').style.display = 'flex';
    }

    // 隐藏水印
    function hideWatermark() {
      document.getElementById('watermark').style.display = 'none';
    }

    // 加载内容
    function loadContent(url) {
      const frame = document.getElementById('contentFrame');
      frame.src = url;
      document.getElementById('loading').style.display = 'none';
      
      frame.onload = function() {
        try {
          bindMouseWheel(frame);
        } catch(e) {
          console.log('跨域限制:', e);
        }
      };
    }

    // 鼠标滚轮控制
    function bindMouseWheel(ifr) {
      const firefox = navigator.userAgent.indexOf('Firefox') != -1;
      
      function handleWheel(e, doc) {
        e.preventDefault();
        const up = (firefox && e.detail < 0) || e.wheelDelta > 0;
        doc.body.scrollTop = doc.documentElement.scrollTop += up ? -50 : 50;
      }
      
      try {
        const doc = ifr.contentWindow.document;
        if (firefox) {
          doc.addEventListener('DOMMouseScroll', (e) => handleWheel(e, doc), false);
        } else {
          doc.onmousewheel = (e) => handleWheel(e || ifr.contentWindow.event, doc);
        }
      } catch(e) {
        console.log('跨域无法获取iframe加载document', e);
      }
    }

    // 主执行函数
    async function main() {
      try {
        const encodedParam = getUrlParam('c');
        if (!encodedParam) {
          throw new Error('缺少授权参数(c)');
        }

        // 解码Base64 URL
        let trueUrl;
        try {
          trueUrl = atob(encodedParam);
          if (!trueUrl.startsWith('http')) {
            throw new Error('无效的URL格式');
          }
        } catch (e) {
          throw new Error('URL解码失败');
        }

        // 加载内容（无论授权状态如何）
        loadContent(trueUrl);

        // 检查授权状态
        const isAuthorized = await checkAuth(trueUrl);
        if (!isAuthorized) {
          showWatermark('授权验证失败');
        } else {
          hideWatermark();
        }
      } catch (error) {
        console.error('初始化失败:', error);
        showWatermark(error.message || '网络请求失败，请稍后重试');
      }
    }

    // 页面加载完成后启动
    window.addEventListener('DOMContentLoaded', main);
  </script>
</body>
</html>
 
