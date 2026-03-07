/**
 * RemixWarp Scratch - WeChat Mini Program WebView Bridge
 * 
 * 此文件用于与微信小程序通信
 */

(function() {
  'use strict';

  // 检测是否在小程序环境中
  const isWechatMiniProgram = () => {
    return typeof wx !== 'undefined' && wx.miniProgram;
  };

  // WebView Bridge 类
  class WechatWebViewBridge {
    constructor() {
      this.isInMiniProgram = isWechatMiniProgram();
      this.messageQueue = [];
      this.listeners = {};
      
      if (this.isInMiniProgram) {
        this.init();
      }
    }

    // 初始化
    init() {
      console.log('[WechatBridge] Initializing...');
      
      // 监听来自小程序的消息
      window.addEventListener('message', (e) => {
        this.handleMessage(e.data);
      });

      // 通知小程序 WebView 已就绪
      this.postMessage({
        type: 'webviewReady',
        data: {
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        }
      });

      console.log('[WechatBridge] Initialized');
    }

    // 发送消息到小程序
    postMessage(message) {
      if (!this.isInMiniProgram) {
        console.log('[WechatBridge] Not in mini program, message queued:', message);
        this.messageQueue.push(message);
        return;
      }

      try {
        wx.miniProgram.postMessage({
          data: message
        });
        console.log('[WechatBridge] Message sent:', message);
      } catch (error) {
        console.error('[WechatBridge] Failed to send message:', error);
      }
    }

    // 处理来自小程序的消息
    handleMessage(message) {
      console.log('[WechatBridge] Message received:', message);
      
      if (message && message.type) {
        // 触发对应的事件监听器
        if (this.listeners[message.type]) {
          this.listeners[message.type].forEach(callback => {
            try {
              callback(message.data);
            } catch (error) {
              console.error('[WechatBridge] Error in message handler:', error);
            }
          });
        }
      }
    }

    // 添加消息监听器
    on(type, callback) {
      if (!this.listeners[type]) {
        this.listeners[type] = [];
      }
      this.listeners[type].push(callback);
      
      // 返回取消订阅函数
      return () => {
        this.off(type, callback);
      };
    }

    // 移除消息监听器
    off(type, callback) {
      if (this.listeners[type]) {
        const index = this.listeners[type].indexOf(callback);
        if (index > -1) {
          this.listeners[type].splice(index, 1);
        }
      }
    }

    // 通知项目已保存
    notifyProjectSaved(projectData) {
      this.postMessage({
        type: 'projectSaved',
        data: {
          projectName: projectData.name,
          projectId: projectData.id,
          timestamp: Date.now()
        }
      });
    }

    // 通知项目已加载
    notifyProjectLoaded(projectData) {
      this.postMessage({
        type: 'projectLoaded',
        data: {
          projectName: projectData.name,
          projectId: projectData.id,
          timestamp: Date.now()
        }
      });
    }

    // 通知错误
    notifyError(error) {
      this.postMessage({
        type: 'error',
        data: {
          message: error.message || 'Unknown error',
          stack: error.stack,
          timestamp: Date.now()
        }
      });
    }

    // 更新状态
    updateStatus(statusText) {
      this.postMessage({
        type: 'status',
        data: {
          statusText,
          timestamp: Date.now()
        }
      });
    }

    // 导航到小程序页面
    navigateTo(page, params = {}) {
      if (!this.isInMiniProgram) return;
      
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const url = `/pages/${page}/${page}${queryString ? '?' + queryString : ''}`;
      
      wx.miniProgram.navigateTo({
        url: url,
        success: () => {
          console.log('[WechatBridge] Navigated to:', url);
        },
        fail: (error) => {
          console.error('[WechatBridge] Navigation failed:', error);
        }
      });
    }

    // 返回上一页
    navigateBack(delta = 1) {
      if (!this.isInMiniProgram) return;
      
      wx.miniProgram.navigateBack({
        delta: delta,
        success: () => {
          console.log('[WechatBridge] Navigated back');
        },
        fail: (error) => {
          console.error('[WechatBridge] Navigate back failed:', error);
        }
      });
    }

    // 显示小程序提示
    showToast(title, icon = 'none', duration = 2000) {
      if (!this.isInMiniProgram) {
        // 在浏览器环境中使用 alert
        alert(title);
        return;
      }
      
      wx.miniProgram.showToast({
        title: title,
        icon: icon,
        duration: duration
      });
    }

    // 显示小程序加载
    showLoading(title = '加载中...') {
      if (!this.isInMiniProgram) return;
      
      wx.miniProgram.showLoading({
        title: title,
        mask: true
      });
    }

    // 隐藏小程序加载
    hideLoading() {
      if (!this.isInMiniProgram) return;
      
      wx.miniProgram.hideLoading();
    }

    // 获取小程序信息
    getSystemInfo() {
      return new Promise((resolve, reject) => {
        if (!this.isInMiniProgram) {
          resolve({
            platform: 'web',
            isMiniProgram: false
          });
          return;
        }
        
        wx.getSystemInfo({
          success: (res) => {
            resolve({
              ...res,
              isMiniProgram: true
            });
          },
          fail: reject
        });
      });
    }

    // 设置屏幕亮度
    setScreenBrightness(value) {
      if (!this.isInMiniProgram) return;
      
      wx.setScreenBrightness({
        value: Math.max(0, Math.min(1, value))
      });
    }

    // 保持屏幕常亮
    keepScreenOn(enable = true) {
      if (!this.isInMiniProgram) return;
      
      wx.setKeepScreenOn({
        keepScreenOn: enable
      });
    }

    // 振动
    vibrate(type = 'short') {
      if (!this.isInMiniProgram) return;
      
      if (type === 'long') {
        wx.vibrateLong();
      } else {
        wx.vibrateShort();
      }
    }
  }

  // 创建全局实例
  const bridge = new WechatWebViewBridge();

  // 暴露到全局
  if (typeof window !== 'undefined') {
    window.WechatWebViewBridge = bridge;
    window.isWechatMiniProgram = isWechatMiniProgram;
  }

  // 如果支持模块导出
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WechatWebViewBridge, isWechatMiniProgram };
  }

  console.log('[WechatBridge] Bridge loaded');

})();
