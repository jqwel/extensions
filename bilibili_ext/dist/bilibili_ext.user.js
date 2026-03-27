// ==UserScript==
// @name         B站首页推荐回溯 (API 历史回放) - 性能优化版
// @namespace    http://tampermonkey.net/
// @version      1.6.1
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

  // [优化] 缓存 matchMedia 实例，避免高频触发重建
  const darkModeQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  /* ========== 工具函数 ========== */

  function isDarkMode() {
    if (darkModeQuery) return darkModeQuery.matches;
    // [优化] 尽量减少 getComputedStyle 的调用
    const bg = getComputedStyle(document.body).backgroundColor || '';
    return bg.includes('0, 0, 0') || bg.includes('24, 24, 24');
  }

  function createNavButton(text, borderRadius) {
    const btn = document.createElement('button');
    const dark = isDarkMode();

    btn.textContent = text;
    // [优化] 将不会变动的样式直接设置好
    Object.assign(btn.style, {
      borderRadius: borderRadius,
      padding: '6px 8px',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      fontWeight: '500',
      userSelect: 'none',
      fontSize: '12px',
      outline: 'none',
      boxShadow: 'none',
      border: 'none',
      backgroundClip: 'padding-box'
    });

    if (dark) {
      btn.style.background = 'rgba(40,40,40,0.7)';
      btn.style.color = 'rgba(240,240,240,0.9)';
    } else {
      btn.style.background = 'transparent';
      btn.style.color = 'rgba(90,90,90,0.9)';
    }

    btn.addEventListener('mouseenter', () => {
      if (isDarkMode()) {
        btn.style.background = 'rgba(55,55,55,0.9)';
        btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.6)';
      } else {
        btn.style.background = 'rgba(0,0,0,0.04)';
        btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.12)';
      }
      btn.style.transform = 'scale(1.02)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.background = isDarkMode() ? 'rgba(40,40,40,0.7)' : 'transparent';
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
    if (btn.disabled === disabled) return; // [优化] 避免无意义的 DOM 更新
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

            if (ctrl.mode === 'replay' && ctrl.index in ctrl.dataMap) {
              const json = ctrl.dataMap[ctrl.index];
              return Promise.resolve(new Response(JSON.stringify(json), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              }));
            }

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
      if (!json || mode !== 'live') return;
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
    if (mode === newMode) return;
    mode = newMode;
    bindHistoryToPageContext();
    updateBarUI();
  }

  function setIndex(newIndex) {
    if (newIndex < 0 || newIndex >= history.length) return;
    historyIndex = newIndex;
    bindHistoryToPageContext();
    updateBarUI();
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

    updateBtnDisabled(prevBtn, history.length === 0 || historyIndex <= 0);
    updateBtnDisabled(nextBtn, history.length === 0 || historyIndex >= history.length - 1);

    // [优化] 移除了高频赋值的静态样式，且避免频繁重写 innerHTML，改用 textContent
    info.style.color = isDarkMode() ? '#d0d0d0' : '#666666';

    if (!history.length) {
      info.textContent = '';
    } else {
      info.textContent = `${historyIndex + 1} / ${history.length}`;
    }
  }

  function addBarNearRefresh() {
    refreshBtn = document.querySelector('.roll-btn');
    if (!refreshBtn || bar) return;

    const dark = isDarkMode();

    bar = document.createElement('div');
    bar.className = 'my-rcmd-bar';
    // [优化] 所有不会变动的静态样式都在此处一次性赋好
    Object.assign(bar.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      marginTop: '8px',
      userSelect: 'none',
      writingMode: 'horizontal-tb',
      textOrientation: 'mixed'
    });

    const btnGroup = document.createElement('div');
    Object.assign(btnGroup.style, {
      display: 'inline-flex',
      gap: '0',
      borderRadius: '18px',
      overflow: 'hidden',
      border: dark ? '1px solid rgba(255,255,255,0.25)' : '1px solid rgba(0,0,0,0.14)',
      background: dark ? 'rgba(20,20,20,0.9)' : 'rgba(255,255,255,0.98)',
      boxShadow: dark ? '0 1px 4px rgba(0,0,0,0.7)' : '0 1px 4px rgba(0,0,0,0.16)'
    });

    const prevBtn = createNavButton('◀', '18px 0 0 18px');
    prevBtn.className = 'my-rcmd-prev';

    const nextBtn = createNavButton('▶', '0 18px 18px 0');
    nextBtn.className = 'my-rcmd-next';

    btnGroup.appendChild(prevBtn);
    btnGroup.appendChild(nextBtn);

    const info = document.createElement('span');
    info.className = 'my-rcmd-info';
    Object.assign(info.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      whiteSpace: 'nowrap',
      gap: '4px',
      fontSize: '12px',
      opacity: '0.85'
    });

    bar.appendChild(btnGroup);
    bar.appendChild(info);

    refreshBtn.parentNode.insertBefore(bar, refreshBtn.nextSibling);

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

    refreshBtn.addEventListener('click', () => {
      if (internalTrigger) {
        internalTrigger = false;
        return;
      }
      setMode('live');
    }, true);

    updateBarUI();
  }

  function waitForRefreshBtn() {
    // [优化] 如果不是首页则停止轮询，防止在视频播放页等无关页面死循环吃性能
    if (location.pathname !== '/' && location.pathname !== '/index.html') return;

    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      if (document.querySelector('.roll-btn')) {
        clearInterval(timer);
        addBarNearRefresh();
      } else if (attempts > 60) {
        // [优化] 超过 30 秒如果还没找到元素也停止定时器
        clearInterval(timer);
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

  const JUNK_PARAMS = new Set([
    'spm_id_from', 'vd_source', 'trackid', 'track_id', 'query_from',
    'search_id', 'search_query', 'csource', 'share_source', 'caid',
    'request_id', 'resource_id', 'source_id', 'from_spmid', 'creative_id',
    'linked_creative_id',
  ]);

  function cleanCurrentUrl() {
    try {
      if (!location.search) return; // [优化] 没有参数直接跳过，降低开销
      const url = new URL(location.href);
      let changed = false;

      // [优化] 直接遍历 keys 迭代器，避免使用 Array.from 产生中间垃圾数组
      const keysToDelete = [];
      for (const key of url.searchParams.keys()) {
        if (JUNK_PARAMS.has(key)) {
          keysToDelete.push(key);
        }
      }

      if (keysToDelete.length > 0) {
        keysToDelete.forEach(k => url.searchParams.delete(k));
        changed = true;
      }

      if (changed) {
        const finalUrl = url.toString().replace(/\?$/, '');
        history.replaceState(history.state, '', finalUrl);
      }
    } catch (e) {
      console.log('[bili-url-cleaner] clean error', e);
    }
  }

  function wrapHistoryMethod(name) {
    const raw = history[name];
    if (!raw) return;

    history[name] = function (state, title, url) {
      if (typeof url === 'string' && url.includes('?')) {
        try {
          // [优化] 在进行昂贵的 URL 解析前，使用低成本字符串预判断
          let mightHaveJunk = false;
          for (const param of JUNK_PARAMS) {
            if (url.includes(param + '=')) {
              mightHaveJunk = true;
              break;
            }
          }

          if (mightHaveJunk) {
            const u = new URL(url, location.origin);
            let changed = false;
            const keysToDelete = [];

            for (const key of u.searchParams.keys()) {
              if (JUNK_PARAMS.has(key)) {
                keysToDelete.push(key);
              }
            }
            if (keysToDelete.length > 0) {
              keysToDelete.forEach(k => u.searchParams.delete(k));
              changed = true;
            }
            if (changed) {
              url = u.toString().replace(/\?$/, '');
            }
          }
        } catch (e) {}
      }

      const ret = raw.apply(this, [state, title, url]);
      cleanCurrentUrl();
      return ret;
    };
  }

  cleanCurrentUrl();
  wrapHistoryMethod('pushState');
  wrapHistoryMethod('replaceState');

  setInterval(() => {
    // [优化] 1.5秒一次的定时器，仅当 URL 可能存在垃圾参数时才触发解析逻辑
    if (!location.search) return;
    for (const param of JUNK_PARAMS) {
      if (location.search.includes(param + '=')) {
        cleanCurrentUrl();
        break;
      }
    }
  }, 1500);
})();