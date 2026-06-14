// content.js – injeta inject.js apenas uma vez na página de upload
(function() {
  const url = window.location.href;
  if (url.includes('/tiktokstudio/upload') || url.includes('/upload') || url.includes('/creator-center')) {
    if (!window.__cleanUploaderInjected) {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('inject.js');
      script.onload = () => script.remove();
      (document.head || document.documentElement).appendChild(script);
    }
  }
})();
