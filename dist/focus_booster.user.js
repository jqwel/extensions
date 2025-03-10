// ==UserScript==
// @name         标注广告
// @namespace    http://tampermonkey.net/
// @version      1.20250310.165719
// @description  加载不同的JS和CSS,标注广告
// @author       YLZ
// @match        *://*/*
// @icon         https://github.com/jqwel/extensions/blob/main/focus_booster/icon.png?raw=true
// @updateURL    https://raw.githubusercontent.com/jqwel/extensions/refs/heads/main/dist/focus_booster.meta.js
// @downloadURL  https://raw.githubusercontent.com/jqwel/extensions/refs/heads/main/dist/focus_booster.user.js
// @grant        GM_addStyle
// @grant        GM_addElement
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  // 需要所有网站都加载的全局资源
  const globalResources = {
    js: "",
    css: `:root{--blur-amount:0px;--filter-transition-duration:0.1s;--filter-transition-timing:ease-in-out;--content-ad-font-size:max((calc(min(7vw, 7vh, 512px)) + calc(min(10vw, 10vh) + 32px)) / 1.6, 32px)}.__focus_booster,.adsbygoogle,div:has(> iframe[src^="//pos.baidu.com/"]),div:has(> iframe[src^="https://pos.baidu.com/"]),div[class$='-ad'],div[id^=google_ads_iframe_]{filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}.__focus_booster:hover,.adsbygoogle:hover,div:has(> iframe[src^="//pos.baidu.com/"]):hover,div:has(> iframe[src^="https://pos.baidu.com/"]):hover,div[class$='-ad']:hover,div[id^=google_ads_iframe_]:hover{filter:blur(0px)!important;overflow:visible}.__focus_booster::after,.adsbygoogle::after,div:has(> iframe[src^="//pos.baidu.com/"])::after,div:has(> iframe[src^="https://pos.baidu.com/"])::after,div[class$='-ad']::after,div[id^=google_ads_iframe_]::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}`,
  };
  const same = {
    ".google.com": ['.google.com.hk', '.google.co.jp', '.google.com.tw', '.google.com'],
  }

  // 配置不同网站的 JS 和 CSS
  const siteConfigs = {
    ".2345.com": {
      css: `.xxl-ad-360{filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}.xxl-ad-360:hover{filter:blur(0px)!important;overflow:visible}.xxl-ad-360::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}`
    },
    ".360.com": {
      css: `.xxl-ad-360{filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}.xxl-ad-360:hover{filter:blur(0px)!important;overflow:visible}.xxl-ad-360::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}`
    },
    ".baidu.com": {
      css: `.c-container:has(.ec-tuiguang),.cr-content:has(.ec-tuiguang),.mediago-ad-wrapper,div[class^=unionAd_],div[data-cmatchid]:has(.ec-tuiguang){filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}.c-container:has(.ec-tuiguang):hover,.cr-content:has(.ec-tuiguang):hover,.mediago-ad-wrapper:hover,div[class^=unionAd_]:hover,div[data-cmatchid]:has(.ec-tuiguang):hover{filter:blur(0px)!important;overflow:visible}.c-container:has(.ec-tuiguang)::after,.cr-content:has(.ec-tuiguang)::after,.mediago-ad-wrapper::after,div[class^=unionAd_]::after,div[data-cmatchid]:has(.ec-tuiguang)::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}`
    },
    ".bilibili.com": {
      css: `.ad-report,.bili-video-card__wrap:has(.bili-video-card__info--ad){filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}.ad-report:hover,.bili-video-card__wrap:has(.bili-video-card__info--ad):hover{filter:blur(0px)!important;overflow:visible}.ad-report::after,.bili-video-card__wrap:has(.bili-video-card__info--ad)::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}`
    },
    ".bing.com": {
      css: `.sb_adTA{filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}.sb_adTA:hover{filter:blur(0px)!important;overflow:visible}.sb_adTA::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}`
    },
    ".duckduckgo.com": {
      css: `li[data-layout=ad]{filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}li[data-layout=ad]:hover{filter:blur(0px)!important;overflow:visible}li[data-layout=ad]::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}`
    },
    ".facebook.com": {
      css: `.x1yztbdb:has(a[href^="/ads/about/?"]){filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}.x1yztbdb:has(a[href^="/ads/about/?"]):hover{filter:blur(0px)!important;overflow:visible}.x1yztbdb:has(a[href^="/ads/about/?"])::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}`
    },
    ".google.com": {
      css: `div[data-text-ad="1"]{filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}div[data-text-ad="1"]:hover{filter:blur(0px)!important;overflow:visible}div[data-text-ad="1"]::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}`
    },
    ".msn.com": {
      js: `var nodeMap={};function findAllShadowRoots(o){const e=[];return o.shadowRoot&&(e.push(o.shadowRoot),e.push(...findAllShadowRoots(o.shadowRoot))),o.childNodes.forEach((o=>{e.push(...findAllShadowRoots(o))})),e}const debouncedHandleShadowRoots=handleShadowRoots,observer=new MutationObserver((o=>{debouncedHandleShadowRoots(document.body)}));function findDivsWithAdSlugAndContent(o){const e=[];return[".card-outer:has(.ad-slug)",".card-content:has(.ad-slug)"].forEach((t=>{o.querySelectorAll(t).forEach((o=>{o.querySelector(".ad-slug")&&e.push(o)}))})),e}observer.observe(document.body,{childList:!0,subtree:!0}),nodeMap[document.body]=!0,handleShadowRoots(document.body),setInterval(debouncedHandleShadowRoots,3e3);var cssPath="https://raw.githubusercontent.com/jqwel/extensions/refs/heads/main/focus_booster/css/all.css";chrome&&(cssPath=chrome.runtime.getURL("css/all.css"));const link=document.createElement("link");link.rel="stylesheet",link.href=cssPath;var SheetLoaded=null;async function handleShadowRoots(o=document.body){o||console.error(o);findAllShadowRoots(o).forEach((o=>{if(!nodeMap[o]){nodeMap[o]=!0;new MutationObserver((e=>{debouncedHandleShadowRoots(o)})).observe(o,{childList:!0,subtree:!0})}findDivsWithAdSlugAndContent(o).forEach((e=>{if(!o._focus_boost_insert){o._focus_boost_insert=!0,async function(){if(!SheetLoaded){const o=new CSSStyleSheet;SheetLoaded=o;const e=await fetch(cssPath),t=await e.text();o.replaceSync(t)}o.adoptedStyleSheets.push(SheetLoaded)}()}o.insertBefore(link,o.firstChild),e.classList.contains("__focus_booster")||e.classList.add("__focus_booster")}))}))}`,
      css: `/deep/cs-native-ad-card:has(.ad-label-text){filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}/deep/cs-native-ad-card:has(.ad-label-text):hover{filter:blur(0px)!important;overflow:visible}/deep/cs-native-ad-card:has(.ad-label-text)::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}`
    },
    ".mydrivers.com": {
      css: `.good_ths li,li:has(.c){filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}.good_ths li:hover,li:has(.c):hover{filter:blur(0px)!important;overflow:visible}.good_ths li::after,li:has(.c)::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}body{background-color:#000!important}`
    },
    ".163.com": {
      css: `.ad_text,.common_ad_item,.mod_js_ad,.post_recommend_ad,.right_ad_item{filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}.ad_text:hover,.common_ad_item:hover,.mod_js_ad:hover,.post_recommend_ad:hover,.right_ad_item:hover{filter:blur(0px)!important;overflow:visible}.ad_text::after,.common_ad_item::after,.mod_js_ad::after,.post_recommend_ad::after,.right_ad_item::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}`
    },
    ".qq.com": {
      css: `.ad-cell-common,.channel-feed-item:has(.adCode),.rectangle-ad-channel{filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}.ad-cell-common:hover,.channel-feed-item:has(.adCode):hover,.rectangle-ad-channel:hover{filter:blur(0px)!important;overflow:visible}.ad-cell-common::after,.channel-feed-item:has(.adCode)::after,.rectangle-ad-channel::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}`
    },
    ".sina.com.cn": {
      css: `.sinaads-float,.sinaads:not(.sinaads-fail){filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}.sinaads-float:hover,.sinaads:not(.sinaads-fail):hover{filter:blur(0px)!important;overflow:visible}.sinaads-float::after,.sinaads:not(.sinaads-fail)::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}`
    },
    ".so.com": {
      css: `.e-buss li{filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}.e-buss li:hover{filter:blur(0px)!important;overflow:visible}.e-buss li::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}`
    },
    ".sogou.com": {
      css: `.art-container:has(.feed-item-close),.sdk-ad,.sdk-ad-side-banner-hover,.sponsored-ams>div,[class^=shopWindow_shopWindowAd]:not([class^=shopWindow_shopWindowAd] [class^=shopWindow_shopWindowAd]){filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}.art-container:has(.feed-item-close):hover,.sdk-ad-side-banner-hover:hover,.sdk-ad:hover,.sponsored-ams>div:hover,[class^=shopWindow_shopWindowAd]:not([class^=shopWindow_shopWindowAd] [class^=shopWindow_shopWindowAd]):hover{filter:blur(0px)!important;overflow:visible}.art-container:has(.feed-item-close)::after,.sdk-ad-side-banner-hover::after,.sdk-ad::after,.sponsored-ams>div::after,[class^=shopWindow_shopWindowAd]:not([class^=shopWindow_shopWindowAd] [class^=shopWindow_shopWindowAd])::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}`
    },
    ".v2ex.com": {
      css: `.wwads-cn{filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}.wwads-cn:hover{filter:blur(0px)!important;overflow:visible}.wwads-cn::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}`
    },
    ".weibo.com": {
      css: `.vue-recycle-scroller__item-view:has(.wbpro-tag-img),:is([class*=" TipsAd_picture_"],[class^=TipsAd_picture_]){filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}.vue-recycle-scroller__item-view:has(.wbpro-tag-img):hover,:is([class*=" TipsAd_picture_"],[class^=TipsAd_picture_]):hover{filter:blur(0px)!important;overflow:visible}.vue-recycle-scroller__item-view:has(.wbpro-tag-img)::after,:is([class*=" TipsAd_picture_"],[class^=TipsAd_picture_])::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}`
    },
    ".x.com": {
      css: `div[data-testid=placementTracking]:has([data-testid*=impression]){filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}div[data-testid=placementTracking]:has([data-testid*=impression]):hover{filter:blur(0px)!important;overflow:visible}div[data-testid=placementTracking]:has([data-testid*=impression])::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}`
    },
    ".youtube.com": {
      css: `#masthead-ad:not(:has(ytd-ad-slot-renderer)),#player-ads,ytd-ad-slot-renderer{filter:blur(var(--blur-amount))!important;transition:filter var(--filter-transition-duration) var(--filter-transition-timing);overflow:hidden}#masthead-ad:not(:has(ytd-ad-slot-renderer)):hover,#player-ads:hover,ytd-ad-slot-renderer:hover{filter:blur(0px)!important;overflow:visible}#masthead-ad:not(:has(ytd-ad-slot-renderer))::after,#player-ads::after,ytd-ad-slot-renderer::after{content:"广告";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);background:rgba(255,255,255,.45);color:rgba(204,0,0,.55);display:inline-flex;padding:40px 40px;border:6px solid rgba(204,0,0,.43);font-size:max(48px, min(8em, 88px));font-family:STBaoliTC-Regular,LiSu,STLiti,cursive;border-radius:5px;z-index:999999999;pointer-events:none;text-shadow:0 0 4px rgba(255,255,255,.3),0 0 8px rgba(255,255,255,.3),0 0 12px rgba(255,255,255,.3);white-space:nowrap;box-shadow:0 0 0 3px rgba(204,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.2),0 0 2px rgba(204,0,0,.6),inset 0 0 5px rgba(204,0,0,.75)}`
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
      if (key.substring(1) === hostname) {
        return true
      }
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
          "User-Agent": "Mozilla/5.0",
          // "Accept": "text/javascript"
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
          "User-Agent": "Mozilla/5.0",
          // "Accept": "text/css"
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
