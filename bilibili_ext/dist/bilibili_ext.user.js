// ==UserScript==
// @name         B站首页推荐回溯 (API 历史回放)
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  记录首页 top/feed/rcmd 接口历史, 左右键回放, 点击换一换自动回到实时模式
// @match        https://www.bilibili.com/*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'bili_rcmd_json_history';
  const MAX_HISTORY = 9;
  const RCMD_PATH = '/x/web-interface/wbi/index/top/feed/rcmd';

  let history = GM_getValue(STORAGE_KEY, []);
  if (!Array.isArray(history)) history = [];

  let mode = 'live';              // 'live' 或 'replay'
  let historyIndex = history.length ? history.length - 1 : -1;

  let bar;                        // 我们的控件栏
  let refreshBtn;                 // B站“换一换”按钮
  let internalTrigger = false;    // 区分脚本自身触发的点击

  /* ========== 工具函数 ========== */

  function isDarkMode() {
    try {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return true;
      }
    } catch (e) {}
    const bg = getComputedStyle(document.body).backgroundColor || '';
    return bg.includes('0, 0, 0') || bg.includes('24, 24, 24');
  }

  function createNavButton(text, borderRadius) {
    const btn = document.createElement('button');
    const dark = isDarkMode();

    btn.textContent = text;
    btn.style.borderRadius = borderRadius;
    btn.style.padding = '6px 8px';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'all 0.15s ease';
    btn.style.fontWeight = '500';
    btn.style.userSelect = 'none';
    btn.style.fontSize = '12px';
    btn.style.outline = 'none';
    btn.style.boxShadow = 'none';
    btn.style.border = 'none';
    btn.style.backgroundClip = 'padding-box';

    if (dark) {
      btn.style.background = 'rgba(40,40,40,0.7)';
      btn.style.color = 'rgba(240,240,240,0.9)';
    } else {
      // 浅色模式：主色尽量轻，靠外层 group 线框
      btn.style.background = 'transparent';
      btn.style.color = 'rgba(90,90,90,0.9)';
    }

    btn.addEventListener('mouseenter', () => {
      if (dark) {
        btn.style.background = 'rgba(55,55,55,0.9)';
        btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.6)';
      } else {
        btn.style.background = 'rgba(0,0,0,0.04)';
        btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
      }
      btn.style.transform = 'scale(1.02)';
    });

    btn.addEventListener('mouseleave', () => {
      if (dark) {
        btn.style.background = 'rgba(40,40,40,0.7)';
      } else {
        btn.style.background = 'transparent';
      }
      btn.style.boxShadow = 'none';
      btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'scale(0.96)';
    });

    btn.addEventListener('mouseup', () => {
      btn.style.transform = 'scale(1.02)';
    });

    return btn;
  }

  function updateBtnDisabled(btn, disabled) {
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.35' : '1';
    btn.style.cursor = disabled ? 'default' : 'pointer';
  }

  /* ========== 历史管理 ========== */

  function persistHistory() {
    GM_setValue(STORAGE_KEY, history);
    bindHistoryToPageContext();
    updateBarUI();
  }

  function saveHistory(json) {
    history.push(json);
    while (history.length > MAX_HISTORY) {history.shift();}
    historyIndex = history.length - 1;
    persistHistory();
    console.log('[rcmd-history] saved batch, length =', history.length);
  }

  /* ========== 与页面通信：注入 fetch hook ========== */

  function injectHook() {
    const hookCode = `
      (function() {
        const RCMD_PATH = ${JSON.stringify(RCMD_PATH)};
        const ORIGIN_FETCH = window.fetch;

        window.__RCMD_HISTORY_CTRL__ = window.__RCMD_HISTORY_CTRL__ || {
          mode: 'live',
          index: -1,
          dataMap: {}
        };

        window.fetch = function(input, init) {
          const url = typeof input === 'string' ? input : input && input.url;
          if (url && url.includes(RCMD_PATH)) {
            const ctrl = window.__RCMD_HISTORY_CTRL__;

            // 回放模式：直接返回历史 JSON
            if (ctrl.mode === 'replay' && ctrl.index in ctrl.dataMap) {
              const json = ctrl.dataMap[ctrl.index];
              console.log('[rcmd-history] replay index', ctrl.index, json);
              const body = JSON.stringify(json);
              return Promise.resolve(new Response(body, {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              }));
            }

            // 实时模式：正常 fetch + 回传给油猴
            return ORIGIN_FETCH(input, init).then(res => {
              try {
                const cloned = res.clone();
                cloned.json().then(json => {
                  window.postMessage({
                    type: 'RCMD_HISTORY_SNAPSHOT',
                    payload: json
                  }, '*');
                });
              } catch (e) {}
              return res;
            });
          }
          return ORIGIN_FETCH(input, init);
        };
      })();
    `;
    const s = document.createElement('script');
    s.textContent = hookCode;
    document.documentElement.appendChild(s);
    s.remove();
  }

  function setupMessageListener() {
    window.addEventListener('message', ev => {
      if (!ev.data || ev.data.type !== 'RCMD_HISTORY_SNAPSHOT') return;
      const json = ev.data.payload;
      if (!json) return;
      if (mode !== 'live') return;   // 回放模式下不记录
      saveHistory(json);
    });
  }

  function bindHistoryToPageContext() {
    const dataMap = history.reduce((acc, item, idx) => {
      acc[idx] = item;
      return acc;
    }, {});
    const script = document.createElement('script');
    script.textContent = `
      window.__RCMD_HISTORY_CTRL__ = window.__RCMD_HISTORY_CTRL__ || {};
      Object.assign(window.__RCMD_HISTORY_CTRL__, {
        dataMap: ${JSON.stringify(dataMap)},
        index: ${historyIndex},
        mode: ${JSON.stringify(mode)}
      });
    `;
    document.documentElement.appendChild(script);
    script.remove();
  }

  function setMode(newMode) {
    mode = newMode;
    bindHistoryToPageContext();
    updateBarUI();
    console.log('[rcmd-history] mode =>', mode);
  }

  function setIndex(newIndex) {
    if (newIndex < 0 || newIndex >= history.length) return;
    historyIndex = newIndex;
    bindHistoryToPageContext();
    updateBarUI();
    console.log('[rcmd-history] index =>', historyIndex);
  }

  function triggerReplayRefresh() {
    if (!refreshBtn) return;
    internalTrigger = true;
    refreshBtn.click();
  }

  /* ========== UI：按钮栏 & 信息 ========== */

  function updateBarUI() {
    if (!bar) return;

    const info = bar.querySelector('.my-rcmd-info');
    const prevBtn = bar.querySelector('.my-rcmd-prev');
    const nextBtn = bar.querySelector('.my-rcmd-next');

    const dark = isDarkMode();

    updateBtnDisabled(prevBtn, history.length === 0 || historyIndex <= 0);
    updateBtnDisabled(nextBtn, history.length === 0 || historyIndex >= history.length - 1);

    info.style.writingMode = 'horizontal-tb';
    info.style.textOrientation = 'mixed';
    info.style.display = 'inline-flex';
    info.style.alignItems = 'center';
    info.style.justifyContent = 'center';
    info.style.whiteSpace = 'nowrap';
    info.style.gap = '4px';
    info.style.fontSize = '12px';
    info.style.opacity = '0.85';
    info.style.color = dark ? '#d0d0d0' : '#666666';

    info.innerHTML = '';

    if (!history.length) {
      info.textContent = '';
      return;
    }

    const label = document.createElement('span');
    label.textContent = '';

    const nums = document.createElement('span');
    nums.textContent = `${historyIndex + 1} / ${history.length}`;

    info.appendChild(label);
    info.appendChild(nums);
  }

  function addBarNearRefresh() {
    // 如果 B站改了“换一换”的 class，这里改 '.roll-btn'
    refreshBtn = document.querySelector('.roll-btn');
    if (!refreshBtn || bar) return;

    const dark = isDarkMode();

    bar = document.createElement('div');
    bar.className = 'my-rcmd-bar';
    bar.style.display = 'flex';
    bar.style.flexDirection = 'column';
    bar.style.alignItems = 'center';
    bar.style.gap = '4px';
    bar.style.marginTop = '8px';
    bar.style.userSelect = 'none';
    bar.style.writingMode = 'horizontal-tb';
    bar.style.textOrientation = 'mixed';

    // 胶囊按钮组
    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'inline-flex';
    btnGroup.style.gap = '0';
    btnGroup.style.borderRadius = '18px';
    btnGroup.style.overflow = 'hidden';
    btnGroup.style.border = dark
        ? '1px solid rgba(255,255,255,0.25)'
        : '1px solid rgba(0,0,0,0.14)';
    btnGroup.style.background = dark
        ? 'rgba(20,20,20,0.9)'
        : 'rgba(255,255,255,0.98)';
    btnGroup.style.boxShadow = dark
        ? '0 1px 4px rgba(0,0,0,0.7)'
        : '0 1px 4px rgba(0,0,0,0.16)';

    const prevBtn = createNavButton('◀', '18px 0 0 18px');
    prevBtn.className = 'my-rcmd-prev';

    const nextBtn = createNavButton('▶', '0 18px 18px 0');
    nextBtn.className = 'my-rcmd-next';

    btnGroup.appendChild(prevBtn);
    btnGroup.appendChild(nextBtn);

    const info = document.createElement('span');
    info.className = 'my-rcmd-info';

    bar.appendChild(btnGroup);
    bar.appendChild(info);

    // 插在“换一换”按钮后面
    refreshBtn.parentNode.insertBefore(bar, refreshBtn.nextSibling);

    // 左右按钮行为
    prevBtn.addEventListener('click', () => {
      if (historyIndex > 0) {
        setMode('replay');
        setIndex(historyIndex - 1);
        triggerReplayRefresh();
      }
    });

    nextBtn.addEventListener('click', () => {
      if (historyIndex < history.length - 1) {
        setMode('replay');
        setIndex(historyIndex + 1);
        triggerReplayRefresh();
      }
    });

    // 用户手动点“换一换” => 回到实时模式
    refreshBtn.addEventListener(
        'click',
        () => {
          if (internalTrigger) {
            internalTrigger = false;
            return;
          }
          setMode('live');
        },
        true
    );

    updateBarUI();
  }

  function waitForRefreshBtn() {
    const timer = setInterval(() => {
      const el = document.querySelector('.roll-btn');
      if (el) {
        clearInterval(timer);
        addBarNearRefresh();
      }
    }, 500);
  }

  /* ========== 启动 ========== */

  injectHook();
  setupMessageListener();
  bindHistoryToPageContext();
  waitForRefreshBtn();
})();
(function () {
  'use strict';

  // 不顺眼的参数都丢这里
  const JUNK_PARAMS = new Set([
    'spm_id_from',
    'vd_source',
    'trackid',
    'track_id',
    'query_from',
    'search_id',
    'search_query',
    'csource',
    'share_source',
    'caid',
    'request_id',
    'resource_id',
    'source_id',
    'from_spmid',
    'creative_id',
    'linked_creative_id',
  ]);

  function cleanCurrentUrl(tag) {
    try {
      const url = new URL(location.href);
      let changed = false;

      for (const key of Array.from(url.searchParams.keys())) {
        if (JUNK_PARAMS.has(key)) {
          url.searchParams.delete(key);
          changed = true;
        }
      }

      if (!changed) return;

      let finalUrl = url.toString().replace(/\?$/, '');
      console.log('[bili-url-cleaner]', tag, '=>', finalUrl);

      history.replaceState(history.state, '', finalUrl);
    } catch (e) {
      console.log('[bili-url-cleaner] clean error', e);
    }
  }

  function wrapHistoryMethod(name) {
    const raw = history[name];
    if (!raw) return;

    history[name] = function (state, title, url) {
      if (typeof url === 'string') {
        try {
          const u = new URL(url, location.origin);
          let changed = false;

          for (const key of Array.from(u.searchParams.keys())) {
            if (JUNK_PARAMS.has(key)) {
              u.searchParams.delete(key);
              changed = true;
            }
          }
          if (changed) {
            url = u.toString().replace(/\?$/, '');
          }
        } catch (e) {}
      }

      const ret = raw.apply(this, [state, title, url]);
      // 再对当前地址兜一层底，防止某些奇怪用法漏网
      cleanCurrentUrl('after ' + name);
      return ret;
    };
  }

  // 1) 刚进入页面就清一次（包括 vd_source）
  cleanCurrentUrl('initial');

  // 2) hook pushState / replaceState，SPA 路由也顺带洗掉
  wrapHistoryMethod('pushState');
  wrapHistoryMethod('replaceState');

  // 3) 再加一个周期性兜底（有些站会直接改 location.href）
  setInterval(() => {
    cleanCurrentUrl('interval');
  }, 1500);
})();
