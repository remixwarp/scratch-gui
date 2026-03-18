export default async function ({ addon, console }) {
  // 替换自制积木/自定义积木为函数的函数
  const replaceCustomBlocksText = () => {
    if (addon.self.disabled) return;
    
    console.log('执行替换操作...');
    
    // 扩大搜索范围，查找所有可能包含积木类别的元素
    const elements = document.querySelectorAll('*');
    let replaced = 0;
    
    elements.forEach(element => {
      // 只处理文本节点
      if (element.nodeType === 3) {
        const parent = element.parentNode;
        if (parent && parent.tagName !== 'SCRIPT' && parent.tagName !== 'STYLE') {
          const text = element.nodeValue;
          if (text.includes('自制积木') || text.includes('自定义积木')) {
            const newText = text.replace(/自制积木|自定义积木/g, '函数');
            element.nodeValue = newText;
            replaced++;
          }
        }
      }
      // 处理元素的属性
      else if (element.nodeType === 1) {
        // 检查 title 属性
        if (element.hasAttribute('title')) {
          const title = element.getAttribute('title');
          if (title.includes('自制积木') || title.includes('自定义积木')) {
            const newTitle = title.replace(/自制积木|自定义积木/g, '函数');
            element.setAttribute('title', newTitle);
            replaced++;
          }
        }
        // 检查 placeholder 属性
        if (element.hasAttribute('placeholder')) {
          const placeholder = element.getAttribute('placeholder');
          if (placeholder.includes('自制积木') || placeholder.includes('自定义积木')) {
            const newPlaceholder = placeholder.replace(/自制积木|自定义积木/g, '函数');
            element.setAttribute('placeholder', newPlaceholder);
            replaced++;
          }
        }
      }
    });
    
    console.log(`替换完成，共替换 ${replaced} 处`);
  };
  
  // 监听插件启用/禁用事件
  addon.self.addEventListener("disabled", () => {
    console.log('插件已禁用');
    // 禁用时恢复原始文本
    location.reload(); // 简单起见，直接刷新页面
  });
  
  addon.self.addEventListener("reenabled", () => {
    console.log('插件已启用，执行替换');
    replaceCustomBlocksText();
  });
  
  // 初始化替换
  const initialize = () => {
    if (addon.self.disabled) return;
    
    console.log('初始化插件...');
    
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
    
    console.log('插件初始化完成，开始监听DOM变化');
  };
  
  // 等待 DOM 加载完成
  if (document.readyState === 'loading') {
    console.log('DOM 正在加载，等待完成...');
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    console.log('DOM 已加载，直接初始化');
    initialize();
  }
}
