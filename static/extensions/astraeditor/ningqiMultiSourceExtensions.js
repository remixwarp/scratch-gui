// Name: Multi-Source Extensions List
// ID: ningqiMultiSourceExtensions
// Description: Fetches extension lists from AstraEditor or ningqiCollectCollection repositories, and allows loading extensions from arbitrary URLs.
// By: ningqi <https://github.com/ningqi24>
// License: CC-BY-4.0


((Scratch) => {
  "use strict";
  Scratch.translate.setup({
    "en": {
      "_Multi-Source Extensions List": "Multi-Source Extensions List",
      "_set source to AstraEditor": "set source to AstraEditor",
      "_set source to Ningqi Collect Collection": "set source to Ningqi Collect Collection",
      "_set source to custom library [URL]": "set source to custom library [URL]",
      "_update extensions list": "update extensions list",
      "_extensions list length": "extensions list length",
      "_extensions list item [INDEX]": "extensions list item [INDEX]",
      "_extensions list": "extensions list",
      "_URL of extension [NAME]": "URL of extension [NAME]",
      "_get extensions as JSON (raw)": "get extensions as JSON (raw)",
      "_load extension from URL [URL]": "load extension from URL [URL]",
      "_current source": "current source",
      "_contribute your extension to ningqiCollect": "contribute your extension to ningqiCollect"
    },
    "zh-cn": {
      "_Multi-Source Extensions List": "多源扩展列表",
      "_set source to AstraEditor": "设置来源为 AstraEditor",
      "_set source to Ningqi Collect Collection": "设置来源为 Ningqi Collect Collection",
      "_set source to custom library [URL]": "设置来源为自定义库 [URL]",
      "_update extensions list": "更新扩展列表",
      "_extensions list length": "扩展列表长度",
      "_extensions list item [INDEX]": "扩展列表第 [INDEX] 项",
      "_extensions list": "扩展列表",
      "_URL of extension [NAME]": "扩展 [NAME] 的 URL",
      "_get extensions as JSON (raw)": "以 JSON 获取扩展（原始）",
      "_load extension from URL [URL]": "从 URL [URL] 载入扩展",
      "_current source": "当前来源",
      "_contribute your extension to ningqiCollect": "投稿你的扩展到 ningqiCollect"
    },
    "zh-tw": {
      "_Multi-Source Extensions List": "多源擴展列表",
      "_set source to AstraEditor": "設定來源為 AstraEditor",
      "_set source to Ningqi Collect Collection": "設定來源為 Ningqi Collect Collection",
      "_set source to custom library [URL]": "設定來源為自定義庫 [URL]",
      "_update extensions list": "更新擴展列表",
      "_extensions list length": "擴展列表長度",
      "_extensions list item [INDEX]": "擴展列表第 [INDEX] 項",
      "_extensions list": "擴展列表",
      "_URL of extension [NAME]": "擴展 [NAME] 的 URL",
      "_get extensions as JSON (raw)": "以 JSON 獲取擴展（原始）",
      "_load extension from URL [URL]": "從 URL [URL] 載入擴展",
      "_current source": "當前來源",
      "_contribute your extension to ningqiCollect": "投稿你的擴展到 ningqiCollect"
    }
  });

  class MultiSourceExtensionsList {
    constructor() {
      this._files = [];
      this._source = "AstraEditor"; // 默认来源
      this._customUrl = "";
    }

    getInfo() {
      return {
        id: "ningqiMultiSourceExtensions",
        name: Scratch.translate("Multi-Source Extensions List"),
        menuIconURI: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcKICAgdmVyc2lvbj0iMS4xIgogICB3aWR0aD0iMzgiCiAgIGhlaWdodD0iMzcuOTk5OTg1IgogICB2aWV3Qm94PSIwIDAgMzcuOTk5OTk5IDM3Ljk5OTk4NSIKICAgaWQ9InN2ZzkiCiAgIHNvZGlwb2RpOmRvY25hbWU9Im5pbmdxaUxvZ29QaWN0dXJlTmV4dC5zdmciCiAgIHhtbDpzcGFjZT0icHJlc2VydmUiCiAgIGlua3NjYXBlOnZlcnNpb249IjEuNC4yIChmNDMyN2Y0LCAyMDI1LTA1LTEzKSIKICAgeG1sbnM6aW5rc2NhcGU9Imh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGUiCiAgIHhtbG5zOnNvZGlwb2RpPSJodHRwOi8vc29kaXBvZGkuc291cmNlZm9yZ2UubmV0L0RURC9zb2RpcG9kaS0wLmR0ZCIKICAgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHNvZGlwb2RpOm5hbWVkdmlldwogICAgIGlkPSJuYW1lZHZpZXc5IgogICAgIHBhZ2Vjb2xvcj0iIzUwNTA1MCIKICAgICBib3JkZXJjb2xvcj0iI2ZmZmZmZiIKICAgICBib3JkZXJvcGFjaXR5PSIxIgogICAgIGlua3NjYXBlOnNob3dwYWdlc2hhZG93PSIwIgogICAgIGlua3NjYXBlOnBhZ2VvcGFjaXR5PSIwIgogICAgIGlua3NjYXBlOnBhZ2VjaGVja2VyYm9hcmQ9IjEiCiAgICAgaW5rc2NhcGU6ZGVza2NvbG9yPSIjNTA1MDUwIgogICAgIGlua3NjYXBlOnpvb209IjAuNzgzNzQ3NzEiCiAgICAgaW5rc2NhcGU6Y3g9IjU1Ny41NzczOCIKICAgICBpbmtzY2FwZTpjeT0iMjgxLjM0MDUzIgogICAgIGlua3NjYXBlOndpbmRvdy13aWR0aD0iMTM2NiIKICAgICBpbmtzY2FwZTp3aW5kb3ctaGVpZ2h0PSI3MDUiCiAgICAgaW5rc2NhcGU6d2luZG93LXg9Ii04IgogICAgIGlua3NjYXBlOndpbmRvdy15PSItOCIKICAgICBpbmtzY2FwZTp3aW5kb3ctbWF4aW1pemVkPSIxIgogICAgIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9InN2ZzkiPjxpbmtzY2FwZTpwYWdlCiAgICAgICB4PSIwIgogICAgICAgeT0iMCIKICAgICAgIHdpZHRoPSIzOCIKICAgICAgIGhlaWdodD0iMzcuOTk5OTg1IgogICAgICAgaWQ9InBhZ2UyIgogICAgICAgbWFyZ2luPSIwIgogICAgICAgYmxlZWQ9IjAiIC8+PC9zb2RpcG9kaTpuYW1lZHZpZXc+PGRlZnMKICAgICBpZD0iZGVmczIiPjxsaW5lYXJHcmFkaWVudAogICAgICAgaWQ9ImxpbmVhckdyYWRpZW50MSIKICAgICAgIGlua3NjYXBlOmNvbGxlY3Q9ImFsd2F5cyI+PHN0b3AKICAgICAgICAgc3R5bGU9InN0b3AtY29sb3I6IzE4OTlmMDtzdG9wLW9wYWNpdHk6MC45NDkwMTk2MTsiCiAgICAgICAgIG9mZnNldD0iMCIKICAgICAgICAgaWQ9InN0b3AzIiAvPjxzdG9wCiAgICAgICAgIHN0eWxlPSJzdG9wLWNvbG9yOiMxN2FhZWY7c3RvcC1vcGFjaXR5OjAuOTQ5MDE5NjE7IgogICAgICAgICBvZmZzZXQ9IjEiCiAgICAgICAgIGlkPSJzdG9wNCIgLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudAogICAgICAgaW5rc2NhcGU6Y29sbGVjdD0iYWx3YXlzIgogICAgICAgeGxpbms6aHJlZj0iI2xpbmVhckdyYWRpZW50MSIKICAgICAgIGlkPSJsaW5lYXJHcmFkaWVudDQiCiAgICAgICB4MT0iNDA4LjI4NDE1IgogICAgICAgeTE9IjQxMi4yMDg1OSIKICAgICAgIHgyPSI1MzkuOTkyNjgiCiAgICAgICB5Mj0iNDEyLjIwODU5IgogICAgICAgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiCiAgICAgICBncmFkaWVudFRyYW5zZm9ybT0ibWF0cml4KDAuMTE0Nzc0MTMsMCwwLDAuMTE0Nzc0MTMsLTM2LjE2NDI0NCwtMjUuNDExMTM5KSIgLz48L2RlZnM+PGcKICAgICB0cmFuc2Zvcm09Im1hdHJpeCgwLjEwNDY3OCwwLDAsMC4xMDQ2ODQxNiwtODUuNjc4MDEyLC0xNy42Mzk0NzUpIgogICAgIGlkPSJnOSI+PGcKICAgICAgIHN0cm9rZT0ibm9uZSIKICAgICAgIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIKICAgICAgIGlkPSJnOCI+PGcKICAgICAgICAgZmlsbC1vcGFjaXR5PSIwLjM4MDM5IgogICAgICAgICBmaWxsPSIjNzVjOGZmIgogICAgICAgICBmaWxsLXJ1bGU9ImV2ZW5vZGQiCiAgICAgICAgIHN0cm9rZS13aWR0aD0iMSIKICAgICAgICAgaWQ9Imc0IiAvPjxwYXRoCiAgICAgICAgIGQ9Im0gMTE4MS41MDksMzUwIGMgMCwxMjAuOTk0NzMgLTYwLjUwMywxODEuNDk4MzIgLTE4MS41MDksMTgxLjQ5ODMyIC0xMjEuMDA2LDAgLTE4MS41MDksLTYwLjUxMzY4IC0xODEuNTA5LC0xODEuNDk4MzIgMCwtMTIwLjk4NDY1IDYwLjUwMywtMTgxLjQ5ODMyIDE4MS41MDksLTE4MS40OTgzMiAxMjAuOTk1MywwIDE4MS41MDksNjAuNTAzIDE4MS41MDksMTgxLjQ5ODMyIHoiCiAgICAgICAgIGZpbGwtb3BhY2l0eT0iMC44NTA5OCIKICAgICAgICAgZmlsbD0iI2ZmZmZmZiIKICAgICAgICAgZmlsbC1ydWxlPSJub256ZXJvIgogICAgICAgICBzdHJva2Utd2lkdGg9IjEiCiAgICAgICAgIGlkPSJwYXRoNSIKICAgICAgICAgc29kaXBvZGk6bm9kZXR5cGVzPSJzc3NzcyIgLz48ZwogICAgICAgICBmaWxsLW9wYWNpdHk9IjAuMzgwMzkiCiAgICAgICAgIGZpbGw9IiM3NWM4ZmYiCiAgICAgICAgIGZpbGwtcnVsZT0iZXZlbm9kZCIKICAgICAgICAgc3Ryb2tlLXdpZHRoPSIxIgogICAgICAgICBpZD0iZzciIC8+PC9nPjwvZz48dGV4dAogICAgIHhtbDpzcGFjZT0icHJlc2VydmUiCiAgICAgc3R5bGU9ImZvbnQtc3R5bGU6bm9ybWFsO2ZvbnQtdmFyaWFudDpub3JtYWw7Zm9udC13ZWlnaHQ6bm9ybWFsO2ZvbnQtc3RyZXRjaDpub3JtYWw7Zm9udC1zaXplOjI2LjUwNjFweDtmb250LWZhbWlseTpNaVNhbnM7LWlua3NjYXBlLWZvbnQtc3BlY2lmaWNhdGlvbjonTWlTYW5zLCBOb3JtYWwnO2ZvbnQtdmFyaWFudC1saWdhdHVyZXM6bm9ybWFsO2ZvbnQtdmFyaWFudC1jYXBzOm5vcm1hbDtmb250LXZhcmlhbnQtbnVtZXJpYzpub3JtYWw7Zm9udC12YXJpYW50LWVhc3QtYXNpYW46bm9ybWFsO3RleHQtYWxpZ246c3RhcnQ7d3JpdGluZy1tb2RlOmxyLXRiO2RpcmVjdGlvbjpsdHI7dGV4dC1hbmNob3I6c3RhcnQ7b3BhY2l0eTowLjkwNTQ1NTtmaWxsOnVybCgjbGluZWFyR3JhZGllbnQ0KTtzdHJva2U6I2ZmZmZmZjtzdHJva2Utd2lkdGg6MDtzdHJva2Utb3BhY2l0eTowLjk1IgogICAgIHg9IjkuMzg5MDYxOSIKICAgICB5PSIyOS42NDU3NzkiCiAgICAgaWQ9InRleHQxIgogICAgIHRyYW5zZm9ybT0ic2NhbGUoMC45OTk5NzA2LDEuMDAwMDI5NCkiPjx0c3BhbgogICAgICAgc29kaXBvZGk6cm9sZT0ibGluZSIKICAgICAgIGlkPSJ0c3BhbjYiCiAgICAgICBzdHlsZT0iZmlsbDp1cmwoI2xpbmVhckdyYWRpZW50NCk7c3Ryb2tlLXdpZHRoOjAiCiAgICAgICB4PSI5LjM4OTA2MTkiCiAgICAgICB5PSIyOS42NDU3NzkiPnt9PC90c3Bhbj48L3RleHQ+PC9zdmc+CjwhLS1yb3RhdGlvbkNlbnRlcjo1NTguMjQ2Njg1MDAwMDAwMToyNzguNjcxODgtLT4KCg==',
                color1: '#0099ff94',
                color2: '#42A5F5',
                color3: '#3e82ff94',
        blocks: [
          {
            opcode: "setSourceAstra",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("set source to AstraEditor"),
          },
          {
            opcode: "setSourceNingqi",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("set source to Ningqi Collect Collection"),
          },
          {
            opcode: "setSourceCustom",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate("set source to custom library [URL]"),
            arguments: {
              URL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "https://api.github.com/repos/user/repo/contents/folder",
              },
            },
          },
          {
            opcode: "getCurrentSource",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate('current source'),
          },
          "---",
          {
            opcode: "updateList",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate('update extensions list'),
          },
          {
            opcode: "listLength",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate('extensions list length'),
          },
          {
            opcode: "listItem",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate('extensions list item [INDEX]'),
            arguments: {
              INDEX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 1,
              },
            },
          },
          {
            opcode: "getExtensionsList",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate('extensions list'),
            disableMonitor: true,
          },
          "---",
          {
            opcode: "extensionUrl",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate('URL of extension [NAME]'),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "example.js",
              },
            },
          },
          "---",
          {
            opcode: "fetchExtensionsAsJSON",
            blockType: Scratch.BlockType.REPORTER,
            text: Scratch.translate('get extensions as JSON (raw)'),
            disableMonitor: true,
          },
          "---",
          {
            opcode: "loadFromURL",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate('load extension from URL [URL]'),
            arguments: {
              URL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "https://example.com/extension.js",
              },
            },
          },
          "---",
          {
            opcode: "contributeToNingqiCollect",
            blockType: Scratch.BlockType.COMMAND,
            text: Scratch.translate('contribute your extension to ningqiCollect'),
          },
        ],
      };
    }

    // 设置来源为 AstraEditor
    setSourceAstra() {
      this._source = "AstraEditor";
    }

    // 设置来源为 Ningqi Collect Collection
    setSourceNingqi() {
      this._source = "NingqiCollectCollection";
    }

    // 设置来源为自定义库
    setSourceCustom(args) {
      this._source = "custom";
      this._customUrl = args.URL;
    }

    // 获取当前来源
    getCurrentSource() {
      if (this._source === "custom") {
        return "Custom: " + this._customUrl;
      }
      return this._source;
    }

    // 更新列表（根据当前来源）
    updateList() {
      if (this._source === "AstraEditor") {
        return this._updateAstraEditor();
      } else if (this._source === "NingqiCollectCollection") {
        return this._updateNingqiCollectCollection();
      } else if (this._source === "custom") {
        return this._updateCustom();
      } else {
        console.error("Unknown source:", this._source);
        this._files = [];
        return Promise.resolve();
      }
    }

    // AstraEditor 获取逻辑
    _updateAstraEditor() {
      const url = "https://api.allorigins.win/raw?url=https://api.github.com/repos/AstraEditor/extensions/contents/extensions";
      return Scratch.fetch(url)
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(data => {
          if (!Array.isArray(data)) throw new Error("Invalid response");
          this._files = data
            .filter(item => item.type === "file")
            .map(item => ({
              name: item.name,
              url: item.download_url || ""
            }));
        })
        .catch(err => {
          console.error("AstraEditor update failed:", err);
          this._files = [];
        });
    }

    // Ningqi Collect Collection 获取逻辑（使用提供的代理URL）
    _updateNingqiCollectCollection() {
      const url = "https://api.allorigins.win/raw?url=https://api.github.com/repos/ningqi24/TurbowarpExtension/contents/.js?ref=main";
      return Scratch.fetch(url)
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(data => {
          if (!Array.isArray(data)) throw new Error("Invalid response");
          this._files = data
            .filter(item => item.type === "file")
            .map(item => ({
              name: item.name,
              url: item.download_url || ""
            }));
        })
        .catch(err => {
          console.error("Ningqi update failed:", err);
          this._files = [];
        });
    }

    // 自定义库获取逻辑
    _updateCustom() {
      const url = "https://api.allorigins.win/raw?url=" + encodeURIComponent(this._customUrl);
      return Scratch.fetch(url)
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
        .then(data => {
          if (!Array.isArray(data)) throw new Error("Invalid response");
          this._files = data
            .filter(item => item.type === "file")
            .map(item => ({
              name: item.name,
              url: item.download_url || ""
            }));
        })
        .catch(err => {
          console.error("Custom update failed:", err);
          this._files = [];
        });
    }

    listLength() {
      return this._files.length;
    }

    listItem(args) {
      const index = Number(args.INDEX) - 1;
      return (index >= 0 && index < this._files.length) ? this._files[index].name : "";
    }

    getExtensionsList() {
      return this._files.map(file => file.name).join('\n');
    }

    extensionUrl(args) {
      const name = String(args.NAME);
      const found = this._files.find(f => f.name === name);
      return found ? found.url : "";
    }

    fetchExtensionsAsJSON() {
      let url;
      if (this._source === "AstraEditor") {
        url = "https://api.allorigins.win/raw?url=https://api.github.com/repos/AstraEditor/extensions/contents/extensions";
      } else if (this._source === "NingqiCollectCollection") {
        url = "https://api.allorigins.win/raw?url=https://api.github.com/repos/ningqi24/TurbowarpExtension/contents/.js?ref=main";
      } else if (this._source === "custom") {
        url = "https://api.allorigins.win/raw?url=" + encodeURIComponent(this._customUrl);
      } else {
        return Promise.resolve(JSON.stringify({ error: "Unknown source" }));
      }
      return Scratch.fetch(url)
        .then(r => r.text())
        .catch(e => JSON.stringify({ error: e.message }));
    }

    // 从指定 URL 加载扩展
    loadFromURL(args) {
      const url = args.URL;
      if (!Scratch.vm) {
        console.error("Scratch.vm not available");
        return Promise.reject("Scratch.vm not available");
      }
      if (!Scratch.vm.extensionManager) {
        console.error("extensionManager not available");
        return Promise.reject("extensionManager not available");
      }
      return Scratch.vm.extensionManager.loadExtensionURL(url).catch(err => {
        console.error("Failed to load extension:", err);
        return Promise.reject(err);
      });
    }

    // 投稿到 ningqiCollect
    contributeToNingqiCollect() {
      window.open("https://github.com/ningqi24/TurbowarpExtension", "_blank");
    }
  }

  Scratch.extensions.register(new MultiSourceExtensionsList());
})(Scratch);