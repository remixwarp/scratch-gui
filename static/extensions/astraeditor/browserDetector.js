// Name: Browser Check
// Description: Detects the browser type running the project, supports multiple browser identification
// By: DVD <https://space.bilibili.com/504603863>

(function(Scratch) {
    'use strict';
    
    Scratch.translate.setup({
      "zh-cn": {
        "_Browser Check": "浏览器检查",
        "_Detects the browser running the project.": "检测运行项目的浏览器。",
        "_If running on [BROWSER]": "如果使用的是 [BROWSER] 运行",
        "_current browser": "当前使用浏览器",
        "_is running on [BROWSER]?": "是否为 [BROWSER] 运行",
        "_Chrome": "Chrome",
        "_Firefox": "Firefox",
        "_Safari": "Safari",
        "_Edge": "Edge",
        "_Opera": "Opera",
        "_Internet Explorer": "Internet Explorer",
        "_Brave": "Brave",
        "_Unknown": "未知"
      },
      "en": {
        "_Browser Check": "Browser Check",
        "_Detects the browser running the project.": "Detects the browser running the project.",
        "_If running on [BROWSER]": "If running on [BROWSER]",
        "_current browser": "current browser",
        "_is running on [BROWSER]?": "is running on [BROWSER]?",
        "_Chrome": "Chrome",
        "_Firefox": "Firefox",
        "_Safari": "Safari",
        "_Edge": "Edge",
        "_Opera": "Opera",
        "_Internet Explorer": "Internet Explorer",
        "_Brave": "Brave",
        "_Unknown": "Unknown"
      },
      "ja": {
        "_Browser Check": "ブラウザチェック",
        "_Detects the browser running the project.": "プロジェクトを実行しているブラウザを検出します。",
        "_If running on [BROWSER]": "[BROWSER]で実行中の場合",
        "_current browser": "現在のブラウザ",
        "_is running on [BROWSER]?": "[BROWSER]で実行中ですか？",
        "_Chrome": "Chrome",
        "_Firefox": "Firefox",
        "_Safari": "Safari",
        "_Edge": "Edge",
        "_Opera": "Opera",
        "_Internet Explorer": "Internet Explorer",
        "_Brave": "Brave",
        "_Unknown": "不明"
      }
    });
    
    class BrowserDetector {
      constructor() {
        this._browser = this._detectBrowser();
      }
      
      _detectBrowser() {
        const ua = navigator.userAgent;
        
        if (ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('OPR')) {
          return 'Chrome';
        } else if (ua.includes('Firefox')) {
          return 'Firefox';
        } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
          return 'Safari';
        } else if (ua.includes('Edg')) {
          return 'Edge';
        } else if (ua.includes('OPR') || ua.includes('Opera')) {
          return 'Opera';
        } else if (ua.includes('Trident') || ua.includes('MSIE')) {
          return 'Internet Explorer';
        } else if (ua.includes('Brave')) {
          return 'Brave';
        } else {
          return 'Unknown';
        }
      }
      
      getInfo() {
        return {
          id: 'browserDetector',
          name: Scratch.translate("Browser Check"),
          // docsURI: "https://extensions.turbowarp.org/",
          description: Scratch.translate("Detects the browser running the project."),
          color1: '#4D97FF',
          color2: '#3D7ECC',
          blocks: [
            {
              opcode: 'ifUsingBrowser',
              blockType: Scratch.BlockType.HAT,
              text: Scratch.translate("If running on [BROWSER]"),
              arguments: {
                BROWSER: {
                  type: Scratch.ArgumentType.STRING,
                  menu: 'browserMenu',
                  defaultValue: 'Chrome'
                }
              }
            },
            {
              opcode: 'currentBrowser',
              blockType: Scratch.BlockType.REPORTER,
              text: Scratch.translate("current browser"),
              disableMonitor: true
            },
            {
              opcode: 'isUsingBrowser',
              blockType: Scratch.BlockType.BOOLEAN,
              text: Scratch.translate("is running on [BROWSER]?"),
              arguments: {
                BROWSER: {
                  type: Scratch.ArgumentType.STRING,
                  menu: 'browserMenu',
                  defaultValue: 'Chrome'
                }
              }
            }
          ],
          menus: {
            browserMenu: {
              acceptReporters: false,
              items: [
                Scratch.translate("Chrome"),
                Scratch.translate("Firefox"),
                Scratch.translate("Safari"),
                Scratch.translate("Edge"),
                Scratch.translate("Opera"),
                Scratch.translate("Internet Explorer"),
                Scratch.translate("Brave"),
                Scratch.translate("Unknown")
              ]
            }
          }
        };
      }
      
      ifUsingBrowser(args) {
        return this._browser === args.BROWSER;
      }
      
      currentBrowser() {
        return this._browser;
      }
      
      isUsingBrowser(args) {
        return this._browser === args.BROWSER;
      }
    }
    
    Scratch.extensions.register(new BrowserDetector());
  })(globalThis.Scratch);
