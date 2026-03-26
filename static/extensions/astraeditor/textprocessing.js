// Name: TextProcessing
// ID: textprocessing
// Description: Provides a rich set of text processing blocks for advanced text manipulation scenarios: case conversion, search & replace, regex, split/join, statistics, text cleaning, and more.
// By: fhy-action <https://github.com/fhy-action>
// License: CC BY-NC-SA 4.0

(function(Scratch) {
  "use strict";

  class TextProcessing {
    constructor() {
      this.extName = "文本处理";
    }

    static getVisualWidth(str) {
      let width = 0;
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if ((code >= 0x4E00 && code <= 0x9FFF) ||
            (code >= 0xFF00 && code <= 0xFFEF) ||
            (code >= 0x3000 && code <= 0x303F) ||
            (code >= 0x3040 && code <= 0x309F) ||
            (code >= 0x30A0 && code <= 0x30FF) ||
            (code >= 0x3130 && code <= 0x318F) ||
            (code >= 0xAC00 && code <= 0xD7AF)) {
          width += 2;
        } else {
          width += 1;
        }
      }
      return width;
    }

    getInfo() {
      return {
        id: "textprocessing",
        name: "文本处理",
        color1: "#426CD2",
        color2: "#2A4B99",
        color3: "#8AA9E6",
        blocks: [
          {
            opcode: "substring",
            blockType: Scratch.BlockType.REPORTER,
            text: "取 [TEXT] 的第 [START] 到 [END] 个字符",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "TurboWarp" },
              START: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              END: { type: Scratch.ArgumentType.NUMBER, defaultValue: 5 }
            }
          },
          {
            opcode: "trim",
            blockType: Scratch.BlockType.REPORTER,
            text: "去除 [TEXT] 两端的空格",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "  Scratch  " }
            }
          },
          {
            opcode: "reverse",
            blockType: Scratch.BlockType.REPORTER,
            text: "反转 [TEXT]",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "stressed" }
            }
          },
          {
            opcode: "uppercase",
            blockType: Scratch.BlockType.REPORTER,
            text: "转为大写 [TEXT]",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "TurboWarp" }
            }
          },
          {
            opcode: "lowercase",
            blockType: Scratch.BlockType.REPORTER,
            text: "转为小写 [TEXT]",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "TurboWarp" }
            }
          },
          {
            opcode: "indexOf",
            blockType: Scratch.BlockType.REPORTER,
            text: "[TEXT] 中第一次出现 [SUB] 的位置",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "TurboWarp" },
              SUB: { type: Scratch.ArgumentType.STRING, defaultValue: "bo" }
            }
          },
          {
            opcode: "replace",
            blockType: Scratch.BlockType.REPORTER,
            text: "把 [TEXT] 中的第一个 [OLD] 替换为 [NEW]",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "apple apple" },
              OLD: { type: Scratch.ArgumentType.STRING, defaultValue: "apple" },
              NEW: { type: Scratch.ArgumentType.STRING, defaultValue: "orange" }
            }
          },
          {
            opcode: "replaceAll",
            blockType: Scratch.BlockType.REPORTER,
            text: "把 [TEXT] 中所有的 [OLD] 替换为 [NEW]",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "apple apple" },
              OLD: { type: Scratch.ArgumentType.STRING, defaultValue: "apple" },
              NEW: { type: Scratch.ArgumentType.STRING, defaultValue: "orange" }
            }
          },
          {
            opcode: "split",
            blockType: Scratch.BlockType.REPORTER,
            text: "用 [DELIMITER] 分割 [TEXT] 得到列表",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "a,b,c" },
              DELIMITER: { type: Scratch.ArgumentType.STRING, defaultValue: "," }
            }
          },
          {
            opcode: "join",
            blockType: Scratch.BlockType.REPORTER,
            text: "用 [DELIMITER] 连接列表 [LIST]",
            arguments: {
              LIST: { type: Scratch.ArgumentType.STRING, defaultValue: '["a","b","c"]' },
              DELIMITER: { type: Scratch.ArgumentType.STRING, defaultValue: "," }
            }
          },
          {
            opcode: "regexMatch",
            blockType: Scratch.BlockType.BOOLEAN,
            text: "[TEXT] 匹配正则 [REGEX] ?",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "abc123" },
              REGEX: { type: Scratch.ArgumentType.STRING, defaultValue: "^[a-z]+\\d+$" }
            }
          },
          {
            opcode: "regexExtract",
            blockType: Scratch.BlockType.REPORTER,
            text: "提取 [TEXT] 中正则 [REGEX] 的第一个匹配",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "我的电话是 666-6666-6666" },
              REGEX: { type: Scratch.ArgumentType.STRING, defaultValue: "\\d{3}-\\d{4}-\\d{4}" }
            }
          },
          {
            opcode: "countOccurrences",
            blockType: Scratch.BlockType.REPORTER,
            text: "统计 [TEXT] 中 [SUB] 出现的次数",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "repreprep" },
              SUB: { type: Scratch.ArgumentType.STRING, defaultValue: "rep" }
            }
          },
          {
            opcode: "caesarCipher",
            blockType: Scratch.BlockType.REPORTER,
            text: "凯撒加密 [TEXT] 偏移 [SHIFT]",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "Hello, World!" },
              SHIFT: { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 }
            }
          },
          {
            opcode: "levenshteinDistance",
            blockType: Scratch.BlockType.REPORTER,
            text: "编辑距离 [A] 和 [B]",
            arguments: {
              A: { type: Scratch.ArgumentType.STRING, defaultValue: "kitten" },
              B: { type: Scratch.ArgumentType.STRING, defaultValue: "sitting" }
            }
          },
          {
            opcode: "padString",
            blockType: Scratch.BlockType.REPORTER,
            text: "填充 [TEXT] 到长度 [LENGTH] 对齐 [ALIGN] 字符 [PAD]",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "Turbo" },
              LENGTH: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 },
              ALIGN: { type: Scratch.ArgumentType.STRING, menu: "alignMenu", defaultValue: "left" },
              PAD: { type: Scratch.ArgumentType.STRING, defaultValue: "*" }
            }
          },
          {
            opcode: "alternatingCase",
            blockType: Scratch.BlockType.REPORTER,
            text: "交替大小写 [TEXT] 起始 [START_LOWER]",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "hello world" },
              START_LOWER: { type: Scratch.ArgumentType.STRING, menu: "boolMenu", defaultValue: "true" }
            }
          },
          {
            opcode: "invertCase",
            blockType: Scratch.BlockType.REPORTER,
            text: "反转大小写 [TEXT]",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "Hello World" }
            }
          },
          {
            opcode: "randomCase",
            blockType: Scratch.BlockType.REPORTER,
            text: "随机大小写 [TEXT] 概率 [PROBABILITY] %",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "random text" },
              PROBABILITY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 }
            }
          },
          {
            opcode: "spongeCase",
            blockType: Scratch.BlockType.REPORTER,
            text: "SpOnGeCaSe [TEXT]",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "mocking text" }
            }
          },
          {
            opcode: "countSyllables",
            blockType: Scratch.BlockType.REPORTER,
            text: "估算音节数 [TEXT]",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "hello world" }
            }
          },
          {
            opcode: "fleschReadingEase",
            blockType: Scratch.BlockType.REPORTER,
            text: "弗莱士可读性指数(仅限句子) [TEXT]",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "This is a simple sentence." }
            }
          },
          {
            opcode: "uniqueWords",
            blockType: Scratch.BlockType.REPORTER,
            text: "不重复单词数 [TEXT]",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "apple banana apple cherry" }
            }
          },
          {
            opcode: "removeExtraSpaces",
            blockType: Scratch.BlockType.REPORTER,
            text: "移除多余空格 [TEXT]",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "This   has   many   spaces" }
            }
          },
          {
            opcode: "removePunctuation",
            blockType: Scratch.BlockType.REPORTER,
            text: "移除标点符号 [TEXT] 保留空格 [KEEP_SPACES]",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "Hello, world! How are you?" },
              KEEP_SPACES: { type: Scratch.ArgumentType.STRING, menu: "boolMenu", defaultValue: "true" }
            }
          },
          {
            opcode: "stripHtmlTags",
            blockType: Scratch.BlockType.REPORTER,
            text: "移除HTML标签 [TEXT]",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "<p>Hello <b>world</b></p>" }
            }
          },
          {
            opcode: "markdownEmphasis",
            blockType: Scratch.BlockType.REPORTER,
            text: "伪Markdown [TEXT] 类型 [TYPE]",
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: "important" },
              TYPE: { type: Scratch.ArgumentType.STRING, menu: "mdMenu", defaultValue: "bold" }
            }
          }
        ],
        menus: {
          alignMenu: {
            acceptReporters: false,
            items: [
              { text: "左对齐", value: "left" },
              { text: "右对齐", value: "right" },
              { text: "居中", value: "center" }
            ]
          },
          boolMenu: {
            acceptReporters: false,
            items: [
              { text: "是", value: "true" },
              { text: "否", value: "false" }
            ]
          },
          mdMenu: {
            acceptReporters: false,
            items: [
              { text: "加粗", value: "bold" },
              { text: "斜体", value: "italic" },
              { text: "加粗斜体", value: "boldItalic" },
              { text: "行内代码", value: "code" }
            ]
          }
        }
      };
    }

    substring(args) {
      const text = String(args.TEXT);
      const start = Number(args.START) - 1;
      const end = Number(args.END);
      if (start < 0) return "";
      return text.substring(start, end);
    }
    trim(args) { return String(args.TEXT).trim(); }
    reverse(args) { return String(args.TEXT).split("").reverse().join(""); }
    uppercase(args) { return String(args.TEXT).toUpperCase(); }
    lowercase(args) { return String(args.TEXT).toLowerCase(); }
    indexOf(args) {
      const pos = String(args.TEXT).indexOf(String(args.SUB));
      return pos + 1;
    }
    replace(args) {
      return String(args.TEXT).replace(String(args.OLD), String(args.NEW));
    }
    replaceAll(args) {
      return String(args.TEXT).replaceAll(String(args.OLD), String(args.NEW));
    }
    split(args) {
      const text = String(args.TEXT);
      const delimiter = String(args.DELIMITER);
      if (delimiter === "") return JSON.stringify(text.split(""));
      return JSON.stringify(text.split(delimiter));
    }
    join(args) {
      let list = args.LIST;
      let arr = [];
      try {
        arr = JSON.parse(list);
        if (!Array.isArray(arr)) arr = [list];
      } catch {
        arr = String(list).split(",").map(s => s.trim());
      }
      return arr.join(String(args.DELIMITER));
    }
    regexMatch(args) {
      try {
        const regex = new RegExp(String(args.REGEX));
        return regex.test(String(args.TEXT));
      } catch {
        return false;
      }
    }
    regexExtract(args) {
      try {
        const regex = new RegExp(String(args.REGEX));
        const match = String(args.TEXT).match(regex);
        return match ? match[0] : "";
      } catch {
        return "";
      }
    }
    countOccurrences(args) {
      const text = String(args.TEXT);
      const sub = String(args.SUB);
      if (sub === "") return 0;
      let count = 0;
      let pos = 0;
      while (true) {
        const found = text.indexOf(sub, pos);
        if (found === -1) break;
        count++;
        pos = found + sub.length;
      }
      return count;
    }
    caesarCipher(args) {
      const text = String(args.TEXT);
      let shift = Number(args.SHIFT);
      shift = ((shift % 26) + 26) % 26;
      return text.replace(/[A-Za-z]/g, (c) => {
        const base = c < 'a' ? 65 : 97;
        return String.fromCharCode(((c.charCodeAt(0) - base + shift) % 26) + base);
      });
    }
    levenshteinDistance(args) {
      const a = String(args.A);
      const b = String(args.B);
      const m = a.length;
      const n = b.length;
      const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (a[i - 1] === b[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1];
          } else {
            dp[i][j] = Math.min(
              dp[i - 1][j] + 1,
              dp[i][j - 1] + 1,
              dp[i - 1][j - 1] + 1
            );
          }
        }
      }
      return dp[m][n];
    }
    padString(args) {
      let text = String(args.TEXT);
      const targetLen = Number(args.LENGTH);
      const align = String(args.ALIGN);
      const padChar = String(args.PAD);
      if (targetLen <= text.length) return text;
      if (padChar.length === 0) return text;
      const padStr = padChar.repeat(targetLen);
      if (align === "left") {
        return (text + padStr).slice(0, targetLen);
      } else if (align === "right") {
        return (padStr + text).slice(-targetLen);
      } else {
        const totalPad = targetLen - text.length;
        const leftPad = Math.floor(totalPad / 2);
        const rightPad = totalPad - leftPad;
        return padStr.slice(0, leftPad) + text + padStr.slice(0, rightPad);
      }
    }
    alternatingCase(args) {
      const text = String(args.TEXT);
      const startLower = args.START_LOWER === "true";
      let result = "";
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char.match(/[A-Za-z]/)) {
          if ((i % 2 === 0) === startLower) {
            result += char.toLowerCase();
          } else {
            result += char.toUpperCase();
          }
        } else {
          result += char;
        }
      }
      return result;
    }
    invertCase(args) {
      const text = String(args.TEXT);
      return text.replace(/[A-Za-z]/g, (c) => {
        return c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase();
      });
    }
    randomCase(args) {
      const text = String(args.TEXT);
      let prob = Number(args.PROBABILITY);
      prob = Math.max(0, Math.min(100, prob)) / 100;
      return text.replace(/[A-Za-z]/g, (c) => {
        return Math.random() < prob ? c.toUpperCase() : c.toLowerCase();
      });
    }
    spongeCase(args) {
      const text = String(args.TEXT);
      let result = "";
      let lower = true;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char.match(/[A-Za-z]/)) {
          result += lower ? char.toLowerCase() : char.toUpperCase();
          lower = !lower;
        } else {
          result += char;
        }
      }
      return result;
    }
    countSyllables(args) {
      const text = String(args.TEXT).toLowerCase();
      const words = text.split(/[^a-z]+/).filter(w => w.length > 0);
      if (words.length === 0) return 0;
      let total = 0;
      for (const word of words) {
        let count = word.match(/[aeiouy]+/g)?.length || 1;
        if (word.endsWith('e') && !word.endsWith('le') && count > 1) count--;
        total += Math.max(1, count);
      }
      return total;
    }
    fleschReadingEase(args) {
      const text = String(args.TEXT);
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1;
      const words = text.split(/[^a-z]+/i).filter(w => w.length > 0).length || 1;
      const syllables = this.countSyllables({ TEXT: text }) || 1;
      const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
      return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
    }
    uniqueWords(args) {
      const text = String(args.TEXT).toLowerCase();
      const words = text.split(/[^a-z]+/i).filter(w => w.length > 0);
      const unique = new Set(words);
      return unique.size;
    }
    removeExtraSpaces(args) {
      return String(args.TEXT).replace(/\s+/g, ' ').trim();
    }
    removePunctuation(args) {
      const text = String(args.TEXT);
      const keepSpaces = args.KEEP_SPACES === "true";
      if (keepSpaces) {
        return text.replace(/[^\w\s]/g, '');
      } else {
        return text.replace(/[^\w]/g, '');
      }
    }
    stripHtmlTags(args) {
      return String(args.TEXT).replace(/<[^>]*>/g, '');
    }
    markdownEmphasis(args) {
      const text = String(args.TEXT);
      const type = String(args.TYPE);
      switch(type) {
        case 'bold': return `**${text}**`;
        case 'italic': return `*${text}*`;
        case 'boldItalic': return `***${text}***`;
        case 'code': return `\`${text}\``;
        default: return text;
      }
    }
  }

  Scratch.extensions.register(new TextProcessing());
})(Scratch);