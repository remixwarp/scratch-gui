import WindowManager from '../../window-system/window-manager.js';
import terminalIconUrl from './Terminal.svg';

export default async function ({ addon, msg, console }) {
  // 等待 DOM 加载完成
  await addon.tab.waitForElement("body", { markAsSeen: true });

  // 终端窗口引用
  let terminalWindow = null;
  let terminalContainer = null;
  let terminalInstance = null;

  // 判断是否 VS Code 布局（与 simple-project-analyzer 一致）
  const isVSCodeLayout = () => {
    try {
      const stored = localStorage.getItem('AESettings');
      if (!stored) return false;
      return JSON.parse(stored).EnableVSCodeLayout === true;
    } catch (e) {
      return false;
    }
  };

  // 在自由窗口中初始化 xterm 终端
  const initTerminal = async (container) => {
    // 加载 xterm.js 库（重复调用时复用 window 上的缓存）
    const loadLibraries = () => {
      const loadScript = () => new Promise((resolve, reject) => {
        if (window.Terminal) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      const loadStyle = () => new Promise((resolve, reject) => {
        if (document.getElementById('xterm-css')) {
          resolve();
          return;
        }
        const link = document.createElement('link');
        link.id = 'xterm-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css';
        link.onload = resolve;
        link.onerror = reject;
        document.head.appendChild(link);
      });
      return Promise.all([loadScript(), loadStyle()]);
    };

    await loadLibraries();

    const term = new window.Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#4d97ff',
        cursorAccent: '#1e1e1e',
        selection: 'rgba(77, 151, 255, 0.3)',
        black: '#1e1e1e',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff'
      },
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block'
    });

    term.open(container);
    terminalInstance = term;

    // 欢迎消息
    term.writeln('\x1b[1;34m=== Scratch Terminal ===\x1b[0m');
    term.writeln('\x1b[32mTerminal ready.\x1b[0m');
    term.writeln('Type commands and press Enter to execute.');
    term.writeln('');

    // 监听终端输入
    let currentLine = '';
    term.write('\x1b[32m$\x1b[0m ');

    term.onData((data) => {
      switch (data) {
        case '\r': // Enter
          term.writeln('');
          if (currentLine.trim()) {
            const args = currentLine.trim().split(/\s+/);
            const cmd = args[0].toLowerCase();

            switch (cmd) {
              case 'clear':
              case 'cls':
                term.clear();
                break;
              case 'help':
                term.writeln('Available commands:');
                term.writeln('  clear, cls - Clear the terminal');
                term.writeln('  help       - Show this help message');
                term.writeln('  echo       - Echo the input text');
                term.writeln('  date       - Show current date and time');
                break;
              case 'echo':
                term.writeln(args.slice(1).join(' '));
                break;
              case 'date':
                term.writeln(new Date().toString());
                break;
              default:
                term.writeln(`\x1b[31mCommand not found: ${cmd}\x1b[0m`);
                term.writeln("Type 'help' for available commands.");
            }
          }
          currentLine = '';
          term.write('\x1b[32m$\x1b[0m ');
          break;
        case '\u007F': // Backspace
          if (currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1);
            term.write('\b \b');
          }
          break;
        default:
          if (data.charCodeAt(0) >= 32) {
            currentLine += data;
            term.write(data);
          }
      }
    });
  };

  // 打开终端自由窗口
  const openTerminalWindow = () => {
    // 窗口已存在：显示并聚焦
    if (terminalWindow) {
      terminalWindow.show().bringToFront();
      return;
    }

    const container = document.createElement('div');
    container.style.cssText = 'width: 100%; height: 100%; box-sizing: border-box; padding: 10px; background: #1e1e1e; min-height: 0;';

    terminalWindow = WindowManager.createWindow({
      id: 'rw-terminal-window',
      title: 'Terminal',
      width: 800,
      height: 500,
      minWidth: 360,
      minHeight: 200,
      className: 'rw-terminal-window',
      onClose: () => {
        if (terminalInstance) {
          terminalInstance.dispose();
          terminalInstance = null;
        }
        terminalWindow = null;
        terminalContainer = null;
      }
    });

    terminalContainer = container;
    terminalWindow.setContent(container);
    terminalWindow.center();
    terminalWindow.show();

    initTerminal(container).catch((e) => {
      console.error('Terminal: Failed to load xterm.js', e);
      container.innerHTML = '<div style="color:#f14c4c;font-family:monospace;padding:10px;">Failed to load terminal library.</div>';
    });
  };

  // 创建打开终端按钮
  const terminalButton = document.createElement('button');
  terminalButton.className = addon.tab.scratchClass('menu-bar_menu-bar-button', {
    others: 'sa-terminal-button'
  });
  // 使用 intl 获取翻译，确保在不同语言环境下显示正确的文本
  const terminalText = msg ? (msg("name", "Terminal") || "Terminal") : "Terminal";
  terminalButton.title = terminalText + " - 打开终端窗口";

  if (isVSCodeLayout()) {
    // VS Code 布局：显示终端图标
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

    const terminalIcon = document.createElement('img');
    terminalIcon.src = terminalIconUrl;
    terminalIcon.alt = 'Terminal';
    terminalIcon.style.width = '2rem';
    terminalIcon.style.height = '2rem';
    terminalIcon.style.display = 'block';

    terminalButton.appendChild(terminalIcon);
  } else {
    // 普通布局：显示文字
    terminalButton.textContent = terminalText;
  }

  terminalButton.addEventListener('click', openTerminalWindow);

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
      // 2. 标签栏内
      () => {
        const tabBar = document.querySelector('[class*="react-tabs_react-tabs__tab-list"]');
        if (tabBar) {
          tabBar.appendChild(terminalButton);
          return true;
        }
        return false;
      },
      // 3. 菜单栏内
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
