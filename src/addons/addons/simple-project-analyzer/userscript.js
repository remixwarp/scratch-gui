
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

export default async function ({ addon, msg, safeMsg, console }) {
  await loadChartJS();
  
  class SimpleProjectAnalyzer {
    constructor() {
      this.analyzeButton = null;
      this.analyzeModal = null;
      this.removeModal = null;
      this.chartInstance = null;
      this.mathLogicChartInstance = null;
      this.drScratchChartInstance = null;
    }

    async createAnalyzeButton() {
      if (this.analyzeButton && document.contains(this.analyzeButton)) {
        return;
      }

      try {
        console.log('Simple Project Analyzer: Creating analyze button...');
        
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

        if (VSCodeLayout) {
          const img = document.createElement('img');
          img.src = icon();
          img.style.filter = "grayscale(100%)"
          img.marginTop = '5px';
          img.width = '20px';
          img.height = '20px';
          img.alt = '分析';
          this.analyzeButton.appendChild(img);
        } else {
          this.analyzeButton.textContent = msg('analyze-button', '分析');
        }
        this.analyzeButton.title = msg('analyze-tooltip', '分析项目统计信息');

        addon.tab.displayNoneWhileDisabled(this.analyzeButton);

        this.analyzeButton.addEventListener('click', () => {
          console.log('Simple Project Analyzer: Analyze button clicked');
          this.showAnalysisModal();
        });

        let buttonAdded = false;

        try {
          console.log('Simple Project Analyzer: Trying to add button to menu bar...');
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

        if (!buttonAdded) {
          try {
            console.log('Simple Project Analyzer: Trying to add button to find bar...');
            const findBar = document.querySelector('.react-tabs');
            if (findBar && findBar.parentElement) {
              console.log('Simple Project Analyzer: Found find bar');
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

        if (!buttonAdded) {
          try {
            console.log('Simple Project Analyzer: Trying to add button to tab bar...');
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

        if (!buttonAdded) {
          try {
            console.log('Simple Project Analyzer: Trying to add button to menu bar...');
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

        if (!buttonAdded) {
          try {
            console.log('Simple Project Analyzer: Trying to add button to body as fallback...');
            document.body.appendChild(this.analyzeButton);
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

        if (buttonAdded) {
          console.log('Simple Project Analyzer: Analyze button created and added successfully');
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

    showAnalysisModal() {
      if (this.analyzeModal) {
        this.analyzeModal.remove();
      }

      const { backdrop, container, content, closeButton, remove } = addon.tab.createModal(msg('modal-title', '项目复杂度分析'), {
        isOpen: true
      });

      this.analyzeModal = backdrop;
      this.removeModal = remove;

      container.classList.add('sa-analyze-modal-popup');
      content.classList.add('sa-analyze-modal-content');

      const analysisHTML = this.generateAnalysisHTML();

      content.innerHTML = `
        <div class="sa-analyze-loading" id="saAnalyzeLoading">
          <div class="sa-analyze-spinner"></div>
          <p>${msg('analyzing', '分析中...')}</p>
        </div>
        <div class="sa-analyze-results" id="saAnalyzeResults" style="display: none;">
          ${analysisHTML}
        </div>
      `;

      backdrop.addEventListener('click', () => this.closeModal());
      closeButton.addEventListener('click', () => this.closeModal());

      this.analyzeProject();
    }

    closeModal() {
      if (this.removeModal) {
        this.removeModal();
        this.analyzeModal = null;
        this.removeModal = null;
        
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
    }

    async analyzeProject() {
      try {
        const vm = addon.tab.traps.vm;
        const projectJSON = JSON.parse(vm.toJSON());
        
        const analysis = this.performAnalysis(projectJSON);

        this.updateAnalysisResults(analysis);
      } catch (error) {
        console.error(msg('analysis-error', '分析项目时出错:'), error);
        document.getElementById('saAnalyzeLoading').innerHTML = `
          <p style="color: #d32f2f;">${msg('analysis-error', '分析项目时出错')}</p>
        `;
      }
    }

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

      this.analyzeExtensions(analysis, projectData);
      
      const extensionNameMap = {};
      analysis.extensions.forEach(ext => {
        extensionNameMap[ext.id] = ext.name;
      });
      
      this.analyzeBlocks(analysis, projectData, extensionNameMap);
      
      this.analyzeSprites(analysis, projectData);
      
      this.analyzeEffectiveBlocks(analysis, projectData);
      
      return analysis;
    }

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
      
      if (opcode.startsWith('procedures_')) return msg('custom-functions', '自定义函数');
      if (opcode.startsWith('argument_')) return msg('custom-functions', '自定义函数');
      
      if (!this.isStandardBlock(opcode)) {
        const extensionId = this.getExtensionIdFromOpcode(opcode);
        if (extensionNameMap[extensionId]) {
          return extensionNameMap[extensionId];
        }
        return this.getExtensionNameFromId(extensionId);
      }
      
      return msg('other', '其他');
    }

    isStandardBlock(opcode) {
      const standardCategories = [
        'motion_', 'looks_', 'sound_', 'event_', 'control_', 
        'sensing_', 'operator_', 'data_', 'video_',
        'procedures_', 'argument_'
      ];
      
      return standardCategories.some(category => opcode.startsWith(category));
    }

    getExtensionIdFromOpcode(opcode) {
      const underscoreIndex = opcode.indexOf('_');
      if (underscoreIndex > 0) {
        return opcode.substring(0, underscoreIndex);
      }
      return opcode;
    }

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

    analyzeExtensions(analysis, projectData) {
      const extensions = projectData.extensions || [];
      const extensionURLs = projectData.extensionURLs || {};
      
      const extensionBlocks = this.getExtensionBlocks(projectData);
      
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

    analyzeSprites(analysis, projectData) {
      const targets = projectData.targets || [];
      const sprites = targets.filter(t => !t.isStage);
      const stage = targets.find(t => t.isStage);
      
      analysis.sprites = sprites.length;
      
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

    analyzeEffectiveBlocks(analysis, projectData) {
      const targets = projectData.targets || [];
      
      targets.forEach(target => {
        const blocks = target.blocks || {};
        Object.values(blocks).forEach(block => {
          if (block.opcode) {
            if (!block.shadow) {
              analysis.effectiveBlocks++;
            }
            
            if (block.opcode === 'procedures_definition') {
              analysis.functionDefinitions++;
            }
          }
        });
      });
    }

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
      const blockTypes = new Set();
      const eventBlockTypes = new Set();
      const controlBlockTypes = new Set();
      const operatorBlockTypes = new Set();
      const dataBlockTypes = new Set();
      const sensingBlockTypes = new Set();
      const motionBlockTypes = new Set();
      const looksBlockTypes = new Set();
      const soundBlockTypes = new Set();
      const procedureBlockTypes = new Set();
      const variableNames = new Set();
      const listNames = new Set();

      targets.forEach(target => {
        const blocks = target.blocks || {};
        Object.values(blocks).forEach(block => {
          if (block.opcode) {
            blockTypes.add(block.opcode);
            
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

      const spriteCount = targets.filter(t => !t.isStage).length;
      const hasMultipleSprites = spriteCount > 1;
      const hasMultipleScripts = eventBlockTypes.size > 1;
      const hasCustomBlocks = procedureBlockTypes.has('procedures_definition');
      const hasClones = controlBlockTypes.has('control_create_clone_of') || controlBlockTypes.has('control_start_as_clone');
      
      if (hasMultipleSprites && hasMultipleScripts) {
        scores[msg('abstraction', '抽象和问题分解')] = 1;
      }
      if (hasCustomBlocks) {
        scores[msg('abstraction', '抽象和问题分解')] = 2;
      }
      if (hasClones) {
        scores[msg('abstraction', '抽象和问题分解')] = 3;
      }

      const hasGreenFlag = eventBlockTypes.has('event_whenflagclicked');
      const hasKeyEvents = eventBlockTypes.has('event_whenkeypressed');
      const hasClickEvents = eventBlockTypes.has('event_whenthisspriteclicked');
      const hasMessageEvents = eventBlockTypes.has('event_whenbroadcastreceived');
      const hasCloneEvents = controlBlockTypes.has('control_create_clone_of');
      const hasSensorEvents = eventBlockTypes.has('event_whengreaterthan');
      const hasBackdropEvents = eventBlockTypes.has('event_whenbackdropswitchesto');
      
      if (hasGreenFlag && eventBlockTypes.size > 1) {
        scores[msg('parallelism', '并行性')] = 1;
      }
      if ((hasKeyEvents || hasClickEvents) && (eventBlockTypes.size > 2)) {
        scores[msg('parallelism', '并行性')] = 2;
      }
      if (hasMessageEvents || hasCloneEvents || hasSensorEvents || hasBackdropEvents) {
        scores[msg('parallelism', '并行性')] = 3;
      }

      const hasIf = controlBlockTypes.has('control_if');
      const hasIfElse = controlBlockTypes.has('control_if_else');
      const hasLogicOps = operatorBlockTypes.has('operator_and') || 
                         operatorBlockTypes.has('operator_or') || 
                         operatorBlockTypes.has('operator_not');
      
      if (hasIf) {
        scores[msg('logic', '逻辑思维')] = 1;
      }
      if (hasIfElse) {
        scores[msg('logic', '逻辑思维')] = 2;
      }
      if (hasLogicOps) {
        scores[msg('logic', '逻辑思维')] = 3;
      }

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
        scores[msg('synchronization', '同步')] = 1;
      }
      if (hasBroadcast || hasReceiveMessage || hasStopAll || hasStopThis || hasStopOther) {
        scores[msg('synchronization', '同步')] = 2;
      }
      if (hasWaitUntil || hasBackdropChange || hasBroadcastAndWait) {
        scores[msg('synchronization', '同步')] = 3;
      }

      const hasSequence = blockTypes.size > 0;
      const hasRepeat = controlBlockTypes.has('control_repeat') || controlBlockTypes.has('control_forever');
      const hasRepeatUntil = controlBlockTypes.has('control_repeat_until');
      
      if (hasSequence) {
        scores[msg('flow-control', '流程控制')] = 1;
      }
      if (hasRepeat) {
        scores[msg('flow-control', '流程控制')] = 2;
      }
      if (hasRepeatUntil) {
        scores[msg('flow-control', '流程控制')] = 3;
      }

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
        scores[msg('user-interactivity', '用户交互')] = 1;
      }
      if (hasKeyPressedEvent || hasSpriteClickedEvent || hasAskWait || hasMouseBlocks) {
        scores[msg('user-interactivity', '用户交互')] = 2;
      }
      if (hasSensorGreater || hasVideo || hasAudioInteraction) {
        scores[msg('user-interactivity', '用户交互')] = 3;
      }

      const hasSpriteModifiers = motionBlockTypes.size > 0 || looksBlockTypes.size > 0 || soundBlockTypes.size > 0;
      const hasVariableOperations = variableNames.size > 0 && dataBlockTypes.size > 0;
      const hasListOperations = listNames.size > 0 && Array.from(dataBlockTypes).some(type => type.includes('list'));
      
      if (hasSpriteModifiers) {
        scores[msg('data-representation', '数据表示')] = 1;
      }
      if (hasVariableOperations) {
        scores[msg('data-representation', '数据表示')] = 2;
      }
      if (hasListOperations) {
        scores[msg('data-representation', '数据表示')] = 3;
      }

      return scores;
    }

    calculateMathLogicScores(projectData) {
      const targets = projectData.targets || [];
      
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
        [msg('operation-complexity', '运算复杂度')]: operatorCount,
        [msg('logic-depth', '逻辑深度')]: controlCount,
        [msg('data-magnitude', '数据规模')]: dataCount
      };

      return scores;
    }

    formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    generateAnalysisHTML() {
      return `
        <div class="sa-analyze-modal-body">
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

          <div class="sa-analyze-section">
            <h3 class="sa-analyze-section-title">${msg('block-distribution', '代码类型分布')}</h3>
            <div class="sa-analyze-chart-container">
              <canvas id="saCodeTypeChart" width="400" height="200"></canvas>
            </div>
          </div>

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

          <div class="sa-analyze-section">
            <h3 class="sa-analyze-section-title">${msg('extensions-used', '使用的扩展')}</h3>
            <div class="sa-analyze-extension-list" id="saExtensionList">
              <p>${msg('loading', '加载中...')}</p>
            </div>
          </div>
        </div>
      `;
    }

    updateAnalysisResults(analysis) {
      this.updateStats(analysis);
      
      this.displayCodeTypeChart(analysis);
      
      const vm = addon.tab.traps.vm;
      const projectJSON = JSON.parse(vm.toJSON());
      const drScratchScores = this.calculateDrScratchScores(projectJSON);
      this.displayDrScratchScores(drScratchScores);
      
      const mathLogicScores = this.calculateMathLogicScores(projectJSON);
      this.displayMathLogicScores(mathLogicScores);
      
      this.displayExtensions(analysis.extensions);

      document.getElementById('saAnalyzeLoading').style.display = 'none';
      document.getElementById('saAnalyzeResults').style.display = 'block';
    }

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

    displayCodeTypeChart(analysis) {
      const canvas = document.getElementById('saCodeTypeChart');
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      
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
      
      const standardCategories = {};
      const extensionCategories = {};
      
      Object.keys(analysis.codeTypes).forEach(category => {
        if (standardOrder.includes(category)) {
          standardCategories[category] = analysis.codeTypes[category];
        } else {
          extensionCategories[category] = analysis.codeTypes[category];
        }
      });
      
      const orderedStandard = {};
      standardOrder.forEach(category => {
        if (standardCategories[category]) {
          orderedStandard[category] = standardCategories[category];
        }
      });
      
      const sortedExtensions = {};
      Object.keys(extensionCategories).sort().forEach(category => {
        sortedExtensions[category] = extensionCategories[category];
      });
      
      const sortedCodeTypes = { ...orderedStandard, ...sortedExtensions };
      const sortedLabels = Object.keys(sortedCodeTypes);
      const sortedData = Object.values(sortedCodeTypes);
      
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
      
      const extensionColors = [
        '#3498DB', '#E74C3C', '#F39C12', '#27AE60', '#16A085', 
        '#2ECC71', '#E67E22', '#95A5A6', '#34495E', '#7F8C8D', 
        '#9B59B6', '#1ABC9C', '#2C3E50', '#F1C40F', '#D35400', 
        '#C0392B', '#BDC3C7', '#7F8C8D', '#95A5A6'
      ];
      
      const assignedColors = sortedLabels.map((label, index) => {
        if (categoryColors[label]) {
          return categoryColors[label];
        } else {
          const extension = analysis.extensions.find(ext => ext.name === label);
          if (extension && extension.color) {
            return extension.color;
          }
          return extensionColors[index % extensionColors.length];
        }
      });
      
      if (this.chartInstance) {
        this.chartInstance.destroy();
        this.chartInstance = null;
      }
      
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

    displayDrScratchScores(scores) {
      const canvas = document.getElementById('saDrScratchChart');
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      
      const labels = Object.keys(scores);
      const data = Object.values(scores);
      const totalScore = data.reduce((sum, val) => sum + val, 0);
      
      document.getElementById('saDrScratchTotalScore').textContent = totalScore;
      
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
      
      if (this.drScratchChartInstance) {
        this.drScratchChartInstance.destroy();
        this.drScratchChartInstance = null;
      }
      
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

    displayMathLogicScores(scores) {
      const canvas = document.getElementById('saMathLogicChart');
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      
      const labels = Object.keys(scores);
      const data = Object.values(scores);
      const totalScore = data.reduce((sum, val) => sum + val, 0);
      
      document.getElementById('saMathTotalScore').textContent = totalScore;
      
      let level = msg('beginner', '初级');
      if (totalScore >= 20) {
        level = msg('advanced', '高级');
      } else if (totalScore >= 10) {
        level = msg('intermediate', '中级');
      } else if (totalScore >= 5) {
        level = msg('developing', '发展中');
      }
      document.getElementById('saMathScoreLevel').textContent = `${msg('evaluation-level', '评估等级')}：${level}`;
      
      const detailsHTML = labels.map(label => `
        <div class="sa-analyze-score-item">
          <div class="sa-analyze-score-label">${label}</div>
          <div class="sa-analyze-score-value">${scores[label]} </div>
        </div>
      `).join('');
      
      const detailsContainer = document.getElementById('saMathLogicDetails');
      const summaryHTML = detailsContainer.querySelector('.sa-analyze-score-summary').outerHTML;
      detailsContainer.innerHTML = summaryHTML + detailsHTML;
      
      if (this.mathLogicChartInstance) {
        this.mathLogicChartInstance.destroy();
        this.mathLogicChartInstance = null;
      }
      
      const maxValue = Math.max(...data, 1);
      const normalizedData = data.map(value => value / maxValue);
      
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

    async init() {
      console.log('Simple Project Analyzer: Initializing plugin...');
      await this.createAnalyzeButton();
      console.log('Simple Project Analyzer: Plugin initialized');
    }
  }

  const analyzer = new SimpleProjectAnalyzer();

  console.log('Simple Project Analyzer: Initializing plugin directly...');
  analyzer.init();

  setInterval(() => {
    if (analyzer.analyzeButton && document.contains(analyzer.analyzeButton)) {
      return;
    }
    console.log('Simple Project Analyzer: Button not found in DOM, recreating...');
    analyzer.createAnalyzeButton();
  }, 5000);

  window.addEventListener('error', (e) => {
    if (e.message.includes('simple-project-analyzer') || e.message.includes('sa-analyze-button')) {
      console.error('Simple Project Analyzer error:', e);
    }
  });
}
