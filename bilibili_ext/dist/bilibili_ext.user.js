// ==UserScript==
// @name         B站换一换历史导航
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在B站主页的"换一换"旁添加前进/后退按钮，支持回溯推荐内容
// @author       YourName
// @match        https://www.bilibili.com/*
// @icon         https://www.bilibili.com/favicon.ico
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
  'use strict';
  const STORAGE_KEY = 'bili_refresh_history';
  const MAX_HISTORY = 50; // 最大历史记录条数
  var mode = 1;

  // 初始化历史记录
  let history = [];// JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  let currentIndex = history.length - 1; // 指向最新记录

  // 等待页面加载完成
  addButtons()

  function addButtons() {
    const refreshBtn = document.querySelector('.roll-btn');
    if (!refreshBtn) return setTimeout(addButtons, 250);

    // 创建按钮容器
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.gap = '0px';
    container.style.marginTop = '8px';
    container.style.marginLeft = '1px';

    // 后退按钮
    const backBtn = createButton('◀', '6px 0px 0px 6px',() => navigate(-1));
    // 前进按钮
    const forwardBtn = createButton('▶', '0px 6px 6px 0px', () => navigate(1));

    container.appendChild(backBtn);
    container.appendChild(forwardBtn);

    // 插入到换一换按钮旁
    refreshBtn.parentNode.insertBefore(container, refreshBtn.nextSibling);
    // 监听换一换点击事件
    refreshBtn.addEventListener('click', () => saveCurrentState());
  }

  function createButton(text, borderRadius, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.background = 'rgba(246,247,248,0.15)'; // 浅灰背景
    btn.style.color = 'rgba(138,132,128,0.8)';         // 深灰字体
    btn.style.border = '1px solid #e0e0e0';
    btn.style.borderRadius = borderRadius;
    btn.style.padding = '7px 2px';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'all 0.2s ease';
    btn.style.fontWeight = '500';
    btn.style.userSelect = 'none';

    // hover 效果（稍微变深，增加阴影）
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(224,224,224,0.15)';
      btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
      btn.style.transform = 'scale(1.02)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(246,247,248,0.15)';
      btn.style.boxShadow = 'none';
      btn.style.transform = 'scale(1)';
    });

    // click 效果（轻微缩小）
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'scale(0.96)';
    });
    btn.addEventListener('mouseup', () => {
      btn.style.transform = 'scale(1.02)';
    });

    btn.addEventListener('click', onClick);
    return btn;
  }

  function saveCurrentState() {
    if (mode === 2) {
      location.reload();
      return
      history = []
      currentIndex = history.length - 1;
      //navigate(1);
      mode = 1;
    }
    // 获取当前推荐列表的HTML快照
    //const content = document.querySelector(".is-version8")?.innerHTML || '';
    const container = document.querySelector(".is-version8");
    if (!container) {
      console.error("container empty");
      return
    }
    const content = container.cloneNode(true)
    history.push(content);
    if (history.length > MAX_HISTORY) history.shift(); // 清理旧记录
    currentIndex = history.length - 1;
    // localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }

  function navigate(direction) {
    if (!history.length) return;
    if (mode === 1) {
      saveCurrentState();
      mode = 2;
    }
    let newIndex = currentIndex + direction;
    if (newIndex < 0) {
      newIndex = 0
    }
    if (newIndex >= history.length) {
      newIndex = history.length - 1
    }
    if (newIndex < 0 || newIndex >= history.length) return; // 边界检查

    currentIndex = newIndex;
    const content = history[currentIndex];

    const container = document.querySelector(".is-version8");
    if (!container) {
      console.log("no container");
    }
    const parent = container.parentNode;
    const newNode = content; //.cloneNode(true);
    parent.replaceChild(newNode, container);
  }
})();