const FAKE_SAMPLE_COUNT = 8573;
const FAKE_SAMPLE_SIZE = 8;
const FAKE_SAMPLE_BYTES = new Uint8Array([0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00]);
const VIDEO_TIMESCALE = 90000;
const VIDEO_DURATION = 2269500;
const VIDEO_EDIT_MEDIA_TIME = 3000;
const VIDEO_SAMPLE_DELTA = 1500;

const fileInput = document.getElementById('fileInput');
const patchBtn = document.getElementById('patchBtn');
const openTabBtn = document.getElementById('openTabBtn');
const statusEl = document.getElementById('status');
const sizeWarningEl = document.getElementById('sizeWarning');
const sizeWarningCloseBtn = document.getElementById('sizeWarningClose');
const langBtns = Array.from(document.querySelectorAll('[data-lang]'));
const i18nEls = Array.from(document.querySelectorAll('[data-i18n]'));

const LANG_KEY = 'cleanUploaderLang';
const SIZE_WARNING_BYTES = 90 * 1024 * 1024;
const CONTAINER_BOXES = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf', 'udta', 'meta', 'ilst']);

const COPY = {
  en: {
    title: 'Shark Uploader',
    subtitle: 'Local MP4 patch + upload metadata cleanup',
    method: 'NXT_Shark537 method',
    selectVideo: 'Select video',
    openTab: 'Open in new tab',
    patchDownload: 'Patch & Download',
    ready: 'Ready',
    processing: 'Processing',
    done: 'Done',
    error: 'Error',
    selected: 'Ready: {name}',
    scanning: 'Processing: rebuilding MP4 sample tables',
    patched: 'Processing: {realSamples}+{fakeSamples} video samples. Downloading',
    downloaded: 'Done: file downloaded',
    failed: 'Error: {message}',
    sizeWarningKicker: 'File size warning',
    sizeWarningTitle: 'Video over 90 MB',
    sizeWarningBody: 'Your video is bigger than 90 MB. It may flop because of that. It is HIGHLY recommended to compress it more.',
    close: 'Close',
  },
  pt: {
    title: 'Shark Uploader',
    subtitle: 'Patch local de MP4 + limpeza de metadados do upload',
    method: 'NXT_Shark537 method',
    selectVideo: 'Selecionar video',
    openTab: 'Abrir em nova aba',
    patchDownload: 'Patch & Download',
    ready: 'Pronto',
    processing: 'Processando',
    done: 'Concluido',
    error: 'Erro',
    selected: 'Pronto: {name}',
    scanning: 'Processando: reconstruindo tabelas MP4',
    patched: 'Processando: {realSamples}+{fakeSamples} samples de video. Baixando',
    downloaded: 'Concluido: arquivo baixado',
    failed: 'Erro: {message}',
    sizeWarningKicker: 'Aviso de tamanho',
    sizeWarningTitle: 'Video acima de 90 MB',
    sizeWarningBody: 'Seu video tem mais de 90 MB. Ele pode flopar por causa disso. E ALTAMENTE recomendado comprimir mais.',
    close: 'Fechar',
  },
};

let selectedFile = null;
let currentLang = 'en';
let currentStatus = { key: 'ready', state: 'idle', values: {} };

function formatCopy(template, values = {}) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
}

function t(key, values = {}) {
  return formatCopy((COPY[currentLang] && COPY[currentLang][key]) || COPY.en[key] || key, values);
}

function persistLanguage(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch (err) {}
}

function getSavedLanguage() {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === 'pt' || saved === 'en' ? saved : 'en';
  } catch (err) {
    return 'en';
  }
}

function setStatus(key, state = 'idle', values = {}) {
  currentStatus = { key, state, values };
  statusEl.textContent = t(key, values);
  statusEl.dataset.state = state;
}

function setLanguage(lang) {
  currentLang = lang === 'pt' ? 'pt' : 'en';
  document.documentElement.lang = currentLang;

  i18nEls.forEach((el) => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });

  fileInput.setAttribute('aria-label', t('selectVideo'));

  langBtns.forEach((btn) => {
    const isActive = btn.dataset.lang === currentLang;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });

  setStatus(currentStatus.key, currentStatus.state, currentStatus.values);
  persistLanguage(currentLang);
}

function showSizeWarning() {
  sizeWarningEl.hidden = false;
}

function hideSizeWarning() {
  sizeWarningEl.hidden = true;
}

function getBoxType(data, offset) {
  return String.fromCharCode(
    data[offset],
    data[offset + 1],
    data[offset + 2],
    data[offset + 3]
  );
}

function setBoxType(data, offset, type) {
  for (let i = 0; i < 4; i += 1) {
    data[offset + i] = type.charCodeAt(i);
  }
}

function assertUint32(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 0xffffffff) {
    throw new Error(`${label} fora do limite uint32: ${value}`);
  }
}

function readBox(view, data, offset, end, parentPath = '') {
  if (offset + 8 > end) {
    throw new Error('MP4 invalido: caixa incompleta.');
  }

  const smallSize = view.getUint32(offset, false);
  const type = getBoxType(data, offset + 4);
  let size = smallSize;
  let headerSize = 8;

  if (smallSize === 1) {
    if (offset + 16 > end) {
      throw new Error(`MP4 invalido: caixa ${type} incompleta.`);
    }

    const high = view.getUint32(offset + 8, false);
    const low = view.getUint32(offset + 12, false);
    size = high * 4294967296 + low;
    headerSize = 16;
  } else if (smallSize === 0) {
    size = end - offset;
  }

  if (size < headerSize || offset + size > end) {
    throw new Error(`MP4 invalido: tamanho incorreto na caixa ${type}.`);
  }

  return {
    type,
    offset,
    size,
    headerSize,
    contentStart: offset + headerSize,
    end: offset + size,
    path: parentPath ? `${parentPath}/${type}` : type,
    data,
    view,
    children: [],
    prefixStart: offset + headerSize,
    prefixEnd: offset + headerSize,
  };
}

function childStartForBox(box) {
  if (box.type === 'meta') {
    return box.contentStart + 4;
  }

  return box.contentStart;
}

function parseBoxes(data, view, start = 0, end = data.length, parentPath = '') {
  const boxes = [];
  let offset = start;

  while (offset + 8 <= end) {
    const box = readBox(view, data, offset, end, parentPath);

    if (CONTAINER_BOXES.has(box.type)) {
      const childStart = childStartForBox(box);
      if (childStart > box.end) {
        throw new Error(`MP4 invalido: container ${box.type} curto demais.`);
      }

      box.prefixStart = box.contentStart;
      box.prefixEnd = childStart;
      box.children = parseBoxes(data, view, childStart, box.end, box.path);
    }

    boxes.push(box);
    offset = box.end;
  }

  return boxes;
}

function findChild(box, type) {
  return box.children.find((child) => child.type === type) || null;
}

function findDescendant(box, path) {
  let current = box;
  for (const type of path) {
    current = findChild(current, type);
    if (!current) return null;
  }

  return current;
}

function findTopLevel(boxes, type) {
  return boxes.find((box) => box.type === type) || null;
}

function handlerTypeForTrak(trak) {
  const hdlr = findDescendant(trak, ['mdia', 'hdlr']);
  if (!hdlr || hdlr.offset + 20 > hdlr.end) {
    return null;
  }

  return getBoxType(hdlr.data, hdlr.offset + 16);
}

function parseStsz(stsz) {
  const sampleSize = stsz.view.getUint32(stsz.offset + 12, false);
  const count = stsz.view.getUint32(stsz.offset + 16, false);

  if (sampleSize) {
    return new Array(count).fill(sampleSize);
  }

  const tableStart = stsz.offset + 20;
  if (tableStart + count * 4 > stsz.end) {
    throw new Error('MP4 invalido: stsz menor que a quantidade de samples declarada.');
  }

  const sizes = [];
  for (let i = 0; i < count; i += 1) {
    sizes.push(stsz.view.getUint32(tableStart + i * 4, false));
  }

  return sizes;
}

function parseStco(stco) {
  const count = stco.view.getUint32(stco.offset + 12, false);
  const tableStart = stco.offset + 16;

  if (tableStart + count * 4 > stco.end) {
    throw new Error('MP4 invalido: stco menor que a quantidade de chunks declarada.');
  }

  const offsets = [];
  for (let i = 0; i < count; i += 1) {
    offsets.push(stco.view.getUint32(tableStart + i * 4, false));
  }

  return offsets;
}

function parseStsc(stsc) {
  const count = stsc.view.getUint32(stsc.offset + 12, false);
  const tableStart = stsc.offset + 16;

  if (tableStart + count * 12 > stsc.end) {
    throw new Error('MP4 invalido: stsc menor que a quantidade de entradas declarada.');
  }

  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const offset = tableStart + i * 12;
    rows.push([
      stsc.view.getUint32(offset, false),
      stsc.view.getUint32(offset + 4, false),
      stsc.view.getUint32(offset + 8, false),
    ]);
  }

  return rows;
}

function makeBox(type, payload) {
  const size = 8 + payload.length;
  assertUint32(size, `${type}.size`);

  const box = new Uint8Array(size);
  const view = new DataView(box.buffer);
  view.setUint32(0, size, false);
  setBoxType(box, 4, type);
  box.set(payload, 8);
  return box;
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  assertUint32(total, 'output_size');

  const output = new Uint8Array(total);
  let offset = 0;

  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });

  return output;
}

function boxBytes(box) {
  return box.data.slice(box.offset, box.end);
}

function boxPayload(box) {
  return box.data.slice(box.contentStart, box.end);
}

function buildMdhd(box) {
  const payload = boxPayload(box);
  const view = new DataView(payload.buffer);
  const version = payload[0];

  if (version !== 0) {
    throw new Error(`Versao mdhd nao suportada nesse metodo: ${version}.`);
  }

  view.setUint32(12, VIDEO_TIMESCALE, false);
  view.setUint32(16, VIDEO_DURATION, false);
  return makeBox('mdhd', payload);
}

function buildElst(box) {
  const payload = boxPayload(box);
  const view = new DataView(payload.buffer);
  const version = payload[0];
  const entryCount = view.getUint32(4, false);

  if (version !== 0 || entryCount < 1) {
    throw new Error('Esse metodo precisa de elst version 0 com pelo menos uma entrada.');
  }

  view.setUint32(12, VIDEO_EDIT_MEDIA_TIME, false);
  return makeBox('elst', payload);
}

function buildStts(realSampleCount) {
  const payload = new Uint8Array(4 + 4 + 8 + 8);
  const view = new DataView(payload.buffer);

  view.setUint32(4, 2, false);
  view.setUint32(8, realSampleCount, false);
  view.setUint32(12, VIDEO_SAMPLE_DELTA, false);
  view.setUint32(16, FAKE_SAMPLE_COUNT, false);
  view.setUint32(20, VIDEO_SAMPLE_DELTA, false);

  return makeBox('stts', payload);
}

function buildStsz(originalSizes) {
  const totalSamples = originalSizes.length + FAKE_SAMPLE_COUNT;
  const payload = new Uint8Array(4 + 4 + 4 + totalSamples * 4);
  const view = new DataView(payload.buffer);

  view.setUint32(8, totalSamples, false);

  let offset = 12;
  originalSizes.forEach((size) => {
    view.setUint32(offset, size, false);
    offset += 4;
  });

  for (let i = 0; i < FAKE_SAMPLE_COUNT; i += 1) {
    view.setUint32(offset, FAKE_SAMPLE_SIZE, false);
    offset += 4;
  }

  return makeBox('stsz', payload);
}

function buildStsc(originalRows, originalChunkCount) {
  const rows = originalRows.map((row) => [...row]);
  const lastRow = rows[rows.length - 1];

  if (!lastRow || lastRow[1] !== 1) {
    rows.push([originalChunkCount + 1, 1, 1]);
  }

  const payload = new Uint8Array(4 + 4 + rows.length * 12);
  const view = new DataView(payload.buffer);

  view.setUint32(4, rows.length, false);

  let offset = 8;
  rows.forEach(([firstChunk, samplesPerChunk, sampleDescriptionIndex]) => {
    view.setUint32(offset, firstChunk, false);
    view.setUint32(offset + 4, samplesPerChunk, false);
    view.setUint32(offset + 8, sampleDescriptionIndex, false);
    offset += 12;
  });

  return makeBox('stsc', payload);
}

function buildStco(originalOffsets, delta, fakeOffset = null) {
  const count = originalOffsets.length + (fakeOffset === null ? 0 : FAKE_SAMPLE_COUNT);
  const payload = new Uint8Array(4 + 4 + count * 4);
  const view = new DataView(payload.buffer);

  view.setUint32(4, count, false);

  let tableOffset = 8;
  originalOffsets.forEach((offset) => {
    const shifted = offset + delta;
    assertUint32(shifted, 'stco.chunk_offset');
    view.setUint32(tableOffset, shifted, false);
    tableOffset += 4;
  });

  if (fakeOffset !== null) {
    assertUint32(fakeOffset, 'stco.fake_sample_offset');
    for (let i = 0; i < FAKE_SAMPLE_COUNT; i += 1) {
      view.setUint32(tableOffset, fakeOffset, false);
      tableOffset += 4;
    }
  }

  return makeBox('stco', payload);
}

function rebuildBox(box, replacements) {
  if (replacements.has(box)) {
    return replacements.get(box);
  }

  if (!box.children.length) {
    return boxBytes(box);
  }

  const parts = [box.data.slice(box.prefixStart, box.prefixEnd)];
  box.children.forEach((child) => {
    parts.push(rebuildBox(child, replacements));
  });

  return makeBox(box.type, concatBytes(parts));
}

function collectTrackStcoBoxes(moov) {
  const stcoBoxes = [];

  moov.children
    .filter((child) => child.type === 'trak')
    .forEach((trak) => {
      const stbl = findDescendant(trak, ['mdia', 'minf', 'stbl']);
      if (!stbl) return;

      const co64 = findChild(stbl, 'co64');
      if (co64) {
        throw new Error('Esse metodo ainda nao suporta MP4 com co64.');
      }

      const stco = findChild(stbl, 'stco');
      if (stco) {
        stcoBoxes.push(stco);
      }
    });

  return stcoBoxes;
}

function buildStcoReplacements(stcoBoxes, videoStco, delta, fakeOffset) {
  const replacements = new Map();

  stcoBoxes.forEach((stco) => {
    replacements.set(
      stco,
      buildStco(parseStco(stco), delta, stco === videoStco ? fakeOffset : null)
    );
  });

  return replacements;
}

function patchSharkSampleTableMethod(arrayBuffer) {
  const data = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  const topLevel = parseBoxes(data, view);

  const ftyp = findTopLevel(topLevel, 'ftyp');
  const moov = findTopLevel(topLevel, 'moov');
  const mdat = findTopLevel(topLevel, 'mdat');

  if (!ftyp) {
    throw new Error('Caixa "ftyp" nao encontrada. O arquivo precisa ser MP4 valido.');
  }

  if (!moov) {
    throw new Error('Caixa "moov" nao encontrada. O arquivo precisa ter metadata MP4 completa.');
  }

  if (!mdat) {
    throw new Error('Caixa "mdat" nao encontrada. O arquivo precisa conter midia MP4.');
  }

  const videoTrak = moov.children.find((child) => child.type === 'trak' && handlerTypeForTrak(child) === 'vide');
  if (!videoTrak) {
    throw new Error('Track de video nao encontrada.');
  }

  const stbl = findDescendant(videoTrak, ['mdia', 'minf', 'stbl']);
  const mdhd = findDescendant(videoTrak, ['mdia', 'mdhd']);
  const elst = findDescendant(videoTrak, ['edts', 'elst']);
  const stts = stbl && findChild(stbl, 'stts');
  const stsc = stbl && findChild(stbl, 'stsc');
  const stsz = stbl && findChild(stbl, 'stsz');
  const stco = stbl && findChild(stbl, 'stco');

  if (!stbl || !mdhd || !elst || !stts || !stsc || !stsz || !stco) {
    throw new Error('MP4 sem as tabelas necessarias: mdhd, elst, stts, stsc, stsz e stco.');
  }

  const originalSizes = parseStsz(stsz);
  const originalStscRows = parseStsc(stsc);
  const originalChunkOffsets = parseStco(stco);
  const stcoBoxes = collectTrackStcoBoxes(moov);
  const preservedTopLevel = topLevel
    .filter((box) => !['ftyp', 'moov', 'mdat'].includes(box.type))
    .map(boxBytes);

  const fixedReplacements = new Map([
    [mdhd, buildMdhd(mdhd)],
    [elst, buildElst(elst)],
    [stts, buildStts(originalSizes.length)],
    [stsc, buildStsc(originalStscRows, originalChunkOffsets.length)],
    [stsz, buildStsz(originalSizes)],
  ]);

  const placeholderReplacements = new Map(fixedReplacements);
  buildStcoReplacements(stcoBoxes, stco, 0, 0).forEach((value, key) => {
    placeholderReplacements.set(key, value);
  });

  const moovPlaceholder = rebuildBox(moov, placeholderReplacements);
  const preservedBytes = concatBytes(preservedTopLevel);
  const oldMdatPayloadStart = mdat.contentStart;
  const oldMdatPayload = data.slice(mdat.contentStart, mdat.end);
  const newMdatPayloadStart = ftyp.size + moovPlaceholder.length + preservedBytes.length + 8;
  let delta = newMdatPayloadStart - oldMdatPayloadStart;
  let fakeOffset = newMdatPayloadStart + oldMdatPayload.length;

  let finalReplacements = new Map(fixedReplacements);
  buildStcoReplacements(stcoBoxes, stco, delta, fakeOffset).forEach((value, key) => {
    finalReplacements.set(key, value);
  });

  let moovNew = rebuildBox(moov, finalReplacements);
  const recalculatedMdatPayloadStart = ftyp.size + moovNew.length + preservedBytes.length + 8;
  delta = recalculatedMdatPayloadStart - oldMdatPayloadStart;
  fakeOffset = recalculatedMdatPayloadStart + oldMdatPayload.length;

  finalReplacements = new Map(fixedReplacements);
  buildStcoReplacements(stcoBoxes, stco, delta, fakeOffset).forEach((value, key) => {
    finalReplacements.set(key, value);
  });

  moovNew = rebuildBox(moov, finalReplacements);
  const mdatPayloadNew = concatBytes([oldMdatPayload, FAKE_SAMPLE_BYTES]);
  const mdatNew = makeBox('mdat', mdatPayloadNew);
  const output = concatBytes([boxBytes(ftyp), moovNew, preservedBytes, mdatNew]);

  return {
    output,
    realSamples: originalSizes.length,
    fakeSamples: FAKE_SAMPLE_COUNT,
    fakeSampleSize: FAKE_SAMPLE_SIZE,
    fakeOffset,
    stcoDelta: delta,
  };
}

fileInput.addEventListener('change', (e) => {
  selectedFile = e.target.files && e.target.files[0] ? e.target.files[0] : null;
  if (selectedFile) {
    patchBtn.disabled = false;
    document.body.classList.add('has-file');
    setStatus('selected', 'idle', { name: selectedFile.name });
    if (selectedFile.size > SIZE_WARNING_BYTES) {
      showSizeWarning();
    } else {
      hideSizeWarning();
    }
  } else {
    patchBtn.disabled = true;
    document.body.classList.remove('has-file');
    hideSizeWarning();
    setStatus('ready', 'idle');
  }
});

openTabBtn.addEventListener('click', () => {
  const url = chrome.runtime.getURL('popup.html');
  chrome.tabs.create({ url });
});

patchBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  setStatus('scanning', 'processing');

  try {
    const arrayBuffer = await selectedFile.arrayBuffer();
    const patch = patchSharkSampleTableMethod(arrayBuffer);

    setStatus('patched', 'processing', {
      realSamples: patch.realSamples,
      fakeSamples: patch.fakeSamples,
    });

    const blob = new Blob([patch.output], { type: selectedFile.type || 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const originalName = selectedFile.name.replace(/\.[^/.]+$/, '');
    a.download = `${originalName}_clean.mp4`;

    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setStatus('downloaded', 'success');
  } catch (err) {
    setStatus('failed', 'error', {
      message: err && err.message ? err.message : 'unknown error',
    });
  }
});

langBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    setLanguage(btn.dataset.lang);
  });
});

sizeWarningCloseBtn.addEventListener('click', hideSizeWarning);

setLanguage(getSavedLanguage());
