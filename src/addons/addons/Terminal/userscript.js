export default async function ({ addon, console }) {
  // 等待 DOM 加载完成
  await addon.tab.waitForElement("body", { markAsSeen: true });

  // 存储弹窗引用
  let terminalWindow = null;

  // 打开终端弹窗
  const openTerminalWindow = () => {
    if (terminalWindow && !terminalWindow.closed) {
      terminalWindow.focus();
      return;
    }

    // 创建弹窗窗口
    const width = 800;
    const height = 500;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    terminalWindow = window.open(
      "",
      "scratch_terminal",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    if (!terminalWindow) {
      alert("无法打开终端窗口。请允许弹出窗口。");
      return;
    }

    // 设置弹窗内容
    terminalWindow.document.title = "Scratch Terminal";
    terminalWindow.document.body.style.margin = "0";
    terminalWindow.document.body.style.padding = "0";
    terminalWindow.document.body.style.background = "#1e1e1e";
    terminalWindow.document.body.style.overflow = "hidden";

    // 创建终端容器
    const terminalContainer = terminalWindow.document.createElement("div");
    terminalContainer.style.cssText = "width: 100%; height: 100%; padding: 10px; box-sizing: border-box;";
    terminalWindow.document.body.appendChild(terminalContainer);

    // 加载 xterm.js 库
    const loadLibraries = async () => {
      return Promise.all([
        new Promise((resolve, reject) => {
          const script = terminalWindow.document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js";
          script.onload = resolve;
          script.onerror = reject;
          terminalWindow.document.head.appendChild(script);
        }),
        new Promise((resolve, reject) => {
          const link = terminalWindow.document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css";
          link.onload = resolve;
          link.onerror = reject;
          terminalWindow.document.head.appendChild(link);
        })
      ]);
    };

    // 初始化终端
    const initTerminal = async () => {
      await loadLibraries();

      const Terminal = terminalWindow.Terminal;
      const term = new Terminal({
        theme: {
          background: "#1e1e1e",
          foreground: "#d4d4d4",
          cursor: "#4d97ff",
          cursorAccent: "#1e1e1e",
          selection: "rgba(77, 151, 255, 0.3)",
          black: "#1e1e1e",
          red: "#cd3131",
          green: "#0dbc79",
          yellow: "#e5e510",
          blue: "#2472c8",
          magenta: "#bc3fbc",
          cyan: "#11a8cd",
          white: "#e5e5e5",
          brightBlack: "#666666",
          brightRed: "#f14c4c",
          brightGreen: "#23d18b",
          brightYellow: "#f5f543",
          brightBlue: "#3b8eea",
          brightMagenta: "#d670d6",
          brightCyan: "#29b8db",
          brightWhite: "#ffffff"
        },
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: 14,
        lineHeight: 1.2,
        cursorBlink: true,
        cursorStyle: "block"
      });

      term.open(terminalContainer);

      // 欢迎消息
      term.writeln("\x1b[1;34m=== Scratch Terminal ===\x1b[0m");
      term.writeln("\x1b[32mTerminal ready.\x1b[0m");
      term.writeln("Type commands and press Enter to execute.");
      term.writeln("");

      // 监听终端输入
      let currentLine = "";
      term.write("\x1b[32m$\x1b[0m ");

      term.onData((data) => {
        switch (data) {
          case "\r": // Enter
            term.writeln("");
            if (currentLine.trim()) {
              const args = currentLine.trim().split(/\s+/);
              const cmd = args[0].toLowerCase();

              switch (cmd) {
                case "clear":
                case "cls":
                  term.clear();
                  break;
                case "help":
                  term.writeln("Available commands:");
                  term.writeln("  clear, cls - Clear the terminal");
                  term.writeln("  help       - Show this help message");
                  term.writeln("  echo       - Echo the input text");
                  term.writeln("  date       - Show current date and time");
                  break;
                case "echo":
                  term.writeln(args.slice(1).join(" "));
                  break;
                case "date":
                  term.writeln(new Date().toString());
                  break;
                default:
                  term.writeln(`\x1b[31mCommand not found: ${cmd}\x1b[0m`);
                  term.writeln("Type 'help' for available commands.");
              }
            }
            currentLine = "";
            term.write("\x1b[32m$\x1b[0m ");
            break;
          case "\u007F": // Backspace
            if (currentLine.length > 0) {
              currentLine = currentLine.slice(0, -1);
              term.write("\b \b");
            }
            break;
          default:
            if (data.charCodeAt(0) >= 32) {
              currentLine += data;
              term.write(data);
            }
        }
      });

      // 监听窗口大小变化
      terminalWindow.addEventListener("resize", () => {
        terminalContainer.style.width = "100%";
        terminalContainer.style.height = "100%";
      });
    };

    initTerminal();

    // 监听窗口关闭事件
    terminalWindow.addEventListener("beforeunload", () => {
      terminalWindow = null;
    });
  };

  // 创建打开终端按钮 - 放在 SPA 分析器按钮旁边
  const terminalButton = document.createElement("button");
  // 保持原始类名，确保按钮能够正确显示
  terminalButton.className = addon.tab.scratchClass('menu-bar_menu-bar-button', {
    others: 'sa-terminal-button'
  });
  // 使用intl获取翻译，确保在不同语言环境下显示正确的文本
  const terminalText = addon.tab.t("Terminal/@name") || "Terminal";
  terminalButton.textContent = terminalText;
  terminalButton.title = "打开终端窗口";
  terminalButton.addEventListener("click", openTerminalWindow);
  
  // 存储终端文本，供VS Code布局使用
  let storedTerminalText = terminalText;

  addon.tab.displayNoneWhileDisabled(terminalButton);

  // 等待标签栏加载完成
  await addon.tab.waitForElement('[class*="react-tabs_react-tabs__tab-list"]', {
    markAsSeen: true,
    reduxEvents: [
      "scratch-gui/mode/SET_PLAYER",
      "fontsLoaded/SET_FONTS_LOADED",
      "scratch-gui/locales/SELECT_LOCALE"
    ],
  });

  // 查找 SPA 分析器按钮
  const findAnalyzeButton = () => {
    return document.querySelector('.sa-analyze-button');
  };

  // 插入终端按钮
  const insertTerminalButton = () => {
    // 尝试不同的插入位置
    const insertionPoints = [
      // 1. 分析器按钮旁边
      () => {
        const analyzeButton = document.querySelector('.sa-analyze-button');
        if (analyzeButton) {
          analyzeButton.parentNode.insertBefore(terminalButton, analyzeButton.nextSibling);
          return true;
        }
        return false;
      },
      // 2. 编辑器包装器内
      () => {
        const editorWrapper = document.querySelector('.editor-wrapper');
        if (editorWrapper) {
          terminalButton.style.position = 'absolute';
          terminalButton.style.top = '10px';
          terminalButton.style.left = '10px';
          terminalButton.style.zIndex = '1000';
          terminalButton.style.padding = '5px 10px';
          terminalButton.style.backgroundColor = '#f0f0f0';
          terminalButton.style.border = '1px solid #ccc';
          terminalButton.style.borderRadius = '4px';
          terminalButton.style.cursor = 'pointer';
          editorWrapper.appendChild(terminalButton);
          return true;
        }
        return false;
      },
      // 3. 标签栏内
      () => {
        const tabBar = document.querySelector('[class*="react-tabs_react-tabs__tab-list"]');
        if (tabBar) {
          // 检查是否是VS Code布局
          const isVSCodeLayout = tabBar.classList.contains('vscode');
          if (isVSCodeLayout) {
            // 为VS Code布局添加特殊样式
            terminalButton.className = 'sa-terminal-button';
            terminalButton.style.width = '40px';
            terminalButton.style.height = '40px';
            terminalButton.style.flexGrow = '0';
            terminalButton.style.borderRadius = '0';
            terminalButton.style.margin = '0';
            terminalButton.style.padding = '10px';
            terminalButton.style.flexDirection = 'column';
            terminalButton.style.justifyContent = 'center';
            terminalButton.style.alignItems = 'center';
            terminalButton.style.fontSize = '0';
            terminalButton.style.backgroundColor = 'transparent';
            terminalButton.style.border = '0';
            terminalButton.style.marginBottom = '10px';
            terminalButton.style.display = 'flex';
            
            // 添加终端图标
            const terminalIcon = document.createElement('div');
            terminalIcon.style.width = '2rem';
            terminalIcon.style.height = '2rem';
            terminalIcon.style.display = 'flex';
            terminalIcon.style.justifyContent = 'center';
            terminalIcon.style.alignItems = 'center';
            terminalIcon.innerHTML = '&#x231B;'; // 终端图标
            terminalIcon.style.color = '#666';
            
            // 清空按钮内容并添加图标
            terminalButton.innerHTML = '';
            terminalButton.appendChild(terminalIcon);
            // 保持title属性，显示语言相关的提示
            terminalButton.title = storedTerminalText + " - 打开终端窗口";
          } else {
            // 普通布局下的样式
            terminalButton.style.padding = '5px 10px';
            terminalButton.style.marginLeft = '10px';
            // 确保显示正确的语言文本
            terminalButton.textContent = storedTerminalText;
          }
          tabBar.appendChild(terminalButton);
          return true;
        }
        return false;
      },
      // 4. 菜单栏内
      () => {
        const menuBar = document.querySelector('.menu-bar');
        if (menuBar) {
          terminalButton.style.padding = '5px 10px';
          terminalButton.style.marginLeft = '10px';
          menuBar.appendChild(terminalButton);
          return true;
        }
        return false;
      }
    ];

    // 尝试每个插入点
    for (const insertionFn of insertionPoints) {
      if (insertionFn() && terminalButton.parentNode) {
        return true;
      }
    }
    return false;
  };

  // 尝试插入按钮，如果失败则重试
  if (!insertTerminalButton()) {
    const observer = new MutationObserver(() => {
      if (insertTerminalButton()) {
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}