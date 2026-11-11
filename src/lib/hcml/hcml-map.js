// HCML 中文标签 / 属性 <-> HTML 英文标签 / 属性 映射表（本地映射表）
// 来源：https://github.com/Fr-main/hcml  src/map.js（逻辑保持一致，便于与网络映射表结果对齐）
// 一个英文标签可以对应多个中文别名；要新增别名，直接往 TAG_MAP / ATTR_MAP 里加键值即可。
//
// HCML 中文标签 -> HTML 英文标签的映射表
// 一个英文标签可以对应**多个**中文标签（同义别名）。
// 别名来源：常见中文译名 + 程序员简写 + 拼音 + 同音不同字/错别字。
// 键必须是字符串；值是小写的 HTML 标签名。
//
// 若要新增中文标签，只需在下面对象里继续添加键值对即可。

export const TAG_MAP = {
  // ============= 文档结构 / 根节点 =============
  "超文本标记语言文档": "html",
  "超文本标记": "html",
  "超文本文档": "html",
  "超文本": "html",
  "网页根元素": "html",
  "网页根": "html",
  "网页": "html",
  "根元素": "html",
  "根": "html",
  "文档根": "html",
  "根节点": "html",
  "html": "html",
  "HTML": "html",

  "头部": "head",
  "文档头": "head",
  "文档头部": "head",
  "文档元信息": "head",
  "文档元": "head",
  "元信息区": "head",
  "头": "head",
  "head": "head",

  "标题": "title",
  "网页标题": "title",
  "文档标题": "title",
  "页签标题": "title",
  "页签": "title",
  "页面标题": "title",
  "标签标题": "title",
  "title": "title",
  "TITLE": "title",

  "主体": "body",
  "页面主体": "body",
  "页面主": "body",
  "正文": "body",
  "主体区": "body",
  "页面正文": "body",
  "body": "body",

  // ============= 元数据 / <meta> =============
  "元信息": "meta",
  "元数据": "meta",
  "元": "meta",
  "页面元": "meta",
  "页元": "meta",
  "meta": "meta",

  "链接": "link",
  "外链": "link",
  "外链标签": "link",
  "引入": "link",
  "link": "link",

  "基础路径": "base",
  "基准地址": "base",
  "基准": "base",
  "基础": "base",
  "base": "base",

  "注释": "comment", // 仅用于保留，转换时会特殊处理

  "脚本": "script",
  "脚本代码": "script",
  "代码脚本": "script",
  "脚本块": "script",
  "script": "script",

  "样式": "style",
  "样式表": "style",
  "样式代码": "style",
  "style": "style",

  "noscript": "noscript",
  "无脚本": "noscript",
  "无脚本标签": "noscript",

  // ============= 语义化区块 =============
  "页眉": "header",
  "页头": "header",
  "顶部": "header",
  "头部区域": "header",
  "头区": "header",
  "页首": "header",
  "header": "header",

  "页脚": "footer",
  "底部": "footer",
  "底部区域": "footer",
  "尾": "footer",
  "尾部": "footer",
  "footer": "footer",

  "导航": "nav",
  "导航栏": "nav",
  "导航菜单": "nav",
  "navbar": "nav",
  "nav": "nav",

  "主内容": "main",
  "主要内容": "main",
  "主区": "main",
  "main": "main",

  "章节": "section",
  "节": "section",
  "区块": "section",
  "分区": "section",
  "部分": "section",
  "段": "section",
  "块": "section",
  "小节": "section",
  "section": "section",

  "文章": "article",
  "文章块": "article",
  "独立内容": "article",
  "独立块": "article",
  "article": "article",

  "侧边栏": "aside",
  "附加区": "aside",
  "旁注": "aside",
  "侧栏": "aside",
  "aside": "aside",

  "详情": "details",
  "可折叠详情": "details",
  "details": "details",

  "概要": "summary",
  "摘要": "summary",
  "折叠标题": "summary",
  "summary": "summary",

  "对话": "dialog",
  "弹窗": "dialog",
  "对话框": "dialog",
  "对话框标签": "dialog",
  "dialog": "dialog",

  // ============= 层级标题 h1 ~ h6 =============
  // 阿拉伯数字 / 汉字数字 / 罗马数字（可选）都能写
  "一级标题": "h1",
  "第一级标题": "h1",
  "1级标题": "h1",
  "一级头": "h1",
  "一级": "h1",
  "一级标题1": "h1",
  "标题1": "h1",
  "标题一": "h1",
  "h1": "h1",
  "H1": "h1",

  "二级标题": "h2",
  "第二级标题": "h2",
  "2级标题": "h2",
  "二级头": "h2",
  "二级": "h2",
  "标题2": "h2",
  "标题二": "h2",
  "h2": "h2",
  "H2": "h2",

  "三级标题": "h3",
  "第三级标题": "h3",
  "3级标题": "h3",
  "三级头": "h3",
  "三级": "h3",
  "标题3": "h3",
  "标题三": "h3",
  "h3": "h3",
  "H3": "h3",

  "四级标题": "h4",
  "第四级标题": "h4",
  "4级标题": "h4",
  "四级头": "h4",
  "四级": "h4",
  "标题4": "h4",
  "标题四": "h4",
  "h4": "h4",
  "H4": "h4",

  "五级标题": "h5",
  "第五级标题": "h5",
  "5级标题": "h5",
  "五级头": "h5",
  "五级": "h5",
  "标题5": "h5",
  "标题五": "h5",
  "h5": "h5",
  "H5": "h5",

  "六级标题": "h6",
  "第六级标题": "h6",
  "6级标题": "h6",
  "六级头": "h6",
  "六级": "h6",
  "标题6": "h6",
  "标题六": "h6",
  "h6": "h6",
  "H6": "h6",

  // ============= 通用容器 =============
  "块级容器": "div",
  "块容器": "div",
  "块": "div",
  "通用容器": "div",
  "通用块": "div",
  "容器": "div",
  "区块容器": "div",
  "div": "div",

  "高亮区域": "span",
  "片段": "span",
  "行内分区": "span",
  "行内容器": "span",
  "内联容器": "span",
  "行内容器": "span",
  "span": "span",

  "段落": "p",
  "段落元素": "p",
  "段": "p",
  "正文段": "p",
  "p": "p",

  "换行": "br",
  "换行元素": "br",
  "br": "br",

  "水平线": "hr",
  "分隔线": "hr",
  "分割线": "hr",
  "横线": "hr",
  "hr": "hr",

  "预格式化": "pre",
  "预格式化文本": "pre",
  "代码块": "pre",
  "代码段落": "pre",
  "pre": "pre",

  "引用段落": "blockquote",
  "块级引用": "blockquote",
  "大引用": "blockquote",
  "blockquote": "blockquote",

  "地址": "address",
  "联系信息": "address",
  "联系": "address",
  "address": "address",

  // ============= 文本语义 =============
  "粗体": "b",
  "加粗": "b",
  "粗体字": "b",
  "b": "b",

  "重要": "strong",
  "强调": "strong",
  "强重点": "strong",
  "strong": "strong",

  "斜体": "i",
  "斜体字": "i",
  "i": "i",

  "强调文字": "em",
  "强调文本": "em",
  "em": "em",

  "小号": "small",
  "小字": "small",
  "小字标签": "small",
  "small": "small",

  "删除": "del",
  "删除线": "del",
  "删除文字": "del",
  "del": "del",

  "插入": "ins",
  "下划线": "ins",
  "新增文本": "ins",
  "ins": "ins",

  "标记": "mark",
  "高亮": "mark",
  "荧光笔": "mark",
  "mark": "mark",

  "上标": "sup",
  "上标文字": "sup",
  "sup": "sup",

  "下标": "sub",
  "下标文字": "sub",
  "sub": "sub",

  "引用": "q",
  "引文": "q",
  "行内引用": "q",
  "q": "q",

  "代码": "code",
  "代码行": "code",
  "code": "code",

  "变量": "var",
  "变量名": "var",
  "var": "var",

  "键盘": "kbd",
  "按键": "kbd",
  "键盘输入": "kbd",
  "kbd": "kbd",

  "样本": "samp",
  "示例输出": "samp",
  "samp": "samp",

  "缩写": "abbr",
  "简称": "abbr",
  "abbr": "abbr",

  "定义": "dfn",
  "术语": "dfn",
  "dfn": "dfn",

  "重音": "ruby",
  "拼音重音": "ruby",
  "注音": "ruby",
  "ruby": "ruby",

  "注音": "rt",
  "注音标签": "rt",
  "rt": "rt",

  "注音符号": "rp",
  "rp": "rp",

  "方向覆盖": "bdi",
  "bdi": "bdi",

  "方向隔离": "bdo",
  "bdo": "bdo",

  "下划文本": "u",
  "下划线文本": "u",
  "下划线标签": "u",
  "u": "u",

  "单词分割": "wbr",
  "wbr": "wbr",

  // ============= 链接 =============
  "超链接": "a",
  "链接标签": "a",
  "锚": "a",
  "锚点": "a",
  "超链": "a",
  "链接": "a",
  "a": "a",

  // ============= 列表 =============
  "列表": "ul",                  // 简写：默认视为无序列表
  "无序列表": "ul",
  "项目符号列表": "ul",
  "ul": "ul",

  "数字列表": "ol",
  "有序列表": "ol",
  "编号列表": "ol",
  "ol": "ol",

  "列表项": "li",
  "条目": "li",
  "项目": "li",
  "li": "li",

  "定义列表": "dl",
  "名词解释列表": "dl",
  "dl": "dl",

  "定义项": "dt",
  "名词": "dt",
  "dt": "dt",

  "定义描述": "dd",
  "描述": "dd",
  "dd": "dd",

  // ============= 表格 =============
  "表格": "table",
  "表": "table",
  "table": "table",

  "表格标题": "caption",
  "表头标题": "caption",
  "caption": "caption",

  "表格分组": "colgroup",
  "列组": "colgroup",
  "colgroup": "colgroup",

  "列": "col",
  "列元素": "col",
  "col": "col",

  "表头": "thead",
  "表头分组": "thead",
  "thead": "thead",

  "表体": "tbody",
  "表体分组": "tbody",
  "tbody": "tbody",

  "表尾": "tfoot",
  "表尾分组": "tfoot",
  "tfoot": "tfoot",

  "表格行": "tr",
  "行": "tr",
  "tr": "tr",

  "表头单元格": "th",
  "表头项": "th",
  "表头列": "th",
  "表头格": "th",
  "th": "th",

  "表格单元格": "td",
  "单元格": "td",
  "数据单元格": "td",
  "表体单元格": "td",
  "td": "td",

  // ============= 表单 =============
  "表单": "form",
  "表单标签": "form",
  "form": "form",

  "输入": "input",
  "输入框": "input",
  "输入控件": "input",
  "input": "input",

  "文本域": "textarea",
  "多行文本": "textarea",
  "textarea": "textarea",

  "按钮": "button",
  "按钮标签": "button",
  "按钮元素": "button",
  "button": "button",

  "标签": "label",
  "文本标签": "label",
  "字段标签": "label",
  "label": "label",

  "字段集": "fieldset",
  "分组": "fieldset",
  "表单分组": "fieldset",
  "fieldset": "fieldset",

  "字段集标题": "legend",
  "分组标题": "legend",
  "图例": "legend",
  "legend": "legend",

  "下拉框": "select",
  "选择框": "select",
  "下拉选择": "select",
  "select": "select",

  "选项": "option",
  "下拉项": "option",
  "option": "option",

  "选项组": "optgroup",
  "选项分组": "optgroup",
  "optgroup": "optgroup",

  "输出": "output",
  "表单输出": "output",
  "output": "output",

  // ============= 嵌入 / 媒体 =============
  "图像": "img",
  "图片": "img",
  "图片标签": "img",
  "图片元素": "img",
  "图": "img",
  "img": "img",

  "图片映射": "map",
  "热区图": "map",
  "map": "map",

  "映射区": "area",
  "热区": "area",
  "area": "area",

  "内联框架": "iframe",
  "框架页": "iframe",
  "iframe": "iframe",

  "嵌入对象": "embed",
  "嵌入": "embed",
  "embed": "embed",

  "对象": "object",
  "对象元素": "object",
  "object": "object",

  "对象参数": "param",
  "参数": "param",
  "param": "param",

  "音频": "audio",
  "音频元素": "audio",
  "audio": "audio",

  "视频": "video",
  "视频元素": "video",
  "video": "video",

  "媒体源": "source",
  "来源": "source",
  "资源来源": "source",
  "source": "source",

  "轨道": "track",
  "字幕轨道": "track",
  "字幕": "track",
  "track": "track",

  "画布": "canvas",
  "画布元素": "canvas",
  "canvas": "canvas",

  "可缩放矢量图形": "svg",
  "矢量图": "svg",
  "svg": "svg",

  "数学": "math",
  "数学公式": "math",
  "math": "math",

  "图片集": "picture",
  "picture": "picture",

  // ============= 过时标签（保留兼容） =============
  "字体": "font",
  "font": "font",

  "中心": "center",
  "居中": "center",
  "center": "center",

  "等宽": "tt",
  "打字机": "tt",
  "tt": "tt",

  "大字": "big",
  "big": "big",

  "框架集": "frameset",
  "frameset": "frameset",

  "框架": "frame",
  "frame": "frame",

  "无框架": "noframes",
  "noframes": "noframes",

  "闪烁": "blink",
  "blink": "blink",

  "滚动": "marquee",
  "marquee": "marquee",

  "列表目录": "dir",
  "dir": "dir",

  "菜单": "menu",
  "menu": "menu",

  // ============= 自定义标签 =============
  "模板": "template",
  "模板元素": "template",
  "template": "template",

  "插槽": "slot",
  "占位插槽": "slot",
  "slot": "slot",
};

// 反向查找：英文标签名 -> 第一个中文别名（用于 HTML -> HCML 方向）
const reverse = {};
for (const zh of Object.keys(TAG_MAP)) {
  const en = TAG_MAP[zh];
  if (!reverse[en]) reverse[en] = zh;
}
export const EN_TO_ZH = reverse;

// HTML void 元素（没有闭合标签）
export const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img",
  "input", "link", "meta", "param", "source", "track", "wbr",
]);

// 必须保持原样的 raw 文本元素
export const RAW_ELEMENTS = new Set(["script", "style", "noscript"]);

// 所有已知的标准 HTML 标签集合（大小写归一化）
// 这些标签即使是**英文写法**混进 HCML，也能被识别并原样保留。
export const KNOWN_HTML_TAGS = new Set(Object.keys(TAG_MAP)
  .map(k => k.toLowerCase())
  .filter(k => /^[a-z][a-z0-9-]*$/.test(k)));

// ============= 中文属性名 -> 英文属性名 =============

export const ATTR_MAP = {
  // 通用 / 全局
  "类": "class",
  "类名": "class",
  "类标签": "class",
  "标识": "id",
  "编号": "id",
  "标识号": "id",
  "样式": "style",
  "标题": "title",
  "语言": "lang",
  "可隐藏": "hidden",
  "隐藏": "hidden",
  "数据": "data",
  "可编辑": "contenteditable",
  "拼写检查": "spellcheck",
  "可拼写检查": "spellcheck",
  "索引": "tabindex",
  "标签索引": "tabindex",
  "自动聚焦": "autofocus",
  "自动焦点": "autofocus",
  "引用": "itemref",
  "类型": "type",
  "值": "value",
  "名称": "name",
  "只读": "readonly",
  "禁用": "disabled",
  "已检查": "checked",
  "选中": "selected",
  "必需": "required",
  "必填": "required",
  "占位符": "placeholder",
  "占位": "placeholder",
  "最小值": "min",
  "最大值": "max",
  "步长": "step",
  "长度": "length",
  "长度值": "size",
  "宽度": "width",
  "高度": "height",

  // <a>
  "链接地址": "href",
  "链接": "href",
  "跳转": "href",
  "目标": "target",
  "关系": "rel",
  "相对关系": "rel",
  "资源": "href",

  // <img> / <source> / <audio> / <video> / <iframe> / <embed> / <frame>
  "源": "src",
  "图片源": "src",
  "文件": "src",
  "地址": "src",
  "嵌入源": "src",
  "代码": "src",
  "替代文本": "alt",
  "说明": "alt",
  "图像集": "srcset",
  "尺寸": "sizes",

  // <meta>
  "元数据名": "name",
  "元名称": "name",
  "内容": "content",
  "字符集": "charset",
  "字符编码": "charset",
  "http等效": "http-equiv",

  // <link>
  "关联": "rel",
  "外部资源": "href",
  "类型值": "type",

  // <form>
  "方法": "method",
  "提交": "action",
  "编码类型": "enctype",
  "自动完成": "autocomplete",
  "目标页面": "target",
  "可验证": "novalidate",
  "已验证": "novalidate",

  // <input>
  "接受": "accept",
  "自动完成值": "autocomplete",
  "自动聚焦值": "autofocus",
  "列表": "list",
  "最小长度": "minlength",
  "最大长度": "maxlength",
  "多行": "multiple",
  "模式": "pattern",
  "只读值": "readonly",
  "尺寸值": "size",

  // <textarea>
  "行数": "rows",
  "列数": "cols",
  "换行": "wrap",

  // <button>
  "类型按钮": "type",
  "类型按钮值": "type",
  "表单提交": "formaction",
  "表单方法": "formmethod",
  "表单不验证": "formnovalidate",
  "表单目标": "formtarget",

  // <select> / <option> / <optgroup>
  "允许多选": "multiple",
  "选项标签": "label",
  "默认选中": "selected",

  // <video> / <audio>
  "自动播放": "autoplay",
  "自动播放值": "autoplay",
  "循环播放": "loop",
  "静音": "muted",
  "预加载": "preload",
  "控制条": "controls",
  "控制": "controls",
  "海报": "poster",
  "播放速率": "playbackrate",

  // <iframe>
  "允许": "allow",
  "允许全屏": "allowfullscreen",
  "允许全屏值": "allowfullscreen",
  "加载": "loading",
  "来源策略": "referrerpolicy",

  // <script> / <style> / <link>
  "异步": "async",
  "延迟": "defer",
  "模块": "type",
  "内联": "type",
  "字符集值": "charset",
  "安全": "integrity",
  "跨域": "crossorigin",
  "跨域值": "crossorigin",

  // <picture> / <source>
  "媒体": "media",
  "资源类型": "type",

  // <col> / <colgroup> / <table>
  "列跨度": "span",
  "列跨度值": "span",
  "跨度": "span",
  "边框": "border",
  "单元格间距": "cellspacing",
  "单元格内边距": "cellpadding",
  "对齐": "align",

  // <td> / <th>
  "跨行": "rowspan",
  "跨列": "colspan",
  "表头关联": "headers",
  "范围": "scope",
  "缩写": "abbr",
  "轴": "axis",

  // <ol>
  "开始": "start",
  "顺序值": "reversed",
  "类型数字": "type",

  // <li>
  "条目值": "value",

  // <ul>
  "紧凑": "compact",

  // <canvas>
  "画布宽度": "width",
  "画布高度": "height",

  // <details>
  "打开": "open",

  // <marquee>
  "行为": "behavior",
  "方向": "direction",
  "循环": "loop",
  "速度": "scrollamount",
  "延迟": "scrolldelay",

  // <param>
  "参数名": "name",
  "参数值": "value",

  // <track>
  "默认": "default",
  "字幕语言": "srclang",
  "字幕语言值": "srclang",
  "轨道标签": "label",
};

const attrReverse = {};
for (const zh of Object.keys(ATTR_MAP)) {
  const en = ATTR_MAP[zh];
  if (!attrReverse[en]) attrReverse[en] = zh;
}
export const EN_ATTR_TO_ZH = attrReverse;
