export default async function ({ addon, msg }) {
  const Blockly = await addon.tab.traps.getBlockly();

  function getFieldValueText(field) {
    try {
      if (!field) return '';
      // Ignore label fields (static text inside blocks)
      if (Blockly && Blockly.FieldLabel && field instanceof Blockly.FieldLabel) return '';
      const ctorName = field && field.constructor && field.constructor.name;
      if (ctorName && /Label/i.test(ctorName)) return '';

      if (typeof field.getText === 'function') {
        return field.getText();
      }
      if (typeof field.getValue === 'function') {
        return String(field.getValue());
      }
      if (field.text) return String(field.text);
    } catch (e) {}
    return '';
  }

  function translateBlockDetailed(block, visited = new Set()) {
    const type = (block && block.type) || '';

    function isReporter(b) {
      if (!b) return false;
      if (b.outputConnection) return true;
      if (b.outputShape_ || b.output) return true;
      return false;
    }

    const getInputsText = (visitedParam) => {
      const parts = [];
      const inputs = block.inputList || [];
      for (const input of inputs) {
        // If there's a connected value block, try to inline it
        let inlined = '';
        try {
          const target = input.connection && input.connection.targetBlock && input.connection.targetBlock();
          if (target && !visitedParam.has(target.id) && isReporter(target)) {
            visitedParam.add(target.id);
            inlined = translateBlockDetailed(target, visitedParam);
          }
        } catch (e) {
          inlined = '';
        }
        if (inlined) {
          parts.push(inlined);
          continue;
        }

        if (!input.fieldRow) continue;
        for (const field of input.fieldRow) {
          const v = getFieldValueText(field);
          if (!v) continue;
          parts.push(v);
        }
      }
      return parts.join(' ');
    };

    const getInputValues = (blk, visitedParam) => {
      const vals = [];
      const inputs = (blk && blk.inputList) || [];
      for (const input of inputs) {
        try {
          const target = input.connection && input.connection.targetBlock && input.connection.targetBlock();
          if (target && isReporter(target) && !visitedParam.has(target.id)) {
            const ttype = (target && target.type) || '';
            // math_number / math_angle
            if (ttype.includes('math_number') || ttype.includes('math_angle')) {
              for (const f of (target.inputList && target.inputList[0] && target.inputList[0].fieldRow) || []) {
                const fv = getFieldValueText(f);
                if (fv) {
                  visitedParam.add(target.id);
                  vals.push(fv);
                  break;
                }
              }
              continue;
            }
            // gotoxy reporter -> return raw coords
            if (ttype.includes('motion_gotoxy') || ttype.includes('gotoxy')) {
              // extract inner x/y values
              const inner = getInputValues(target, visitedParam);
              const ix = inner[0] || '<数值>';
              const iy = inner[1] || '<数值>';
              visitedParam.add(target.id);
              vals.push(`x:${ix} y:${iy}`);
              continue;
            }
            // dropdown menus
            if (ttype.includes('motion_goto_menu') || ttype.includes('goto_menu') || ttype.includes('pointtowards_menu')) {
              for (const f of (target.inputList && target.inputList[0] && target.inputList[0].fieldRow) || []) {
                const fv = getFieldValueText(f);
                if (fv) {
                  visitedParam.add(target.id);
                  vals.push(fv);
                  break;
                }
              }
              continue;
            }
            // fallback: inline reporter (but avoid returning long sentence for motion blocks)
            visitedParam.add(target.id);
            const inlined = translateBlockDetailed(target, visitedParam);
            // if inlined starts with verbs like '移到' or '在 ' strip them for inline use
            const stripped = String(inlined).replace(/^移到\s*/g, '').replace(/^在\s*[\d<>一-龥\s]+秒内滑行到\s*/g, '');
            vals.push(stripped);
            continue;
          }
        } catch (e) {}

        if (!input.fieldRow) {
          vals.push('');
          continue;
        }
        const parts = [];
        for (const field of input.fieldRow) {
          const v = getFieldValueText(field);
          if (v) parts.push(v);
        }
        vals.push(parts.join(' '));
      }
      return vals;
    };

    // Reporters
    if (type.includes('math_number')) {
      const fv = getInputsText(visited) || '';
      return fv || '<数值>';
    }

    // Motion blocks formatting
    if (type.includes('motion_movesteps') || type.includes('move')) {
      const vals = getInputValues(block, visited);
      const v = vals[0] || '<步数>';
      return `移动 ${v} 步`;
    }
    if (type.includes('motion_turnright') || type.includes('turn_right')) {
      const vals = getInputValues(block, visited);
      const v = vals[0] || '<角度>';
      return `右转 ${v}${/\d/.test(String(v)) ? ' 度' : ''}`;
    }
    if (type.includes('motion_turnleft') || type.includes('turn_left')) {
      const vals = getInputValues(block, visited);
      const v = vals[0] || '<角度>';
      return `左转 ${v}${/\d/.test(String(v)) ? ' 度' : ''}`;
    }
    if (type.includes('motion_goto') || type.includes('goto')) {
      const vals = getInputValues(block, visited);
      const v = vals[0] || '<目标>';
      // If the target looks like 'x:... y:...' keep as-is
      if (typeof v === 'string' && /x:\s*-?\d+(?:\.\d+)?\s*y:\s*-?\d+(?:\.\d+)?/.test(v)) {
        return `移到 ${v}`;
      }
      // If this block actually has separate x/y inputs returned as two values, join them
      if (vals.length >= 2 && (vals[0] !== '' || vals[1] !== '')) {
        const maybeX = vals[0] || '<数值>';
        const maybeY = vals[1] || '<数值>';
        if (/^-?\d+(?:\.\d+)?$/.test(String(maybeX)) || /^-?\d+(?:\.\d+)?$/.test(String(maybeY))) {
          return `移到 x:${maybeX} y:${maybeY}`;
        }
      }
      return `移到 ${v}`;
    }
    if (type.includes('motion_gotoxy') || type.includes('gotoxy')) {
      let vals = getInputValues(block, visited);
      if (vals.length === 1 && typeof vals[0] === 'string' && vals[0].includes(' ')) {
        const s = vals[0].trim().split(/\s+/);
        if (s.length >= 2) vals = [s[0], s[1]];
      }
      const x = vals[0] || '<数值>';
      const y = vals[1] || '<数值>';
      return `移到 x:${x} y:${y}`;
    }
    // glide to that may have type like 'motion_glidesecstoxy' or similar
    if (type.includes('motion_glidesecstoxy') || type.includes('glidesecstoxy') || type.includes('motion_glideto') || type.includes('glideto')) {
      const vals = getInputValues(block, visited);
      // Some glide blocks have [secs, target] while others have [secs, x, y]
      const secs = vals[0] || '<秒数>';
      let target = vals[1] || '<目标>';
      if (vals.length >= 3 && vals[1] !== '' && vals[2] !== '') {
        target = `x:${vals[1]} y:${vals[2]}`;
      }
      return `在 ${secs} 秒内滑行到 ${target}`;
    }

    // Additional motion blocks
    if (type.includes('motion_changexby') || type.includes('change_x_by') || type.includes('movexby') || type.includes('change_x')) {
      const vals = getInputValues(block, visited);
      const v = vals[0] || '<数值>';
      return `将 x 增加 ${v}`;
    }
    if (type.includes('motion_setx') || type.includes('set_x')) {
      const vals = getInputValues(block, visited);
      const v = vals[0] || '<数值>';
      return `设置 x 为 ${v}`;
    }
    if (type.includes('motion_changeyby') || type.includes('change_y_by') || type.includes('changey') || type.includes('change_y')) {
      const vals = getInputValues(block, visited);
      const v = vals[0] || '<数值>';
      return `将 y 增加 ${v}`;
    }
    if (type.includes('motion_sety') || type.includes('set_y')) {
      const vals = getInputValues(block, visited);
      const v = vals[0] || '<数值>';
      return `设置 y 为 ${v}`;
    }
    if (type.includes('motion_ifonedgebounce') || type.includes('if_on_edge_bounce')) {
      return '碰到边缘就反弹';
    }
    // 设置旋转方式（下拉） -> 输出完整句子
    if (type.includes('motion_setrotationstyle') || type.includes('set_rotation_style') || type.includes('setrotationstyle')) {
      const vals = getInputValues(block, visited);
      const v = vals[0] || getInputsText(visited) || '<旋转方式>';
      return `将 旋转方式 设为 ${v}`;
    }
    // Generic flip detection (左右翻转) — fallback for unknown flip-like blocks
    if (type.includes('flip') || type.includes('mirror') || type.includes('左右翻转')) {
      const txt = getInputsText(visited) || '左右翻转';
      if (/左右|left-?right/i.test(txt)) return '左右翻转';
      return txt;
    }
    if (type.includes('motion_pointindirection') || type.includes('pointindirection')) {
      const vals = getInputValues(block, visited);
      const v = vals[0] || '<角度>';
      return `面向 ${v} 方向`;
    }
    if (type.includes('motion_pointtowards') || type.includes('pointtowards')) {
      const vals = getInputValues(block, visited);
      const v = vals[0] || '<目标>';
      return `面向 ${v}`;
    }

    // Looks / appearance blocks
    if (type.includes('looks_sayforsecs') || type.includes('sayforsecs')) {
      const vals = getInputValues(block, visited);
      const t = vals[0] || '<文本>';
      const s = vals[1] || '<秒数>';
      return `说 ${t} ${s} 秒`;
    }
    if (type.includes('looks_say') || (type.includes('say') && !type.includes('sayforsecs'))) {
      return `说 ${getInputsText(visited) || '<文本>'}`;
    }
    if (type.includes('looks_thinkforsecs') || type.includes('thinkforsecs')) {
      const vals = getInputValues(block, visited);
      const t = vals[0] || '<文本>';
      const s = vals[1] || '<秒数>';
      return `思考 ${t} ${s} 秒`;
    }
    if (type.includes('looks_think') || type.includes('think')) {
      return `思考 ${getInputsText(visited) || '<文本>'}`;
    }
    if (type.includes('looks_switchcostumeto') || type.includes('switchcostumeto') || type.includes('switch_costume_to')) {
      const vals = getInputValues(block, visited);
      const name = vals[0] || getInputsText(visited) || '<造型>';
      return `换成 ${name} 造型`;
    }
    if (type.includes('looks_nextcostume') || type.includes('nextcostume')) {
      return '下一个造型';
    }
    if (type.includes('looks_switchbackdropto') || type.includes('switchbackdropto') || type.includes('switch_backdrop_to')) {
      const vals = getInputValues(block, visited);
      const name = vals[0] || getInputsText(visited) || '<背景>';
      return `换成 ${name} 背景`;
    }
    if (type.includes('looks_nextbackdrop') || type.includes('nextbackdrop')) {
      return '下一个背景';
    }
    if (type.includes('looks_changesizeby') || type.includes('change_size_by') || type.includes('changesizeby')) {
      const vals = getInputValues(block, visited);
      const v = vals[0] || '<数值>';
      return `将大小增加 ${v}`;
    }
    if (type.includes('looks_setsizeto') || type.includes('set_size_to') || type.includes('setsizeto')) {
      const vals = getInputValues(block, visited);
      const v = vals[0] || '<数值>';
      return `将大小设为 ${v}`;
    }
    if (type.includes('looks_changeeffectby') || type.includes('change_effect') || type.includes('changeeffectby')) {
      const vals = getInputValues(block, visited);
      const effect = vals[1] || '<效果>';
      const v = vals[0] || '<数值>';
      return `将 ${effect} 特效增加 ${v}`;
    }
    if (type.includes('looks_seteffectto') || type.includes('set_effect_to') || type.includes('seteffectto')) {
      const vals = getInputValues(block, visited);
      const effect = vals[1] || '<效果>';
      const v = vals[0] || '<数值>';
      return `将 ${effect} 特效设定为 ${v}`;
    }
    if (type.includes('looks_cleargraphiceffects') || type.includes('clear_graphic') || type.includes('cleargraphiceffects')) {
      return '清除图形特效';
    }
    if (type.includes('looks_show') || type.includes('show')) {
      return '显示';
    }
    if (type.includes('looks_hide') || type.includes('hide')) {
      return '隐藏';
    }
    // Layer ordering
    if (type.includes('looks_gotofrontback') || type.includes('go_to_front_back') || type.includes('gotofrontback')) {
      const vals = getInputValues(block, visited);
      const v = vals[0] || getInputsText(visited) || '<位置>';
      if (/front|最前|前/i.test(String(v))) return '移到最前面';
      if (/back|最后|后/i.test(String(v))) return '移到最后面';
      return `移到最 ${v}`;
    }
    if (type.includes('looks_goforward') || type.includes('goforward') || type.includes('go_forward')) {
      const vals = getInputValues(block, visited);
      const v = vals[0] || '<层数>';
      return `前移 ${v} 层`;
    }
    if (type.includes('looks_goback') || type.includes('goback') || type.includes('go_back')) {
      const vals = getInputValues(block, visited);
      const v = vals[0] || '<层数>';
      return `后移 ${v} 层`;
    }

    // Other translations
    if (type.includes('looks_sayforsecs') || type.includes('say')) {
      return `说 ${getInputsText(visited) || '<文本>'}`;
    }
    if (type.includes('data_setvariableto') || type.includes('setvariableto')) {
      return `设置 变量 为 ${getInputsText(visited) || '<值>'}`;
    }
    if (type.includes('data_changevariableby')) {
      return `将 变量 增加 ${getInputsText(visited) || '<值>'}`;
    }
    if (type.includes('operator_add') || type.includes('math_add')) {
      return `${getInputsText(visited) || '<表达式>'} + ${getInputsText(visited) || '<表达式>'}`;
    }
    if (type.includes('operator_equals') || type.includes('logic_compare')) {
      return `${getInputsText(visited) || '<表达式>'} 等于 ${getInputsText(visited) || '<表达式>'}`;
    }
    if (type.includes('event_whenflagclicked') || type.includes('event_when')) {
      return '当 绿旗 被点击';
    }
    if (type === 'controls_if' || type.includes('control_if')) {
      return `如果 <表达式> 那么 {${getInputsText(visited) || '<语句>'}}`;
    }
    if (type === 'controls_if_else' || type.includes('control_if_else')) {
      return `如果 <表达式> 那么 {${getInputsText(visited) || '<语句>'}} 否则 {<否则语句>}`;
    }
    if (type.includes('control_repeat') || type.includes('repeat')) {
      return `重复执行{${getInputsText(visited) || '<语句>'}}`;
    }
    if (type.includes('control_forever')) {
      return `一直重复{${getInputsText(visited) || '<语句>'}}`;
    }

    // Fallback: include any simple field values (omit block type)
    const simpleFields = [];
    for (const input of block.inputList || []) {
      if (!input.fieldRow) continue;
      for (const field of input.fieldRow) {
        const v = getFieldValueText(field);
        if (v) simpleFields.push(v);
      }
    }
    if (simpleFields.length) return simpleFields.join(' ');
    return `[${type}]`;
  }

  function buildChineseCodeFromBlock(block) {
    if (!block) return '';
    // Try to get a structured representation by walking descendants
    const lines = [];
    const visited = new Set();
    // Walk the top-level sequence (next blocks). Input-connected reporter blocks are inlined by translateBlockDetailed.
    let cur = block;
    while (cur) {
      try {
        lines.push(translateBlockDetailed(cur, visited));
      } catch (e) {
        lines.push(`[${cur.type}]`);
      }
      try {
        cur = cur.getNextBlock && cur.getNextBlock();
      } catch (e) {
        break;
      }
    }

    return lines.join('\n');
  }

  function trySetComment(topBlock, text) {
    try {
      if (!topBlock) return false;
      // Blockly provides setCommentText in some builds
      if (typeof topBlock.setCommentText === 'function') {
        topBlock.setCommentText(text);
        return true;
      }
      // ScratchBlocks may support commenting via .comment && .comment.setText
      if (topBlock.comment && typeof topBlock.comment.setText === 'function') {
        topBlock.comment.setText(text);
        return true;
      }
    } catch (e) {
      console.warn('Failed to set comment:', e);
    }
    return false;
  }

  addon.tab.createBlockContextMenu((items, block) => {
    if (addon.self.disabled) return items;

    const insertIndex = items.length; // append at end
    items.splice(insertIndex, 0, {
      enabled: !!block,
      text: msg('') || '生成中文code',
      callback: async () => {
        try {
          const top = block.getTopBlock ? block.getTopBlock() : block;
          const body = buildChineseCodeFromBlock(top);
          const finalText = '#<cn.code>\n' + body;

          const didComment = trySetComment(top, finalText);
          if (!didComment) {
            // fallback: copy to clipboard
              if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(finalText);
              alert(msg('cn-code/copied') || '中文 code 已复制到剪贴板');
            } else {
              // last resort: prompt user to copy manually
              window.prompt(msg('cn-code/copy_prompt') || '复制中文 code:', finalText);
            }
          }
        } catch (e) {
          console.error('生成中文code 出错', e);
          alert(msg('cn-code/error') || '生成中文code 时出错');
        }
      },
      separator: false
    });

    return items;
  }, { blocks: true });
}
