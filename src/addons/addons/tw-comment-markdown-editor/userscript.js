export default async function ({ addon, console }) {
  const vm = addon.tab.traps.vm;

  const Blockly = await addon.tab.traps.getBlockly();

  const processCommentElements = () => {
    if (addon.self.disabled) return;

    const commentElements = document.querySelectorAll('.blocklyBubbleCanvas > g');
    console.log('Markdown Editor: Found', commentElements.length, 'comment elements');

    commentElements.forEach((commentEl, index) => {
      console.log('Markdown Editor: Processing comment element', index, commentEl);
      
      if (commentEl.dataset.markdownProcessed) {
        console.log('Markdown Editor: Already processed, skipping');
        return;
      }

      const textarea = commentEl.querySelector('textarea');
      console.log('Markdown Editor: Found textarea:', !!textarea);
      if (!textarea) {
        console.log('Markdown Editor: No textarea found, skipping');
        return;
      }

      const scratchCommentBody = commentEl.querySelector('.scratchCommentBody');
      const topBarClass = commentEl.querySelector('[class*="TopBar"]');
      const firstChild = commentEl.firstElementChild;
      console.log('Markdown Editor: scratchCommentBody:', !!scratchCommentBody, 'topBarClass:', !!topBarClass, 'firstChild:', !!firstChild);
      
      const topBar = scratchCommentBody || topBarClass || firstChild;
      if (!topBar) {
        console.log('Markdown Editor: No topBar found, skipping');
        return;
      }

      commentEl.dataset.markdownProcessed = 'true';

      const toggleContainer = document.createElement('div');
      toggleContainer.className = 'tw-md-toggle-container';
      toggleContainer.style.cssText = `
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: 2px 6px;
        background: transparent;
        gap: 6px;
        position: absolute;
        top: 2px;
        right: 2px;
        z-index: 100;
      `;

      const modeIndicator = document.createElement('span');
      modeIndicator.className = 'tw-md-mode-indicator';
      modeIndicator.textContent = '编辑模式';
      modeIndicator.style.cssText = `
        font-size: 14px;
        color: #888;
        margin-right: 8px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        opacity: 0.8;
        text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
      `;

      const toggleButton = document.createElement('button');
      toggleButton.className = 'tw-md-toggle-button';
      toggleButton.innerHTML = '编辑';
      toggleButton.dataset.mode = 'edit';
      toggleButton.title = '切换到预览模式 (Ctrl+M)';
      toggleButton.style.cssText = `
        background: rgba(200, 200, 200, 0.5);
        color: #555;
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        opacity: 0.9;
        user-select: none;
        display: flex;
        align-items: center;
        gap: 6px;
      `;

      toggleContainer.appendChild(modeIndicator);
      toggleContainer.appendChild(toggleButton);

      const previewContainer = document.createElement('div');
      previewContainer.className = 'tw-md-preview-container';
      previewContainer.style.cssText = `
        display: none;
        width: 100%;
        height: 100%;
        padding: 12px;
        background: transparent;
        color: #333;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 16px;
        line-height: 1.7;
        white-space: pre-wrap;
        overflow-y: auto;
        overflow-x: hidden;
        box-sizing: border-box;
        max-height: 100%;
      `;

      topBar.appendChild(toggleContainer);
      console.log('Markdown Editor: Added toggle container to topBar');

      const contentArea = commentEl.querySelector('.scratchCommentTextarea')?.parentElement || textarea.parentElement;
      if (contentArea) {
        contentArea.appendChild(previewContainer);
        console.log('Markdown Editor: Added preview container to contentArea');
      }

      toggleButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleMode();
      });

      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
          const activeElement = document.activeElement;
          const isEditingComment = activeElement && (
            activeElement === textarea ||
            activeElement.closest('[data-markdown-processed]') === commentEl
          );

          const isInPreviewMode = toggleButton.dataset.mode === 'preview';

          if ((isEditingComment || isInPreviewMode) && commentEl.dataset.markdownProcessed === 'true') {
            e.preventDefault();
            toggleMode();
          }
        }
      });

      function toggleMode() {
        const mode = toggleButton.dataset.mode;
        if (mode === 'edit') {
          toggleButton.dataset.mode = 'preview';
          toggleButton.innerHTML = '预览';
          toggleButton.title = '切换到编辑模式 (Ctrl+M)';
          toggleButton.style.cssText = `
            background: rgba(76, 175, 80, 0.4);
            color: #2E7D32;
            border: 1px solid rgba(76, 175, 80, 0.4);
            border-radius: 6px;
            padding: 6px 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            opacity: 0.9;
            user-select: none;
            display: flex;
            align-items: center;
            gap: 6px;
          `;
          modeIndicator.textContent = '预览模式';
          modeIndicator.style.cssText = `
            font-size: 14px;
            color: #4CAF50;
            margin-right: 8px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            opacity: 1;
            text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
          `;
          textarea.style.display = 'none';
          previewContainer.style.display = 'block';

          renderMarkdown(textarea.value, previewContainer);
        } else {
          toggleButton.dataset.mode = 'edit';
          toggleButton.innerHTML = '编辑';
          toggleButton.title = '切换到预览模式 (Ctrl+M)';
          toggleButton.style.cssText = `
            background: rgba(200, 200, 200, 0.5);
            color: #555;
            border: 1px solid rgba(0, 0, 0, 0.2);
            border-radius: 6px;
            padding: 6px 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            opacity: 0.9;
            user-select: none;
            display: flex;
            align-items: center;
            gap: 6px;
          `;
          modeIndicator.textContent = '编辑模式';
          modeIndicator.style.cssText = `
            font-size: 14px;
            color: #888;
            margin-right: 8px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            opacity: 0.8;
            text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
          `;
          textarea.style.display = 'block';
          previewContainer.style.display = 'none';

          textarea.focus();
        }
      }

      textarea.addEventListener('input', () => {
        if (toggleButton.dataset.mode === 'preview') {
          renderMarkdown(textarea.value, previewContainer);
        }
      });

      console.log('Processed comment element:', commentEl);
    });
  };

  function renderMarkdown(text, container) {
    container.innerHTML = '';

    let html = text
      .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gm, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gm, '<em>$1</em>')
      .replace(/```([\s\S]*?)```/gm, '<pre><code>$1</code></pre>')
      .replace(/`(.*?)`/gm, '<code>$1</code>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/gm, '<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0;">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gm, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/^\* (.*$)/gm, '<li>$1</li>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/\n/g, '<br>');

    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    container.innerHTML = html;
  }

  const observer = new MutationObserver((mutations) => {
    let shouldProcess = false;
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.matches && node.matches('.blocklyBubbleCanvas > g')) {
            shouldProcess = true;
          } else if (node.querySelector && node.querySelector('.blocklyBubbleCanvas > g')) {
            shouldProcess = true;
          }
        }
      });
    });

    if (shouldProcess) {
      setTimeout(processCommentElements, 100);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  setTimeout(processCommentElements, 1000);

  setInterval(processCommentElements, 2000);

  addon.self.addEventListener('disabled', () => {
    const toggleContainers = document.querySelectorAll('.tw-md-toggle-container');
    const previewContainers = document.querySelectorAll('.tw-md-preview-container');

    toggleContainers.forEach(container => container.remove());
    previewContainers.forEach(container => container.remove());

    const processedElements = document.querySelectorAll('[data-markdown-processed]');
    processedElements.forEach(el => {
      delete el.dataset.markdownProcessed;
      const textarea = el.querySelector('textarea');
      if (textarea) {
        textarea.style.display = 'block';
      }
    });

    console.log('Markdown comment editor addon disabled');
  });

  addon.self.addEventListener('enabled', () => {
    setTimeout(processCommentElements, 500);
    console.log('Markdown comment editor addon enabled');
  });

  console.log('Markdown comment editor addon loaded');
}
