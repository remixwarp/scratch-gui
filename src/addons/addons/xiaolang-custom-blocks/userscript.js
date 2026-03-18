export default async function ({ addon, console }) {
  // 替换自制积木为函数的函数
  const replaceCustomBlocksText = () => {
    if (addon.self.disabled) return;
    
    // 只在选取积木区的类别下面进行替换
    // 查找积木区的类别容器
    const blockCategories = document.querySelectorAll('[class*="category_category"]');
    blockCategories.forEach(category => {
      // 查找类别内的所有元素
      const elements = category.querySelectorAll('*');
      elements.forEach(element => {
        // 只处理文本节点
        if (element.nodeType === 3) {
          const parent = element.parentNode;
          if (parent && parent.tagName !== 'SCRIPT' && parent.tagName !== 'STYLE') {
            const text = element.nodeValue;
            if (text.includes('自制积木')) {
              const newText = text.replace(/自制积木/g, '函数');
              element.nodeValue = newText;
            }
          }
        }
        // 处理元素的属性
        else if (element.nodeType === 1) {
          // 检查 title 属性
          if (element.hasAttribute('title')) {
            const title = element.getAttribute('title');
            if (title.includes('自制积木')) {
              const newTitle = title.replace(/自制积木/g, '函数');
              element.setAttribute('title', newTitle);
            }
          }
          // 检查 placeholder 属性
          if (element.hasAttribute('placeholder')) {
            const placeholder = element.getAttribute('placeholder');
            if (placeholder.includes('自制积木')) {
              const newPlaceholder = placeholder.replace(/自制积木/g, '函数');
              element.setAttribute('placeholder', newPlaceholder);
            }
          }
        }
      });
    });
  };
  
  // 监听插件启用/禁用事件
  addon.self.addEventListener("disabled", () => {
    // 禁用时恢复原始文本
    location.reload(); // 简单起见，直接刷新页面
  });
  
  addon.self.addEventListener("reenabled", () => {
    replaceCustomBlocksText();
  });
  
  // 初始化替换
  const initialize = () => {
    if (addon.self.disabled) return;
    
    // 立即执行一次替换
    replaceCustomBlocksText();
    
    // 监听 DOM 变化，处理动态加载的内容
    const observer = new MutationObserver(() => {
      if (!addon.self.disabled) {
        replaceCustomBlocksText();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  };
  
  // 等待 DOM 加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
}
