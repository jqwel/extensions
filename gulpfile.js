const gulp = require("gulp");
const replace = require("gulp-replace");
const through2 = require('through2');
const fs = require("fs-extra");
const CleanCSS = require('clean-css');
const Terser = require('terser');

function getCurrentTimeVersion() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}.${hours}${minutes}${seconds}`;
}

function minifyCSS(cssString) {
  return new CleanCSS().minify(cssString).styles;
}

function minifyJS(jsString) {
  const result = Terser.minify_sync(jsString);
  return result.code; // 返回压缩后的 JS 代码
}

// 自定义的输入输出函数
function customTransformMinJS() {
  return through2.obj(function (file, enc, cb) {
    if (file.isBuffer()) {
      // 对文件内容进行操作，比如转换文本内容
      let contents = file.contents.toString();
      var cssPart1 = fs.readFileSync("./run_sh/css_data/part1.css", "utf8");
      var cssPart2 = fs.readFileSync("./run_sh/css_data/part2.css", "utf8");
      var cssPart3 = fs.readFileSync("./run_sh/css_data/part3.css", "utf8");
      var prefix = "$CSS$";
      cssPart1 = minifyCSS(prefix + cssPart1).substring(prefix.length);
      cssPart2 = minifyCSS(prefix + cssPart2).substring(prefix.length);
      cssPart3 = minifyCSS(prefix + cssPart3).substring(prefix.length);
      contents = contents.replaceAll(`${cssPart1}`, `\` + CssPart1 + \``);
      contents = contents.replaceAll(`${cssPart2}`, `\` + CssPart2 + \``);
      contents = contents.replaceAll(`${cssPart3}`, `\` + CssPart3 + \``);
      contents = contents.replaceAll(`$CssPart1$`, cssPart1)
      contents = contents.replaceAll(`$CssPart2$`, cssPart2)
      contents = contents.replaceAll(`$CssPart3$`, cssPart3)
      contents = minifyJS(contents);
      file.contents = Buffer.from(contents);
    }
    cb(null, file); // 返回处理过的文件
  });
}

// Task 1: inject-version - Generate focus_booster.meta.js with version and CSS content
gulp.task("inject-version", function () {
  return gulp.src("./run_sh/tampermonkey/focus_booster.meta.js")
      .pipe(replace("VERSION_TIME", `${getCurrentTimeVersion()}`))
      .pipe(gulp.dest("dist"));
});

// Task 2: inject-css - Replace placeholders and prepend meta content
gulp.task("inject-css", function () {
  const metaContent = fs.readFileSync("./dist/focus_booster.meta.js", "utf8"); // 读取 meta.js 内容

  return gulp.src("./run_sh/tampermonkey/focus_booster.user.js")
      .pipe(replace("$CSS_CONTENT$GLOBAL$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/all.css", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$2345$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/2345.css", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$360$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/360.css", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$baidu$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/baidu.css", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$bilibili$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/bilibili.css", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$bing$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/bing.css", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$duckduckgo$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/duckduckgo.css", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$facebook$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/facebook.css", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$google$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/google.css", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$ifeng$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/ifeng.css", "utf8"))}\``))
      .pipe(replace("$JS_CONTENT$msn$", `\`${minifyJS(fs.readFileSync("./focus_booster/js/msn.js", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$msn$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/msn.css", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$mydrivers$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/mydrivers.css", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$163$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/netease.css", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$qq$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/qq.css", "utf8"))}\``))
      .pipe(replace("$JS_CONTENT$reddit$", `\`${minifyJS(fs.readFileSync("./focus_booster/js/reddit.js", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$reddit$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/reddit.css", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$sina$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/sina.css", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$so$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/so.css", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$sogou$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/sogou.css", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$v2ex$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/v2ex.css", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$weibo$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/weibo.css", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$x$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/x.css", "utf8"))}\``))
      .pipe(replace("$CSS_CONTENT$youtube$", `\`${minifyCSS(fs.readFileSync("./focus_booster/css/youtube.css", "utf8"))}\``))
      .pipe(customTransformMinJS())
      .pipe(replace(/^/, metaContent + "\n")) // 在文件开头添加 meta 内容
      .pipe(gulp.dest("dist"));
});

// Default task to run both tasks sequentially
gulp.task("default", gulp.series("inject-version", "inject-css"));

// 把inject-version 的输出添加到 inject-css输出文件的开头
