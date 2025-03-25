(function() {
  'use strict';
  var CssPart1 = `$CssPart1$`;
  var CssPart2 = `$CssPart2$`;
  var CssPart3 = `$CssPart3$`;

  // 需要所有网站都加载的全局资源
  const globalResources = {
    js: "",
    css: $CSS_CONTENT$GLOBAL$,
  };
  const same = {
    ".google.com":
        [
          '.google.com.hk', '.google.co.jp', '.google.co.kr', '.google.com.tw', '.google.com', '.google.ca', '.google.com.au',
          '.google.cn', '.google.co.in', '.google.com.sg', '.google.co.id', '.google.com.sa', '.google.com.ph', '.google.co.uk',
          '.google.fr', '.google.ru', '.google.de', '.google.it', '.google.es', '.google.co.za', '.google.com.eg'
    ],
    ".msn.com": [".bing.com"],
  }

  // 配置不同网站的 JS 和 CSS
  const siteConfigs = {
    ".2345.com": {
      css: $CSS_CONTENT$2345$
    },
    ".360.com": {
      css: $CSS_CONTENT$2345$
    },
    ".baidu.com": {
      css: $CSS_CONTENT$baidu$
    },
    ".bilibili.com": {
      css: $CSS_CONTENT$bilibili$
    },
    ".bing.com": {
      css: $CSS_CONTENT$bing$
    },
    ".duckduckgo.com": {
      css: $CSS_CONTENT$duckduckgo$
    },
    ".facebook.com": {
      css: $CSS_CONTENT$facebook$
    },
    ".google.com": {
      css: $CSS_CONTENT$google$
    },
    ".ifeng.com": {
      css: $CSS_CONTENT$ifeng$
    },
    ".msn.com": {
      js: $JS_CONTENT$msn$,
      css: $CSS_CONTENT$msn$
    },
    ".mydrivers.com": {
      css: $CSS_CONTENT$mydrivers$
    },
    ".163.com": {
      css: $CSS_CONTENT$163$
    },
    ".qq.com": {
      css: $CSS_CONTENT$qq$
    },
    ".reddit.com": {
      js: $JS_CONTENT$reddit$,
      css: $CSS_CONTENT$reddit$
    },
    ".sina.com.cn": {
      css: $CSS_CONTENT$sina$
    },
    ".so.com": {
      css: $CSS_CONTENT$so$
    },
    ".sogou.com": {
      css: $CSS_CONTENT$sogou$
    },
    ".v2ex.com": {
      css: $CSS_CONTENT$v2ex$
    },
    ".weibo.com": {
      css: $CSS_CONTENT$weibo$
    },
    ".x.com": {
      css: $CSS_CONTENT$x$
    },
    ".youtube.com": {
      css: $CSS_CONTENT$youtube$
    },
  };
  for (let key of Object.keys(same)) {
    var val = same[key];
    if (!val) continue
    for (let v of val) {
      if (!v) continue
      siteConfigs[v] = siteConfigs[key]
    }
  }

  // 先加载全局资源
  loadScript(globalResources.js);
  loadStyle(globalResources.css);

  // 获取当前网站配置
  const hostname = window.location.hostname;
  const siteKey = Object.keys(siteConfigs).find(key => {
    if (key.length > 0 && key[0] === ".") {
      if (key.substring(1) === hostname) {return true}
    }
    return hostname.endsWith(key)
  });

  if (siteKey) {
    const config = siteConfigs[siteKey];
    if (config.js) loadScript(config.js);
    if (config.css) loadStyle(config.css);
  }

  function loadScript(urlOrCode) {
    if (!urlOrCode) return
    if (!urlOrCode.startsWith("http")) {
      let script = document.createElement("script");
      script.textContent = urlOrCode;
      document.head.appendChild(script);
    } else {
      GM_xmlhttpRequest({
        method: "GET",
        url: urlOrCode,
        headers: {
          "User-Agent": "Mozilla/5.0", // "Accept": "text/javascript"
        },
        onload: function(response) {
          let script = document.createElement("script");
          script.textContent = response.responseText;
          document.head.appendChild(script);
        },
        onerror: function(error) {
          console.error("JS 请求失败:", error);
        }
      });
    }
  }

  function loadStyle(url) {
    if (!url) return
    if (!url.startsWith("http")) {
      let style = document.createElement("style");
      style.textContent = url;
      document.head.appendChild(style, document.head);
      keepStyle(style);
    } else {
      GM_xmlhttpRequest({
        method: "GET",
        url: url,
        headers: {
          "User-Agent": "Mozilla/5.0", // "Accept": "text/css"
        },
        onload: function(response) {
          let style = document.createElement("style");
          style.textContent = response.responseText;
          document.head.appendChild(style);
          keepStyle(style, document.head);
        },
        onerror: function(error) {
          console.error("CSS 请求失败:", error);
        }
      });
    }
  }
  function keepStyle(style, node) {
    if (!node) node = document.head
    const observer = new MutationObserver(() => {
      if (!node.contains(style) && location.hostname === originalHostname) {
        node.appendChild(style);
      }
    });
    const originalHostname = location.hostname; // 记录当前域名
    observer.observe(node, { childList: true });
  }
})();
