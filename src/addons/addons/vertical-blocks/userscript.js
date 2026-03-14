export default async function ({ addon, msg, console }) {
  const Blockly = await addon.tab.traps.getBlockly();

  // Override block dragging behavior to only allow vertical movement
  const originalDragBlock = Blockly.BlockDragger.prototype.dragBlock;
  Blockly.BlockDragger.prototype.dragBlock = function(e, currentDragDeltaXY, opt_forceConnectionUpdate) {
    // Check if we're in vertical mode
    if (this.workspace_.isVerticalMode) {
      // Only allow vertical movement
      currentDragDeltaXY.x = 0;
    }
    return originalDragBlock.call(this, e, currentDragDeltaXY, opt_forceConnectionUpdate);
  };

  // Add vertical mode property to workspace
  Blockly.WorkspaceSvg.prototype.isVerticalMode = false;

  // Add method to toggle vertical mode
  Blockly.WorkspaceSvg.prototype.toggleVerticalMode = function() {
    this.isVerticalMode = !this.isVerticalMode;
    console.log('Vertical mode:', this.isVerticalMode);
  };

  // Add square button to zoom controls
  const originalZoomControlsCreate = Blockly.ZoomControls.prototype.createDom;
  Blockly.ZoomControls.prototype.createDom = function() {
    const result = originalZoomControlsCreate.call(this);

    // Add square button
    const squareButton = document.createElement('button');
    squareButton.className = 'blocklyZoom square-button';
    squareButton.title = msg('show-block-sections', 'Show block sections');
    squareButton.innerHTML = '□';
    squareButton.style.fontSize = '12px';
    squareButton.style.width = '24px';
    squareButton.style.height = '24px';
    squareButton.style.marginBottom = '5px';
    squareButton.style.border = '1px solid #ccc';
    squareButton.style.borderRadius = '3px';
    squareButton.style.backgroundColor = '#f5f5f5';
    squareButton.style.cursor = 'pointer';
    squareButton.style.display = 'block';

    // Insert before zoom in button
    const svgGroup = this.svgGroup_;
    if (svgGroup) {
      const zoomInButton = svgGroup.querySelector('.blocklyZoom > svg');
      if (zoomInButton && zoomInButton.parentNode) {
        zoomInButton.parentNode.insertBefore(squareButton, zoomInButton.parentNode.firstChild);

        // Add click event
        squareButton.addEventListener('click', function() {
          const workspace = Blockly.getMainWorkspace();
          if (workspace) {
            showBlockSections(workspace);
          }
        });

        this.squareButton_ = squareButton;
      }
    }
    return result;
  };

  // Add method to show block sections
  function showBlockSections(workspace) {
    // Create modal for block sections
    const modal = document.createElement('div');
    modal.className = 'block-sections-modal';
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.width = '400px';
    modal.style.height = '500px';
    modal.style.backgroundColor = 'white';
    modal.style.border = '1px solid #ccc';
    modal.style.borderRadius = '5px';
    modal.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    modal.style.padding = '20px';
    modal.style.zIndex = '1000';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '20px';

    const title = document.createElement('h3');
    title.textContent = msg('block-sections', 'Block Sections');
    header.appendChild(title);

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.fontSize = '20px';
    closeButton.style.border = 'none';
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.cursor = 'pointer';
    closeButton.addEventListener('click', function() {
      document.body.removeChild(modal);
    });
    header.appendChild(closeButton);

    modal.appendChild(header);

    const content = document.createElement('div');
    content.style.overflowY = 'auto';
    content.style.maxHeight = '400px';

    // Get top blocks
    const topBlocks = workspace.getTopBlocks(true);

    if (topBlocks.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.textContent = msg('no-blocks-found', 'No blocks found');
      content.appendChild(emptyMessage);
    } else {
      topBlocks.forEach((block, index) => {
        const section = document.createElement('div');
        section.style.border = '1px solid #eee';
        section.style.borderRadius = '3px';
        section.style.padding = '10px';
        section.style.marginBottom = '10px';

        const sectionHeader = document.createElement('div');
        sectionHeader.style.display = 'flex';
        sectionHeader.style.justifyContent = 'space-between';
        sectionHeader.style.alignItems = 'center';
        sectionHeader.style.marginBottom = '5px';

        const sectionTitle = document.createElement('span');
        sectionTitle.className = 'section-title';
        sectionTitle.textContent = msg('section', 'Section') + ' ' + (index + 1);
        sectionTitle.style.fontWeight = 'bold';
        sectionTitle.style.cursor = 'pointer';

        // Add click event to edit section name
        sectionTitle.addEventListener('click', function() {
          const input = document.createElement('input');
          input.type = 'text';
          input.value = sectionTitle.textContent;
          input.style.width = '150px';
          input.style.marginRight = '10px';

          sectionHeader.replaceChild(input, sectionTitle);
          input.focus();

          input.addEventListener('blur', function() {
            sectionTitle.textContent = input.value || (msg('section', 'Section') + ' ' + (index + 1));
            sectionHeader.replaceChild(sectionTitle, input);
          });

          input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
              sectionTitle.textContent = input.value || (msg('section', 'Section') + ' ' + (index + 1));
              sectionHeader.replaceChild(sectionTitle, input);
            }
          });
        });

        const sectionButton = document.createElement('button');
        sectionButton.textContent = msg('go-to-section', 'Go to Section');
        sectionButton.style.fontSize = '12px';
        sectionButton.style.padding = '2px 8px';
        sectionButton.style.border = '1px solid #ccc';
        sectionButton.style.borderRadius = '3px';
        sectionButton.style.backgroundColor = '#f5f5f5';
        sectionButton.style.cursor = 'pointer';

        // Add click event to scroll to block
        sectionButton.addEventListener('click', function() {
          const blockXY = block.getRelativeToSurfaceXY();
          workspace.scrollCenterOn(blockXY.x, blockXY.y);
          document.body.removeChild(modal);
        });

        sectionHeader.appendChild(sectionTitle);
        sectionHeader.appendChild(sectionButton);
        section.appendChild(sectionHeader);

        const blockType = document.createElement('span');
        blockType.style.fontSize = '12px';
        blockType.style.color = '#666';
        blockType.textContent = msg('block-type', 'Block type') + ': ' + block.type;
        section.appendChild(blockType);

        content.appendChild(section);
      });
    }

    modal.appendChild(content);
    document.body.appendChild(modal);
  }

  // Enable vertical mode by default when addon is enabled
  addon.self.addEventListener('reenabled', function() {
    const workspace = Blockly.getMainWorkspace();
    if (workspace) {
      workspace.isVerticalMode = true;
      console.log('Vertical mode enabled');
    }
  });

  addon.self.addEventListener('disabled', function() {
    const workspace = Blockly.getMainWorkspace();
    if (workspace) {
      workspace.isVerticalMode = false;
      console.log('Vertical mode disabled');
    }
  });

  // Initialize vertical mode
  const workspace = Blockly.getMainWorkspace();
  if (workspace) {
    workspace.isVerticalMode = true;
    console.log('Vertical mode initialized');
  }
}