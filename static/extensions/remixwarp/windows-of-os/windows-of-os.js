(function (Scratch) {
  'use strict';

  // 全局变量
  let windows = new Map(); // 存储所有窗口
  let nextWindowId = 1; // 窗口ID计数器
  let components = new Map(); // 存储组件
  let nextComponentId = 1; // 组件ID计数器

  class GmyOSWindowExtension {
    constructor() {
      this.runtime = null;
      this.isWindowOpen = false;
      this.windowElement = null;
      this.terminalElement = null;
      this.inputElement = null;
      this.dragging = false;
      this.dragOffset = { x: 0, y: 0 };

      // 虚拟文件系统
      this.vfs = {
        'C:': {
          type: 'drive',
          label: 'GMYOS_SIM',
          contents: {
            'AUTOEXEC.BAT': {
              type: 'file',
              content: '@ECHO OFF\nPROMPT $P$G\nVER\nCLS',
              size: 128,
              date: '2025-02-14'
            },
            'COMMAND.COM': {
              type: 'file',
              content: 'gmy_xxl/windows of OS Version 2.0 - (C) Copyright 2026',
              size: 32768,
              date: '2025-02-14'
            }
          }
        }
      };

      // 系统状态
      this.currentDrive = 'C:';
      this.currentPath = '\\';
      this.outputHistory = [];
      this.commandHistory = [];

      // GmyOS 专用寄存器
      this.registers = {
        GX: 0x0000, GY: 0x0000, GZ: 0x0000, GW: 0x0000,
        SYS_A: 0x0000, SYS_B: 0x0000,
        IP: 0x0100, STATUS: 0x0000
      };

      // 程序执行状态
      this.loadedProgram = null;
      this.isProgramRunning = false;
      this.programCounter = 0;

      // 外部程序存储
      this.externalPrograms = new Map();
    }

    getInfo() {
      return {
        id: 'gmyosWindow',
        name: 'windows of OS',
        color1: '#2B60DE',
        color2: '#4B0082',
        blocks: [
          // 原有功能保持不变
          {
            opcode: 'openGmyOS',
            blockType: Scratch.BlockType.COMMAND,
            text: '打开CMD OF OS窗口'
          },
          {
            opcode: 'closeGmyOS',
            blockType: Scratch.BlockType.COMMAND,
            text: '关闭CMD OF OS窗口'
          },
          {
            opcode: 'executeCommand',
            blockType: Scratch.BlockType.COMMAND,
            text: '执行命令: [COMMAND]',
            arguments: {
              COMMAND: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'HELP',
                menu: 'gmyCommands'
              }
            }
          },
          {
            opcode: 'clearScreen',
            blockType: Scratch.BlockType.COMMAND,
            text: '清屏'
          },
          '---',
          {
            opcode: 'setGmyRegister',
            blockType: Scratch.BlockType.COMMAND,
            text: '设置寄存器 [REG] = [VALUE]',
            arguments: {
              REG: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'GX',
                menu: 'gmyRegisters'
              },
              VALUE: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 255
              }
            }
          },
          {
            opcode: 'getGmyRegister',
            blockType: Scratch.BlockType.REPORTER,
            text: '获取寄存器 [REG]',
            arguments: {
              REG: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'GX',
                menu: 'gmyRegisters'
              }
            }
          },
          {
            opcode: 'showAllRegisters',
            blockType: Scratch.BlockType.REPORTER,
            text: '显示所有寄存器'
          },
          '---',
          {
            opcode: 'loadGmyProgram',
            blockType: Scratch.BlockType.COMMAND,
            text: '加载程序: [CODE]',
            arguments: {
              CODE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'MOV GX, 1234h'
              }
            }
          },
          {
            opcode: 'runProgram',
            blockType: Scratch.BlockType.COMMAND,
            text: '运行程序'
          },
          {
            opcode: 'loadExternalProgram',
            blockType: Scratch.BlockType.COMMAND,
            text: '加载外部程序 [NAME]: [CODE]',
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'MYPROG'
              },
              CODE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'MOV GX, 1234h\nADD GX, 100h'
              }
            }
          },
          {
            opcode: 'runExternalProgram',
            blockType: Scratch.BlockType.COMMAND,
            text: '运行外部程序 [NAME]',
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'MYPROG'
              }
            }
          },
          {
            opcode: 'listExternalPrograms',
            blockType: Scratch.BlockType.REPORTER,
            text: '列出外部程序'
          },
          
          // 新增功能：自定义窗口
          '---自定义窗口---',
          {
            opcode: 'createCustomWindow',
            blockType: Scratch.BlockType.COMMAND,
            text: '创建自定义窗口 名称:[NAME] 标题:[TITLE] X:[X] Y:[Y] 宽度:[WIDTH] 高度:[HEIGHT]',
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '我的窗口'
              },
              TITLE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '自定义窗口'
              },
              X: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 100
              },
              Y: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 100
              },
              WIDTH: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 600
              },
              HEIGHT: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 400
              }
            }
          },
          {
            opcode: 'closeCustomWindow',
            blockType: Scratch.BlockType.COMMAND,
            text: '关闭自定义窗口 名称:[NAME]',
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '我的窗口'
              }
            }
          },
          {
            opcode: 'closeAllWindows',
            blockType: Scratch.BlockType.COMMAND,
            text: '关闭所有自定义窗口'
          },
          {
            opcode: 'getWindowList',
            blockType: Scratch.BlockType.REPORTER,
            text: '获取自定义窗口列表'
          },

          // 新增功能：组件管理
          '---组件管理---',
          {
            opcode: 'addButton',
            blockType: Scratch.BlockType.COMMAND,
            text: '添加按钮到窗口[NAME] 标签:[LABEL] X:[X] Y:[Y]',
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '我的窗口'
              },
              LABEL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '按钮'
              },
              X: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10
              },
              Y: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10
              }
            }
          },
          {
            opcode: 'addSlider',
            blockType: Scratch.BlockType.COMMAND,
            text: '添加滑杆到窗口[NAME] 标签:[LABEL] X:[X] Y:[Y] 最小值:[MIN] 最大值:[MAX] 默认值:[DEFAULT]',
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '我的窗口'
              },
              LABEL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '滑杆'
              },
              X: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10
              },
              Y: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 50
              },
              MIN: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 0
              },
              MAX: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 100
              },
              DEFAULT: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 50
              }
            }
          },
          {
            opcode: 'addCheckbox',
            blockType: Scratch.BlockType.COMMAND,
            text: '添加复选框到窗口[NAME] 标签:[LABEL] X:[X] Y:[Y] 默认状态:[STATE]',
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '我的窗口'
              },
              LABEL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '复选框'
              },
              X: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10
              },
              Y: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 90
              },
              STATE: {
                type: Scratch.ArgumentType.BOOLEAN,
                defaultValue: true
              }
            }
          },
          {
            opcode: 'addDropdown',
            blockType: Scratch.BlockType.COMMAND,
            text: '添加下拉菜单到窗口[NAME] 标签:[LABEL] X:[X] Y:[Y] 选项:[OPTIONS]',
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '我的窗口'
              },
              LABEL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '下拉菜单'
              },
              X: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10
              },
              Y: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 130
              },
              OPTIONS: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '选项1,选项2,选项3'
              }
            }
          },
          {
            opcode: 'addTextbox',
            blockType: Scratch.BlockType.COMMAND,
            text: '添加文本框到窗口[NAME] 标签:[LABEL] X:[X] Y:[Y] 默认文本:[TEXT]',
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '我的窗口'
              },
              LABEL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '文本框'
              },
              X: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10
              },
              Y: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 170
              },
              TEXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '默认文本'
              }
            }
          },
          {
            opcode: 'addCustomLabel',
            blockType: Scratch.BlockType.COMMAND,
            text: '添加标签到窗口[NAME] 文字:[TEXT] X:[X] Y:[Y] 颜色:[COLOR]',
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '我的窗口'
              },
              TEXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '标签文字'
              },
              X: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 10
              },
              Y: {
                type: Scratch.ArgumentType.NUMBER,
                defaultValue: 210
              },
              COLOR: {
                type: Scratch.ArgumentType.COLOR,
                defaultValue: '#00FF00'
              }
            }
          },

          // 新增功能：组件交互
          '---组件交互---',
          {
            opcode: 'getSliderValue',
            blockType: Scratch.BlockType.REPORTER,
            text: '获取滑杆值 窗口:[NAME] 标签:[LABEL]',
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '我的窗口'
              },
              LABEL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '滑杆'
              }
            }
          },
          {
            opcode: 'getCheckboxState',
            blockType: Scratch.BlockType.BOOLEAN,
            text: '获取复选框状态 窗口:[NAME] 标签:[LABEL]',
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '我的窗口'
              },
              LABEL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '复选框'
              }
            }
          },
          {
            opcode: 'getDropdownSelection',
            blockType: Scratch.BlockType.REPORTER,
            text: '获取下拉菜单选择 窗口:[NAME] 标签:[LABEL]',
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '我的窗口'
              },
              LABEL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '下拉菜单'
              }
            }
          },
          {
            opcode: 'getTextboxValue',
            blockType: Scratch.BlockType.REPORTER,
            text: '获取文本框内容 窗口:[NAME] 标签:[LABEL]',
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '我的窗口'
              },
              LABEL: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '文本框'
              }
            }
          },

          // 新增功能：设备信息
          '---设备信息---',
          {
            opcode: 'getBrowserInfo',
            blockType: Scratch.BlockType.REPORTER,
            text: '🌐 获取浏览器信息'
          },
          {
            opcode: 'getPlatformInfo',
            blockType: Scratch.BlockType.REPORTER,
            text: '💻 获取平台信息'
          },
          {
            opcode: 'getScreenInfo',
            blockType: Scratch.BlockType.REPORTER,
            text: '🖥️ 获取屏幕信息'
          },
          {
            opcode: 'getLanguageInfo',
            blockType: Scratch.BlockType.REPORTER,
            text: '🌍 获取语言信息'
          },
          {
            opcode: 'isOnline',
            blockType: Scratch.BlockType.BOOLEAN,
            text: '📡 是否在线'
          }
        ],
        menus: {
          gmyCommands: {
            items: [
              'HELP', 'DIR', 'VER', 'TIME', 'DATE',
              'CLS', 'REG', 'MEM', 'RUN', 'EXIT',
              'PROGRAMS'
            ]
          },
          gmyRegisters: {
            items: [
              'GX', 'GY', 'GZ', 'GW',
              'SYS_A', 'SYS_B', 'IP', 'STATUS'
            ]
          }
        }
      };
    }

    // ========== 原有功能保持不变 ==========
    openGmyOS() {
      if (this.isWindowOpen) return;
      
      this.createWindow();
      this.showWelcomeMessage();
      this.isWindowOpen = true;
    }

    createWindow() {
      // 创建窗口元素
      this.windowElement = document.createElement('div');
      this.windowElement.style.cssText = `
        position: fixed;
        top: 100px;
        left: 100px;
        width: 700px;
        height: 500px;
        background: #000080;
        border: 3px solid #C0C0C0;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 9999;
        font-family: 'Courier New', monospace;
        overflow: hidden;
        resize: both;
      `;

      // 创建标题栏（可拖动）
      const titleBar = document.createElement('div');
      titleBar.style.cssText = `
        background: linear-gradient(to bottom, #0000AA, #000066);
        color: white;
        padding: 12px;
        font-weight: bold;
        cursor: move;
        user-select: none;
        border-bottom: 2px solid #4444AA;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;
      
      const titleText = document.createElement('span');
      titleText.textContent = 'GmyOS Terminal - Version 1.0';
      
      const closeButton = document.createElement('button');
      closeButton.textContent = '×';
      closeButton.style.cssText = `
        background: #FF4444;
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 12px;
        cursor: pointer;
        font-weight: bold;
      `;
      closeButton.onclick = () => this.closeGmyOS();

      titleBar.appendChild(titleText);
      titleBar.appendChild(closeButton);

      // 添加拖动功能
      titleBar.addEventListener('mousedown', (e) => {
        this.dragging = true;
        this.dragOffset = {
          x: e.clientX - this.windowElement.offsetLeft,
          y: e.clientY - this.windowElement.offsetTop
        };
      });

      document.addEventListener('mousemove', (e) => {
        if (this.dragging && this.windowElement) {
          this.windowElement.style.left = (e.clientX - this.dragOffset.x) + 'px';
          this.windowElement.style.top = (e.clientY - this.dragOffset.y) + 'px';
        }
      });

      document.addEventListener('mouseup', () => {
        this.dragging = false;
      });

      this.windowElement.appendChild(titleBar);

      // 创建终端内容区域
      this.terminalElement = document.createElement('div');
      this.terminalElement.style.cssText = `
        height: calc(100% - 120px);
        overflow-y: auto;
        padding: 15px;
        color: #00FF00;
        background: #000000;
        font-size: 14px;
        line-height: 1.4;
        font-family: 'Courier New', monospace;
        white-space: pre-wrap;
        word-wrap: break-word;
      `;
      this.windowElement.appendChild(this.terminalElement);

      // 创建输入区域
      const inputContainer = document.createElement('div');
      inputContainer.style.cssText = `
        padding: 15px;
        background: #000033;
        border-top: 2px solid #4444AA;
        display: flex;
        align-items: center;
      `;

      const prompt = document.createElement('span');
      prompt.textContent = 'C:\\>';
      prompt.style.cssText = `
        color: #00FF00;
        margin-right: 8px;
        font-weight: bold;
      `;

      this.inputElement = document.createElement('input');
      this.inputElement.style.cssText = `
        flex: 1;
        background: #000022;
        border: 1px solid #4444AA;
        color: #00FF00;
        padding: 8px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        outline: none;
      `;
      this.inputElement.placeholder = '输入命令...';

      this.inputElement.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.executeInTerminal(this.inputElement.value);
          this.inputElement.value = '';
        }
      });

      inputContainer.appendChild(prompt);
      inputContainer.appendChild(this.inputElement);
      this.windowElement.appendChild(inputContainer);

      // 添加到页面
      document.body.appendChild(this.windowElement);
      this.inputElement.focus();
    }

    closeGmyOS() {
      if (this.windowElement) {
        this.windowElement.remove();
        this.windowElement = null;
      }
      this.isWindowOpen = false;
    }

    showWelcomeMessage() {
      this.addToTerminal('═══════════════════════════════════════');
      this.addToTerminal('           GmyOS Version 1.0');
      this.addToTerminal('        (C) Copyright 2025 GmyStudio');
      this.addToTerminal('═══════════════════════════════════════');
      this.addToTerminal('');
      this.addToTerminal('正在启动系统...');
      this.addToTerminal('加载内核模块...');
      this.addToTerminal('初始化硬件驱动...');
      this.addToTerminal('');
      this.addToTerminal('GmyOS 启动完成！');
      this.addToTerminal('输入 HELP 获取命令帮助');
      this.addToTerminal('');
      this.addToTerminal('C:\\>');
    }

    addToTerminal(text) {
      if (this.terminalElement) {
        const line = document.createElement('div');
        line.textContent = text;
        line.style.marginBottom = '4px';
        this.terminalElement.appendChild(line);
        this.terminalElement.scrollTop = this.terminalElement.scrollHeight;
      }
    }

    // ========== 基本命令实现 ==========
    cmdHELP() {
      return 'GmyOS 命令帮助:\n' +
        '──────────────────────────────\n' +
        '[命令功能]\n' +
        '使用命令:\n' +
        '   HELP      - 显示此帮助信息\n' +
        '   DIR       - 显示目录内容\n' +
        '   VER       - 显示系统版本\n' +
        '   CLS       - 清空屏幕\n' +
        '   REG       - 显示寄存器状态\n' +
        '   TIME      - 显示当前时间\n' +
        '   DATE      - 显示当前日期\n' +
        '   MEM       - 显示内存信息\n' +
        '   PROGRAMS  - 显示外部程序列表\n' +
        '[积木功能]\n' +
        '使用左侧的积木来:\n' +
        '   - 加载和执行程序\n' +
        '   - 管理寄存器\n' +
        '   - 运行外部程序\n' +
        '──────────────────────────────\n' +
        '输入命令名称获取详细帮助';
    }

    cmdDIR() {
      const currentDir = this.getCurrentDirectory();
      let output = ` Volume in drive ${this.currentDrive} is ${this.vfs[this.currentDrive].label}\n`;
      output += ` Directory of ${this.currentDrive}${this.currentPath}\n\n`;

      let dirCount = 0;
      let fileCount = 0;
      let totalSize = 0;

      for (const [name, item] of Object.entries(currentDir.contents || {})) {
        if (item.type === 'dir') {
          output += `<DIR>          ${item.date}   ${name}\n`;
          dirCount++;
        } else {
          output += `     ${item.size.toString().padStart(9)}  ${item.date}   ${name}\n`;
          fileCount++;
          totalSize += item.size;
        }
      }

      output += `\n     ${fileCount} file(s)    ${totalSize} bytes\n`;
      output += `     ${dirCount} dir(s)    ${1048576 - totalSize} bytes free`;

      return output;
    }

    cmdVER() {
      return `GmyOS Version 1.0\nBuild 2025.0214\n(C) Copyright 2025 GmyStudio`;
    }

    cmdCLS() {
      if (this.terminalElement) {
        this.terminalElement.innerHTML = '';
      }
      return '';
    }

    cmdREG() {
      let output = 'GmyOS 寄存器状态:\n';
      output += '──────────────────────────────\n';
      
      for (const [reg, value] of Object.entries(this.registers)) {
        output += `${reg.padEnd(6)}: 0x${value.toString(16).toUpperCase().padStart(4, '0')}\n`;
      }
      
      output += '──────────────────────────────';
      return output;
    }

    cmdTIME() {
      const now = new Date();
      const time = now.toLocaleTimeString('zh-CN', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      return `当前时间: ${time}`;
    }

    cmdDATE() {
      const now = new Date();
      const date = now.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return `当前日期: ${date}`;
    }

    cmdMEM() {
      const totalMem = 1048576; // 1MB
      const usedMem = Object.values(this.vfs['C:'].contents)
        .filter(item => item.type === 'file')
        .reduce((sum, file) => sum + file.size, 0);
      const freeMem = totalMem - usedMem;
      
      return `内存使用情况:\n总内存: ${totalMem} bytes\n已使用: ${usedMem} bytes\n可用内存: ${freeMem} bytes\n使用率: ${((usedMem / totalMem) * 100).toFixed(1)}%`;
    }

    cmdRUN() {
      if (!this.loadedProgram) {
        return '错误：没有加载的程序\n使用 LOAD 命令加载程序';
      }
      
      this.isProgramRunning = true;
      this.addToTerminal('开始执行程序...');
      this.addToTerminal('──────────────────────────────');
      
      const result = this.runProgramInternal();
      
      this.addToTerminal('──────────────────────────────');
      this.addToTerminal('程序执行完成');
      this.isProgramRunning = false;
      
      return result;
    }

    cmdPROGRAMS() {
      if (this.externalPrograms.size === 0) {
        return '没有可用的外部程序\n使用 LOADEXTERNAL 命令加载外部程序';
      }
      
      let output = '外部程序列表:\n';
      output += '──────────────────────────────\n';
      
      for (const [name, program] of this.externalPrograms) {
        const lineCount = program.split('\n').filter(line => line.trim()).length;
        output += `${name.padEnd(12)} - ${lineCount} 行代码\n`;
      }
      
      output += '──────────────────────────────\n';
      output += '使用 RUNEXTERNAL [程序名] 运行程序';
      
      return output;
    }

    getCurrentDirectory() {
      let current = this.vfs[this.currentDrive];
      if (this.currentPath !== '\\') {
        const pathParts = this.currentPath.split('\\').filter(p => p);
        for (const part of pathParts) {
          if (current.contents && current.contents[part]) {
            current = current.contents[part];
          }
        }
      }
      return current;
    }

    // ========== 命令执行接口 ==========
    executeCommand(args) {
      if (!this.isWindowOpen) {
        this.openGmyOS();
      }
      
      const command = args.COMMAND.toUpperCase();
      this.addToTerminal(`C:\\>${command}`);
      
      const result = this.executeGmyCommand(command);
      this.addToTerminal(result);
      this.addToTerminal('C:\\>');
      
      return result;
    }

    executeInTerminal(command) {
      if (!command.trim()) return;

      this.addToTerminal(`C:\\>${command}`);
      
      const result = this.executeGmyCommand(command.toUpperCase());
      this.addToTerminal(result);
      this.addToTerminal('C:\\>');
    }

    executeGmyCommand(command) {
      switch (command) {
        case 'HELP':
          return this.cmdHELP();
        case 'DIR':
          return this.cmdDIR();
        case 'VER':
          return this.cmdVER();
        case 'CLS':
          return this.cmdCLS();
        case 'REG':
          return this.cmdREG();
        case 'TIME':
          return this.cmdTIME();
        case 'DATE':
          return this.cmdDATE();
        case 'MEM':
          return this.cmdMEM();
        case 'RUN':
          return this.cmdRUN();
        case 'PROGRAMS':
          return this.cmdPROGRAMS();
        case 'LOAD':
          return '请使用"加载程序"积木来加载程序';
        default:
          return `未知命令: ${command}\n输入 HELP 获取可用命令列表`;
      }
    }

    clearScreen() {
      if (this.terminalElement) {
        this.terminalElement.innerHTML = '';
        this.addToTerminal('C:\\>');
      }
      return '';
    }

    // ========== 寄存器操作函数 ==========
    setGmyRegister(args) {
      const reg = args.REG;
      const value = Number(args.VALUE);
      
      if (this.registers.hasOwnProperty(reg)) {
        this.registers[reg] = value;
        if (this.isWindowOpen) {
          this.addToTerminal(`寄存器 ${reg} 设置为: 0x${value.toString(16).toUpperCase()}`);
        }
        return `寄存器 ${reg} 已更新`;
      }
      return `无效的寄存器: ${reg}`;
    }

    getGmyRegister(args) {
      const reg = args.REG;
      return this.registers[reg] || 0;
    }

    showAllRegisters() {
      return this.cmdREG();
    }

    // ========== 程序加载和执行 ==========
    loadGmyProgram(args) {
      const code = args.CODE;
      this.loadedProgram = code;
      this.programCounter = 0;
      this.isProgramRunning = false;
      
      if (this.isWindowOpen) {
        this.addToTerminal(`程序已加载到内存`);
        this.addToTerminal(`代码长度: ${code.length} 字符`);
        this.addToTerminal(`使用 RUN 命令执行程序`);
      }
      return '程序加载完成';
    }

    runProgram() {
      if (!this.loadedProgram) {
        return '错误：没有加载的程序';
      }

      if (!this.isWindowOpen) {
        this.openGmyOS();
      }

      this.isProgramRunning = true;
      this.addToTerminal('开始执行程序...');
      this.addToTerminal('──────────────────────────────');
      
      const result = this.runProgramInternal();
      
      this.addToTerminal('──────────────────────────────');
      this.addToTerminal('程序执行完成');
      this.isProgramRunning = false;
      
      return result;
    }

    runProgramInternal() {
      const lines = this.loadedProgram.split('\n');
      let output = '';
      
      for (this.programCounter = 0; this.programCounter < lines.length; this.programCounter++) {
        const line = lines[this.programCounter].trim();
        if (line) {
          this.addToTerminal(`[${this.programCounter.toString().padStart(3, '0')}] ${line}`);
          
          // 指令解析和执行
          const result = this.executeInstruction(line);
          if (result) {
            this.addToTerminal(result);
          }
          
          // 模拟执行延迟
          if (this.programCounter % 3 === 0) {
            this.addToTerminal('执行中...');
          }
        }
      }
      
      return '程序执行完毕';
    }

    // ========== 外部程序功能 ==========
    loadExternalProgram(args) {
      const name = args.NAME.toUpperCase();
      const code = args.CODE;
      
      this.externalPrograms.set(name, code);
      
      if (this.isWindowOpen) {
        this.addToTerminal(`外部程序 "${name}" 已加载`);
        this.addToTerminal(`代码长度: ${code.length} 字符`);
      }
      
      return `外部程序 "${name}" 加载完成`;
    }

    runExternalProgram(args) {
      const name = args.NAME.toUpperCase();
      
      if (!this.externalPrograms.has(name)) {
        return `错误：找不到外部程序 "${name}"`;
      }

      if (!this.isWindowOpen) {
        this.openGmyOS();
      }

      const programCode = this.externalPrograms.get(name);
      this.addToTerminal(`执行外部程序: ${name}`);
      this.addToTerminal('──────────────────────────────');
      
      // 临时加载并执行外部程序
      const originalProgram = this.loadedProgram;
      this.loadedProgram = programCode;
      const result = this.runProgramInternal();
      this.loadedProgram = originalProgram;
      
      this.addToTerminal('──────────────────────────────');
      this.addToTerminal(`外部程序 "${name}" 执行完成`);
      
      return result;
    }

    listExternalPrograms() {
      if (this.externalPrograms.size === 0) {
        return '没有外部程序';
      }
      
      let output = '外部程序列表:\n';
      for (const [name, code] of this.externalPrograms) {
        const lines = code.split('\n').filter(line => line.trim());
        output += `${name}: ${lines.length} 行代码\n`;
      }
      return output;
    }

    // ========== 指令执行函数 ==========
    executeInstruction(instruction) {
      const upperInstruction = instruction.toUpperCase();
      
      if (upperInstruction.startsWith('MOV')) {
        return this.executeMOV(instruction);
      } else if (upperInstruction.startsWith('ADD')) {
        return this.executeADD(instruction);
      } else if (upperInstruction.startsWith('SUB')) {
        return this.executeSUB(instruction);
      } else if (upperInstruction.startsWith('INC')) {
        return this.executeINC(instruction);
      } else if (upperInstruction.startsWith('DEC')) {
        return this.executeDEC(instruction);
      } else if (upperInstruction.startsWith('PRINT')) {
        return this.executePRINT(instruction);
      }
      
      return null;
    }

    executeMOV(instruction) {
      const parts = instruction.split(/[\s,]+/);
      if (parts.length >= 3) {
        const reg = parts[1].toUpperCase();
        let value = parts[2];
        
        // 处理十六进制值
        if (value.endsWith('h') || value.endsWith('H')) {
          value = parseInt(value.slice(0, -1), 16);
        } else {
          value = parseInt(value);
        }
        
        if (!isNaN(value) && this.registers.hasOwnProperty(reg)) {
          this.registers[reg] = value;
          return `  -> ${reg} = 0x${value.toString(16).toUpperCase()}`;
        }
      }
      return `  -> 语法错误: ${instruction}`;
    }

    executeADD(instruction) {
      const parts = instruction.split(/[\s,]+/);
      if (parts.length >= 3) {
        const reg = parts[1].toUpperCase();
        let value = parts[2];
        
        if (value.endsWith('h') || value.endsWith('H')) {
          value = parseInt(value.slice(0, -1), 16);
        } else {
          value = parseInt(value);
        }
        
        if (!isNaN(value) && this.registers.hasOwnProperty(reg)) {
          this.registers[reg] += value;
          return `  -> ${reg} += ${value} (新值: 0x${this.registers[reg].toString(16).toUpperCase()})`;
        }
      }
      return `  -> 语法错误: ${instruction}`;
    }

    executeSUB(instruction) {
      const parts = instruction.split(/[\s,]+/);
      if (parts.length >= 3) {
        const reg = parts[1].toUpperCase();
        let value = parts[2];
        
        if (value.endsWith('h') || value.endsWith('H')) {
          value = parseInt(value.slice(0, -1), 16);
        } else {
          value = parseInt(value);
        }
        
        if (!isNaN(value) && this.registers.hasOwnProperty(reg)) {
          this.registers[reg] -= value;
          return `  -> ${reg} -= ${value} (新值: 0x${this.registers[reg].toString(16).toUpperCase()})`;
        }
      }
      return `  -> 语法错误: ${instruction}`;
    }

    executeINC(instruction) {
      const parts = instruction.split(/[\s,]+/);
      if (parts.length >= 2) {
        const reg = parts[1].toUpperCase();
        
        if (this.registers.hasOwnProperty(reg)) {
          this.registers[reg]++;
          return `  -> ${reg}++ (新值: 0x${this.registers[reg].toString(16).toUpperCase()})`;
        }
      }
      return `  -> 语法错误: ${instruction}`;
    }

    executeDEC(instruction) {
      const parts = instruction.split(/[\s,]+/);
      if (parts.length >= 2) {
        const reg = parts[1].toUpperCase();
        
        if (this.registers.hasOwnProperty(reg)) {
          this.registers[reg]--;
          return `  -> ${reg}-- (新值: 0x${this.registers[reg].toString(16).toUpperCase()})`;
        }
      }
      return `  -> 语法错误: ${instruction}`;
    }

    executePRINT(instruction) {
      const parts = instruction.split(/[\s,]+/);
      if (parts.length >= 2) {
        const reg = parts[1].toUpperCase();
        
        if (this.registers.hasOwnProperty(reg)) {
          const value = this.registers[reg];
          return `  -> 输出: ${reg} = ${value} (0x${value.toString(16).toUpperCase()})`;
        }
      }
      return `  -> 语法错误: ${instruction}`;
    }

    // ========== 新增功能：自定义窗口管理 ==========
    createCustomWindow(args) {
      const name = args.NAME;
      const title = args.TITLE;
      const x = args.X;
      const y = args.Y;
      const width = args.WIDTH;
      const height = args.HEIGHT;

      // 如果窗口已存在，先关闭它
      if (windows.has(name)) {
        this.closeCustomWindow({NAME: name});
      }

      // 创建窗口元素
      const windowElement = document.createElement('div');
      windowElement.id = 'custom_window_' + name;
      windowElement.style.cssText = `
        position: fixed;
        top: ${y}px;
        left: ${x}px;
        width: ${width}px;
        height: ${height}px;
        background: #000080;
        border: 3px solid #C0C0C0;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 9999;
        font-family: 'Courier New', monospace;
        overflow: hidden;
        resize: both;
      `;

      // 创建标题栏
      const titleBar = document.createElement('div');
      titleBar.style.cssText = `
        background: linear-gradient(to bottom, #0000AA, #000066);
        color: white;
        padding: 12px;
        font-weight: bold;
        cursor: move;
        user-select: none;
        border-bottom: 2px solid #4444AA;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;
      
      const titleText = document.createElement('span');
      titleText.textContent = title;
      
      const closeButton = document.createElement('button');
      closeButton.textContent = '×';
      closeButton.style.cssText = `
        background: #FF4444;
        border: none;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 12px;
        cursor: pointer;
        font-weight: bold;
      `;
      closeButton.onclick = () => this.closeCustomWindow({NAME: name});

      titleBar.appendChild(titleText);
      titleBar.appendChild(closeButton);
      windowElement.appendChild(titleBar);

      // 添加拖动功能
      this.addDragFunctionality(windowElement, titleBar);

      // 创建内容区域
      const contentArea = document.createElement('div');
      contentArea.id = 'custom_window_content_' + name;
      contentArea.style.cssText = `
        height: calc(100% - 40px);
        overflow-y: auto;
        padding: 15px;
        color: #00FF00;
        background: #000000;
        font-size: 14px;
        line-height: 1.4;
        font-family: 'Courier New', monospace;
        white-space: pre-wrap;
        word-wrap: break-word;
      `;
      windowElement.appendChild(contentArea);

      // 添加到页面
      document.body.appendChild(windowElement);

      // 保存窗口引用
      windows.set(name, {
        element: windowElement,
        content: contentArea,
        components: new Map()
      });

      return name;
    }

    addDragFunctionality(windowElement, titleBar) {
      let dragging = false;
      let dragOffset = { x: 0, y: 0 };

      titleBar.addEventListener('mousedown', (e) => {
        dragging = true;
        dragOffset = {
          x: e.clientX - windowElement.offsetLeft,
          y: e.clientY - windowElement.offsetTop
        };
        windowElement.style.zIndex = 10000;
      });

      document.addEventListener('mousemove', (e) => {
        if (dragging) {
          windowElement.style.left = (e.clientX - dragOffset.x) + 'px';
          windowElement.style.top = (e.clientY - dragOffset.y) + 'px';
        }
      });

      document.addEventListener('mouseup', () => {
        dragging = false;
        windowElement.style.zIndex = 9999;
      });
    }

    closeCustomWindow(args) {
      const name = args.NAME;
      const windowObj = windows.get(name);
      if (windowObj) {
        windowObj.element.remove();
        windows.delete(name);
      }
    }

    closeAllWindows() {
      windows.forEach((windowObj, name) => {
        windowObj.element.remove();
      });
      windows.clear();
    }

    getWindowList() {
      return Array.from(windows.keys()).join(',');
    }

    // ========== 新增功能：组件管理 ==========
    addButton(args) {
      const windowName = args.NAME;
      const label = args.LABEL;
      const x = args.X;
      const y = args.Y;
      
      const windowObj = windows.get(windowName);
      if (!windowObj) return;

      const id = 'button_' + windowName + '_' + nextComponentId++;
      const button = document.createElement('button');
      button.id = id;
      button.textContent = label;
      button.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        background: #003366;
        color: #00FF00;
        border: 1px solid #4444AA;
        padding: 8px 12px;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        cursor: pointer;
      `;
      
      button.addEventListener('click', () => {
        // 可以在这里触发Scratch事件
      });

      windowObj.element.appendChild(button);
      windowObj.components.set(label, {type: 'button', element: button});
      return id;
    }

    addSlider(args) {
      const windowName = args.NAME;
      const label = args.LABEL;
      const x = args.X;
      const y = args.Y;
      const min = args.MIN;
      const max = args.MAX;
      const defaultValue = args.DEFAULT;
      
      const windowObj = windows.get(windowName);
      if (!windowObj) return;

      const id = 'slider_' + windowName + '_' + nextComponentId++;
      
      const container = document.createElement('div');
      container.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        display: flex;
        align-items: center;
        color: #00FF00;
        font-family: 'Courier New', monospace;
      `;
      
      const labelElement = document.createElement('span');
      labelElement.textContent = label;
      labelElement.style.marginRight = '10px';
      
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = min;
      slider.max = max;
      slider.value = defaultValue;
      slider.style.width = '150px';
      
      container.appendChild(labelElement);
      container.appendChild(slider);
      windowObj.element.appendChild(container);
      
      windowObj.components.set(label, {type: 'slider', element: slider});
      return id;
    }

    addCheckbox(args) {
      const windowName = args.NAME;
      const label = args.LABEL;
      const x = args.X;
      const y = args.Y;
      const state = args.STATE;
      
      const windowObj = windows.get(windowName);
      if (!windowObj) return;

      const id = 'checkbox_' + windowName + '_' + nextComponentId++;
      
      const container = document.createElement('div');
      container.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        display: flex;
        align-items: center;
        color: #00FF00;
        font-family: 'Courier New', monospace;
      `;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = state;
      checkbox.style.marginRight = '8px';
      
      const labelElement = document.createElement('span');
      labelElement.textContent = label;
      
      container.appendChild(checkbox);
      container.appendChild(labelElement);
      windowObj.element.appendChild(container);
      
      windowObj.components.set(label, {type: 'checkbox', element: checkbox});
      return id;
    }

    addDropdown(args) {
      const windowName = args.NAME;
      const label = args.LABEL;
      const x = args.X;
      const y = args.Y;
      const options = args.OPTIONS.split(',');
      
      const windowObj = windows.get(windowName);
      if (!windowObj) return;

      const id = 'dropdown_' + windowName + '_' + nextComponentId++;
      
      const container = document.createElement('div');
      container.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        display: flex;
        align-items: center;
        color: #00FF00;
        font-family: 'Courier New', monospace;
      `;
      
      const labelElement = document.createElement('span');
      labelElement.textContent = label;
      labelElement.style.marginRight = '10px';
      
      const dropdown = document.createElement('select');
      dropdown.style.background = '#000022';
      dropdown.style.color = '#00FF00';
      dropdown.style.border = '1px solid #4444AA';
      dropdown.style.padding = '4px';
      dropdown.style.borderRadius = '4px';
      
      options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        dropdown.appendChild(optionElement);
      });
      
      container.appendChild(labelElement);
      container.appendChild(dropdown);
      windowObj.element.appendChild(container);
      
      windowObj.components.set(label, {type: 'dropdown', element: dropdown});
      return id;
    }

    addTextbox(args) {
      const windowName = args.NAME;
      const label = args.LABEL;
      const x = args.X;
      const y = args.Y;
      const text = args.TEXT;
      
      const windowObj = windows.get(windowName);
      if (!windowObj) return;

      const id = 'textbox_' + windowName + '_' + nextComponentId++;
      
      const container = document.createElement('div');
      container.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        display: flex;
        align-items: center;
        color: #00FF00;
        font-family: 'Courier New', monospace;
      `;
      
      const labelElement = document.createElement('span');
      labelElement.textContent = label;
      labelElement.style.marginRight = '10px';
      
      const textbox = document.createElement('input');
      textbox.type = 'text';
      textbox.value = text;
      textbox.style.background = '#000022';
      textbox.style.color = '#00FF00';
      textbox.style.border = '1px solid #4444AA';
      textbox.style.padding = '4px';
      textbox.style.borderRadius = '4px';
      
      container.appendChild(labelElement);
      container.appendChild(textbox);
      windowObj.element.appendChild(container);
      
      windowObj.components.set(label, {type: 'textbox', element: textbox});
      return id;
    }

    addCustomLabel(args) {
      const windowName = args.NAME;
      const text = args.TEXT;
      const x = args.X;
      const y = args.Y;
      const color = args.COLOR;
      
      const windowObj = windows.get(windowName);
      if (!windowObj) return;

      const id = 'label_' + windowName + '_' + nextComponentId++;
      
      const labelElement = document.createElement('div');
      labelElement.id = id;
      labelElement.textContent = text;
      labelElement.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        color: ${color};
        font-family: 'Courier New', monospace;
        font-size: 14px;
      `;
      
      windowObj.element.appendChild(labelElement);
      
      windowObj.components.set(text, {type: 'label', element: labelElement});
      return id;
    }

    // ========== 新增功能：组件交互 ==========
    getSliderValue(args) {
      const windowName = args.NAME;
      const label = args.LABEL;
      
      const windowObj = windows.get(windowName);
      if (!windowObj) return 0;
      
      const component = windowObj.components.get(label);
      if (component && component.type === 'slider') {
        return component.element.value;
      }
      return 0;
    }

    getCheckboxState(args) {
      const windowName = args.NAME;
      const label = args.LABEL;
      
      const windowObj = windows.get(windowName);
      if (!windowObj) return false;
      
      const component = windowObj.components.get(label);
      if (component && component.type === 'checkbox') {
        return component.element.checked;
      }
      return false;
    }

    getDropdownSelection(args) {
      const windowName = args.NAME;
      const label = args.LABEL;
      
      const windowObj = windows.get(windowName);
      if (!windowObj) return '';
      
      const component = windowObj.components.get(label);
      if (component && component.type === 'dropdown') {
        return component.element.value;
      }
      return '';
    }

    getTextboxValue(args) {
      const windowName = args.NAME;
      const label = args.LABEL;
      
      const windowObj = windows.get(windowName);
      if (!windowObj) return '';
      
      const component = windowObj.components.get(label);
      if (component && component.type === 'textbox') {
        return component.element.value;
      }
      return '';
    }

    // ========== 新增功能：设备信息 ==========
    getBrowserInfo() {
      return navigator.userAgent;
    }

    getPlatformInfo() {
      return navigator.platform;
    }

    getScreenInfo() {
      return `${screen.width}x${screen.height} (${screen.colorDepth}位)`;
    }

    getLanguageInfo() {
      return navigator.language;
    }

    isOnline() {
      return navigator.onLine;
    }
  }

  // 注册 GmyOS 扩展
  if (typeof Scratch !== 'undefined' && Scratch.extensions) {
    Scratch.extensions.register(new GmyOSWindowExtension());
  } else if (typeof window !== 'undefined') {
    // 用于测试环境
    window.GmyOSWindowExtension = GmyOSWindowExtension;
  }
})(typeof Scratch !== 'undefined' ? Scratch : {});
