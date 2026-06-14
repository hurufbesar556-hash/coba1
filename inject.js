(function() {
  if (window.__cleanUploaderInjected) return;
  window.__cleanUploaderInjected = true;

  const SHARK_USERNAME = 'nxt_shark537';
  const SHARK_MENTION = '@nxt_shark537';
  const SHARK_USER_ID = '6861503987175867397';
  const COLLAB_SIGNATURE_PREFIX = '⚡︎ upload method ⚡︎ ';
  const COLLAB_SIGNATURE = `${COLLAB_SIGNATURE_PREFIX}${SHARK_MENTION}`;
  const CAPTION_KEYS = new Set([
    'caption',
    'captiontext',
    'captiontextdraft',
    'captiondraft',
    'markuptext',
    'text',
    'title',
    'desc',
    'description',
    'itemdescription',
    'itemdesc',
    'video_description',
    'videodescription',
    'posttext',
    'posttitle',
    'videodesc',
    'video_title',
    'videotitle',
  ]);
  const TECHNICAL_BRANCH_RE = /(?:music|audio|cover|url|uri|path|file|id|uid|sec|user|author|hash|token|key|material|effect|sticker|challenge)/i;
  const TECHNICAL_VALUE_RE = /^(?:https?:\/\/|\/|blob:|data:|urn:|[a-z]:\\)/i;
  const COLLAB_SIGNATURE_RE = /\s*⚡︎ upload method ⚡︎\s*@nxt_shark537\s*/g;
  const COLLAB_MENTIONS_RE = /(?:@nxt_shark537\s*)+/g;

  function appendCollabSignature(text) {
    const withoutSignature = stripCollabSignature(text);
    return withoutSignature ? `${withoutSignature}\n\n${COLLAB_SIGNATURE}` : COLLAB_SIGNATURE;
  }

  function escapeMarkupText(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeMarkupAttr(text) {
    return escapeMarkupText(text).replace(/"/g, '&quot;');
  }

  function stripMarkupTags(text) {
    return String(text || '').replace(/<\/?[hm][^>]*>/g, '');
  }

  function stripCollabSignature(text) {
    return stripMarkupTags(text)
      .replace(/&amp;/g, '&')
      .split(COLLAB_SIGNATURE)
      .join('')
      .replace(COLLAB_SIGNATURE_RE, '')
      .replace(COLLAB_MENTIONS_RE, '')
      .trimEnd();
  }

  function getTextExtraRangeText(item, text) {
    const start = Number(item && item.start);
    const end = Number(item && item.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return '';
    return String(text || '').slice(start, end);
  }

  function isSharkMentionExtra(item, text) {
    if (!item || Number(item.type) !== 0) return false;

    const name = String(item.hashtag_name || '').replace(/^@/, '');
    const mentionText = getTextExtraRangeText(item, text);
    const userId = String(item.user_id || item.userId || '');

    return name === SHARK_USERNAME ||
      mentionText === SHARK_MENTION ||
      userId === SHARK_USER_ID;
  }

  function nextTextExtraTagId(textExtra) {
    const used = new Set((Array.isArray(textExtra) ? textExtra : [])
      .filter(item => item && item.tag_id !== undefined && item.tag_id !== null)
      .map(item => String(item.tag_id)));

    let tagId = 0;
    while (used.has(String(tagId))) tagId += 1;
    return String(tagId);
  }

  function appendCollabTextExtra(textExtra, text) {
    const nextTextExtra = Array.isArray(textExtra)
      ? textExtra.filter(item => {
        return !isSharkMentionExtra(item, text);
      })
      : [];

    const start = String(text || '').lastIndexOf(SHARK_MENTION);
    if (start === -1) return nextTextExtra;

    nextTextExtra.push({
      tag_id: nextTextExtraTagId(nextTextExtra),
      start,
      end: start + SHARK_MENTION.length,
      user_id: SHARK_USER_ID,
      type: 0,
      hashtag_name: '',
    });

    return nextTextExtra;
  }

  function getCollabMentionTagId(textExtra, finalText) {
    const start = String(finalText || '').lastIndexOf(SHARK_MENTION);
    const end = start + SHARK_MENTION.length;
    const mention = Array.isArray(textExtra)
      ? textExtra.find(item => (
        item &&
        Number(item.type) === 0 &&
        String(item.user_id || item.userId || '') === SHARK_USER_ID &&
        Number(item.start) === start &&
        Number(item.end) === end
      ))
      : null;

    return mention && mention.tag_id !== undefined ? String(mention.tag_id) : '0';
  }

  function buildCollabMarkup(baseMarkup, textExtra, finalText) {
    const cleanMarkup = String(baseMarkup || '')
      .replace(/\s*⚡︎ upload method ⚡︎\s*(?:<m id="[^"]+">@nxt_shark537<\/m>|@nxt_shark537)\s*/g, '')
      .replace(COLLAB_SIGNATURE_RE, '')
      .replace(COLLAB_MENTIONS_RE, '')
      .trimEnd();

    const tagId = getCollabMentionTagId(textExtra, finalText);
    const collabMarkup = `${escapeMarkupText(COLLAB_SIGNATURE_PREFIX)}<m id="${escapeMarkupAttr(tagId)}">${escapeMarkupText(SHARK_MENTION)}</m>`;

    return cleanMarkup ? `${cleanMarkup}\n\n${collabMarkup}` : collabMarkup;
  }

  function isTikTokPublishUrl(url) {
    return typeof url === 'string' && (
      url.includes('tiktok/web/project/post/v1/') ||
      (
        /(?:post|publish|upload|aweme|item)/i.test(url) &&
        /tiktok/i.test(url)
      )
    );
  }

  function getRequestUrl(resource) {
    if (typeof resource === 'string') return resource;
    if (resource && typeof resource.url === 'string') return resource.url;
    return '';
  }

  function patchPublishBodyText(bodyText) {
    let body = JSON.parse(bodyText);

    const hasMusic = body.single_post_req_list &&
                     body.single_post_req_list[0] &&
                     body.single_post_req_list[0].single_post_feature_info &&
                     body.single_post_req_list[0].single_post_feature_info.music_info &&
                     body.single_post_req_list[0].single_post_feature_info.music_info.music_id_string;

    const forbiddenKeys = ['draft', 'canvas_config', 'vedit_segment_info'];
    forbiddenKeys.forEach(key => { if (body[key] !== undefined) delete body[key]; });
    if (body.cloud_edit_is_use_video_canvas !== undefined) body.cloud_edit_is_use_video_canvas = false;
    if (body.enter_post_page_from !== undefined) body.enter_post_page_from = 1;

    if (body.post_common_info) {
      body.post_common_info.post_type = 3;
      body.post_common_info.enter_post_page_from = 1;
    }

    if (hasMusic && Array.isArray(body.feature_common_info_list)) {
      body.feature_common_info_list.forEach(feature => {
        if (feature && feature.vedit_common_info) {
          if (feature.vedit_common_info.tiktok_snap_shot_lite_params !== undefined) {
            delete feature.vedit_common_info.tiktok_snap_shot_lite_params;
          }
          if (feature.vedit_common_info.application !== undefined) {
            feature.vedit_common_info.application = 1;
          }
        }
      });
    }

    if (Array.isArray(body.single_post_req_list)) {
      body.single_post_req_list.forEach(req => {
        if (req && req.single_post_feature_info) {
          if (req.single_post_feature_info.vedit_segment_info !== undefined) {
            delete req.single_post_feature_info.vedit_segment_info;
          }
          req.single_post_feature_info.has_original_audio = 1;
          req.single_post_feature_info.cloud_edit_is_use_video_canvas = false;
        }
      });
    }

    ensureSignatureInCaptionFields(body);
    return JSON.stringify(body);
  }

  function isClearlyPublishPayload(payload) {
    return !!(
      payload &&
      typeof payload === 'object' &&
      (
        Array.isArray(payload.single_post_req_list) ||
        Array.isArray(payload.post_items) ||
        Array.isArray(payload.item_list) ||
        payload.post_common_info ||
        payload.item_common_info ||
        payload.publish_info ||
        payload.item_info
      )
    );
  }

  function normalizePayloadKey(key) {
    return String(key || '').replace(/[_-]/g, '').toLowerCase();
  }

  function isCaptionKey(key) {
    return CAPTION_KEYS.has(normalizePayloadKey(key));
  }

  function shouldSkipCaptionBranch(key) {
    const normalized = String(key || '');
    return TECHNICAL_BRANCH_RE.test(normalized) && !/(?:caption|desc|title|text|post)/i.test(normalized);
  }

  function isSafeCaptionValue(value) {
    if (typeof value !== 'string') return false;
    if (value.length > 2200) return false;
    if (TECHNICAL_VALUE_RE.test(value.trim())) return false;
    return true;
  }

  function ensureSignatureInCaptionFields(payload) {
    if (!isClearlyPublishPayload(payload)) return false;

    const structuredChanged = ensureStructuredSinglePostCaptions(payload);
    if (Array.isArray(payload.single_post_req_list)) return structuredChanged;

    const seen = new WeakSet();
    let changed = false;

    function walk(node, parentKey, depth) {
      if (!node || typeof node !== 'object' || depth > 8 || seen.has(node)) return;
      seen.add(node);

      Object.keys(node).forEach(key => {
        const value = node[key];

        if (normalizePayloadKey(key) === 'markuptext' && isSafeCaptionValue(value)) {
          const finalPlain = appendCollabSignature(stripCollabSignature(value));
          const finalExtra = appendCollabTextExtra([], finalPlain);
          const next = buildCollabMarkup(value, finalExtra, finalPlain);
          if (value !== next) {
            node[key] = next;
            changed = true;
          }
          return;
        }

        if (isCaptionKey(key) && isSafeCaptionValue(value)) {
          const next = appendCollabSignature(value);
          if (value !== next) {
            node[key] = next;
            changed = true;
          }
          return;
        }

        if (value && typeof value === 'object' && !shouldSkipCaptionBranch(key)) {
          walk(value, key, depth + 1);
        }
      });
    }

    walk(payload, '', 0);
    if (!changed) changed = ensureSignatureInKnownTikTokCaptionSlots(payload);
    return changed;
  }

  function ensureStringPath(root, path) {
    let node = root;
    for (let i = 0; i < path.length - 1; i++) {
      node = node && node[path[i]];
      if (!node || typeof node !== 'object') return false;
    }

    const key = path[path.length - 1];
    if (!isSafeCaptionValue(node[key])) return false;

    const next = appendCollabSignature(node[key]);
    if (node[key] === next) return false;

    node[key] = next;
    return true;
  }

  function ensureSignatureInKnownTikTokCaptionSlots(payload) {
    let changed = false;

    if (Array.isArray(payload.single_post_req_list)) {
      payload.single_post_req_list.forEach(req => {
        if (!req || typeof req !== 'object') return;

        [
          ['caption'],
          ['desc'],
          ['title'],
          ['text'],
          ['description'],
          ['single_post_feature_info', 'caption'],
          ['single_post_feature_info', 'desc'],
          ['single_post_feature_info', 'markup_text'],
          ['single_post_feature_info', 'title'],
          ['single_post_feature_info', 'text'],
          ['single_post_feature_info', 'description'],
        ].forEach(path => {
          if (ensureStringPath(req, path)) changed = true;
        });

      });
    }

    if (payload.post_common_info && typeof payload.post_common_info === 'object') {
      ['caption', 'desc', 'title', 'text', 'description'].forEach(key => {
        if (ensureStringPath(payload.post_common_info, [key])) changed = true;
      });
    }

    return changed;
  }

  function ensureStructuredSinglePostCaptions(payload) {
    if (!Array.isArray(payload.single_post_req_list)) return false;

    let changed = false;

    payload.single_post_req_list.forEach(req => {
      const info = req && req.single_post_feature_info;
      if (!info || typeof info !== 'object') return;

      const baseText = stripCollabSignature(info.text || info.markup_text || '');
      const finalText = appendCollabSignature(baseText);
      const finalTextExtra = appendCollabTextExtra(info.text_extra, finalText);
      const finalMarkupText = buildCollabMarkup(info.markup_text || escapeMarkupText(baseText), finalTextExtra, finalText);

      if (info.text !== finalText) {
        info.text = finalText;
        changed = true;
      }

      if (info.markup_text !== finalMarkupText) {
        info.markup_text = finalMarkupText;
        changed = true;
      }

      if (JSON.stringify(info.text_extra || []) !== JSON.stringify(finalTextExtra)) {
        info.text_extra = finalTextExtra;
        changed = true;
      }
    });

    return changed;
  }

  // Nao mexe na legenda visivel. A assinatura entra apenas no payload final de publish.

  // ==================== CAMADA 1: JSON.stringify ====================
  const originalStringify = JSON.stringify;

  JSON.stringify = function(value, replacer, space) {
    if (value && typeof value === 'object') {
      // Detecta se há áudio promocional selecionado
      const hasMusic = value.single_post_req_list &&
                       value.single_post_req_list[0] &&
                       value.single_post_req_list[0].single_post_feature_info &&
                       value.single_post_req_list[0].single_post_feature_info.music_info &&
                       value.single_post_req_list[0].single_post_feature_info.music_info.music_id_string;

      // Limpeza geral de metadados
      const forbiddenKeys = ['draft', 'canvas_config', 'vedit_segment_info'];
      forbiddenKeys.forEach(key => { if (value[key] !== undefined) delete value[key]; });
      if (value.cloud_edit_is_use_video_canvas !== undefined) value.cloud_edit_is_use_video_canvas = false;
      if (value.enter_post_page_from !== undefined) value.enter_post_page_from = 1;

      // Corrige post_type e enter_post_page_from dentro de post_common_info
      if (value.post_common_info) {
        if (value.post_common_info.post_type !== undefined) value.post_common_info.post_type = 3;
        if (value.post_common_info.enter_post_page_from !== undefined) value.post_common_info.enter_post_page_from = 1;
      }

      // Se há áudio promocional, remove o projeto de edição para evitar recompressão
      if (hasMusic && Array.isArray(value.feature_common_info_list)) {
        value.feature_common_info_list.forEach(feature => {
          if (feature && feature.vedit_common_info) {
            if (feature.vedit_common_info.tiktok_snap_shot_lite_params !== undefined) {
              delete feature.vedit_common_info.tiktok_snap_shot_lite_params;
            }
            if (feature.vedit_common_info.application !== undefined) {
              feature.vedit_common_info.application = 1;
            }
          }
        });
      }

      // Limpeza dentro de single_post_req_list
      if (Array.isArray(value.single_post_req_list)) {
        value.single_post_req_list.forEach(req => {
          if (req && req.single_post_feature_info) {
            if (req.single_post_feature_info.vedit_segment_info !== undefined) {
              delete req.single_post_feature_info.vedit_segment_info;
            }
            req.single_post_feature_info.has_original_audio = 1;
            req.single_post_feature_info.cloud_edit_is_use_video_canvas = false;
          }
        });
      }

      ensureSignatureInCaptionFields(value);
    }
    return originalStringify.call(this, value, replacer, space);
  };

  // ==================== CAMADA 2: fetch ====================
  const originalFetch = window.fetch;
  window.fetch = async function(resource, options = {}) {
    if (isTikTokPublishUrl(getRequestUrl(resource))) {
      if (options.body && typeof options.body === 'string') {
        try {
          options.body = patchPublishBodyText(options.body);
        } catch(e) {}
      } else if (typeof Request !== 'undefined' && resource instanceof Request) {
        try {
          const text = await resource.clone().text();
          if (text) {
            resource = new Request(resource, { body: patchPublishBodyText(text) });
          }
        } catch(e) {}
      }
    }
    return originalFetch.call(this, resource, options);
  };

  // ==================== CAMADA 3: XMLHttpRequest ====================
  const XHR = XMLHttpRequest.prototype;
  const originalOpen = XHR.open;
  const originalSend = XHR.send;

  XHR.open = function(method, url) {
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  XHR.send = function(body) {
    if (isTikTokPublishUrl(this._url)) {
      if (typeof body === 'string') {
        try {
          let json = JSON.parse(body);
          
          const hasMusic = json.single_post_req_list &&
                           json.single_post_req_list[0] &&
                           json.single_post_req_list[0].single_post_feature_info &&
                           json.single_post_req_list[0].single_post_feature_info.music_info &&
                           json.single_post_req_list[0].single_post_feature_info.music_info.music_id_string;

          const forbiddenKeys = ['draft', 'canvas_config', 'vedit_segment_info'];
          forbiddenKeys.forEach(key => { if (json[key] !== undefined) delete json[key]; });
          if (json.cloud_edit_is_use_video_canvas !== undefined) json.cloud_edit_is_use_video_canvas = false;
          if (json.enter_post_page_from !== undefined) json.enter_post_page_from = 1;

          if (json.post_common_info) {
            json.post_common_info.post_type = 3;
            json.post_common_info.enter_post_page_from = 1;
          }

          if (hasMusic && Array.isArray(json.feature_common_info_list)) {
            json.feature_common_info_list.forEach(feature => {
              if (feature && feature.vedit_common_info) {
                if (feature.vedit_common_info.tiktok_snap_shot_lite_params !== undefined) {
                  delete feature.vedit_common_info.tiktok_snap_shot_lite_params;
                }
                if (feature.vedit_common_info.application !== undefined) {
                  feature.vedit_common_info.application = 1;
                }
              }
            });
          }

          if (Array.isArray(json.single_post_req_list)) {
            json.single_post_req_list.forEach(req => {
              if (req && req.single_post_feature_info) {
                if (req.single_post_feature_info.vedit_segment_info !== undefined) {
                  delete req.single_post_feature_info.vedit_segment_info;
                }
                req.single_post_feature_info.has_original_audio = 1;
                req.single_post_feature_info.cloud_edit_is_use_video_canvas = false;
              }
            });
          }

          ensureSignatureInCaptionFields(json);
          body = JSON.stringify(json);
        } catch(e) {}
      }
    }
    return originalSend.call(this, body);
  };
})();
