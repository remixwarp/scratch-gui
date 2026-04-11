export default async ({ addon, console, msg }) => {
  const replaceColorInAllCostumes = async (oldColor, newColor) => {
    const vm = addon.tab.traps.getVM();
    const target = vm.editingTarget;
    if (!target || !target.sprite || !target.sprite.costumes) return;
    
    const costumes = target.sprite.costumes;
    for (let i = 0; i < costumes.length; i++) {
      const costume = costumes[i];
      if (costume.dataFormat === 'svg') {
        const svgContent = await vm.getCostume(i);
        const updatedSvg = svgContent.replace(new RegExp(oldColor, 'gi'), newColor);
        vm.updateSvg(i, updatedSvg, costume.rotationCenterX, costume.rotationCenterY);
      } else if (costume.dataFormat === 'png' || costume.dataFormat === 'bmp') {
        // 对于位图，我们需要获取图像数据，替换颜色，然后更新
        // 这里需要更复杂的实现，暂时跳过
        console.log('Bitmap color replacement not implemented yet');
      }
    }
  };

  const getCurrentColor = () => {
    const state = addon.tab.redux.state;
    let fillOrStroke;
    if (state.scratchPaint.modals.fillColor) {
      fillOrStroke = "fill";
    } else if (state.scratchPaint.modals.strokeColor) {
      fillOrStroke = "stroke";
    } else {
      return null;
    }
    const colorType = state.scratchPaint.fillMode.colorIndex;
    const primaryOrSecondary = ["primary", "secondary"][colorType];
    const color = state.scratchPaint.color[`${fillOrStroke}Color`][primaryOrSecondary];
    if (color === null || color === "scratch-paint/style-path/mixed") return null;
    return color;
  };

  while (true) {
    // 等待颜色选择器面板出现，寻找包含颜色滑块的元素
    const colorSlider = await addon.tab.waitForElement('div[class*="color-picker"]', {
      markAsSeen: true,
      reduxCondition: (state) => state.scratchGui.editorTab.activeTabIndex === 1 && !state.scratchGui.mode.isPlayerOnly,
    });

    if (addon.tab.editorMode !== "editor") continue;

    // 检查是否已经添加了按钮
    if (colorSlider.querySelector('.batch-color-replace-button')) continue;

    // 创建批量替换按钮
    const replaceButton = Object.assign(document.createElement('button'), {
      className: 'batch-color-replace-button',
      textContent: msg('replaceAll'),
      title: msg('replaceAllTooltip'),
      style: {
        margin: '10px 0',
        padding: '8px 12px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
        width: '100%',
        fontWeight: 'bold',
        textAlign: 'center'
      }
    });

    replaceButton.addEventListener('click', async () => {
      const currentColor = getCurrentColor();
      if (!currentColor) {
        alert(msg('noColorSelected'));
        return;
      }

      const newColor = prompt(msg('enterNewColor'), currentColor);
      if (!newColor) return;

      // 验证颜色格式
      if (!/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
        alert(msg('invalidColor'));
        return;
      }

      await replaceColorInAllCostumes(currentColor, newColor);
      alert(msg('replaceSuccess'));
    });

    // 找到颜色值输入框的位置，将按钮添加到输入框上方
    const colorInput = colorSlider.querySelector('input[type="text"], input[class*="color-picker"]');
    if (colorInput) {
      colorInput.parentElement.insertBefore(replaceButton, colorInput);
    } else {
      // 如果找不到输入框，就将按钮添加到面板的底部
      colorSlider.appendChild(replaceButton);
    }
  }
};