import WindowManager from '../../window-system/window-manager.js';

export default async function ({ addon, msg, console }) {
  // 等待 DOM 加载完成
  await addon.tab.waitForElement('body', { markAsSeen: true });

  // ---- 内联终端图标（fill=currentColor 以跟随主题） ----
  const TERMINAL_ICON_SVG =
    '<svg viewBox="0 0 1024 1024" class="sa-terminal-icon" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path fill="currentColor" d="M499.712 481.792l-128-128c-16.896-16.384-44.032-15.872-60.416 1.024-15.872 16.384-15.872 42.496 0 59.392L409.088 512l-97.792 97.792c-16.896 16.384-17.408 43.52-1.024 60.416s43.52 17.408 60.416 1.024l1.024-1.024 128-128c16.384-16.896 16.384-43.52 0-60.416zM682.496 597.504h-128c-23.552 0-42.496 18.944-42.496 42.496 0 23.552 18.944 42.496 42.496 42.496h128c23.552 0 42.496-18.944 42.496-42.496s-18.944-42.496-42.496-42.496z"/>' +
    '<path fill="currentColor" d="M810.496 128H213.504c-70.656 0-128 57.344-128 128v512c0 70.656 57.344 128 128 128h597.504c70.656 0 128-57.344 128-128V256c-0.512-70.656-57.856-128-128.512-128z m0 682.496H213.504c-23.552 0-42.496-18.944-42.496-42.496V256c0-23.552 18.944-42.496 42.496-42.496h597.504c23.552 0 42.496 18.944 42.496 42.496v512c0 23.552-19.456 42.496-43.008 42.496z"/>' +
    '</svg>';

  // 终端名称（语言包已添加 Terminal/name）
  const terminalName = () => {
    const name = msg ? msg('name') : '';
    return (name && !name.includes('/')) ? name : '终端';
  };

  // ---- 状态 ----
  let terminalWindow = null;
  let terminalInstance = null;

  // ---- 布局判断（与 simple-project-analyzer 一致） ----
  const isVSCodeLayout = () => {
    try {
      const stored = localStorage.getItem('AESettings');
      if (!stored) return false;
      return JSON.parse(stored).EnableVSCodeLayout === true;
    } catch (e) {
      return false;
    }
  };

  // ---- 主题模式（深色/浅色/其他） ----
  const getThemeMode = () => {
    try {
      const reduxState = addon.tab.redux?.state;
      const theme = reduxState?.scratchGui?.theme?.theme;
      if (theme && typeof theme.isDark === 'function') {
        return theme.isDark() ? 'dark' : 'light';
      }
      const isDark = reduxState?.scratchGui?.theme?.isDark;
      if (typeof isDark === 'boolean') return isDark ? 'dark' : 'light';
    } catch (e) { /* ignore */ }
    return 'light';
  };

  // 主题变化时更新颜色 class
  const applyThemeMode = () => {
    const dark = getThemeMode() === 'dark';
    document.querySelectorAll('.sa-terminal-button, .sa-terminal-menu-item').forEach((el) => {
      el.classList.toggle('sa-terminal-dark', dark);
    });
  };

  // ---- 图标元素 ----
  const createSvgIcon = () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(TERMINAL_ICON_SVG, 'image/svg+xml');
    return doc.documentElement;
  };

  // ---- xterm 终端初始化 ----
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

  // ---- 打开终端自由窗口 ----
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
      title: terminalName(),
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
      }
    });

    terminalWindow.setContent(container);
    terminalWindow.center();
    terminalWindow.show();

    initTerminal(container).catch((e) => {
      console.error('Terminal: Failed to load xterm.js', e);
      container.innerHTML = '<div style="color:#f14c4c;font-family:monospace;padding:10px;">Failed to load terminal library.</div>';
    });
  };

  // ---- 关闭工具菜单（模拟外部点击，触发 MenuLabel 的 onClose） ----
  const closeToolsMenu = () => {
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    document.body.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  };

  // ---- 非 VS Code 布局：工具菜单栏菜单项 ----
  const createMenuEntry = () => {
    const li = document.createElement('li');
    li.className = addon.tab.scratchClass('menu_menu-item', 'menu_hoverable', {
      others: 'sa-terminal-menu-item'
    });
    li.appendChild(createSvgIcon());
    const label = document.createElement('span');
    label.textContent = terminalName();
    li.appendChild(label);
    li.addEventListener('click', (e) => {
      e.stopPropagation();
      openTerminalWindow();
      closeToolsMenu();
    });
    return li;
  };

  const injectMenuEntry = () => {
    // MenuLabel 不透传 data-mw-item 到 DOM，故用"添加扩展"作为锚点定位 Tools 菜单的 <ul>
    const allMenuUls = document.querySelectorAll('ul[class*="menu_menu"]');
    let toolsMenuUl = null;
    for (const ul of allMenuUls) {
      if (ul.textContent.includes('添加扩展') || ul.textContent.includes('Extension Library')) {
        toolsMenuUl = ul;
        break;
      }
    }
    if (!toolsMenuUl) return false;
    if (toolsMenuUl.querySelector('.sa-terminal-menu-item')) return true;
    toolsMenuUl.appendChild(createMenuEntry());
    applyThemeMode();
    return true;
  };

  const observeToolsMenu = () => {
    // 工具菜单（containers/menu.jsx）关闭时卸载、打开时挂载 ul，故持续监听
    const observer = new MutationObserver(() => {
      // 每次菜单重新挂载都尝试注入
      if (injectMenuEntry()) {
        // 注入成功即可，下次菜单打开时 MutationObserver 会再次触发
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  // ---- VS Code 布局：侧边栏图标按钮 ----
  const createSidebarButton = () => {
    const btn = document.createElement('button');
    btn.className = 'sa-terminal-button';
    btn.title = terminalName() + ' - 打开终端窗口';
    btn.appendChild(createSvgIcon());
    btn.addEventListener('click', openTerminalWindow);
    addon.tab.displayNoneWhileDisabled(btn);
    return btn;
  };

  const insertSidebarButton = async () => {
    await addon.tab.waitForElement('[class*="react-tabs_react-tabs__tab-list"]', {
      markAsSeen: true,
      reduxEvents: [
        'scratch-gui/mode/SET_PLAYER',
        'fontsLoaded/SET_FONTS_LOADED',
        'scratch-gui/locales/SELECT_LOCALE'
      ]
    });
    const tabBar = document.querySelector('[class*="react-tabs_react-tabs__tab-list"]');
    if (!tabBar) return;
    const btn = createSidebarButton();
    const analyzeButton = tabBar.querySelector('.sa-analyze-button');
    if (analyzeButton) {
      analyzeButton.parentNode.insertBefore(btn, analyzeButton.nextSibling);
    } else {
      tabBar.appendChild(btn);
    }
    applyThemeMode();
  };

  // ---- 主题实时监测 ----
  const redux = addon.tab.redux;
  if (redux) {
    redux.initialize?.();
    redux.addEventListener?.('statechanged', applyThemeMode);
  }
  applyThemeMode();

  // ---- 启动 ----
  if (isVSCodeLayout()) {
    insertSidebarButton();
  } else {
    observeToolsMenu();
  }
}
