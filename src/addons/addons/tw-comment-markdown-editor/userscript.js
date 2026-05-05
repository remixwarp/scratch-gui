export default async function ({ addon, console }) {
  const vm = addon.tab.traps.vm;

  const Blockly = await addon.tab.traps.getBlockly();

  const processCommentElements = () => {
    if (addon.self.disabled) return;

    const commentElements = document.querySelectorAll('.blocklyBubbleCanvas > g');

    commentElements.forEach(commentEl => {
      if (commentEl.dataset.markdownProcessed) return;

      const textarea = commentEl.querySelector('textarea');
      if (!textarea) return;

      const topBar = commentEl.querySelector('.scratchCommentBody') || commentEl.querySelector('[class*="TopBar"]') || commentEl.firstElementChild;
      if (!topBar) return;

      commentEl.dataset.markdownProcessed = 'true';

      const toggleContainer = document.createElement('div');
      toggleContainer.className = 'tw-md-toggle-container';

      const modeIndicator = document.createElement('span');
      modeIndicator.className = 'tw-md-mode-indicator';
      modeIndicator.textContent = '编辑模式';

      const toggleButton = document.createElement('button');
      toggleButton.className = 'tw-md-toggle-button';
      toggleButton.innerHTML = '编辑';
      toggleButton.dataset.mode = 'edit';
      toggleButton.title = '切换到预览模式 (Ctrl+M)';

      toggleContainer.appendChild(modeIndicator);
      toggleContainer.appendChild(toggleButton);

      const previewContainer = document.createElement('div');
      previewContainer.className = 'tw-md-preview-container';
      previewContainer.style.display = 'none';

      toggleContainer.appendChild(toggleButton);
      topBar.appendChild(toggleContainer);

      const contentArea = commentEl.querySelector('.scratchCommentTextarea')?.parentElement || textarea.parentElement;
      if (contentArea) {
        contentArea.appendChild(previewContainer);
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
          modeIndicator.textContent = '预览模式';
          modeIndicator.classList.add('preview-mode');
          textarea.style.display = 'none';
          previewContainer.style.display = 'block';

          renderMarkdown(textarea.value, previewContainer);
        } else {
          toggleButton.dataset.mode = 'edit';
          toggleButton.innerHTML = '编辑';
          toggleButton.title = '切换到预览模式 (Ctrl+M)';
          modeIndicator.textContent = '编辑模式';
          modeIndicator.classList.remove('preview-mode');
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
  });

  addon.self.addEventListener('enabled', () => {
    setTimeout(processCommentElements, 500);
  });
}
