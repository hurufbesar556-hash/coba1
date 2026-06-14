(function () {
  if (window.__repostRemoverLoaded) return;
  window.__repostRemoverLoaded = true;

  const RR_LANG_KEY = 'cleanUploaderLang';
  const RR_COPY = {
    en: {
      repostRemover: 'Repost Remover',
      openRepostRemover: 'Open Repost Remover',
      close: 'Close',
      removeReposts: 'Remove Reposts',
      pause: 'Pause',
      resume: 'Resume',
      report: 'Report',
      ready: 'Ready',
      processing: 'Processing',
      done: 'Done',
      error: 'Error',
      pages: 'Pages',
      removed: 'Removed',
      failed: 'Failed',
      method: 'NXT_Shark537 method',
      finding: 'Processing: finding reposts',
      missingSecUid: 'Error: secUid not found. Open the right profile',
      fetchError: 'Error: could not fetch reposts',
      finished: 'Done: all reposts processed',
      reportDownloaded: 'Done: report downloaded',
      removing: 'Processing: removing ({count} processed)',
      paused: 'Processing paused',
      resumed: 'Processing resumed',
    },
    pt: {
      repostRemover: 'Removedor de Reposts',
      openRepostRemover: 'Abrir Removedor de Reposts',
      close: 'Fechar',
      removeReposts: 'Remover Reposts',
      pause: 'Pausar',
      resume: 'Continuar',
      report: 'Relatório',
      ready: 'Pronto',
      processing: 'Processando',
      done: 'Concluído',
      error: 'Erro',
      pages: 'Páginas',
      removed: 'Removidos',
      failed: 'Falhas',
      method: 'NXT_Shark537 method',
      finding: 'Processando: buscando reposts',
      missingSecUid: 'Erro: secUid não encontrado. Abra o perfil certo',
      fetchError: 'Erro: não foi possível buscar reposts',
      finished: 'Concluído: todos os reposts foram processados',
      reportDownloaded: 'Concluído: relatório baixado',
      removing: 'Processando: removendo ({count} processados)',
      paused: 'Processamento pausado',
      resumed: 'Processamento retomado',
    },
  };

  let currentLang = getSavedLanguage();
  let currentStatus = { key: 'ready', values: {}, state: 'idle' };

  function getSavedLanguage() {
    try {
      const saved = localStorage.getItem(RR_LANG_KEY);
      return saved === 'pt' || saved === 'en' ? saved : 'en';
    } catch (err) {
      return 'en';
    }
  }

  function persistLanguage(lang) {
    try {
      localStorage.setItem(RR_LANG_KEY, lang);
    } catch (err) {}
  }

  function formatCopy(template, values = {}) {
    return String(template || '').replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
  }

  function t(key, values = {}) {
    return formatCopy((RR_COPY[currentLang] && RR_COPY[currentLang][key]) || RR_COPY.en[key] || key, values);
  }

  // ==================== UI ====================
  const root = document.createElement('div');
  root.id = '__repostRemoverRoot';
  root.innerHTML = `
    <style>
      #__repostRemoverRoot {
        --cu-bg: #050506;
        --cu-bg-2: #060a12;
        --cu-bg-3: #07101f;
        --cu-surface: rgba(12, 16, 24, 0.78);
        --cu-surface-strong: rgba(16, 24, 38, 0.9);
        --cu-border: rgba(255, 255, 255, 0.08);
        --cu-border-hot: rgba(45, 140, 255, 0.42);
        --cu-text: #f7f3f4;
        --cu-muted: #9a8f94;
        --cu-dim: #6c5d63;
        --cu-blue: #2d8cff;
        --cu-blue-2: #1473ff;
        --cu-blue-dark: #063a7a;
        --cu-blue-soft: rgba(45, 140, 255, 0.16);
        --cu-deep-blue: #0f55b8;
        --cu-black: #030304;
        --cu-green: #35e783;
        --cu-green-soft: rgba(53, 231, 131, 0.16);
        --cu-cyan-detail: #3ddcff;
        position: relative;
        z-index: 2147483646;
        font-family: Inter, Sora, "Space Grotesk", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      #__repostRemoverRoot * {
        box-sizing: border-box;
      }

      #rrLauncher {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 2147483646;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 40px;
        padding: 0 13px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.09);
        border-top-color: rgba(45,140,255,0.24);
        color: var(--cu-text);
        background: linear-gradient(135deg, rgba(12,16,24,0.86), rgba(9,35,74,0.76));
        backdrop-filter: blur(16px);
        box-shadow:
          0 14px 35px rgba(0,0,0,0.58),
          0 0 24px rgba(45,140,255,0.10),
          inset 0 1px 0 rgba(255,255,255,0.05);
        cursor: pointer;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, opacity 180ms ease;
      }

      #rrLauncher:hover {
        transform: translateY(-2px);
        border-color: var(--cu-border-hot);
        box-shadow:
          0 16px 42px rgba(0,0,0,0.64),
          0 0 30px rgba(45,140,255,0.22),
          inset 0 1px 0 rgba(255,255,255,0.06);
      }

      #rrLauncher:active {
        transform: scale(0.98);
      }

      #rrLauncher.rr-hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateY(8px) scale(0.96);
      }

      #rrLauncher .rr-dot {
        width: 9px;
        height: 9px;
        border-radius: 999px;
        background: var(--cu-blue);
        box-shadow: 0 0 16px rgba(45,140,255,0.56);
      }

      #__repostRemoverPanel {
        position: fixed;
        right: 18px;
        bottom: 70px;
        z-index: 2147483646;
        width: min(324px, calc(100vw - 36px));
        max-height: 70vh;
        overflow: auto;
        color: var(--cu-text);
        background:
          radial-gradient(circle at 12% 0%, rgba(45,140,255,0.22), transparent 38%),
          radial-gradient(circle at 95% 100%, rgba(15,85,184,0.18), transparent 40%),
          var(--cu-surface);
        backdrop-filter: blur(16px);
        border: 1px solid var(--cu-border);
        border-top: 1px solid rgba(45,140,255,0.25);
        border-radius: 22px;
        box-shadow:
          0 18px 45px rgba(0,0,0,0.65),
          0 0 30px rgba(45,140,255,0.08),
          inset 0 1px 0 rgba(255,255,255,0.05);
        opacity: 0;
        pointer-events: none;
        transform: translateY(12px) scale(0.96);
        transition: opacity 200ms ease, transform 200ms ease;
      }

      #__repostRemoverPanel.rr-open {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0) scale(1);
      }

      #__repostRemoverPanel .rr-header {
        display: grid;
        grid-template-columns: 36px minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 10px;
        padding: 13px;
        border-bottom: 1px solid rgba(255,255,255,0.07);
      }

      #__repostRemoverPanel .rr-mark {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        border: 1px solid rgba(255,255,255,0.12);
        background:
          radial-gradient(circle at 35% 20%, rgba(255,255,255,0.22), transparent 26%),
          linear-gradient(135deg, rgba(45,140,255,0.95), rgba(6,58,122,0.92));
        box-shadow: 0 0 22px rgba(45,140,255,0.34);
      }

      #__repostRemoverPanel .rr-mark::before {
        content: "";
        width: 15px;
        height: 15px;
        border-radius: 5px;
        border: 2px solid rgba(255,255,255,0.9);
        transform: rotate(45deg);
      }

      #__repostRemoverPanel .rr-title {
        display: block;
        font-size: 13px;
        line-height: 1;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      #__repostRemoverPanel .rr-method {
        display: block;
        margin-top: 5px;
        color: var(--cu-muted);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      #__repostRemoverPanel .rr-lang {
        display: inline-flex;
        gap: 2px;
        padding: 3px;
        border-radius: 999px;
        background: rgba(3,3,4,0.52);
        border: 1px solid var(--cu-border);
      }

      #__repostRemoverPanel .rr-lang-btn,
      #__repostRemoverPanel .rr-close {
        border: 0;
        cursor: pointer;
        font-weight: 800;
        transition: 180ms ease;
      }

      #__repostRemoverPanel .rr-lang-btn {
        min-width: 28px;
        padding: 5px 7px;
        border-radius: 999px;
        color: var(--cu-muted);
        background: transparent;
        font-size: 10px;
        letter-spacing: 0.08em;
      }

      #__repostRemoverPanel .rr-lang-btn:hover,
      #__repostRemoverPanel .rr-lang-btn.is-active {
        color: var(--cu-text);
        background: rgba(45,140,255,0.18);
        box-shadow: 0 0 16px rgba(45,140,255,0.16);
      }

      #__repostRemoverPanel .rr-close {
        width: 30px;
        height: 30px;
        border-radius: 999px;
        color: var(--cu-muted);
        background: rgba(3,3,4,0.42);
        border: 1px solid rgba(255,255,255,0.08);
        font-size: 15px;
        line-height: 1;
      }

      #__repostRemoverPanel .rr-close:hover {
        color: #fff;
        border-color: rgba(45,140,255,0.44);
        background: rgba(45,140,255,0.18);
        box-shadow: 0 0 18px rgba(45,140,255,0.18);
      }

      #__repostRemoverPanel .rr-body {
        display: grid;
        gap: 11px;
        padding: 13px;
      }

      #__repostRemoverPanel .rr-status {
        position: relative;
        min-height: 34px;
        padding: 9px 10px 9px 28px;
        color: var(--cu-muted);
        background: rgba(3,3,4,0.48);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 13px;
        font-size: 11px;
        line-height: 1.35;
      }

      #__repostRemoverPanel .rr-status::before {
        content: "";
        position: absolute;
        left: 11px;
        top: 13px;
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: var(--cu-dim);
      }

      #__repostRemoverPanel .rr-status[data-state="processing"] {
        color: #dcecff;
        border-color: rgba(45,140,255,0.20);
      }

      #__repostRemoverPanel .rr-status[data-state="processing"]::before {
        background: var(--cu-blue);
        box-shadow: 0 0 14px rgba(45,140,255,0.42);
      }

      #__repostRemoverPanel .rr-status[data-state="success"] {
        color: #d9ffe9;
        border-color: rgba(53,231,131,0.22);
        background: var(--cu-green-soft);
      }

      #__repostRemoverPanel .rr-status[data-state="success"]::before {
        background: var(--cu-green);
        box-shadow: 0 0 14px rgba(53,231,131,0.46);
      }

      #__repostRemoverPanel .rr-status[data-state="error"] {
        color: #d4e7ff;
        border-color: rgba(45,140,255,0.38);
        background: rgba(45,140,255,0.10);
      }

      #__repostRemoverPanel .rr-status[data-state="error"]::before {
        background: var(--cu-blue-2);
        box-shadow: 0 0 16px rgba(20,115,255,0.48);
      }

      #__repostRemoverPanel .rr-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 7px;
      }

      #__repostRemoverPanel .rr-stat {
        min-width: 0;
        padding: 8px 6px;
        text-align: center;
        color: var(--cu-muted);
        background: rgba(3,3,4,0.38);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 14px;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      #__repostRemoverPanel .rr-stat span {
        display: block;
        margin-bottom: 3px;
        color: var(--cu-text);
        font-size: 18px;
        line-height: 1;
        letter-spacing: 0;
      }

      #__repostRemoverPanel .rr-buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 7px;
      }

      #__repostRemoverPanel button {
        font-family: inherit;
      }

      #__repostRemoverPanel .rr-action {
        min-height: 38px;
        padding: 10px;
        border-radius: 13px;
        cursor: pointer;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, opacity 180ms ease;
      }

      #__repostRemoverPanel .rr-action:hover {
        transform: translateY(-1px);
      }

      #__repostRemoverPanel .rr-action:active {
        transform: scale(0.98);
      }

      #__repostRemoverPanel .rr-action:disabled {
        opacity: 0.42;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      #__repostRemoverPanel .rr-btn-start {
        grid-column: 1 / -1;
        color: #f8fbff;
        border: 1px solid rgba(255,255,255,0.10);
        background: linear-gradient(135deg, #2d8cff, #0f55b8);
        box-shadow: 0 12px 28px rgba(15,85,184,0.30), 0 0 22px rgba(45,140,255,0.16);
      }

      #__repostRemoverPanel .rr-btn-pause,
      #__repostRemoverPanel .rr-btn-report {
        color: var(--cu-text);
        background: linear-gradient(135deg, rgba(18,12,14,0.88), rgba(9,35,74,0.68));
        border: 1px solid rgba(255,255,255,0.09);
      }

      #__repostRemoverPanel .rr-btn-pause:hover,
      #__repostRemoverPanel .rr-btn-report:hover {
        border-color: var(--cu-border-hot);
        box-shadow: 0 0 20px rgba(45,140,255,0.12);
      }
    </style>

    <button id="rrLauncher" type="button">
      <span class="rr-dot" aria-hidden="true"></span>
      <span id="rrLauncherText">Repost</span>
    </button>

    <div id="__repostRemoverPanel" role="dialog">
      <div class="rr-header">
        <div class="rr-mark" aria-hidden="true"></div>
        <div>
          <span class="rr-title" id="rrTitle"></span>
          <span class="rr-method" id="rrMethod"></span>
        </div>
        <div class="rr-lang" aria-label="Language">
          <button class="rr-lang-btn" type="button" data-rr-lang="en">EN</button>
          <button class="rr-lang-btn" type="button" data-rr-lang="pt">PT</button>
        </div>
        <button class="rr-close" id="rrClose" type="button">X</button>
      </div>
      <div class="rr-body">
        <div class="rr-status" id="rrStatus" data-state="idle"></div>
        <div class="rr-stats">
          <div class="rr-stat"><span id="rrPages">0</span><span id="rrPagesLabel"></span></div>
          <div class="rr-stat"><span id="rrRemoved">0</span><span id="rrRemovedLabel"></span></div>
          <div class="rr-stat"><span id="rrFailed">0</span><span id="rrFailedLabel"></span></div>
        </div>
        <div class="rr-buttons">
          <button class="rr-action rr-btn-start" id="rrStart" type="button"></button>
          <button class="rr-action rr-btn-pause" id="rrPause" type="button" disabled></button>
          <button class="rr-action rr-btn-report" id="rrReport" type="button" disabled></button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // ==================== REFS ====================
  const panel = document.getElementById('__repostRemoverPanel');
  const launcherBtn = document.getElementById('rrLauncher');
  const launcherText = document.getElementById('rrLauncherText');
  const titleEl = document.getElementById('rrTitle');
  const methodEl = document.getElementById('rrMethod');
  const statusEl  = document.getElementById('rrStatus');
  const pagesEl   = document.getElementById('rrPages');
  const removedEl = document.getElementById('rrRemoved');
  const failedEl  = document.getElementById('rrFailed');
  const pagesLabelEl = document.getElementById('rrPagesLabel');
  const removedLabelEl = document.getElementById('rrRemovedLabel');
  const failedLabelEl = document.getElementById('rrFailedLabel');
  const startBtn  = document.getElementById('rrStart');
  const pauseBtn  = document.getElementById('rrPause');
  const reportBtn = document.getElementById('rrReport');
  const closeBtn  = document.getElementById('rrClose');
  const langBtns = Array.from(root.querySelectorAll('[data-rr-lang]'));

  // ==================== STATE ====================
  let running = false;
  let paused  = false;
  const removed = [];
  const failed  = [];

  // ==================== HELPERS ====================
  function setStatus(key, values = {}, state = 'idle') {
    currentStatus = { key, values, state };
    statusEl.textContent = t(key, values);
    statusEl.dataset.state = state;
  }

  function setLanguage(lang) {
    currentLang = lang === 'pt' ? 'pt' : 'en';
    titleEl.textContent = t('repostRemover');
    methodEl.textContent = t('method');
    pagesLabelEl.textContent = t('pages');
    removedLabelEl.textContent = t('removed');
    failedLabelEl.textContent = t('failed');
    startBtn.textContent = t('removeReposts');
    pauseBtn.textContent = paused ? t('resume') : t('pause');
    reportBtn.textContent = t('report');
    closeBtn.title = t('close');
    closeBtn.setAttribute('aria-label', t('close'));
    launcherBtn.title = t('openRepostRemover');
    launcherBtn.setAttribute('aria-label', t('openRepostRemover'));
    launcherText.textContent = 'Repost';
    panel.setAttribute('aria-label', t('repostRemover'));

    langBtns.forEach((btn) => {
      const active = btn.dataset.rrLang === currentLang;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    setStatus(currentStatus.key, currentStatus.values, currentStatus.state);
    persistLanguage(currentLang);
  }

  function updateStats(pages) {
    pagesEl.textContent   = pages;
    removedEl.textContent = removed.length;
    failedEl.textContent  = failed.length;
  }

  function openPanel() {
    panel.classList.add('rr-open');
    launcherBtn.classList.add('rr-hidden');
  }

  function closePanel() {
    running = false;
    paused = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = t('pause');
    panel.classList.remove('rr-open');
    launcherBtn.classList.remove('rr-hidden');
  }

  function getSecUid() {
    const match = document.documentElement.innerHTML.match(/"secUid":"([^"]+)"/);
    return match ? match[1] : null;
  }

  function downloadReport() {
    const report = {
      totalRemoved: removed.length,
      totalFailed: failed.length,
      removed,
      failed,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `repost_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus('reportDownloaded', {}, 'success');
  }

  // ==================== CORE ====================
  async function run() {
    const secUid = getSecUid();
    if (!secUid) {
      setStatus('missingSecUid', {}, 'error');
      return;
    }

    running = true;
    paused  = false;
    startBtn.disabled = true;
    pauseBtn.disabled = false;

    const AID   = 1988;
    const COUNT = 30;
    let cursor  = 0;
    let pages   = 0;

    setStatus('finding', {}, 'processing');

    while (running) {
      // Aguarda pausa
      while (paused && running) {
        await new Promise(r => setTimeout(r, 500));
      }
      if (!running) break;

      // Busca lista de reposts
      let data;
      try {
        const url = `https://www.tiktok.com/api/repost/item_list/?aid=${AID}&count=${COUNT}&coverFormat=2&cursor=${cursor}&needPinnedItemIds=true&post_item_list_request_type=0&secUid=${secUid}`;
        const resp = await fetch(url, { credentials: 'include' });
        data = await resp.json();
      } catch (err) {
        setStatus('fetchError', {}, 'error');
        break;
      }

      if (!data?.itemList?.length) {
        setStatus('finished', {}, 'success');
        break;
      }

      pages++;
      updateStats(pages);

      for (const item of data.itemList) {
        while (paused && running) {
          await new Promise(r => setTimeout(r, 500));
        }
        if (!running) break;

        const itemId = item.id || item.awemeId;
        try {
          const delResp = await fetch(
            `https://www.tiktok.com/tiktok/v1/upvote/delete?aid=${AID}&item_id=${itemId}`,
            { method: 'POST', credentials: 'include' }
          );
          if (delResp.ok) {
            removed.push({
              id: itemId,
              author: item.author?.uniqueId,
              desc: item.desc,
              url: `https://www.tiktok.com/@${item.author?.uniqueId}/video/${itemId}`,
            });
          } else {
            failed.push({ id: itemId, reason: `Status ${delResp.status}` });
          }
        } catch (err) {
          failed.push({ id: itemId, reason: err.message });
        }

        setStatus('removing', { count: removed.length + failed.length }, 'processing');
        updateStats(pages);
        await new Promise(r => setTimeout(r, 2000));
      }

      cursor = data.cursor || 0;
      if (!cursor) break;
    }

    running = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    reportBtn.disabled = false;

    if (removed.length > 0 || failed.length > 0) {
      setStatus('finished', {}, 'success');
      updateStats(pages);
      downloadReport();
    }
  }

  // ==================== EVENTS ====================
  launcherBtn.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', closePanel);

  langBtns.forEach((btn) => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.rrLang));
  });

  startBtn.addEventListener('click', () => {
    removed.length = 0;
    failed.length  = 0;
    reportBtn.disabled = true;
    updateStats(0);
    run();
  });

  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? t('resume') : t('pause');
    setStatus(paused ? 'paused' : 'resumed', {}, 'processing');
  });

  reportBtn.addEventListener('click', downloadReport);

  setLanguage(currentLang);
})();
