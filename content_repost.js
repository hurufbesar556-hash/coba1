// content_repost.js – injeta o Repost Remover na página de perfil
(function() {
  if (window.__repostRemoverInjected) return;
  window.__repostRemoverInjected = true;

  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('repost_injected.js');
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
})();
