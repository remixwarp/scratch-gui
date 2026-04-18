// 加载Chart.js库
async function loadChartJS() {
  return new Promise((resolve, reject) => {
    if (window.Chart) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/chart.js@4.4.0/dist/chart.umd.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
import icon from '!../../../lib/tw-recolor/build!./SPA.svg'
import WindowManager from '../../window-system/window-manager.js';

export default async function ({ addon, msg, safeMsg, console }) {
  // 加载Chart.js库
  await loadChartJS();
  
  // 项目分析器类
  class SimpleProjectAnalyzer {
    constructor() {
      this.analyzeButton = null;
      this.analyzeWindow = null;
      this.chartInstance = null;
      this.mathLogicChartInstance = null;
      this.drScratchChartInstance = null;
    }

    // 创建分析按钮
    async createAnalyzeButton() {
      // 如果按钮已存在且在DOM中，直接返回
      if (this.analyzeButton && document.contains(this.analyzeButton)) {
        return;
      }

      try {
        console.log('Simple Project Analyzer: Creating analyze button...');
        
        // 尝试获取 VSCodeLayout 设置，添加错误处理
        let VSCodeLayout = false;
        try {
          const aeSettings = localStorage.getItem('AESettings');
          if (aeSettings) {
            VSCodeLayout = JSON.parse(aeSettings).EnableVSCodeLayout || false;
          }
          console.log('Simple Project Analyzer: VSCodeLayout setting:', VSCodeLayout);
        } catch (e) {
          console.log('Simple Project Analyzer: AESettings not found, using default layout');
        }

        this.analyzeButton = document.createElement('button');
        this.analyzeButton.className = addon.tab.scratchClass('menu-bar_menu-bar-button', {
          others: 'sa-analyze-button'
        });

        // 确保按钮显示中文
        this.analyzeButton.textContent = '分析';
        this.analyzeButton.title = '分析项目统计信息';

        // 添加自定义样式，确保按钮可见
        this.analyzeButton.style.padding = '8px 12px';
        this.analyzeButton.style.margin = '0 4px';
        this.analyzeButton.style.marginLeft = '40px';
        this.analyzeButton.style.backgroundColor = '#4CAF50';
        this.analyzeButton.style.color = 'white';
        this.analyzeButton.style.border = 'none';
        this.analyzeButton.style.borderRadius = '4px';
        this.analyzeButton.style.cursor = 'pointer';
        this.analyzeButton.style.fontSize = '14px';
        this.analyzeButton.style.fontWeight = 'bold';
        this.analyzeButton.style.order = '3';
        this.analyzeButton.style.position = 'relative';
        this.analyzeButton.style.zIndex = '1000';

        // 禁用时隐藏按钮
        addon.tab.displayNoneWhileDisabled(this.analyzeButton);

        this.analyzeButton.addEventListener('click', () => {
          console.log('Simple Project Analyzer: Analyze button clicked');
          this.showAnalysisWindow();
        });

        // 尝试多个位置来添加按钮
        let buttonAdded = false;

        // 不考虑VS Code布局，直接尝试添加到菜单栏
        try {
          console.log('Simple Project Analyzer: Trying to add button to menu bar...');
          // 查找菜单栏
          const menuBar = document.querySelector('[class^="menu-bar_main-menu"]');
          if (menuBar) {
            console.log('Simple Project Analyzer: Found menu bar');
            menuBar.appendChild(this.analyzeButton);
            console.log('Simple Project Analyzer: Added analyze button to menu bar');
            buttonAdded = true;
          } else {
            console.log('Simple Project Analyzer: Menu bar not found');
          }
        } catch (e) {
          console.error('Simple Project Analyzer: Failed to add analyze button to menu bar:', e);
        }

        // 如果添加到菜单栏失败，尝试添加到查找功能右边
        if (!buttonAdded) {
          try {
            console.log('Simple Project Analyzer: Trying to add button to find bar...');
            // 尝试查找查找功能
            const findBar = document.querySelector('.react-tabs');
            if (findBar && findBar.parentElement) {
              console.log('Simple Project Analyzer: Found find bar');
              // 在查找功能右边添加按钮
              findBar.parentElement.insertBefore(this.analyzeButton, findBar.nextSibling);
              console.log('Simple Project Analyzer: Added analyze button to find bar');
              buttonAdded = true;
            } else {
              console.log('Simple Project Analyzer: Find bar not found');
            }
          } catch (e) {
            console.error('Simple Project Analyzer: Failed to add analyze button to find bar:', e);
          }
        }

        // 如果还是没有添加成功，尝试添加到标签栏
        if (!buttonAdded) {
          try {
            console.log('Simple Project Analyzer: Trying to add button to tab bar...');
            // 查找标签栏
            const tabBar = document.querySelector('[class*="react-tabs_react-tabs__tab-list"]');
            if (tabBar) {
              console.log('Simple Project Analyzer: Found tab bar');
              tabBar.appendChild(this.analyzeButton);
              console.log('Simple Project Analyzer: Added analyze button to tab bar');
              buttonAdded = true;
            } else {
              console.log('Simple Project Analyzer: Tab bar not found');
            }
          } catch (e) {
            console.error('Simple Project Analyzer: Failed to add analyze button to tab bar:', e);
          }
        }

        // 如果还是没有添加成功，尝试添加到菜单栏
        if (!buttonAdded) {
          try {
            console.log('Simple Project Analyzer: Trying to add button to menu bar...');
            // 查找菜单栏
            const menuBar = document.querySelector('[class*="menu-bar_menu-bar"]');
            if (menuBar) {
              console.log('Simple Project Analyzer: Found menu bar');
              menuBar.appendChild(this.analyzeButton);
              console.log('Simple Project Analyzer: Added analyze button to menu bar');
              buttonAdded = true;
            } else {
              console.log('Simple Project Analyzer: Menu bar not found');
            }
          } catch (e) {
            console.error('Simple Project Analyzer: Failed to add analyze button to menu bar:', e);
          }
        }

        // 如果还是没有添加成功，尝试添加到body作为最后的 fallback
        if (!buttonAdded) {
          try {
            console.log('Simple Project Analyzer: Trying to add button to body as fallback...');
            document.body.appendChild(this.analyzeButton);
            // 设置绝对定位，确保按钮可见
            this.analyzeButton.style.position = 'fixed';
            this.analyzeButton.style.top = '10px';
            this.analyzeButton.style.right = '10px';
            this.analyzeButton.style.zIndex = '9999';
            this.analyzeButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            console.log('Simple Project Analyzer: Added analyze button to body as fallback');
            buttonAdded = true;
          } catch (e) {
            console.error('Simple Project Analyzer: Failed to add analyze button to body:', e);
          }
        }

        // 检查按钮是否成功添加
        if (buttonAdded) {
          console.log('Simple Project Analyzer: Analyze button created and added successfully');
          // 测试按钮是否可见
          const isVisible = this.analyzeButton.offsetParent !== null;
          console.log('Simple Project Analyzer: Button visibility:', isVisible);
          if (!isVisible) {
            console.log('Simple Project Analyzer: Button is not visible, checking styles...');
            console.log('Simple Project Analyzer: Button style display:', window.getComputedStyle(this.analyzeButton).display);
            console.log('Simple Project Analyzer: Button style visibility:', window.getComputedStyle(this.analyzeButton).visibility);
            console.log('Simple Project Analyzer: Button style opacity:', window.getComputedStyle(this.analyzeButton).opacity);
          }
        } else {
          console.error('Simple Project Analyzer: Failed to add analyze button to any location');
        }

      } catch (error) {
        console.error('Simple Project Analyzer: Error creating analyze button:', error);
      }
    }

    // 显示分析结果窗口
    showAnalysisWindow() {
      // 如果窗口已存在，显示并聚焦
      if (this.analyzeWindow) {
        this.analyzeWindow.show().bringToFront();
        return;
      }

      // 创建自由窗口
      this.analyzeWindow = WindowManager.createWindow({
        id: 'simple-project-analyzer',
        title: msg('modal-title', '项目复杂度分析'),
        width: 900,
        height: 700,
        minWidth: 700,
        minHeight: 500,
        className: 'sa-project-analyzer-window',
        onClose: () => {
          this.analyzeWindow = null;
          // 销毁图表实例
          if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
          }
          if (this.mathLogicChartInstance) {
            this.mathLogicChartInstance.destroy();
            this.mathLogicChartInstance = null;
          }
          if (this.drScratchChartInstance) {
            this.drScratchChartInstance.destroy();
            this.drScratchChartInstance = null;
          }
        }
      });

      // 创建内容容器
      const contentWrapper = document.createElement('div');
      contentWrapper.className = 'sa-analyze-content-wrapper';
      contentWrapper.style.cssText = `
        height: 100%;
        overflow-y: auto;
        padding: 15px;
        box-sizing: border-box;
      `;

      // 生成分析结果HTML
      const analysisHTML = this.generateAnalysisHTML();

      // 设置内容
      contentWrapper.innerHTML = `
        <div class="sa-analyze-loading" id="saAnalyzeLoading">
          <div class="sa-analyze-spinner"></div>
          <p>${msg('analyzing')}</p>
        </div>
        <div class="sa-analyze-results" id="saAnalyzeResults" style="display: none;">
          ${analysisHTML}
        </div>
      `;

      this.analyzeWindow.setContent(contentWrapper);
      this.analyzeWindow.show();

      // 异步分析项目
      this.analyzeProject();
    }

    // 分析项目
    async analyzeProject() {
      try {
        // 使用 vm.toJSON 获取项目数据
        const vm = addon.tab.traps.vm;
        const projectJSON = JSON.parse(vm.toJSON());
        
        // 执行分析
        const analysis = this.performAnalysis(projectJSON);

        // 更新UI
        this.updateAnalysisResults(analysis);
      } catch (error) {
        console.error(msg('analysis-error', '分析项目时出错:'), error);
        document.getElementById('saAnalyzeLoading').innerHTML = `
          <p style="color: #d32f2f;">${msg('analysis-error')}</p>
        `;
      }
    }

    // 执行分析
    performAnalysis(projectData) {
      const analysis = {
        totalBlocks: 0,
        codeTypes: {},
        extensions: [],
        sprites: 0,
        stageInfo: {},
        editorPlatform: 'Scratch',
        effectiveBlocks: 0,
        functionDefinitions: 0,
        projectSize: 0,
        costumesSize: 0,
        soundsSize: 0,
        costumeCount: 0,
        soundCount: 0,
        variableCount: 0,
        listCount: 0
      };

      // 分析扩展
      this.analyzeExtensions(analysis, projectData);
      
      // 创建扩展名称映射
      const extensionNameMap = {};
      analysis.extensions.forEach(ext => {
        extensionNameMap[ext.id] = ext.name;
      });
      
      // 分析代码块
      this.analyzeBlocks(analysis, projectData, extensionNameMap);
      
      // 分析精灵和舞台
      this.analyzeSprites(analysis, projectData);
      
      // 分析有效积木和函数定义
      this.analyzeEffectiveBlocks(analysis, projectData);
      
      return analysis;
    }

    // 分析代码块
    analyzeBlocks(analysis, projectData, extensionNameMap = {}) {
      const targets = projectData.targets || [];
      
      targets.forEach(target => {
        const blocks = target.blocks || {};
        
        Object.values(blocks).forEach(block => {
          if (block.opcode) {
            analysis.totalBlocks++;
            
            const category = this.getBlockCategory(block.opcode, extensionNameMap);
            analysis.codeTypes[category] = (analysis.codeTypes[category] || 0) + 1;
          }
        });
      });
    }

    // 获取积木类型
    getBlockCategory(opcode, extensionNameMap = {}) {
      if (opcode.startsWith('motion_')) return msg('motion', '运动');
      if (opcode.startsWith('looks_')) return msg('looks', '外观');
      if (opcode.startsWith('sound_')) return msg('sound', '声音');
      if (opcode.startsWith('event_')) return msg('events', '事件');
      if (opcode.startsWith('control_')) return msg('control', '控制');
      if (opcode.startsWith('sensing_')) return msg('sensing', '侦测');
      if (opcode.startsWith('operator_')) return msg('operators', '运算');
      if (opcode.startsWith('data_')) return msg('data', '数据');
      if (opcode.startsWith('video_')) return msg('video', '视频');
      
      // 自定义函数和参数
      if (opcode.startsWith('procedures_')) return msg('custom-functions', '自定义函数');
      if (opcode.startsWith('argument_')) return msg('custom-functions', '自定义函数');
      
      // 扩展积木处理
      if (!this.isStandardBlock(opcode)) {
        const extensionId = this.getExtensionIdFromOpcode(opcode);
        // 优先使用解析的中文名称
        if (extensionNameMap[extensionId]) {
          return extensionNameMap[extensionId];
        }
        // 回退到默认名称
        return this.getExtensionNameFromId(extensionId);
      }
      
      return msg('other', '其他');
    }

    // 检查是否为标准积木
    isStandardBlock(opcode) {
      const standardCategories = [
        'motion_', 'looks_', 'sound_', 'event_', 'control_', 
        'sensing_', 'operator_', 'data_', 'video_',
        'procedures_', 'argument_'
      ];
      
      return standardCategories.some(category => opcode.startsWith(category));
    }

    // 从积木操作码提取扩展ID
    getExtensionIdFromOpcode(opcode) {
      const underscoreIndex = opcode.indexOf('_');
      if (underscoreIndex > 0) {
        return opcode.substring(0, underscoreIndex);
      }
      return opcode;
    }

    // 从扩展ID获取扩展名称
    getExtensionNameFromId(extensionId) {
      const defaultExtensionNames = {
        'music': 'Music',
        'pen': 'Pen',
        'videoSensing': 'Video Sensing',
        'text2speech': 'Text to Speech',
        'translate': 'Translate',
        'makeymakey': 'Makey Makey',
        'microbit': 'micro:bit',
        'ev3': 'LEGO EV3',
        'wedo2': 'LEGO WeDo 2.0',
        'boost': 'LEGO BOOST'
      };
      
      return defaultExtensionNames[extensionId] || extensionId;
    }

    // 分析扩展
    analyzeExtensions(analysis, projectData) {
      const extensions = projectData.extensions || [];
      const extensionURLs = projectData.extensionURLs || {};
      
      // 获取所有扩展积木操作码
      const extensionBlocks = this.getExtensionBlocks(projectData);
      
      // 分析扩展信息
      extensions.forEach(ext => {
        let extensionName = this.getExtensionNameFromId(ext);
        let extensionColor = null;
        
        const extensionInfo = {
          id: ext,
          name: extensionName,
          color: extensionColor,
          url: extensionURLs[ext] || null,
          blocks: extensionBlocks.filter(block => block.extensionId === ext)
        };
        
        analysis.extensions.push(extensionInfo);
      });
      
      // 检查画笔扩展使用情况
      const penBlocks = extensionBlocks.filter(block => block.extensionId === 'pen');
      if (penBlocks.length > 0 && !extensions.includes('pen')) {
        const penExtensionInfo = {
          id: 'pen',
          name: msg('extension-pen', '画笔'),
          color: null,
          url: null,
          blocks: penBlocks
        };
        analysis.extensions.push(penExtensionInfo);
      }
    }

    // 获取扩展积木
    getExtensionBlocks(projectData) {
      const extensionBlocks = [];
      const targets = projectData.targets || [];
      
      targets.forEach(target => {
        const blocks = target.blocks || {};
        Object.values(blocks).forEach(block => {
          if (block.opcode && !this.isStandardBlock(block.opcode)) {
            const extensionId = this.getExtensionIdFromOpcode(block.opcode);
            extensionBlocks.push({
              opcode: block.opcode,
              extensionId: extensionId
            });
          }
        });
      });
      
      return extensionBlocks;
    }

    // 分析精灵和舞台
    analyzeSprites(analysis, projectData) {
      const targets = projectData.targets || [];
      const sprites = targets.filter(t => !t.isStage);
      const stage = targets.find(t => t.isStage);
      
      analysis.sprites = sprites.length;
      
      // 统计造型和声音
      targets.forEach(target => {
        if (target.costumes) {
          analysis.costumeCount += target.costumes.length;
        }
        if (target.sounds) {
          analysis.soundCount += target.sounds.length;
        }
        if (target.variables) {
          analysis.variableCount += Object.keys(target.variables).length;
        }
        if (target.lists) {
          analysis.listCount += Object.keys(target.lists).length;
        }
      });
    }

    // 分析有效积木和函数定义
    analyzeEffectiveBlocks(analysis, projectData) {
      const targets = projectData.targets || [];
      
      targets.forEach(target => {
        const blocks = target.blocks || {};
        Object.values(blocks).forEach(block => {
          if (block.opcode) {
            // 统计有效积木（非 shadow）
            if (!block.shadow) {
              analysis.effectiveBlocks++;
            }
            
            // 统计函数定义
            if (block.opcode === 'procedures_definition') {
              analysis.functionDefinitions++;
            }
          }
        });
      });
    }

    // 计算Dr.Scratch评分
    calculateDrScratchScores(projectData) {
      const scores = {
        [msg('abstraction', '抽象和问题分解')]: 0,
        [msg('parallelism', '并行性')]: 0,
        [msg('logic', '逻辑思维')]: 0,
        [msg('synchronization', '同步')]: 0,
        [msg('flow-control', '流程控制')]: 0,
        [msg('user-interactivity', '用户交互')]: 0,
        [msg('data-representation', '数据表示')]: 0
      };

      const targets = projectData.targets || [];
      const blockTypes = new Set(); // 存储所有使用的积木块种类
      const eventBlockTypes = new Set(); // 存储事件积木块种类
      const controlBlockTypes = new Set(); // 存储控制积木块种类
      const operatorBlockTypes = new Set(); // 存储运算积木块种类
      const dataBlockTypes = new Set(); // 存储数据积木块种类
      const sensingBlockTypes = new Set(); // 存储侦测积木块种类
      const motionBlockTypes = new Set(); // 存储运动积木块种类
      const looksBlockTypes = new Set(); // 存储外观积木块种类
      const soundBlockTypes = new Set(); // 存储声音积木块种类
      const procedureBlockTypes = new Set(); // 存储自定义积木块种类
      const variableNames = new Set();
      const listNames = new Set();

      // 收集所有积木块种类
      targets.forEach(target => {
        const blocks = target.blocks || {};
        Object.values(blocks).forEach(block => {
          if (block.opcode) {
            blockTypes.add(block.opcode);
            
            // 分类收集积木块种类
            if (block.opcode.startsWith('event_')) {
              eventBlockTypes.add(block.opcode);
            }
            if (block.opcode.startsWith('control_')) {
              controlBlockTypes.add(block.opcode);
            }
            if (block.opcode.startsWith('operator_')) {
              operatorBlockTypes.add(block.opcode);
            }
            if (block.opcode.startsWith('data_')) {
              dataBlockTypes.add(block.opcode);
            }
            if (block.opcode.startsWith('sensing_')) {
              sensingBlockTypes.add(block.opcode);
            }
            if (block.opcode.startsWith('motion_')) {
              motionBlockTypes.add(block.opcode);
            }
            if (block.opcode.startsWith('looks_')) {
              looksBlockTypes.add(block.opcode);
            }
            if (block.opcode.startsWith('sound_')) {
              soundBlockTypes.add(block.opcode);
            }
            if (block.opcode.startsWith('procedures_')) {
              procedureBlockTypes.add(block.opcode);
            }
          }
        });

        // 收集变量和列表名称
        if (target.variables) {
          Object.values(target.variables).forEach(variable => {
            if (Array.isArray(variable) && variable.length > 0) {
              variableNames.add(variable[0]);
            }
          });
        }
        if (target.lists) {
          Object.values(target.lists).forEach(list => {
            if (Array.isArray(list) && list.length > 0) {
              listNames.add(list[0]);
            }
          });
        }
      });

      // 1. 抽象和问题分解 (Abstraction and problem decomposition)
      // 完全基于积木块种类评分
      const spriteCount = targets.filter(t => !t.isStage).length;
      const hasMultipleSprites = spriteCount > 1;
      const hasMultipleScripts = eventBlockTypes.size > 1; // 多种事件积木表示多个脚本
      const hasCustomBlocks = procedureBlockTypes.has('procedures_definition');
      const hasClones = controlBlockTypes.has('control_create_clone_of') || controlBlockTypes.has('control_start_as_clone');
      
      if (hasMultipleSprites && hasMultipleScripts) {
        scores[msg('abstraction', '抽象和问题分解')] = 1; // Basic
      }
      if (hasCustomBlocks) {
        scores[msg('abstraction', '抽象和问题分解')] = 2; // Developing
      }
      if (hasClones) {
        scores[msg('abstraction', '抽象和问题分解')] = 3; // Proficiency
      }

      // 2. 并行性 (Parallelism)
      // 基于不同的事件积木块种类
      const hasGreenFlag = eventBlockTypes.has('event_whenflagclicked');
      const hasKeyEvents = eventBlockTypes.has('event_whenkeypressed');
      const hasClickEvents = eventBlockTypes.has('event_whenthisspriteclicked');
      const hasMessageEvents = eventBlockTypes.has('event_whenbroadcastreceived');
      const hasCloneEvents = controlBlockTypes.has('control_create_clone_of');
      const hasSensorEvents = eventBlockTypes.has('event_whengreaterthan');
      const hasBackdropEvents = eventBlockTypes.has('event_whenbackdropswitchesto');
      
      if (hasGreenFlag && eventBlockTypes.size > 1) {
        scores[msg('parallelism', '并行性')] = 1; // Basic - 多个绿旗脚本
      }
      if ((hasKeyEvents || hasClickEvents) && (eventBlockTypes.size > 2)) {
        scores[msg('parallelism', '并行性')] = 2; // Developing - 按键或点击事件
      }
      if (hasMessageEvents || hasCloneEvents || hasSensorEvents || hasBackdropEvents) {
        scores[msg('parallelism', '并行性')] = 3; // Proficiency - 消息、克隆或传感器事件
      }

      // 3. 逻辑思维 (Logical thinking)
      // 基于不同的逻辑积木块种类
      const hasIf = controlBlockTypes.has('control_if');
      const hasIfElse = controlBlockTypes.has('control_if_else');
      const hasLogicOps = operatorBlockTypes.has('operator_and') || 
                         operatorBlockTypes.has('operator_or') || 
                         operatorBlockTypes.has('operator_not');
      
      if (hasIf) {
        scores[msg('logic', '逻辑思维')] = 1; // Basic
      }
      if (hasIfElse) {
        scores[msg('logic', '逻辑思维')] = 2; // Developing
      }
      if (hasLogicOps) {
        scores[msg('logic', '逻辑思维')] = 3; // Proficiency
      }

      // 4. 同步 (Synchronization)
      // 基于不同的同步积木块种类
      const hasWait = controlBlockTypes.has('control_wait');
      const hasBroadcast = eventBlockTypes.has('event_broadcast');
      const hasReceiveMessage = eventBlockTypes.has('event_whenbroadcastreceived');
      const hasStopAll = controlBlockTypes.has('control_stop_all');
      const hasStopThis = controlBlockTypes.has('control_stop_this_script');
      const hasStopOther = controlBlockTypes.has('control_stop_other_scripts_in_sprite');
      const hasWaitUntil = controlBlockTypes.has('control_wait_until');
      const hasBackdropChange = looksBlockTypes.has('looks_nextbackdrop') || looksBlockTypes.has('looks_switchbackdropto');
      const hasBroadcastAndWait = eventBlockTypes.has('event_broadcastandwait');
      
      if (hasWait) {
        scores[msg('synchronization', '同步')] = 1; // Basic
      }
      if (hasBroadcast || hasReceiveMessage || hasStopAll || hasStopThis || hasStopOther) {
        scores[msg('synchronization', '同步')] = 2; // Developing
      }
      if (hasWaitUntil || hasBackdropChange || hasBroadcastAndWait) {
        scores[msg('synchronization', '同步')] = 3; // Proficiency
      }

      // 5. 流程控制 (Flow control)
      // 基于不同的流程控制积木块种类
      const hasSequence = blockTypes.size > 0; // 任何积木块都表示有序列
      const hasRepeat = controlBlockTypes.has('control_repeat') || controlBlockTypes.has('control_forever');
      const hasRepeatUntil = controlBlockTypes.has('control_repeat_until');
      
      if (hasSequence) {
        scores[msg('flow-control', '流程控制')] = 1; // Basic
      }
      if (hasRepeat) {
        scores[msg('flow-control', '流程控制')] = 2; // Developing
      }
      if (hasRepeatUntil) {
        scores[msg('flow-control', '流程控制')] = 3; // Proficiency
      }

      // 6. 用户交互 (User Interactivity)
      // 基于不同的交互积木块种类
      const hasGreenFlagEvent = eventBlockTypes.has('event_whenflagclicked');
      const hasKeyPressedEvent = eventBlockTypes.has('event_whenkeypressed');
      const hasSpriteClickedEvent = eventBlockTypes.has('event_whenthisspriteclicked');
      const hasAskWait = sensingBlockTypes.has('sensing_askandwait');
      const hasMouseBlocks = sensingBlockTypes.has('sensing_mousedown') || 
                            sensingBlockTypes.has('sensing_mousex') || 
                            sensingBlockTypes.has('sensing_mousey');
      const hasSensorGreater = eventBlockTypes.has('event_whengreaterthan');
      const hasVideo = Array.from(blockTypes).some(type => type.startsWith('video_'));
      const hasAudioInteraction = soundBlockTypes.has('sound_playuntildone') || 
                                 soundBlockTypes.has('sound_setvolumeto') ||
                                 soundBlockTypes.has('sound_changevolumeby');
      
      if (hasGreenFlagEvent) {
        scores[msg('user-interactivity', '用户交互')] = 1; // Basic
      }
      if (hasKeyPressedEvent || hasSpriteClickedEvent || hasAskWait || hasMouseBlocks) {
        scores[msg('user-interactivity', '用户交互')] = 2; // Developing
      }
      if (hasSensorGreater || hasVideo || hasAudioInteraction) {
        scores[msg('user-interactivity', '用户交互')] = 3; // Proficiency
      }

      // 7. 数据表示 (Data representation)
      // 基于不同的数据积木块种类
      const hasSpriteModifiers = motionBlockTypes.size > 0 || looksBlockTypes.size > 0 || soundBlockTypes.size > 0;
      const hasVariableOperations = variableNames.size > 0 && dataBlockTypes.size > 0;
      const hasListOperations = listNames.size > 0 && Array.from(dataBlockTypes).some(type => type.includes('list'));
      
      if (hasSpriteModifiers) {
        scores[msg('data-representation', '数据表示')] = 1; // Basic
      }
      if (hasVariableOperations) {
        scores[msg('data-representation', '数据表示')] = 2; // Developing
      }
      if (hasListOperations) {
        scores[msg('data-representation', '数据表示')] = 3; // Proficiency
      }

      return scores;
    }

    // 计算数学逻辑评分
    calculateMathLogicScores(projectData) {
      const targets = projectData.targets || [];
      
      // 统计各类积木块数量
      let operatorCount = 0;
      let controlCount = 0;
      let dataCount = 0;

      targets.forEach(target => {
        const blocks = target.blocks || {};
        Object.values(blocks).forEach(block => {
          if (!block.opcode) return;
          
          if (block.opcode.startsWith('operator_')) {
            operatorCount++;
          }
          
          if (block.opcode.startsWith('control_')) {
            controlCount++;
          }
          
          if (block.opcode.startsWith('data_')) {
            dataCount++;
          }
        });
      });

      const scores = {
        [msg('operation-complexity', 'Operation Complexity')]: operatorCount,
        [msg('logic-depth', 'Logic Depth')]: controlCount,
        [msg('data-magnitude', 'Data Magnitude')]: dataCount
      };

      return scores;
    }

    // 格式化文件大小
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 生成分析结果HTML
    generateAnalysisHTML() {
      return `
        <div class="sa-analyze-modal-body">
          <!-- 项目统计部分 -->
          <div class="sa-analyze-section">
            <h3 class="sa-analyze-section-title">${msg('project-stats', '项目统计')}</h3>
            <div class="sa-analyze-stats-grid" id="saStatsGrid">
              <div class="sa-analyze-stat">
                <div class="sa-analyze-stat-value">-</div>
                <div class="sa-analyze-stat-label">${msg('total-blocks', '总代码块数')}</div>
              </div>
              <div class="sa-analyze-stat">
                <div class="sa-analyze-stat-value">-</div>
                <div class="sa-analyze-stat-label">${msg('effective-blocks', '有效积木')}</div>
              </div>
              <div class="sa-analyze-stat">
                <div class="sa-analyze-stat-value">-</div>
                <div class="sa-analyze-stat-label">${msg('function-definitions', '函数定义')}</div>
              </div>
              <div class="sa-analyze-stat">
                <div class="sa-analyze-stat-value">-</div>
                <div class="sa-analyze-stat-label">${msg('stat-sprites', '精灵数量')}</div>
              </div>
              <div class="sa-analyze-stat">
                <div class="sa-analyze-stat-value">-</div>
                <div class="sa-analyze-stat-label">${msg('stat-costumes', '造型数量')}</div>
              </div>
              <div class="sa-analyze-stat">
                <div class="sa-analyze-stat-value">-</div>
                <div class="sa-analyze-stat-label">${msg('stat-sounds', '声音数量')}</div>
              </div>
              <div class="sa-analyze-stat">
                <div class="sa-analyze-stat-value">-</div>
                <div class="sa-analyze-stat-label">${msg('stat-variables', '变量数量')}</div>
              </div>
              <div class="sa-analyze-stat">
                <div class="sa-analyze-stat-value">-</div>
                <div class="sa-analyze-stat-label">${msg('stat-lists', '列表数量')}</div>
              </div>
              <div class="sa-analyze-stat">
                <div class="sa-analyze-stat-value">-</div>
                <div class="sa-analyze-stat-label">${msg('extensions', '扩展数量')}</div>
              </div>
            </div>
          </div>

          <!-- 代码类型分布 -->
          <div class="sa-analyze-section">
            <h3 class="sa-analyze-section-title">${msg('block-distribution', '代码类型分布')}</h3>
            <div class="sa-analyze-chart-container">
              <canvas id="saCodeTypeChart" width="400" height="200"></canvas>
            </div>
          </div>

          <!-- Dr.Scratch评分系统 -->
          <div class="sa-analyze-section">
            <h3 class="sa-analyze-section-title">${msg('dr-scratch-score', 'Dr.Scratch评分系统')}</h3>
            <div class="sa-analyze-row">
              <div class="sa-analyze-col-6">
                <div class="sa-analyze-chart-container">
                  <canvas id="saDrScratchChart" width="400" height="300"></canvas>
                </div>
              </div>
              <div class="sa-analyze-col-6">
                <div class="sa-analyze-score-details" id="saDrScratchDetails">
                  <div class="sa-analyze-score-summary">
                    <h4>${msg('total-score', '总分')}：<span id="saDrScratchTotalScore">0</span> / 21</h4>
                    <div class="sa-analyze-score-level" id="saDrScratchScoreLevel">${msg('evaluation-level', '评估等级')}：${msg('calculating', '计算中...')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 核心数学能力评估 -->
          <div class="sa-analyze-section">
            <h3 class="sa-analyze-section-title">${msg('math-logic-assessment', '核心数学能力评估')}</h3>
            <div class="sa-analyze-row">
              <div class="sa-analyze-col-6">
                <div class="sa-analyze-chart-container">
                  <canvas id="saMathLogicChart" width="400" height="300"></canvas>
                </div>
              </div>
              <div class="sa-analyze-col-6">
                <div class="sa-analyze-score-details" id="saMathLogicDetails">
                  <div class="sa-analyze-score-summary">
                    <h4>${msg('math-total-score', '数学总分')}：<span id="saMathTotalScore">0</span> ${msg('blocks-count', '')}</h4>
                    <div class="sa-analyze-score-level" id="saMathScoreLevel">${msg('evaluation-level', '评估等级')}：${msg('calculating', '计算中...')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 使用的扩展 -->
          <div class="sa-analyze-section">
            <h3 class="sa-analyze-section-title">${msg('extensions-used', '使用的扩展')}</h3>
            <div class="sa-analyze-extension-list" id="saExtensionList">
              <p>${msg('loading', '加载中...')}</p>
            </div>
          </div>
        </div>
      `;
    }

    // 更新分析结果
    updateAnalysisResults(analysis) {
      // 更新统计数据
      this.updateStats(analysis);
      
      // 更新代码类型分布图
      this.displayCodeTypeChart(analysis);
      
      // 计算并更新Dr.Scratch评分
      const vm = addon.tab.traps.vm;
      const projectJSON = JSON.parse(vm.toJSON());
      const drScratchScores = this.calculateDrScratchScores(projectJSON);
      this.displayDrScratchScores(drScratchScores);
      
      // 计算并更新数学逻辑评分
      const mathLogicScores = this.calculateMathLogicScores(projectJSON);
      this.displayMathLogicScores(mathLogicScores);
      
      // 更新扩展列表
      this.displayExtensions(analysis.extensions);

      // 显示结果，隐藏加载
      document.getElementById('saAnalyzeLoading').style.display = 'none';
      document.getElementById('saAnalyzeResults').style.display = 'block';
    }

    // 更新统计数据
    updateStats(analysis) {
      const statsGrid = document.getElementById('saStatsGrid');
      const totalExtensionBlocks = analysis.extensions.reduce((sum, ext) => sum + ext.blocks.length, 0);
      
      statsGrid.innerHTML = `
        <div class="sa-analyze-stat">
          <div class="sa-analyze-stat-value">${analysis.totalBlocks}</div>
          <div class="sa-analyze-stat-label">${msg('total-blocks', '总代码块数')}</div>
        </div>
        <div class="sa-analyze-stat">
          <div class="sa-analyze-stat-value">${analysis.effectiveBlocks}</div>
          <div class="sa-analyze-stat-label">${msg('effective-blocks', '有效积木')}</div>
        </div>
        <div class="sa-analyze-stat">
          <div class="sa-analyze-stat-value">${analysis.functionDefinitions}</div>
          <div class="sa-analyze-stat-label">${msg('function-definitions', '函数定义')}</div>
        </div>
        <div class="sa-analyze-stat">
          <div class="sa-analyze-stat-value">${analysis.sprites}</div>
          <div class="sa-analyze-stat-label">${msg('stat-sprites', '精灵数量')}</div>
        </div>
        <div class="sa-analyze-stat">
          <div class="sa-analyze-stat-value">${analysis.costumeCount}</div>
          <div class="sa-analyze-stat-label">${msg('stat-costumes', '造型数量')}</div>
        </div>
        <div class="sa-analyze-stat">
          <div class="sa-analyze-stat-value">${analysis.soundCount}</div>
          <div class="sa-analyze-stat-label">${msg('stat-sounds', '声音数量')}</div>
        </div>
        <div class="sa-analyze-stat">
          <div class="sa-analyze-stat-value">${analysis.variableCount}</div>
          <div class="sa-analyze-stat-label">${msg('stat-variables', '变量数量')}</div>
        </div>
        <div class="sa-analyze-stat">
          <div class="sa-analyze-stat-value">${analysis.listCount}</div>
          <div class="sa-analyze-stat-label">${msg('stat-lists', '列表数量')}</div>
        </div>
        <div class="sa-analyze-stat">
          <div class="sa-analyze-stat-value">${analysis.extensions.length}</div>
          <div class="sa-analyze-stat-label">${msg('extensions', '扩展数量')}</div>
        </div>
      `;
    }

    // 显示代码类型分布图
    displayCodeTypeChart(analysis) {
      const canvas = document.getElementById('saCodeTypeChart');
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      
      // 定义标准类别的固定顺序
      const standardOrder = [
        msg('motion', '运动'),
        msg('looks', '外观'),
        msg('sound', '声音'),
        msg('events', '事件'),
        msg('control', '控制'),
        msg('sensing', '侦测'),
        msg('operators', '运算'),
        msg('data', '数据'),
        msg('custom-functions', '自定义函数')
      ];
      
      // 分离标准和扩展类别
      const standardCategories = {};
      const extensionCategories = {};
      
      Object.keys(analysis.codeTypes).forEach(category => {
        if (standardOrder.includes(category)) {
          standardCategories[category] = analysis.codeTypes[category];
        } else {
          extensionCategories[category] = analysis.codeTypes[category];
        }
      });
      
      // 按固定顺序排列标准类别
      const orderedStandard = {};
      standardOrder.forEach(category => {
        if (standardCategories[category]) {
          orderedStandard[category] = standardCategories[category];
        }
      });
      
      // 按字母顺序排序扩展类别
      const sortedExtensions = {};
      Object.keys(extensionCategories).sort().forEach(category => {
        sortedExtensions[category] = extensionCategories[category];
      });
      
      // 合并排序后的数据
      const sortedCodeTypes = { ...orderedStandard, ...sortedExtensions };
      const sortedLabels = Object.keys(sortedCodeTypes);
      const sortedData = Object.values(sortedCodeTypes);
      
      // 定义每个类别的颜色
      const categoryColors = {
        [msg('motion', '运动')]: '#4C97FF',
        [msg('looks', '外观')]: '#9966FF',
        [msg('sound', '声音')]: '#CF63CF',
        [msg('events', '事件')]: '#FFBF00',
        [msg('control', '控制')]: '#FFAB19',
        [msg('sensing', '侦测')]: '#5CB1D6',
        [msg('operators', '运算')]: '#59C059',
        [msg('data', '数据')]: '#FF8C1A',
        [msg('custom-functions', '自定义函数')]: '#FF6680'
      };
      
      // 为扩展生成默认颜色
      const extensionColors = [
        '#3498DB', '#E74C3C', '#F39C12', '#27AE60', '#16A085', 
        '#2ECC71', '#E67E22', '#95A5A6', '#34495E', '#7F8C8D', 
        '#9B59B6', '#1ABC9C', '#2C3E50', '#F1C40F', '#D35400', 
        '#C0392B', '#BDC3C7', '#7F8C8D', '#95A5A6'
      ];
      
      // 为每个标签分配对应颜色
      const assignedColors = sortedLabels.map((label, index) => {
        if (categoryColors[label]) {
          return categoryColors[label];
        } else {
          // 检查是否是具有自定义颜色的扩展
          const extension = analysis.extensions.find(ext => ext.name === label);
          if (extension && extension.color) {
            return extension.color;
          }
          // 使用预定义的扩展颜色
          return extensionColors[index % extensionColors.length];
        }
      });
      
      // 销毁现有图表
      if (this.chartInstance) {
        this.chartInstance.destroy();
        this.chartInstance = null;
      }
      
      // 创建新图表
      this.chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: sortedLabels,
          datasets: [{
            data: sortedData,
            backgroundColor: assignedColors,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 12,
                padding: 10,
                font: {
                  size: 11
                }
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((value / total) * 100).toFixed(1);
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }

    // 显示Dr.Scratch评分
    displayDrScratchScores(scores) {
      const canvas = document.getElementById('saDrScratchChart');
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      
      const labels = Object.keys(scores);
      const data = Object.values(scores);
      const totalScore = data.reduce((sum, val) => sum + val, 0);
      
      // 更新总分
      document.getElementById('saDrScratchTotalScore').textContent = totalScore;
      
      // 计算等级
      let level = msg('beginner', '初学者');
      if (totalScore >= 18) {
        level = msg('expert', '专家级');
      } else if (totalScore >= 14) {
        level = msg('advanced', '高级');
      } else if (totalScore >= 10) {
        level = msg('intermediate', '中级');
      } else if (totalScore >= 6) {
        level = msg('developing', '发展中');
      }
      document.getElementById('saDrScratchScoreLevel').textContent = `${msg('evaluation-level', '评估等级')}：${level}`;
      
      // 更新评分详情
      const detailsHTML = labels.map(label => `
        <div class="sa-analyze-score-item">
          <div class="sa-analyze-score-label">${label}</div>
          <div class="sa-analyze-score-bar">
            <div class="sa-analyze-score-fill" style="width: ${(scores[label] / 3) * 100}%"></div>
          </div>
          <div class="sa-analyze-score-value">${scores[label]}/3</div>
        </div>
      `).join('');
      
      const detailsContainer = document.getElementById('saDrScratchDetails');
      const summaryHTML = detailsContainer.querySelector('.sa-analyze-score-summary').outerHTML;
      detailsContainer.innerHTML = summaryHTML + detailsHTML;
      
      // 销毁现有图表
      if (this.drScratchChartInstance) {
        this.drScratchChartInstance.destroy();
        this.drScratchChartInstance = null;
      }
      
      // 创建雷达图
      this.drScratchChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: labels,
          datasets: [{
            label: msg('computational-thinking-score', '计算思维评分'),
            data: data,
            backgroundColor: 'rgba(77, 151, 255, 0.2)',
            borderColor: '#4d97ff',
            borderWidth: 2,
            pointBackgroundColor: '#4d97ff',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#4d97ff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              beginAtZero: true,
              max: 3,
              ticks: {
                stepSize: 1
              }
            }
          },
          plugins: {
            legend: {
              display: false
            }
          }
        }
      });
    }

    // 显示数学逻辑评分
    displayMathLogicScores(scores) {
      const canvas = document.getElementById('saMathLogicChart');
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      
      const labels = Object.keys(scores);
      const data = Object.values(scores);
      const totalScore = data.reduce((sum, val) => sum + val, 0);
      
      // 更新总分
      document.getElementById('saMathTotalScore').textContent = totalScore;
      
      // 计算等级
      let level = msg('beginner', '初级');
      if (totalScore >= 20) {
        level = msg('advanced', '高级');
      } else if (totalScore >= 10) {
        level = msg('intermediate', '中级');
      } else if (totalScore >= 5) {
        level = msg('developing', '发展中');
      }
      document.getElementById('saMathScoreLevel').textContent = `${msg('evaluation-level', '评估等级')}：${level}`;
      
      // 更新评分详情
      const detailsHTML = labels.map(label => `
        <div class="sa-analyze-score-item">
          <div class="sa-analyze-score-label">${label}</div>
          <div class="sa-analyze-score-value">${scores[label]} </div>
        </div>
      `).join('');
      
      const detailsContainer = document.getElementById('saMathLogicDetails');
      const summaryHTML = detailsContainer.querySelector('.sa-analyze-score-summary').outerHTML;
      detailsContainer.innerHTML = summaryHTML + detailsHTML;
      
      // 销毁现有图表
      if (this.mathLogicChartInstance) {
        this.mathLogicChartInstance.destroy();
        this.mathLogicChartInstance = null;
      }
      
      // 数据标准化
      const maxValue = Math.max(...data, 1);
      const normalizedData = data.map(value => value / maxValue);
      
      // 创建雷达图
      this.mathLogicChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: labels,
          datasets: [{
            label: msg('relative-intensity', '相对强度'),
            data: normalizedData,
            backgroundColor: 'rgba(230, 81, 0, 0.2)',
            borderColor: '#E65100',
            borderWidth: 2,
            pointBackgroundColor: '#E65100',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#E65100'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              beginAtZero: true,
              max: 1,
              ticks: {
                stepSize: 0.2
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const rawValue = data[context.dataIndex];
                  return `${label}: ${rawValue} `;
                }
              }
            }
          }
        }
      });
    }

    // 显示扩展列表
    displayExtensions(extensions) {
      const extensionList = document.getElementById('saExtensionList');
      
      if (extensions.length === 0) {
        extensionList.innerHTML = `<p>${msg('no-extensions', '未使用扩展')}</p>`;
        return;
      }
      
      let html = '<div class="sa-analyze-extensions-grid">';
      
      extensions.forEach(extension => {
        const color = extension.color || '#888888';
        html += `
          <div class="sa-analyze-extension-item">
            <div class="sa-analyze-extension-color" style="background-color: ${color}"></div>
            <div class="sa-analyze-extension-name">${extension.name}</div>
            <div class="sa-analyze-extension-count">${extension.blocks.length} ${msg('blocks-count', '')}</div>
          </div>
        `;
      });
      
      html += '</div>';
      extensionList.innerHTML = html;
    }

    // 初始化插件
    async init() {
      console.log('Simple Project Analyzer: Initializing plugin...');
      await this.createAnalyzeButton();
      console.log('Simple Project Analyzer: Plugin initialized');
    }
  }

  // 创建并初始化分析器
  const analyzer = new SimpleProjectAnalyzer();

  // 直接初始化插件，不等待元素加载
  console.log('Simple Project Analyzer: Initializing plugin directly...');
  analyzer.init();

  // 每隔一段时间检查按钮是否存在，如果不存在则重新创建
  setInterval(() => {
    // 检查按钮是否已存在且在DOM中
    if (analyzer.analyzeButton && document.contains(analyzer.analyzeButton)) {
      return;
    }
    console.log('Simple Project Analyzer: Button not found in DOM, recreating...');
    analyzer.createAnalyzeButton();
  }, 5000);

  // 添加错误处理，确保插件即使在初始化失败时也不会影响其他功能
  window.addEventListener('error', (e) => {
    if (e.message.includes('simple-project-analyzer') || e.message.includes('sa-analyze-button')) {
      console.error('Simple Project Analyzer error:', e);
    }
  });
}