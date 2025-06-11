package main

import (
	_ "embed"
	"fmt"
	"os"
)

//go:embed part1.css
var part1css string

//go:embed part2.css
var part2css string

//go:embed part3.css
var part3css string

//go:embed part4.css
var part4css string

//go:embed root.css
var rootcss string

func main() {
	var input []OutputEntry = []OutputEntry{
		{
			Filename: "all.css",
			Selectors: []string{
				`.__focus_booster`,
				`div[id^="google_ads_iframe_"]`,
				// ".adsbygoogle",
				`div:has(> iframe[src*="googleads.g.doubleclick.net/"])`,
				`div:has(> iframe[src^="https://pos.baidu.com/"])`,
				`div:has(> iframe[src^="//pos.baidu.com/"])`,
				`.advertise`,
				`div:has(> img[class*="-ad-"]) a`,
				`a:has(> img[class*="-ad-"])`,
				`div[id*="_ad_"]`,
				`.pc-ad-common`,
			},
			Prefix: rootcss,
		},
		{
			Filename: "2345.css",
			Selectors: []string{
				".xxl-ad-360",
				"div:has(> .ad-mark)",
			},
		},
		{
			Filename: "360.css",
			Selectors: []string{
				".uni-flow-card:has(.ad)",
				".cube-mod:has(.ad-flag)",
			},
		},
		{
			Filename: "baidu.css",
			Selectors: []string{
				".c-container:has(.ec-tuiguang):not(:has(div[data-cmatchid]))", // 排除5
				".cr-content:has(.ec-tuiguang):not(:has(div[data-cmatchid]))",  // 排除5
				`.mediago-ad-wrapper`,
				`div[class^="unionAd_"]`,
				`div[data-cmatchid]:has(.ec-tuiguang)`,
				`.clearfix > div:has(> .j_click_stats)`,
				`div[ad-dom-img="true"]`,
				`#J-bottom-recommend-wrapper`,
				`img[src*="//baikebcs.bdimg.com/adpic/"]`,
				`.newfcImgli:has(.fc-ad-tip)`, // image.baidu.com
			},
		},
		{
			Filename: "bilibili.css",
			Selectors: []string{
				".bili-video-card__wrap:has(.bili-video-card__info--ad)",
				`.bili-video-card__wrap:has(.bili-video-card__image--link[href*="cm.bilibili.com/cm/api"])`,
				`.ad-report`,
			},
		},
		{
			Filename: "bing.css",
			Selectors: []string{
				`.sb_adTA`,
			},
		},
		{
			Filename: "duckduckgo.css",
			Selectors: []string{
				`li[data-layout="ad"]`,
			},
		},
		{
			Filename: "facebook.css", // 切换到中文
			Selectors: []string{
				`.x1yztbdb:has(a[href^="/ads/about/?"])`,
				`div[role="complementary"] a[aria-label="广告主"]`,
				// `.x1yztbdb:has(a[href*="#?"]:not([href*="%2C"]))`,
			},
		},
		{
			Filename: "google.css",
			Selectors: []string{
				`div[data-text-ad="1"]`,
			},
		},
		{
			Filename: "ifeng.css",
			Selectors: []string{
				`:is(div, a):not([class^="text-"]):has(> img[src*="/feprod/c/ifengimcp/pic/20210108/3677f2773fd79f12b079_size1_w56_h34.png"])`,
				// `:is(div)[class^="text-"]:has(img[src*="/feprod/c/ifengimcp/pic/20210108/3677f2773fd79f12b079_size1_w56_h34.png"])`,
				`div:has(> img[src*="//x0.ifengimg.com/feprod/c/2023_1_17/16_21_21/1.png"])`,
				`div:has(> iframe[src*="www.ifeng.com/a_if/iis/baidu/"])`,
				`:is(div, li):has(> iframe[src*="www.ifeng.com/a_if/baidu/"])`,
				`div[class*="index_topAd"]`,
				`div[class*="index_floatAd"]`,
				`div[class*="index_bottomAd"]`,
				`div[class*="index_asideAd"]`,
				`div[class*="index_ad"]`,
				`div[class*="index_hardAd"]`,
				`div[class*="index_contentBottomAd"]`,
				`div[class*="index_serviceAd"]`,
				`div[class*="index_rectangleAd"]`,
				`.news-stream-newsStream-news-item-ad`,
				`newsfeed:has(.adTag)`,
				`#viewDiv:has(img[src*="x0.ifengimg.com/feprod/c/feprod/c/ifengimcp/pic/20210108/3677f2773fd79f12b079_size1_w56_h34.png"])`,
			},
		},
		{
			Filename: "msn.css",
			Selectors: []string{
				`/deep/cs-content-card[data-t*="NativeAd"]`,
			},
		},
		{
			Filename: "mydrivers.css",
			Selectors: []string{
				`li:has(.c)`,
				`.good_ths li`,
			},
			AdditionalData: `body {
    background-color: black !important;
}`,
		},
		{
			Filename: "netease.css",
			Selectors: []string{
				`.ad_text`,
				`.mod_js_ad`,
				`.common_ad_item`,
				`.right_ad_item`,
				`.post_recommend_ad`,
				`.hp_textlink1_ad`,
				`.idx_kaola_ad`,
			},
		},
		{
			Filename: "qq.css",
			Selectors: []string{
				`.ad-cell-common`,
				`.channel-feed-item:has(.adCode)`,
				`.rectangle-ad-channel`,
				`div[adconfig_key]`,
			},
		},
		{
			Filename: "reddit.css",
			Selectors: []string{
				// `shreddit-dynamic-ad-link`,
				`.promotedlink`,
			},
		},
		{
			Filename: "sina.css",
			Selectors: []string{
				`div[id*="sinaadToolkitBox"]`,
				`.sinaads:not(.sinaads-fail)`,
				`.sinaads-float`,
				`div:has(> iframe[adtypeturning="undefined"])`,
			},
		},
		{
			Filename: "so.css",
			Selectors: []string{
				`.e-buss li`,
			},
		},
		{
			Filename: "sogou.css",
			Selectors: []string{
				`.sponsored-ams > div`,
				`.sdk-ad-side-banner-hover`,
				`.art-container:has(.feed-item-close)`,
				`[class^="shopWindow_shopWindowAd"]:not([class^="shopWindow_shopWindowAd"] [class^="shopWindow_shopWindowAd"])`, // `:is([class^="shopWindow_shopWindowAd"])`,
				`.sdk-ad`,
				`#ad-top-static-banner`,
				`#ad_result_right`,
				`#opening-ad`,
				`.ad-icon-side-banner`,
				`a[dt-eid="ads_top"]`,
			},
		},
		{
			Filename: "v2ex.css",
			Selectors: []string{
				`.wwads-cn`,
			},
		},
		{
			Filename: "weibo.css",
			Selectors: []string{
				`.vue-recycle-scroller__item-view:has(.wbpro-tag-img)`,
				`.vue-recycle-scroller__item-view:has([mark*="_mark_ad:"])`,
				`:is([class*=" TipsAd_picture_"], [class^="TipsAd_picture_"])`,
			},
		},
		{
			Filename: "youtube.css",
			Selectors: []string{
				`ytd-ad-slot-renderer`,
				`#player-ads`,
				`#masthead-ad:not(:has(ytd-ad-slot-renderer))`,
			},
		},
		{
			Filename: "x.css",
			Selectors: []string{
				`div[data-testid="placementTracking"]:has([data-testid*="impression"])`,
			},
		},
	}
	// Part 1
	for _, entry := range input {
		var pre = entry.Prefix
		var part1 = GenPart(entry.Selectors, "", part1css)
		var part2 = GenPart(entry.Selectors, ":hover", part2css)
		var part3 = GenPart(entry.Selectors, "::after", part3css)
		var part4 = GenPart(entry.Selectors, ":hover::after", part4css)
		if pre != "" {
			pre += "\n\n"
		}
		var result = fmt.Sprintf("%s%s\n\n%s\n\n%s\n\n%s\n", pre, part1, part2, part3, part4)
		// Part 2
		// Part 3
		if entry.AdditionalData != "" {
			result += fmt.Sprintf("\n%s\n", entry.AdditionalData)
		}
		// fmt.Println(entry.Filename)
		// fmt.Println(result)
		err := os.WriteFile(fmt.Sprintf("../../focus_booster/css/%s", entry.Filename), []byte(result), 0644)
		if err != nil {
			fmt.Println("写入文件失败:", err)
			return
		}
	}
}

func GenPart(selectors []string, decorator string, content string) string {
	var result string
	if selectors == nil || len(selectors) == 0 {
		return result
	}
	for i, selector := range selectors {
		if i != 0 {
			result += ",\n"
		}
		result += selector + decorator
	}
	return result + " " + content
}

type OutputEntry struct {
	Filename       string
	Prefix         string
	Selectors      []string
	AdditionalData string
}
