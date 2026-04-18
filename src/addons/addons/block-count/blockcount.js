import WindowManager from '../../window-system/window-manager.js';

export default async function ({ addon, console, msg }) {
  const vm = addon.tab.traps.vm;
  
  let complexityWindow = null;

  const getProjectComplexity = () => {
    let blockCount = 0;
    let scriptCount = 0;
    let maxDepth = 0;
    let totalDepth = 0;
    let blockTypeCount = {};
    let customBlockCount = 0;
    let conditionalBlockCount = 0;
    let loopBlockCount = 0;
    let eventBlockCount = 0;
    let longestScript = 0;
    
    let sprites = new Set(vm.runtime.targets.map((i) => i.sprite.blocks._blocks));
    
    sprites.forEach((sprite, i) => {
      const blocks = Object.values(sprite).filter((o) => !o.shadow); // shadow blocks should be filtered out
      blockCount += blocks.length;
      
      // Count script stacks
      const scriptBlocks = blocks.filter((o) => !o.parent);
      scriptCount += scriptBlocks.length;
      
      // Analyze each script for complexity metrics
      scriptBlocks.forEach(scriptBlock => {
        const { depth, length } = analyzeScript(sprite, scriptBlock.id);
        maxDepth = Math.max(maxDepth, depth);
        totalDepth += depth;
        longestScript = Math.max(longestScript, length);
      });
      
      // Count block types
      blocks.forEach(block => {
        const opcode = block.opcode;
        blockTypeCount[opcode] = (blockTypeCount[opcode] || 0) + 1;
        
        // Categorize special block types
        if (opcode.includes('procedures_call')) {
          customBlockCount++;
        } else if (opcode.includes('control_if') || opcode.includes('control_if_else')) {
          conditionalBlockCount++;
        } else if (opcode.includes('control_repeat') || opcode.includes('control_forever') || opcode.includes('control_while')) {
          loopBlockCount++;
        } else if (opcode.includes('event_when')) {
          eventBlockCount++;
        }
      });
    });
    
    const averageDepth = scriptCount > 0 ? totalDepth / scriptCount : 0;
    const complexityScore = calculateComplexityScore({
      blockCount,
      scriptCount,
      maxDepth,
      averageDepth,
      customBlockCount,
      conditionalBlockCount,
      loopBlockCount,
      longestScript
    });

    return {
      blockCount,
      scriptCount,
      spriteCount: sprites.size - 1, // Backdrop counts as a target so we can subtract it
      maxDepth,
      averageDepth: Math.round(averageDepth * 10) / 10,
      longestScript,
      customBlockCount,
      conditionalBlockCount,
      loopBlockCount,
      eventBlockCount,
      complexityScore,
      blockTypeCount
    };
  };

  const analyzeScript = (sprite, blockId, depth = 0) => {
    const block = sprite[blockId];
    if (!block) return { depth: 0, length: 0 };
    
    let maxDepth = depth;
    let length = 1;
    
    // Check nested blocks (like inside if/else, loops)
    if (block.inputs) {
      Object.values(block.inputs).forEach(input => {
        if (input.block) {
          const nested = analyzeScript(sprite, input.block, depth + 1);
          maxDepth = Math.max(maxDepth, nested.depth);
          length += nested.length;
        }
      });
    }
    
    // Check next block in sequence
    if (block.next) {
      const next = analyzeScript(sprite, block.next, depth);
      maxDepth = Math.max(maxDepth, next.depth);
      length += next.length;
    }
    
    return { depth: maxDepth, length };
  };

  const calculateComplexityScore = (metrics) => {
    // Enhanced complexity scoring algorithm
    let score = 0;
    
    // Base complexity from block count (weight: low)
    score += metrics.blockCount * 0.1;
    
    // Script count (weight: medium) - more scripts = more complexity
    score += metrics.scriptCount * 2;
    
    // Nesting depth (weight: high) - deep nesting is harder to understand
    score += metrics.maxDepth * 8;
    score += metrics.averageDepth * 4;
    
    // Custom blocks (weight: medium) - can reduce or increase complexity
    score += metrics.customBlockCount * 3;
    
    // Control flow complexity (weight: high)
    score += metrics.conditionalBlockCount * 4; // if/else statements
    score += metrics.loopBlockCount * 5; // loops are complex
    
    // Script length penalty - very long scripts are hard to maintain
    const longScriptPenalty = Math.max(0, metrics.longestScript - 15) * 1.2;
    score += longScriptPenalty;
    
    // Bonus for good practices
    if (metrics.customBlockCount > 0 && metrics.blockCount > 50) {
      score -= 10; // Bonus for using custom blocks in larger projects
    }
    
    return Math.max(0, Math.round(score));
  };



  const showComplexityDetails = async () => {
    // 如果窗口已存在，显示并聚焦
    if (complexityWindow) {
      complexityWindow.show().bringToFront();
      return;
    }

    let metrics = getProjectComplexity();
    
    // 创建自由窗口
    complexityWindow = WindowManager.createWindow({
      id: 'block-count-complexity',
      title: msg('complexity-title', '项目复杂度分析'),
      width: 500,
      height: 450,
      minWidth: 400,
      minHeight: 350,
      className: 'sa-block-count-window',
      onClose: () => {
        if (languageChangeListener) {
          addon.tab.redux.removeEventListener('statechanged', languageChangeListener);
        }
        complexityWindow = null;
      }
    });
    
    let languageChangeListener;
    let currentMode = 'original';
    
    // 加载Chart.js库
    async function loadChartJS() {
      return new Promise((resolve, reject) => {
        if (window.Chart) {
          console.log('Chart.js 已存在');
          resolve();
          return;
        }
        
        console.log('开始加载 Chart.js...');
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/chart.js@4.4.0/dist/chart.umd.js';
        script.onload = () => {
          console.log('Chart.js 加载完成');
          resolve();
        };
        script.onerror = (e) => {
          console.error('Chart.js 加载失败:', e);
          reject(e);
        };
        document.head.appendChild(script);
      });
    }
    
    // 加载Chart.js
    await loadChartJS();
    
    // 图表实例
    let chartInstance = null;
    let mathLogicChartInstance = null;
    let drScratchChartInstance = null;
    
    // 检查是否为标准积木
    const isStandardBlock = (opcode) => {
      const standardCategories = [
        'motion_', 'looks_', 'sound_', 'event_', 'control_', 
        'sensing_', 'operator_', 'data_', 'video_',
        'procedures_', 'argument_'
      ];
      
      return standardCategories.some(category => opcode.startsWith(category));
    };
    
    // 从积木操作码提取扩展ID
    const getExtensionIdFromOpcode = (opcode) => {
      const underscoreIndex = opcode.indexOf('_');
      if (underscoreIndex > 0) {
        return opcode.substring(0, underscoreIndex);
      }
      return opcode;
    };
    
    // 从扩展ID获取扩展名称
    const getExtensionNameFromId = (extensionId) => {
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
    };
    
    // 获取扩展积木
    const getExtensionBlocks = (projectData) => {
      const extensionBlocks = [];
      const targets = projectData.targets || [];
      
      targets.forEach(target => {
        const blocks = target.blocks || {};
        Object.values(blocks).forEach(block => {
          if (block.opcode && !isStandardBlock(block.opcode)) {
            const extensionId = getExtensionIdFromOpcode(block.opcode);
            extensionBlocks.push({
              opcode: block.opcode,
              extensionId: extensionId
            });
          }
        });
      });
      
      return extensionBlocks;
    };
    
    // 获取积木类型
    const getBlockCategory = (opcode, extensionNameMap = {}) => {
      if (opcode.startsWith('motion_')) return '运动';
      if (opcode.startsWith('looks_')) return '外观';
      if (opcode.startsWith('sound_')) return '声音';
      if (opcode.startsWith('event_')) return '事件';
      if (opcode.startsWith('control_')) return '控制';
      if (opcode.startsWith('sensing_')) return '侦测';
      if (opcode.startsWith('operator_')) return '运算';
      if (opcode.startsWith('data_')) return '数据';
      if (opcode.startsWith('video_')) return '视频';
      
      // 自定义函数和参数
      if (opcode.startsWith('procedures_')) return '自定义函数';
      if (opcode.startsWith('argument_')) return '自定义函数';
      
      // 扩展积木处理
      if (!isStandardBlock(opcode)) {
        const extensionId = getExtensionIdFromOpcode(opcode);
        if (extensionNameMap[extensionId]) {
          return extensionNameMap[extensionId];
        }
        return getExtensionNameFromId(extensionId);
      }
      
      return '其他';
    };
    
    // 分析扩展
    const analyzeExtensions = (analysis, projectData) => {
      const extensions = projectData.extensions || [];
      const extensionURLs = projectData.extensionURLs || {};
      
      // 获取所有扩展积木操作码
      const extensionBlocks = getExtensionBlocks(projectData);
      
      // 分析扩展信息
      extensions.forEach(ext => {
        let extensionName = getExtensionNameFromId(ext);
        
        const extensionInfo = {
          id: ext,
          name: extensionName,
          color: null,
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
          name: '画笔',
          color: null,
          url: null,
          blocks: penBlocks
        };
        analysis.extensions.push(penExtensionInfo);
      }
    };
    
    // 分析代码块
    const analyzeBlocks = (analysis, projectData, extensionNameMap = {}) => {
      const targets = projectData.targets || [];
      
      targets.forEach(target => {
        const blocks = target.blocks || {};
        
        Object.values(blocks).forEach(block => {
          if (block.opcode) {
            analysis.totalBlocks++;
            
            const category = getBlockCategory(block.opcode, extensionNameMap);
            analysis.codeTypes[category] = (analysis.codeTypes[category] || 0) + 1;
          }
        });
      });
    };
    
    // 分析精灵和舞台
    const analyzeSprites = (analysis, projectData) => {
      const targets = projectData.targets || [];
      const sprites = targets.filter(t => !t.isStage);
      
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
    };
    
    // 分析有效积木和函数定义
    const analyzeEffectiveBlocks = (analysis, projectData) => {
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
    };
    
    // 执行分析
    const performAnalysis = (projectData) => {
      const analysis = {
        totalBlocks: 0,
        codeTypes: {},
        extensions: [],
        sprites: 0,
        effectiveBlocks: 0,
        functionDefinitions: 0,
        costumeCount: 0,
        soundCount: 0,
        variableCount: 0,
        listCount: 0
      };

      // 分析扩展
      analyzeExtensions(analysis, projectData);
      
      // 创建扩展名称映射
      const extensionNameMap = {};
      analysis.extensions.forEach(ext => {
        extensionNameMap[ext.id] = ext.name;
      });
      
      // 分析代码块
      analyzeBlocks(analysis, projectData, extensionNameMap);
      
      // 分析精灵和舞台
      analyzeSprites(analysis, projectData);
      
      // 分析有效积木和函数定义
      analyzeEffectiveBlocks(analysis, projectData);
      
      return analysis;
    };
    
    // 分析项目
    const analyzeProject = async () => {
      try {
        console.log('vm.toJSON 方法:', typeof vm.toJSON);
        
        const projectData = vm.toJSON();
        console.log('项目数据类型:', typeof projectData);
        console.log('项目数据预览:', projectData.substring(0, 200) + '...');
        
        const analysis = performAnalysis(JSON.parse(projectData));
        console.log('分析结果:', analysis);
        return analysis;
      } catch (error) {
        console.error('分析项目时出错:', error);
        // 显示错误信息
        const loadingElement = document.getElementById('saAnalyzeLoading');
        if (loadingElement) {
          loadingElement.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; padding: 40px;">
              <p style="color: #d32f2f;">分析项目时出错: ${error.message}</p>
            </div>
          `;
        }
        return null;
      }
    };
    
    // 计算Dr.Scratch评分
    const calculateDrScratchScores = (projectData) => {
      const scores = {
        '抽象和问题分解': 0,
        '并行性': 0,
        '逻辑思维': 0,
        '同步': 0,
        '流程控制': 0,
        '用户交互': 0,
        '数据表示': 0
      };

      const targets = projectData.targets || [];
      const blockTypes = new Set();
      const eventBlockTypes = new Set();
      const controlBlockTypes = new Set();
      const operatorBlockTypes = new Set();
      const dataBlockTypes = new Set();
      const sensingBlockTypes = new Set();
      const procedureBlockTypes = new Set();
      const variableNames = new Set();
      const listNames = new Set();

      // 收集所有积木块种类
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

      // 1. 抽象和问题分解
      const spriteCount = targets.filter(t => !t.isStage).length;
      const hasMultipleSprites = spriteCount > 1;
      const hasMultipleScripts = eventBlockTypes.size > 1;
      const hasCustomBlocks = procedureBlockTypes.has('procedures_definition');
      const hasClones = controlBlockTypes.has('control_create_clone_of') || controlBlockTypes.has('control_start_as_clone');
      
      if (hasMultipleSprites && hasMultipleScripts) {
        scores['抽象和问题分解'] = 1;
      }
      if (hasCustomBlocks) {
        scores['抽象和问题分解'] = 2;
      }
      if (hasClones) {
        scores['抽象和问题分解'] = 3;
      }

      // 2. 并行性
      const hasGreenFlag = eventBlockTypes.has('event_whenflagclicked');
      const hasKeyEvents = eventBlockTypes.has('event_whenkeypressed');
      const hasClickEvents = eventBlockTypes.has('event_whenthisspriteclicked');
      const hasMessageEvents = eventBlockTypes.has('event_whenbroadcastreceived');
      const hasCloneEvents = controlBlockTypes.has('control_create_clone_of');
      const hasSensorEvents = eventBlockTypes.has('event_whengreaterthan');
      const hasBackdropEvents = eventBlockTypes.has('event_whenbackdropswitchesto');
      
      if (hasGreenFlag && eventBlockTypes.size > 1) {
        scores['并行性'] = 1;
      }
      if ((hasKeyEvents || hasClickEvents) && (eventBlockTypes.size > 2)) {
        scores['并行性'] = 2;
      }
      if (hasMessageEvents || hasCloneEvents || hasSensorEvents || hasBackdropEvents) {
        scores['并行性'] = 3;
      }

      // 3. 逻辑思维
      const hasIf = controlBlockTypes.has('control_if');
      const hasIfElse = controlBlockTypes.has('control_if_else');
      const hasLogicOps = operatorBlockTypes.has('operator_and') || 
                         operatorBlockTypes.has('operator_or') || 
                         operatorBlockTypes.has('operator_not');
      
      if (hasIf) {
        scores['逻辑思维'] = 1;
      }
      if (hasIfElse) {
        scores['逻辑思维'] = 2;
      }
      if (hasLogicOps) {
        scores['逻辑思维'] = 3;
      }

      // 4. 同步
      const hasWait = controlBlockTypes.has('control_wait');
      const hasBroadcast = eventBlockTypes.has('event_broadcast');
      const hasReceiveMessage = eventBlockTypes.has('event_whenbroadcastreceived');
      const hasStopAll = controlBlockTypes.has('control_stop_all');
      const hasStopThis = controlBlockTypes.has('control_stop_this_script');
      const hasStopOther = controlBlockTypes.has('control_stop_other_scripts_in_sprite');
      const hasWaitUntil = controlBlockTypes.has('control_wait_until');
      const hasBackdropChange = blockTypes.has('looks_nextbackdrop') || blockTypes.has('looks_switchbackdropto');
      const hasBroadcastAndWait = eventBlockTypes.has('event_broadcastandwait');
      
      if (hasWait) {
        scores['同步'] = 1;
      }
      if (hasBroadcast || hasReceiveMessage || hasStopAll || hasStopThis || hasStopOther) {
        scores['同步'] = 2;
      }
      if (hasWaitUntil || hasBackdropChange || hasBroadcastAndWait) {
        scores['同步'] = 3;
      }

      // 5. 流程控制
      const hasSequence = blockTypes.size > 0;
      const hasRepeat = controlBlockTypes.has('control_repeat') || controlBlockTypes.has('control_forever');
      const hasRepeatUntil = controlBlockTypes.has('control_repeat_until');
      
      if (hasSequence) {
        scores['流程控制'] = 1;
      }
      if (hasRepeat) {
        scores['流程控制'] = 2;
      }
      if (hasRepeatUntil) {
        scores['流程控制'] = 3;
      }

      // 6. 用户交互
      const hasGreenFlagEvent = eventBlockTypes.has('event_whenflagclicked');
      const hasKeyPressedEvent = eventBlockTypes.has('event_whenkeypressed');
      const hasSpriteClickedEvent = eventBlockTypes.has('event_whenthisspriteclicked');
      const hasAskWait = sensingBlockTypes.has('sensing_askandwait');
      const hasMouseBlocks = sensingBlockTypes.has('sensing_mousedown') || 
                            sensingBlockTypes.has('sensing_mousex') || 
                            sensingBlockTypes.has('sensing_mousey');
      const hasSensorGreater = eventBlockTypes.has('event_whengreaterthan');
      const hasVideo = Array.from(blockTypes).some(type => type.startsWith('video_'));
      const hasAudioInteraction = blockTypes.has('sound_playuntildone') || 
                                 blockTypes.has('sound_setvolumeto') ||
                                 blockTypes.has('sound_changevolumeby');
      
      if (hasGreenFlagEvent) {
        scores['用户交互'] = 1;
      }
      if (hasKeyPressedEvent || hasSpriteClickedEvent || hasAskWait || hasMouseBlocks) {
        scores['用户交互'] = 2;
      }
      if (hasSensorGreater || hasVideo || hasAudioInteraction) {
        scores['用户交互'] = 3;
      }

      // 7. 数据表示
      const hasSpriteModifiers = blockTypes.size > 0;
      const hasVariableOperations = variableNames.size > 0 && dataBlockTypes.size > 0;
      const hasListOperations = listNames.size > 0 && Array.from(dataBlockTypes).some(type => type.includes('list'));
      
      if (hasSpriteModifiers) {
        scores['数据表示'] = 1;
      }
      if (hasVariableOperations) {
        scores['数据表示'] = 2;
      }
      if (hasListOperations) {
        scores['数据表示'] = 3;
      }

      return scores;
    };
    
    // 计算数学逻辑评分
    const calculateMathLogicScores = (projectData) => {
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
        '运算复杂度': operatorCount,
        '逻辑深度': controlCount,
        '数据量': dataCount
      };

      return scores;
    };
    
    // 显示代码类型分布图
    const displayCodeTypeChart = (analysis) => {
      const canvas = document.getElementById('saCodeTypeChart');
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      
      // 定义标准类别的固定顺序
      const standardOrder = [
        '运动', '外观', '声音', '事件', '控制', '侦测', '运算', '数据', '自定义函数'
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
        '运动': '#4C97FF',
        '外观': '#9966FF',
        '声音': '#CF63CF',
        '事件': '#FFBF00',
        '控制': '#FFAB19',
        '侦测': '#5CB1D6',
        '运算': '#59C059',
        '数据': '#FF8C1A',
        '自定义函数': '#FF6680'
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
          return extensionColors[index % extensionColors.length];
        }
      });
      
      // 销毁现有图表
      if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
      }
      
      // 创建新图表
      chartInstance = new Chart(ctx, {
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
    };
    
    // 显示Dr.Scratch评分
    const displayDrScratchScores = (scores) => {
      const canvas = document.getElementById('saDrScratchChart');
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      
      const labels = Object.keys(scores);
      const data = Object.values(scores);
      const totalScore = data.reduce((sum, val) => sum + val, 0);
      
      // 更新总分
      document.getElementById('saDrScratchTotalScore').textContent = totalScore;
      
      // 计算等级
      let level = '初级';
      if (totalScore >= 18) {
        level = '专家级';
      } else if (totalScore >= 14) {
        level = '高级';
      } else if (totalScore >= 10) {
        level = '中级';
      } else if (totalScore >= 6) {
        level = '发展中';
      }
      document.getElementById('saDrScratchScoreLevel').textContent = `评估等级：${level}`;
      
      // 更新评分详情
      const detailsHTML = labels.map(label => `
        <div class="sa-analyze-score-item" style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
          <div class="sa-analyze-score-label" style="flex: 1; font-size: 12px;">${label}</div>
          <div class="sa-analyze-score-bar" style="flex: 2; height: 8px; background: var(--ui-black-transparent, rgba(255,255,255,0.2)); border-radius: 4px; overflow: hidden;">
            <div class="sa-analyze-score-fill" style="height: 100%; width: ${(scores[label] / 3) * 100}%; background: #4d97ff; border-radius: 4px;"></div>
          </div>
          <div class="sa-analyze-score-value" style="width: 40px; text-align: right; font-size: 12px;">${scores[label]}/3</div>
        </div>
      `).join('');
      
      const detailsContainer = document.getElementById('saDrScratchDetails');
      const summaryHTML = detailsContainer.querySelector('.sa-analyze-score-summary')?.outerHTML || detailsContainer.innerHTML;
      detailsContainer.innerHTML = summaryHTML + detailsHTML;
      
      // 销毁现有图表
      if (drScratchChartInstance) {
        drScratchChartInstance.destroy();
        drScratchChartInstance = null;
      }
      
      // 创建雷达图
      drScratchChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: labels,
          datasets: [{
            label: '计算思维评分',
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
    };
    
    // 显示数学逻辑评分
    const displayMathLogicScores = (scores) => {
      const canvas = document.getElementById('saMathLogicChart');
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      
      const labels = Object.keys(scores);
      const data = Object.values(scores);
      const totalScore = data.reduce((sum, val) => sum + val, 0);
      
      // 更新总分
      document.getElementById('saMathTotalScore').textContent = totalScore;
      
      // 计算等级
      let level = '初级';
      if (totalScore >= 20) {
        level = '高级';
      } else if (totalScore >= 10) {
        level = '中级';
      } else if (totalScore >= 5) {
        level = '发展中';
      }
      document.getElementById('saMathScoreLevel').textContent = `评估等级：${level}`;
      
      // 更新评分详情
      const detailsHTML = labels.map(label => `
        <div class="sa-analyze-score-item" style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
          <div class="sa-analyze-score-label" style="flex: 1; font-size: 12px;">${label}</div>
          <div class="sa-analyze-score-value" style="width: 60px; text-align: right; font-size: 12px;">${scores[label]} </div>
        </div>
      `).join('');
      
      const detailsContainer = document.getElementById('saMathLogicDetails');
      const summaryHTML = detailsContainer.querySelector('.sa-analyze-score-summary')?.outerHTML || detailsContainer.innerHTML;
      detailsContainer.innerHTML = summaryHTML + detailsHTML;
      
      // 销毁现有图表
      if (mathLogicChartInstance) {
        mathLogicChartInstance.destroy();
        mathLogicChartInstance = null;
      }
      
      // 数据标准化
      const maxValue = Math.max(...data, 1);
      const normalizedData = data.map(value => value / maxValue);
      
      // 创建雷达图
      mathLogicChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: labels,
          datasets: [{
            label: '相对强度',
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
    };
    
    // 显示扩展列表
    const displayExtensions = (extensions) => {
      const extensionList = document.getElementById('saExtensionList');
      
      if (extensions.length === 0) {
        extensionList.innerHTML = '<p>未使用扩展</p>';
        return;
      }
      
      let html = '<div class="sa-analyze-extensions-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">';
      
      extensions.forEach(extension => {
        const color = extension.color || '#888888';
        html += `
          <div class="sa-analyze-extension-item" style="display: flex; align-items: center; gap: 10px; padding: 12px; background: var(--ui-black-transparent, rgba(255,255,255,0.1)); border-radius: 6px;">
            <div class="sa-analyze-extension-color" style="width: 12px; height: 12px; border-radius: 50%; background-color: ${color};"></div>
            <div style="flex: 1;">
              <div class="sa-analyze-extension-name" style="font-weight: 500; margin-bottom: 2px;">${extension.name}</div>
              <div class="sa-analyze-extension-count" style="font-size: 12px; color: var(--ui-black-transparent, #999);">${extension.blocks.length} 个积木</div>
            </div>
          </div>
        `;
      });
      
      html += '</div>';
      extensionList.innerHTML = html;
    };
    
    // 更新AstraEditor分析结果
    const updateAstraAnalysisResults = async (analysis) => {
      if (!analysis) return;
      
      // 更新统计数据
      const statsGrid = document.getElementById('saStatsGrid');
      statsGrid.innerHTML = `
        <div class="sa-analyze-stat">
          <div class="sa-analyze-stat-value">${analysis.totalBlocks}</div>
          <div class="sa-analyze-stat-label">总代码块数</div>
        </div>
        <div class="sa-analyze-stat">
          <div class="sa-analyze-stat-value">${analysis.effectiveBlocks}</div>
          <div class="sa-analyze-stat-label">有效积木</div>
        </div>
        <div class="sa-analyze-stat">
          <div class="sa-analyze-stat-value">${analysis.functionDefinitions}</div>
          <div class="sa-analyze-stat-label">函数定义</div>
        </div>
        <div class="sa-analyze-stat">
          <div class="sa-analyze-stat-value">${analysis.sprites}</div>
          <div class="sa-analyze-stat-label">角色</div>
        </div>
        <div class="sa-analyze-stat">
          <div class="sa-analyze-stat-value">${analysis.costumeCount}</div>
          <div class="sa-analyze-stat-label">造型</div>
        </div>
        <div class="sa-analyze-stat">
          <div class="sa-analyze-stat-value">${analysis.soundCount}</div>
          <div class="sa-analyze-stat-label">声音</div>
        </div>
        <div class="sa-analyze-stat">
          <div class="sa-analyze-stat-value">${analysis.variableCount}</div>
          <div class="sa-analyze-stat-label">变量</div>
        </div>
        <div class="sa-analyze-stat">
          <div class="sa-analyze-stat-value">${analysis.listCount}</div>
          <div class="sa-analyze-stat-label">列表</div>
        </div>
        <div class="sa-analyze-stat">
          <div class="sa-analyze-stat-value">${analysis.extensions.length}</div>
          <div class="sa-analyze-stat-label">扩展</div>
        </div>
      `;
      
      // 更新代码类型分布图
      displayCodeTypeChart(analysis);
      
      // 计算并更新Dr.Scratch评分
      const projectJSON = JSON.parse(vm.toJSON());
      const drScratchScores = calculateDrScratchScores(projectJSON);
      displayDrScratchScores(drScratchScores);
      
      // 计算并更新数学逻辑评分
      const mathLogicScores = calculateMathLogicScores(projectJSON);
      displayMathLogicScores(mathLogicScores);
      
      // 更新扩展列表
      displayExtensions(analysis.extensions);
      
      // 显示结果，隐藏加载
      document.getElementById('saAnalyzeLoading').style.display = 'none';
      document.getElementById('saAnalyzeResults').style.display = 'block';
    };
    
    // Switch mode function
    const switchMode = (mode) => {
      currentMode = mode;
      updateWindowContent();
    };
    
    // Create a function to update the window content
    const updateWindowContent = () => {
      const content = document.createElement('div');
      content.className = 'sa-block-count-window-content';
      content.style.cssText = `
        height: 100%;
        overflow-y: auto;
        box-sizing: border-box;
      `;
      
      // 添加旋转动画样式
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .sa-analyze-score-item {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .sa-analyze-score-label {
          flex: 1;
          font-size: 12px;
        }
        
        .sa-analyze-score-bar {
          flex: 2;
          height: 6px;
          background: #333;
          border-radius: 3px;
          margin: 0 10px;
          overflow: hidden;
        }
        
        .sa-analyze-score-fill {
          height: 100%;
          background: #4d97ff;
          transition: width 0.3s ease;
        }
        
        .sa-analyze-score-value {
          width: 40px;
          text-align: right;
          font-size: 12px;
        }
        
        .sa-analyze-extensions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }
        
        .sa-analyze-extension-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: #2c3e50;
          border-radius: 6px;
        }
        
        .sa-analyze-extension-color {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        
        .sa-analyze-extension-name {
          flex: 1;
          font-size: 12px;
        }
        
        .sa-analyze-extension-count {
          font-size: 10px;
          color: #999;
        }
      `;
      content.appendChild(style);
      
      // Add button area
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        display: flex;
        gap: 10px;
        padding: 15px 20px 0;
        border-bottom: 1px solid var(--ui-black-transparent, #e0e0e0);
        padding-bottom: 15px;
      `;
      
      const originalButton = document.createElement('button');
      originalButton.textContent = '原版积木分析';
      originalButton.style.cssText = `
        padding: 8px 16px;
        border: 1px solid var(--ui-black-transparent, #ccc);
        border-radius: 4px;
        background: ${currentMode === 'original' ? 'var(--looks-secondary, #0fbd8c)' : 'var(--ui-secondary, #f8f9fa)'};
        color: ${currentMode === 'original' ? 'white' : 'var(--ui-modal-foreground, #000)'};
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
      `;
      originalButton.addEventListener('click', () => switchMode('original'));
      
      const astraButton = document.createElement('button');
      astraButton.textContent = 'AstraEditor积木分析';
      astraButton.style.cssText = `
        padding: 8px 16px;
        border: 1px solid var(--ui-black-transparent, #ccc);
        border-radius: 4px;
        background: ${currentMode === 'astra' ? 'var(--looks-secondary, #0fbd8c)' : 'var(--ui-secondary, #f8f9fa)'};
        color: ${currentMode === 'astra' ? 'white' : 'var(--ui-modal-foreground, #000)'};
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
      `;
      astraButton.addEventListener('click', () => switchMode('astra'));
      
      buttonContainer.appendChild(originalButton);
      buttonContainer.appendChild(astraButton);
      content.appendChild(buttonContainer);
      
      // Main content container
      const contentContainer = document.createElement('div');
      contentContainer.style.cssText = `
        padding: 20px;
      `;
      
      if (currentMode === 'original') {
        // Determine complexity level for styling
        let complexityClass = 'sa-block-count-complexity-low';
        if (metrics.complexityScore > 100) {
          complexityClass = 'sa-block-count-complexity-high';
        } else if (metrics.complexityScore > 50) {
          complexityClass = 'sa-block-count-complexity-medium';
        }
        
        contentContainer.innerHTML = `
          <h2>${msg('complexity-title')}</h2>
          
          <div class="sa-block-count-stats-grid">
            <div class="sa-block-count-stat-card">
              <h3>${msg('basic-stats')}</h3>
              <div class="sa-block-count-stat-list">
                <div><strong>${msg('total-blocks')}:</strong> ${metrics.blockCount}</div>
                <div><strong>${msg('total-scripts')}:</strong> ${metrics.scriptCount}</div>
                <div><strong>${msg('total-sprites')}:</strong> ${metrics.spriteCount}</div>
              </div>
            </div>
            
            <div class="sa-block-count-stat-card">
              <h3>${msg('complexity-metrics')}</h3>
              <div class="sa-block-count-stat-list">
                <div><strong>${msg('complexity-score')}:</strong> 
                  <span class="sa-block-count-complexity-score ${complexityClass}">${metrics.complexityScore}</span>
                </div>
                <div><strong>${msg('max-nesting')}:</strong> ${metrics.maxDepth}</div>
                <div><strong>${msg('avg-nesting')}:</strong> ${metrics.averageDepth}</div>
                <div><strong>${msg('longest-script')}:</strong> ${metrics.longestScript} ${msg('blocks-unit')}</div>
              </div>
            </div>
          </div>
          
          <div class="sa-block-count-block-types">
            <h3>${msg('block-types')}</h3>
            <div class="sa-block-count-types-grid">
              <div><strong>${msg('custom-blocks')}:</strong> ${metrics.customBlockCount}</div>
              <div><strong>${msg('conditional-blocks')}:</strong> ${metrics.conditionalBlockCount}</div>
              <div><strong>${msg('loop-blocks')}:</strong> ${metrics.loopBlockCount}</div>
              <div><strong>${msg('event-blocks')}:</strong> ${metrics.eventBlockCount}</div>
            </div>
          </div>
        `;
      } else {
        contentContainer.innerHTML = `
          <div style="margin-bottom: 20px;">
            <h2 style="margin-bottom: 10px;">项目分析</h2>
            <div style="width: 100%; height: 1px; background: var(--ui-black-transparent, #e0e0e0);"></div>
          </div>
          
          <div class="sa-analyze-loading" id="saAnalyzeLoading">
            <div style="display: flex; flex-direction: column; align-items: center; padding: 40px;">
              <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px;"></div>
              <p style="color: #666;">分析中...</p>
            </div>
          </div>
          <div class="sa-analyze-results" id="saAnalyzeResults" style="display: none;">
            <!-- 项目统计部分 -->
            <div style="margin-bottom: 30px;">
              <h3 style="margin-bottom: 15px; color: var(--ui-modal-foreground, #333);">项目统计</h3>
              <div class="sa-analyze-stats-grid" id="saStatsGrid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 15px;">
                <div style="background: #0fbd8c; padding: 15px; border-radius: 8px; text-align: center; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">-</div>
                  <div style="font-size: 12px;">总代码块数</div>
                </div>
                <div style="background: #0fbd8c; padding: 15px; border-radius: 8px; text-align: center; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">-</div>
                  <div style="font-size: 12px;">有效积木</div>
                </div>
                <div style="background: #0fbd8c; padding: 15px; border-radius: 8px; text-align: center; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">-</div>
                  <div style="font-size: 12px;">函数定义</div>
                </div>
                <div style="background: #0fbd8c; padding: 15px; border-radius: 8px; text-align: center; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">-</div>
                  <div style="font-size: 12px;">角色</div>
                </div>
                <div style="background: #0fbd8c; padding: 15px; border-radius: 8px; text-align: center; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">-</div>
                  <div style="font-size: 12px;">造型</div>
                </div>
                <div style="background: #0fbd8c; padding: 15px; border-radius: 8px; text-align: center; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">-</div>
                  <div style="font-size: 12px;">声音</div>
                </div>
                <div style="background: #0fbd8c; padding: 15px; border-radius: 8px; text-align: center; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">-</div>
                  <div style="font-size: 12px;">变量</div>
                </div>
                <div style="background: #0fbd8c; padding: 15px; border-radius: 8px; text-align: center; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">-</div>
                  <div style="font-size: 12px;">列表</div>
                </div>
                <div style="background: #0fbd8c; padding: 15px; border-radius: 8px; text-align: center; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">-</div>
                  <div style="font-size: 12px;">扩展</div>
                </div>
              </div>
            </div>

            <!-- 代码类型分布 -->
            <div style="margin-bottom: 30px;">
              <h3 style="margin-bottom: 15px; color: var(--ui-modal-foreground, #333);">积木分布</h3>
              <div style="background: var(--ui-secondary, #1a1a1a); padding: 20px; border-radius: 8px; height: 300px;">
                <canvas id="saCodeTypeChart" width="400" height="200"></canvas>
              </div>
            </div>

            <!-- Dr.Scratch评分系统 -->
            <div style="margin-bottom: 30px;">
              <h3 style="margin-bottom: 15px; color: var(--ui-modal-foreground, #333);">Dr.Scratch评分</h3>
              <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 300px; background: var(--ui-secondary, #1a1a1a); padding: 20px; border-radius: 8px; height: 350px;">
                  <canvas id="saDrScratchChart" width="400" height="300"></canvas>
                </div>
                <div style="flex: 1; min-width: 300px; background: var(--ui-secondary, #1a1a1a); padding: 20px; border-radius: 8px;">
                  <div id="saDrScratchDetails" style="color: var(--ui-modal-foreground, white);">
                    <div style="margin-bottom: 20px;">
                      <h4 style="margin-bottom: 10px;">总分：<span id="saDrScratchTotalScore">0</span> / 21</h4>
                      <div id="saDrScratchScoreLevel" style="color: var(--ui-black-transparent, #999);">评估等级：计算中...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 数学逻辑评估 -->
            <div style="margin-bottom: 30px;">
              <h3 style="margin-bottom: 15px; color: var(--ui-modal-foreground, #333);">数学逻辑评估</h3>
              <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 300px; background: var(--ui-secondary, #1a1a1a); padding: 20px; border-radius: 8px; height: 350px;">
                  <canvas id="saMathLogicChart" width="400" height="300"></canvas>
                </div>
                <div style="flex: 1; min-width: 300px; background: var(--ui-secondary, #1a1a1a); padding: 20px; border-radius: 8px;">
                  <div id="saMathLogicDetails" style="color: var(--ui-modal-foreground, white);">
                    <div style="margin-bottom: 20px;">
                      <h4 style="margin-bottom: 10px;">数学总分：<span id="saMathTotalScore">0</span> 个积木</h4>
                      <div id="saMathScoreLevel" style="color: var(--ui-black-transparent, #999);">评估等级：计算中...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 使用的扩展 -->
            <div style="margin-bottom: 20px;">
              <h3 style="margin-bottom: 15px; color: var(--ui-modal-foreground, #333);">使用的扩展</h3>
              <div id="saExtensionList" style="background: var(--ui-secondary, #1a1a1a); padding: 20px; border-radius: 8px; color: var(--ui-modal-foreground, white);">
                <p>加载中...</p>
              </div>
            </div>
          </div>
        `;
        
        // 异步分析项目
        setTimeout(async () => {
          console.log('开始分析项目...');
          const analysis = await analyzeProject();
          console.log('分析完成:', analysis);
          await updateAstraAnalysisResults(analysis);
          console.log('结果更新完成');
        }, 100);
      }
      
      content.appendChild(contentContainer);
      complexityWindow.setContent(content);
    };
    
    // Initial content update
    updateWindowContent();
    
    // Add language change listener
    languageChangeListener = (e) => {
      if (e.action && e.action.type === 'scratch-gui/locales/SELECT_LOCALE') {
        updateWindowContent();
      }
    };
    addon.tab.redux.addEventListener('statechanged', languageChangeListener);
    
    // Add project change listener to update content when blocks change
    let debounce;
    const projectChangeListener = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        // Re-calculate metrics and update content
        if (currentMode === 'original') {
          metrics = getProjectComplexity();
        }
        updateWindowContent();
      }, 1000);
    };
    vm.on("PROJECT_CHANGED", projectChangeListener);
    vm.runtime.on("PROJECT_LOADED", projectChangeListener);
    
    // Clean up listeners when window closes
    const originalOnClose = complexityWindow.onClose;
    complexityWindow.onClose = () => {
      if (originalOnClose) {
        originalOnClose();
      }
      vm.off("PROJECT_CHANGED", projectChangeListener);
      vm.runtime.off("PROJECT_LOADED", projectChangeListener);
    };
    
    complexityWindow.show();
  };

  const addLiveBlockCount = async () => {
    if (vm.editingTarget) {
      let handler = null;
      while (true) {
        const topBar = await addon.tab.waitForElement("[class^='menu-bar_main-menu']", {
          markAsSeen: true,
          reduxEvents: [
            "scratch-gui/mode/SET_PLAYER",
            "fontsLoaded/SET_FONTS_LOADED",
            "scratch-gui/locales/SELECT_LOCALE",
          ],
          reduxCondition: (state) => !state.scratchGui.mode.isPlayerOnly,
        });
        
        let display = topBar.appendChild(document.createElement("span"));
        addon.tab.displayNoneWhileDisabled(display);
        display.style.order = 1;
        display.style.cursor = 'pointer';
        display.style.padding = '4px 8px';
        display.style.borderRadius = '4px';
        display.style.transition = 'background-color 0.2s';
        display.style.marginLeft = '80px';
        display.style.marginRight = '10px';
        display.style.whiteSpace = 'nowrap';
        
        const updateDisplay = () => {
          const metrics = getProjectComplexity();
          if (addon.settings.get('show_complexity_score')) {
            display.innerText = `${msg("blocks", { num: metrics.blockCount })} (${msg("complexity-short")}: ${metrics.complexityScore})`;
          } else {
            display.innerText = msg("blocks", { num: metrics.blockCount });
          }
        };
        
        updateDisplay();
        
        display.addEventListener('click', showComplexityDetails);
        display.addEventListener('mouseenter', () => {
          display.style.backgroundColor = 'var(--ui-black-transparent, rgba(0,0,0,0.1))';
        });
        display.addEventListener('mouseleave', () => {
          display.style.backgroundColor = 'transparent';
        });
        
        let debounce; // debouncing values because of the way 'PROJECT_CHANGED' works
        if (handler) {
          vm.off("PROJECT_CHANGED", handler);
          vm.runtime.off("PROJECT_LOADED", handler);
        }
        handler = async () => {
          clearTimeout(debounce);
          debounce = setTimeout(updateDisplay, 1000);
        };
        vm.on("PROJECT_CHANGED", handler);
        vm.runtime.on("PROJECT_LOADED", handler);
        
        // Add language change listener
        addon.tab.redux.addEventListener('statechanged', (e) => {
          if (e.action && e.action.type === 'scratch-gui/locales/SELECT_LOCALE') {
            updateDisplay();
          }
        });
      }
    } else {
      let timeout = setTimeout(function () {
        addLiveBlockCount();
        clearTimeout(timeout);
      }, 1000);
    }
  };

  addLiveBlockCount();
}
