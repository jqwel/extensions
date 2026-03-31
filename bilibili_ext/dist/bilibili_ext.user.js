// ==UserScript==
// @name         B站首页推荐回溯与极致净化 (稍后再看自动跳转)
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  1.【推荐回溯】Proxy无痕劫持API，支持首页左右键回访历史推荐；2.【精准跳转】自动检测“稍后再看”列表页，直接中转至对应视频页并自动识别分P；3.【极致净化】A标签预净化+地址栏补丁，源头阻断spm_id等追踪参数；4.【零感注入】MutationObserver零轮询监听，样式自适应黑暗模式。
// @match        https://www.bilibili.com/*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // ========== 配置与全局变量 ==========
  const STORAGE_KEY = 'bili_rcmd_json_history';
  const MAX_HISTORY = 9;
  const RCMD_PATH = '/x/web-interface/wbi/index/top/feed/rcmd';

  const JUNK_PARAMS = new Set([
    'spm_id_from', 'vd_source', 'trackid', 'track_id', 'query_from',
    'search_id', 'search_query', 'csource', 'share_source', 'caid',
    'request_id', 'resource_id', 'source_id', 'from_spmid', 'creative_id',
    'linked_creative_id',
  ]);

  let historyData = GM_getValue(STORAGE_KEY, []);
  if (!Array.isArray(historyData)) historyData = [];

  let mode = 'live';              // 'live' 或 'replay'
  let historyIndex = historyData.length ? historyData.length - 1 : -1;

  let bar;                        // 我们的控件栏
  let refreshBtn;                 // B站“换一换”按钮
  let internalTrigger = false;    // 区分脚本自身触发的点击

  // 缓存 matchMedia 实例
  const darkModeQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  /* ========== 1. 底层拦截：Fetch Proxy 注入 ========== */
  function injectHook() {
    const hookCode = `
      (function() {
        const RCMD_PATH = ${JSON.stringify(RCMD_PATH)};
        window.__RCMD_HISTORY_CTRL__ = window.__RCMD_HISTORY_CTRL__ || {
          mode: 'live',
          index: -1,
          dataMap: {}
        };

        // 使用 Proxy 现代代理模式，隐蔽性极强且不丢失原生绑定
        window.fetch = new Proxy(window.fetch, {
          apply: function(target, thisArg, argumentsList) {
            const [input, init] = argumentsList;
            const url = typeof input === 'string' ? input : input && input.url;

            if (url && url.includes(RCMD_PATH)) {
              const ctrl = window.__RCMD_HISTORY_CTRL__;

              // 回放模式：直接返回历史 JSON
              if (ctrl.mode === 'replay' && ctrl.index in ctrl.dataMap) {
                const json = ctrl.dataMap[ctrl.index];
                return Promise.resolve(new Response(JSON.stringify(json), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' }
                }));
              }

              // 实时模式：正常请求并抓包
              return Reflect.apply(target, thisArg, argumentsList).then(res => {
                try {
                  res.clone().json().then(json => {
                    window.postMessage({
                      type: 'RCMD_HISTORY_SNAPSHOT',
                      payload: json
                    }, '*');
                  });
                } catch (e) {}
                return res;
              });
            }

            // 其他请求直接放行
            return Reflect.apply(target, thisArg, argumentsList);
          }
        });
      })();
    `;
    const s = document.createElement('script');
    s.textContent = hookCode;
    // 注入后立刻移除 script 标签，保持 DOM 干净
    document.documentElement.appendChild(s);
    s.remove();
  }

  /* ========== 2. 状态通信与同步 ========== */
  function setupMessageListener() {
    window.addEventListener('message', ev => {
      if (!ev.data || ev.data.type !== 'RCMD_HISTORY_SNAPSHOT') return;
      const json = ev.data.payload;
      if (!json || mode !== 'live') return;

      historyData.push(json);
      while (historyData.length > MAX_HISTORY) { historyData.shift(); }
      historyIndex = historyData.length - 1;

      GM_setValue(STORAGE_KEY, historyData);
      bindHistoryToPageContext();
      updateBarUI();
    });
  }

  function bindHistoryToPageContext() {
    const dataMap = historyData.reduce((acc, item, idx) => {
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

  /* ========== 3. UI 渲染与控制 ========== */
  function isDarkMode() {
    if (darkModeQuery) return darkModeQuery.matches;
    const bg = getComputedStyle(document.body).backgroundColor || '';
    return bg.includes('0, 0, 0') || bg.includes('24, 24, 24');
  }

  function createNavButton(text, borderRadius) {
    const btn = document.createElement('button');
    const dark = isDarkMode();

    btn.textContent = text;
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
      backgroundClip: 'padding-box',
      background: dark ? 'rgba(40,40,40,0.7)' : 'transparent',
      color: dark ? 'rgba(240,240,240,0.9)' : 'rgba(90,90,90,0.9)'
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.background = isDarkMode() ? 'rgba(55,55,55,0.9)' : 'rgba(0,0,0,0.04)';
      btn.style.boxShadow = isDarkMode() ? '0 1px 3px rgba(0,0,0,0.6)' : '0 1px 3px rgba(0,0,0,0.12)';
      btn.style.transform = 'scale(1.02)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.background = isDarkMode() ? 'rgba(40,40,40,0.7)' : 'transparent';
      btn.style.boxShadow = 'none';
      btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('mousedown', () => { btn.style.transform = 'scale(0.96)'; });
    btn.addEventListener('mouseup', () => { btn.style.transform = 'scale(1.02)'; });

    return btn;
  }

  function updateBtnDisabled(btn, disabled) {
    if (btn.disabled === disabled) return;
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.35' : '1';
    btn.style.cursor = disabled ? 'default' : 'pointer';
  }

  function setMode(newMode) {
    if (mode === newMode) return;
    mode = newMode;
    bindHistoryToPageContext();
    updateBarUI();
  }

  function setIndex(newIndex) {
    if (newIndex < 0 || newIndex >= historyData.length) return;
    historyIndex = newIndex;
    bindHistoryToPageContext();
    updateBarUI();
  }

  function triggerReplayRefresh() {
    if (!refreshBtn) return;
    internalTrigger = true;
    refreshBtn.click();
  }

  function updateBarUI() {
    if (!bar) return;
    const info = bar.querySelector('.my-rcmd-info');
    const prevBtn = bar.querySelector('.my-rcmd-prev');
    const nextBtn = bar.querySelector('.my-rcmd-next');

    updateBtnDisabled(prevBtn, historyData.length === 0 || historyIndex <= 0);
    updateBtnDisabled(nextBtn, historyData.length === 0 || historyIndex >= historyData.length - 1);
    info.style.color = isDarkMode() ? '#d0d0d0' : '#666666';
    info.textContent = historyData.length ? `${historyIndex + 1} / ${historyData.length}` : '';
  }

  function addBarNearRefresh() {
    refreshBtn = document.querySelector('.roll-btn');
    if (!refreshBtn || bar) return;

    const dark = isDarkMode();
    bar = document.createElement('div');
    bar.className = 'my-rcmd-bar';
    Object.assign(bar.style, {
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
      marginTop: '8px', userSelect: 'none', writingMode: 'horizontal-tb', textOrientation: 'mixed'
    });

    const btnGroup = document.createElement('div');
    Object.assign(btnGroup.style, {
      display: 'inline-flex', gap: '0', borderRadius: '18px', overflow: 'hidden',
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
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      whiteSpace: 'nowrap', gap: '4px', fontSize: '12px', opacity: '0.85'
    });

    bar.appendChild(btnGroup);
    bar.appendChild(info);
    refreshBtn.parentNode.insertBefore(bar, refreshBtn.nextSibling);

    prevBtn.addEventListener('click', () => {
      if (historyIndex > 0) {
        setMode('replay'); setIndex(historyIndex - 1); triggerReplayRefresh();
      }
    });

    nextBtn.addEventListener('click', () => {
      if (historyIndex < historyData.length - 1) {
        setMode('replay'); setIndex(historyIndex + 1); triggerReplayRefresh();
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

  /* ========== 4. MutationObserver 零轮询 ========== */
  function waitForRefreshBtn() {
    if (location.pathname !== '/' && location.pathname !== '/index.html') return;

    if (document.querySelector('.roll-btn')) {
      addBarNearRefresh();
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      if (document.querySelector('.roll-btn')) {
        addBarNearRefresh();
        obs.disconnect(); // 找到后立刻释放
      }
    });

    // 【修复点】：在 document-start 阶段 document.body 为 null，
    // 改为监听 document.documentElement 或 document 本身
    observer.observe(document.documentElement || document, { childList: true, subtree: true });

    // 兜底：15秒没刷出来主动放弃观察
    setTimeout(() => observer.disconnect(), 15000);
  }

  /* ========== 5. 链接预净化 (源头阻断) ========== */
  function setupLinkPreCleaner() {
    document.addEventListener('mousedown', function(e) {
      const a = e.target.closest('a');
      if (!a || !a.href || !a.href.startsWith('http')) return;

      if (a.href.includes('?')) {
        try {
          let mightHaveJunk = false;
          for (const key of JUNK_PARAMS) {
            if (a.href.includes(key + '=')) {
              mightHaveJunk = true;
              break;
            }
          }
          if (!mightHaveJunk) return;

          const url = new URL(a.href);
          let changed = false;
          for (const key of JUNK_PARAMS) {
            if (url.searchParams.has(key)) {
              url.searchParams.delete(key);
              changed = true;
            }
          }
          if (changed) {
            a.href = url.toString().replace(/\?$/, '');
          }
        } catch (err) {}
      }
    }, { passive: true, capture: true }); // 在捕获阶段处理，确保在跳转发生前完成修改
  }

  /* ========== 6. 地址栏兜底清理 ========== */
  function cleanCurrentUrl() {
    try {
      if (!location.search) return;
      const url = new URL(location.href);
      let changed = false;
      const keysToDelete = [];

      for (const key of url.searchParams.keys()) {
        if (JUNK_PARAMS.has(key)) keysToDelete.push(key);
      }

      if (keysToDelete.length > 0) {
        keysToDelete.forEach(k => url.searchParams.delete(k));
        changed = true;
      }

      if (changed) {
        history.replaceState(history.state, '', url.toString().replace(/\?$/, ''));
      }
    } catch (e) {}
  }

  function wrapHistoryMethod(name) {
    const raw = history[name];
    if (!raw) return;
    history[name] = function (state, title, url) {
      if (typeof url === 'string' && url.includes('?')) {
        try {
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
              if (JUNK_PARAMS.has(key)) keysToDelete.push(key);
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

  /* ========== 7. 稍后再看页面自动请求与跳转 (逻辑精简版) ========== */
  function handleWatchLater() {
    if (!location.href.includes('bilibili.com/list/watchlater')) return;

    const url = new URL(location.href);
    const bvid = url.searchParams.get('bvid');
    if (!bvid) return;

    console.log(`[脚本日志] 正在检索视频 ${bvid} 的分 P 信息...`);

    fetch(`https://api.bilibili.com/x/v2/history/toview`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' }
    })
        .then(res => res.json())
        .then(data => {
          if (!data || data.code !== 0) return;

          const list = data?.data?.list;
          if (!Array.isArray(list)) return;

          // 查找匹配的视频对象
          const targetVideo = list.find(item => item.bvid === bvid);

          if (targetVideo) {
            // 1. 按照你的要求：使用 ?? 0 容错
            const page = targetVideo.page?.page ?? 0;

            // 2. 只有当 page > 1 时才拼接 p 参数，否则直接跳转主链接
            const targetUrl = page > 1
                ? `https://www.bilibili.com/video/${bvid}/?p=${page}`
                : `https://www.bilibili.com/video/${bvid}/`;

            console.log(`[脚本日志] 跳转目标: ${targetUrl}`);
            location.replace(targetUrl);
          }
        })
        .catch(err => console.error('[脚本日志] 稍后再看请求失败:', err));
  }

  /* ========== 启动 ========== */
  handleWatchLater();            // 0. 处理稍后再看页面逻辑
  injectHook();                  // 1. 注入 Fetch 劫持
  setupMessageListener();        // 2. 监听抓包回传
  bindHistoryToPageContext();    // 3. 同步历史状态到网页
  waitForRefreshBtn();           // 4. 等待UI渲染
  setupLinkPreCleaner();         // 5. 启动点击预净化
  cleanCurrentUrl();             // 6. 初始清理当前URL
  wrapHistoryMethod('pushState');
  wrapHistoryMethod('replaceState');

  // 极低频兜底（防跳转遗漏），仅限有参数时运行
  setInterval(() => {
    if (!location.search) return;
    for (const param of JUNK_PARAMS) {
      if (location.search.includes(param + '=')) {
        cleanCurrentUrl();
        break;
      }
    }
  }, 2000);

})();