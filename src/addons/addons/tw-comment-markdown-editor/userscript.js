export default async function ({ addon, console }) {
  console.log('=== Markdown Editor Addon: Loaded ===');
  
  const processComments = () => {
    if (addon.self.disabled) return;
    
    const comments = document.querySelectorAll('.blocklyBubbleCanvas > g');
    console.log('Markdown Editor: Found', comments.length, 'comments');
    
    comments.forEach(comment => {
      if (comment.dataset.mdProcessed) return;
      
      const textarea = comment.querySelector('textarea');
      if (!textarea) return;
      
      const topBar = comment.querySelector('.scratchCommentBody') || comment.querySelector('[class*="TopBar"]') || comment.firstElementChild;
      if (!topBar) return;
      
      comment.dataset.mdProcessed = 'true';
      
      const button = document.createElement('button');
      button.textContent = '编辑';
      button.style.cssText = `
        position: absolute !important;
        top: 5px !important;
        right: 5px !important;
        z-index: 100 !important;
        background: #4CAF50 !important;
        color: white !important;
        border: none !important;
        padding: 4px 10px !important;
        border-radius: 4px !important;
        font-size: 12px !important;
        cursor: pointer !important;
      `;
      
      topBar.style.position = 'relative';
      topBar.appendChild(button);
      
      console.log('Markdown Editor: Added button to comment');
      
      button.addEventListener('click', () => {
        alert('Markdown Editor button clicked!');
      });
    });
  };
  
  setTimeout(processComments, 1000);
  setInterval(processComments, 2000);
  
  console.log('=== Markdown Editor Addon: Ready ===');
}
