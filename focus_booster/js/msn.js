var cssPath = ""
try {
  if (chrome) {
    cssPath = chrome.runtime.getURL('css/all.css')
  }
} catch {
}
if (!cssPath) {
  cssPath = "https://raw.githubusercontent.com/jqwel/extensions/refs/heads/main/focus_booster/css/all.css"
}
var link = document.createElement('link');
link.rel = 'stylesheet';
link.href = cssPath;

var nodeMap = {}

var SheetLoaded = null
// 处理 shadowRoot 的逻辑
async function handleShadowRoots(node = document.body) {
  if (!node) {
    console.error(node)
  }

  const shadowRoots = findAllShadowRoots(node);
  shadowRoots.forEach(shadowRoot => {
    if (!nodeMap[shadowRoot]) {
      nodeMap[shadowRoot] = true
      const observer = new MutationObserver((mutationsList) => {
        debouncedHandleShadowRoots(shadowRoot); // 使用防抖函数
      });
      observer.observe(shadowRoot, {
        childList: true,  // 监听子节点的变化
        subtree: true      // 监听所有后代节点的变化
      });
    }
    // 在这里处理 shadowRoot
    const targetDivs = findDivsWithAdSlugAndContent(shadowRoot);
    targetDivs.forEach(div => {
      if (!shadowRoot._focus_boost_insert) {
        shadowRoot._focus_boost_insert = true;
        async function fetchData() {
          if (!SheetLoaded) {
            const sheet = new CSSStyleSheet(); // 创建新的 CSSStyleSheet 对象
            SheetLoaded = sheet
            const response = await fetch(cssPath); // 替换为外部 CSS 文件的地址
            const cssText = await response.text(); // 获取文件内容并解析为文本
            sheet.replaceSync(cssText); // 用外部 CSS 内容替换样式表
          }
          shadowRoot.adoptedStyleSheets.push(SheetLoaded)
          // shadowRoot.adoptedStyleSheets = [sheet];
        }
        fetchData()
      }
      shadowRoot.insertBefore(link, shadowRoot.firstChild);
      // console.log('Found shadowRoot:', shadowRoot);
      // console.log('Found target div:', div);
      // 在这里处理找到的 div
      if (!div.classList.contains("__focus_booster")) {
        div.classList.add('__focus_booster');
      }
    });
  });
}

// 递归查找所有的 shadowRoot（包括嵌套的 shadowRoot）
function findAllShadowRoots(node) {
  const shadowRoots = [];

  // 如果当前节点有 shadowRoot，添加到数组中
  if (node.shadowRoot) {
    shadowRoots.push(node.shadowRoot);

    // 递归查找 shadowRoot 内部的 shadowRoot
    shadowRoots.push(...findAllShadowRoots(node.shadowRoot));
  }

  // 递归查找子节点的 shadowRoot
  node.childNodes.forEach(child => {
    shadowRoots.push(...findAllShadowRoots(child));
  });

  return shadowRoots;
}

// 创建一个防抖版本的 handleShadowRoots
const debouncedHandleShadowRoots = handleShadowRoots;

// 创建一个 MutationObserver 实例
const observer = new MutationObserver((mutationsList) => {
  debouncedHandleShadowRoots(document.body); // 使用防抖函数
});

// 配置 MutationObserver 监听整个文档的变化
observer.observe(document.body, {
  childList: true,  // 监听子节点的变化
  subtree: true      // 监听所有后代节点的变化
});
nodeMap[document.body] = true
// 初始查找页面中已有的 shadowRoot
handleShadowRoots(document.body);
setInterval(debouncedHandleShadowRoots, 600)

function findDivsWithAdSlugAndContent(shadowRoot) {
  const result = [];
  ['.card-outer:has(.ad-slug)', '.card-content:has(.ad-slug)', ".content-card-container:has(.ad-label)"].forEach(val => {
    // 查找所有具有 content class 的 div
    const divsWithContent = shadowRoot.querySelectorAll(val);
    // 过滤出包含 .ad-slug 的 div
    divsWithContent.forEach(div => {
      // if (div.querySelector('.ad-slug')) {
        result.push(div);
      // }
    });
  })
  return result;
}