// HCML <-> HTML 双向转换器（本地映射表版）
// 来源：https://github.com/Fr-main/hcml  src/convert.js；映射表改从 ./hcml-map.js 读取。
// 超级重构的「本地映射表」预览直接使用 hcmlToHtml()，完全在浏览器内转换，不依赖网络。
// —— 原文件说明 ——
//
// HCML（中文 HTML 标记语言）规则：
//  - <文档类型声明> 代表 DOCTYPE
//  - <中文标签名 属性="值"> ... </中文标签名>
//  - 空元素也用 <中文标签名 /> 或 <中文标签名>
//  - 原始内容（script/style/noscript/textarea/template）内部保持原样
//
// 当遇到无法识别的中文标签时，HCML -> HTML 转换会将"中文标签名"
// 以普通文本形式写入，避免破坏 HTML 结构（如用户提示所示）。

import {
  TAG_MAP,
  EN_TO_ZH,
  ATTR_MAP,
  EN_ATTR_TO_ZH,
  VOID_ELEMENTS,
  RAW_ELEMENTS,
} from "./hcml-map.js";

// 匹配一个"完整标签"的正则。
// 允许标签名中包含 Unicode 字符（用于匹配中文/Emoji/其它 Unicode 标识符）。
const TAG_RE = /<(\/?)([\p{L}\p{N}_:-]+)(\s[^<>]*?)?(\/?)>/gu;

// 已知 void 元素（HTML 规范）用于 HTML -> HCML 方向
const HTML_VOIDS = VOID_ELEMENTS;

// 属性匹配：name="value" / name='value' / name（布尔属性）
// 支持中文 / 英文属性名；允许冒号、连字符。
const ATTR_RE = /([\p{L}\p{N}_:.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>]*)))?/gu;

/**
 * 把一个"属性串"（如 ` 类="foo" 源="x.png" 禁用`）里的属性名翻译。
 *
 * @param {string} attrs - 形如 ` class="foo" 源="x.png" 禁用`
 * @param {Record<string, string>} dict - 中文 -> 英文 / 英文 -> 中文 映射表
 * @returns {string} 翻译后的属性串（保留原始空白）
 */
function translateAttrs(attrs, dict) {
  if (!attrs) return "";
  // 只翻译属性名，值与引号不动。
  // 重新构建时，保留原始空白序列（前后空白 + 属性间空白）。
  let out = "";
  let lastEnd = 0;
  ATTR_RE.lastIndex = 0;
  let m;
  while ((m = ATTR_RE.exec(attrs)) !== null) {
    // 跳过属性串里那些像 DOCTYPE 指令的情况：不处理。
    const name = m[1];
    const val = m[2] !== undefined ? `"${m[2]}"`
              : m[3] !== undefined ? `'${m[3]}'`
              : m[4] !== undefined ? m[4]
              : null;

    // 跳过标签起始处可能遗留的 "<" 等；name 应该是纯标识符
    if (!name || /^[\s<>]/.test(name)) continue;

    // 原样输出前面的空白
    out += attrs.slice(lastEnd, m.index);

    const translated = dict[name] || name;
    out += translated;
    if (val !== null) out += `=${val}`;
    lastEnd = m.index + m[0].length;
  }
  out += attrs.slice(lastEnd);
  return out;
}

/**
 * HTML -> HCML：把英文标签全部换成中文别名，同时把英文属性名换成中文。
 * @param {string} html
 * @returns {string}
 */
export function htmlToHcml(html) {
  if (!html || typeof html !== "string") return "";

  let out = html;

  // 1. 把 <!DOCTYPE ...> 转成 <文档类型声明>
  out = out.replace(/<!doctype(\s[^<>]*?)?(\/?)>/gi, (_m) => `<文档类型声明>`);

  // 2. 把注释 <!-- ... --> 保持原样（在 HCML 中也合法）
  const comments = [];
  out = out.replace(/<!--([\s\S]*?)-->/g, (_m, c) => {
    const key = `\u0000CMT${comments.length}\u0000`;
    comments.push(`<!--${c}-->`);
    return key;
  });

  // 3. 替换原始块标签：script/style/noscript/textarea/template
  //    只改外层标签名 + 属性名，内部保留
  out = replaceRawBlocks(out, EN_TO_ZH, EN_ATTR_TO_ZH);

  // 4. 替换普通标签
  out = out.replace(TAG_RE, (m, slash, name, attrs, selfClose) => {
    const lname = name.toLowerCase();

    // DOCTYPE 占位符（如果正则漏过），保留
    if (lname === "!doctype") return m;

    let zh = EN_TO_ZH[lname];
    if (!zh) {
      // 没有中文名 -> 保留英文标签，避免破坏结构
      return m;
    }
    attrs = attrs || "";
    attrs = translateAttrs(attrs, EN_ATTR_TO_ZH);
    return `<${slash ? "/" : ""}${zh}${attrs}${selfClose ? " /" : ""}>`;
  });

  // 5. 还原注释
  out = out.replace(/\u0000CMT(\d+)\u0000/g, (_m, i) => comments[+i]);

  return out;
}

/**
 * HCML -> HTML：把中文标签换成英文 HTML 标签
 * 无法识别的中文标签会以原中文文本（去掉 < >）输出，避免破坏 HTML 结构。
 * @param {string} hcml
 * @returns {string}
 */
export function hcmlToHtml(hcml) {
  if (!hcml || typeof hcml !== "string") return "";

  let src = hcml;

  // 1. 占位处理注释
  const comments = [];
  src = src.replace(/<!--([\s\S]*?)-->/g, (_m, c) => {
    const key = `\u0000CMT${comments.length}\u0000`;
    comments.push(`<!--${c}-->`);
    return key;
  });

  // 2. 占位处理原始块（script/style/noscript）
  //    这些块里可能有字符串包含 <xxx>，不能被错误识别为标签。
  const rawBlocks = [];
  src = replaceRawHCMLBlocks(src, rawBlocks);

  // 3. 替换普通标签
  src = src.replace(TAG_RE, (m, slash, name, attrs, selfClose) => {
    // 特殊：<!DOCTYPE ...> -> <!DOCTYPE html>
    if (name === "文档类型声明" && !slash) {
      return `<!DOCTYPE html>`;
    }
    if (name === "文档类型声明" && slash) {
      // 非法闭合，忽略
      return `<!-- 非法的闭合文档类型声明 -->`;
    }

    const en = TAG_MAP[name];
    attrs = attrs || "";
    if (!en) {
      // 没在中文映射表里，但它可能是用户混进来的"原生英文标签"
      // 归一化后看看是不是一个合法的 HTML 标签名
      const lc = name.toLowerCase();
      if (/^[a-z][a-z0-9-]*$/.test(lc)) {
        // 合法的 HTML 标签格式 —— 直接透传
        // 属性也按 ATTR_MAP 翻译（如果能识别到中文属性名）
        const translatedAttrs = translateAttrs(attrs, ATTR_MAP);
        const joined = translatedAttrs ? " " + translatedAttrs.trim() : "";
        if (VOID_ELEMENTS.has(lc) && !slash) {
          return `<${lc}${joined}>`;
        }
        return `<${slash ? "/" : ""}${lc}${joined}${selfClose && !slash ? " /" : ""}>`;
      }
      // 其它未知：视为未识别中文标签，降级为纯文本，避免破坏结构
      const attrHint = attrs && attrs.trim() ? ` ${attrs.trim()}` : "";
      return `&lt;未识别标签:${name}${attrHint}&gt;`;
    }

    if (en === "comment") {
      // 不支持；退回普通文本
      return `<!-- HCML 中的注释标签 -->`;
    }

    // 翻译属性名
    const translatedAttrs = translateAttrs(attrs, ATTR_MAP);
    const joined = translatedAttrs ? " " + translatedAttrs.trim() : "";

    // void 元素：自动去掉闭合斜杠（HTML5 允许但无必要）
    if (VOID_ELEMENTS.has(en) && !slash) {
      return `<${en}${joined}>`;
    }

    return `<${slash ? "/" : ""}${en}${joined}${selfClose && !slash ? " /" : ""}>`;
  });

  // 4. 还原原始块（内部文本原样；仅外壳标签名 + 属性名被映射）
  src = src.replace(/\u0000RAW(\d+)\u0000/g, (_m, i) => rawBlocks[+i]);

  // 5. 还原注释
  src = src.replace(/\u0000CMT(\d+)\u0000/g, (_m, i) => comments[+i]);

  // 6. 若根是 <超文本标记语言文档> 开头但缺 DOCTYPE，补上一个
  // 6. 若根是根元素标签开头（允许带属性）且缺 DOCTYPE，补上一个
  //    支持 `<超文本标记语言文档>` / `<网页根元素>` 等任意已知根元素写法
  if (/^\s*<(?:超文本标记语言文档|网页根元素|html|HTML)(?=\s|>)/.test(src)) {
    if (!/^\s*<!doctype/i.test(src)) {
      src = "<!DOCTYPE html>\n" + src.replace(/^\s+/, "");
    }
  }

  // 7. 若 <头部> 存在但没有 <meta charset=...>，补上 UTF-8 meta
  if (/<head(\s|>)/i.test(src) && !/<meta\s[^>]*charset=/i.test(src)) {
    src = src.replace(/<head(\s[^<>]*?)?>/i, (m, attrs) => {
      attrs = attrs || "";
      return `<head${attrs}><meta charset="UTF-8">`;
    });
  }

  return src;
}

// ---- 内部工具 ----

// HTML -> HCML：把 <script>...html...</script> 的外壳标签名替换
function replaceRawBlocks(html, zhMap, zhAttrMap) {
  const tags = ["script", "style", "noscript", "textarea"];
  let out = html;
  for (const t of tags) {
    const zh = zhMap[t] || null;
    if (!zh) continue;
    const openRe = new RegExp(`<(${t})(\\s[^<>]*?)?>`, "gi");
    const closeRe = new RegExp(`</(${t})\\s*>`, "gi");
    out = out.replace(openRe, (_m, name, attrs) => {
      attrs = attrs || "";
      attrs = translateAttrs(attrs, zhAttrMap);
      return `<${zh}${attrs}>`;
    });
    out = out.replace(closeRe, `</${zh}>`);
  }
  return out;
}

// HCML -> HTML：先把已知原始元素的整段内容占位（避免内部被误识别为标签）
function replaceRawHCMLBlocks(src, rawBlocks) {
  // 用 TAG_MAP 反向定位可能的 raw 中文名
  const rawZHNames = Object.keys(TAG_MAP).filter(zh => RAW_ELEMENTS.has(TAG_MAP[zh]));

  let out = src;
  for (const zh of rawZHNames) {
    const re = new RegExp(
      `<${zh}(\\s[^<>]*?)?>([\\s\\S]*?)</${zh}\\s*>`,
      "g"
    );
    out = out.replace(re, (_m, attrs, inner) => {
      const en = TAG_MAP[zh];
      const idx = rawBlocks.length;
      const key = `\u0000RAW${idx}\u0000`;
      attrs = attrs || "";
      attrs = translateAttrs(attrs, ATTR_MAP);
      rawBlocks.push(`<${en}${attrs}>${inner}</${en}>`);
      return key;
    });
  }
  return out;
}

// 统一导出映射表，调用方（超级重构窗口）只需 import 本文件即可拿到全部能力
export * from './hcml-map.js';
