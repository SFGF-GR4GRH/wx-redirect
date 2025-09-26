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

const checkAuthorization = async (domain) => {
    try {
        const res = await fetch(`https://github.cos.ddkisw.cn/check.php?link==${domain}`);
        const data = await res.json();
        return data.authorized === true;
    } catch (e) {
        console.error('授权接口调用失败:', e);
        return false;
    }
};

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
