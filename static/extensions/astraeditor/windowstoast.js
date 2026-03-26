// Name: Windows toast
// Description: Send Windows Toast notifications with icon, sound and duration settings
// By: DVD <https://space.bilibili.com/504603863>

(function(Scratch) {
    'use strict';
    
    Scratch.translate.setup({
      "zh-cn": {
        "_Windows toast": "Windows toast",
        "_发送图标URL[iconUrl]标题[title]内容[content] 音效URL[soundUrl] 显示时长[duration]": "发送图标URL[iconUrl]标题[title]内容[content] 音效URL[soundUrl] 显示时长[duration]",
        "_打断通知": "打断通知",
        "_通知标题": "通知标题",
        "_通知内容": "通知内容",
        "_Toast通知已发送": "Toast通知已发送",
        "_所有通知已打断": "所有通知已打断",
        "_发送通知时出错": "发送通知时出错",
        "_当前环境不支持通知功能": "当前环境不支持通知功能",
        "_音效播放中": "音效播放中",
        "_音效已停止": "音效已停止",
        "_图片加载失败": "图片加载失败",
        "_浏览器不支持通知": "浏览器不支持通知",
        "_正在检查图片": "正在检查图片"
      },
      "en": {
        "_Windows toast": "Windows toast",
        "_发送图标URL[iconUrl]标题[title]内容[content] 音效URL[soundUrl] 显示时长[duration]": "Send icon URL[iconUrl] title[title] content[content] sound URL[soundUrl] duration[duration]",
        "_打断通知": "Dismiss All Notifications",
        "_通知标题": "Notification Title",
        "_通知内容": "Notification Content",
        "_Toast通知已发送": "Toast notification sent",
        "_所有通知已打断": "All notifications dismissed",
        "_发送通知时出错": "Error sending notification",
        "_当前环境不支持通知功能": "Notification not supported in current environment",
        "_音效播放中": "Audio playing",
        "_音效已停止": "Audio stopped",
        "_图片加载失败": "Image load failed",
        "_浏览器不支持通知": "Browser does not support notifications",
        "_正在检查图片": "Checking image"
      }
    });
  
    if (!Scratch.extensions.unsandboxed) {
      throw new Error("This extension must run unsandboxed in order to work.");
    }
  
    class WindowsToastExtension {
      constructor() {
        this.notificationHistory = [];
        this.audioElements = [];
        this.imageCache = new Map();
      }
      
      getInfo() {
        return {
          id: 'windowstoast',
          name: Scratch.translate("Windows toast"),
          color1: '#00C2FF',
          color2: '#00C2FF',
          color3: '#00C2FF',
          blocks: [
            {
              opcode: 'sendToast',
              blockType: Scratch.BlockType.COMMAND,
              text: Scratch.translate("发送图标URL[iconUrl]标题[title]内容[content] 音效URL[soundUrl] 显示时长[duration]"),
              arguments: {
                iconUrl: {
                  type: Scratch.ArgumentType.STRING,
                  defaultValue: ''
                },
                title: {
                  type: Scratch.ArgumentType.STRING,
                  defaultValue: Scratch.translate("通知标题")
                },
                content: {
                  type: Scratch.ArgumentType.STRING,
                  defaultValue: Scratch.translate("通知内容")
                },
                soundUrl: {
                  type: Scratch.ArgumentType.STRING,
                  defaultValue: ''
                },
                duration: {
                  type: Scratch.ArgumentType.NUMBER,
                  defaultValue: '7'
                }
              }
            },
            {
              opcode: 'dismissAll',
              blockType: Scratch.BlockType.COMMAND,
              text: Scratch.translate("打断通知")
            }
          ]
        };
      }
  
      async sendToast(args) {
        const { iconUrl, title, content, soundUrl, duration } = args;
        const durationSeconds = Scratch.Cast.toNumber(duration) || 7;
        
        this.playSound(soundUrl);
        
        try {
          if (typeof Windows !== 'undefined' && Windows.UI && Windows.UI.Notifications) {
            await this.sendWindowsToast(iconUrl, title, content, soundUrl, durationSeconds);
          } else {
            await this.sendBrowserNotification(iconUrl, title, content, soundUrl, durationSeconds);
          }
        } catch (error) {
          this.showFallbackAlert(iconUrl, title, content, soundUrl, durationSeconds);
        }
      }
  
      async sendWindowsToast(iconUrl, title, content, soundUrl, durationSeconds) {
        const notifications = Windows.UI.Notifications;
        let toastXml;
        
        if (iconUrl && iconUrl.trim() !== '') {
          try {
            const template = notifications.ToastTemplateType.toastImageAndText02;
            toastXml = notifications.ToastNotificationManager.getTemplateContent(template);
            
            const imageNodes = toastXml.getElementsByTagName('image');
            if (imageNodes.length > 0) {
              const srcAttribute = toastXml.createAttribute('src');
              srcAttribute.value = iconUrl;
              imageNodes[0].attributes.setNamedItem(srcAttribute);
            }
            
            const textNodes = toastXml.getElementsByTagName('text');
            if (textNodes.length >= 2) {
              textNodes[0].appendChild(toastXml.createTextNode(title));
              textNodes[1].appendChild(toastXml.createTextNode(content));
            }
          } catch (imageError) {
            const template = notifications.ToastTemplateType.toastText02;
            toastXml = notifications.ToastNotificationManager.getTemplateContent(template);
            
            const textNodes = toastXml.getElementsByTagName('text');
            if (textNodes.length >= 2) {
              textNodes[0].appendChild(toastXml.createTextNode(title));
              textNodes[1].appendChild(toastXml.createTextNode(content));
            }
          }
        } else {
          const template = notifications.ToastTemplateType.toastText02;
          toastXml = notifications.ToastNotificationManager.getTemplateContent(template);
          
          const textNodes = toastXml.getElementsByTagName('text');
          if (textNodes.length >= 2) {
            textNodes[0].appendChild(toastXml.createTextNode(title));
            textNodes[1].appendChild(toastXml.createTextNode(content));
          }
        }
        
        this.setToastDuration(toastXml, durationSeconds);
        
        if (soundUrl && soundUrl.trim() !== '') {
          try {
            const audioElement = toastXml.createElement('audio');
            audioElement.setAttribute('src', soundUrl);
            
            if (durationSeconds > 25) {
              audioElement.setAttribute('loop', 'true');
            }
            
            toastXml.getElementsByTagName('toast')[0].appendChild(audioElement);
          } catch (audioError) {}
        }
        
        const toast = new notifications.ToastNotification(toastXml);
        this.setExpirationTime(toast, durationSeconds);
        
        const notificationId = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        this.notificationHistory.push({
          id: notificationId,
          iconUrl: iconUrl,
          title: title,
          content: content,
          soundUrl: soundUrl,
          duration: durationSeconds,
          timestamp: Date.now(),
          toastObject: toast
        });
        
        const notifier = notifications.ToastNotificationManager.createToastNotifier();
        notifier.show(toast);
      }
  
      async sendBrowserNotification(iconUrl, title, content, soundUrl, durationSeconds) {
        if (!('Notification' in window)) {
          throw new Error(Scratch.translate("浏览器不支持通知"));
        }
        
        if (Notification.permission === 'denied') {
          throw new Error(Scratch.translate("当前环境不支持通知功能"));
        }
        
        if (Notification.permission !== 'granted') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            throw new Error(Scratch.translate("当前环境不支持通知功能"));
          }
        }
        
        let validatedIconUrl = '';
        if (iconUrl && iconUrl.trim() !== '') {
          validatedIconUrl = await this.validateImageUrl(iconUrl);
        }
        
        const notificationOptions = { 
          body: content,
          requireInteraction: durationSeconds > 25
        };
        
        if (validatedIconUrl) {
          notificationOptions.icon = validatedIconUrl;
        }
        
        notificationOptions.tag = 'toast_' + Date.now();
        
        const notification = new Notification(title, notificationOptions);
        
        if (durationSeconds > 0 && durationSeconds < 86400) {
          setTimeout(() => {
            try {
              notification.close();
            } catch (e) {}
          }, durationSeconds * 1000);
        }
        
        const notificationId = 'browser_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        this.notificationHistory.push({
          id: notificationId,
          iconUrl: validatedIconUrl,
          title: title,
          content: content,
          soundUrl: soundUrl,
          duration: durationSeconds,
          timestamp: Date.now(),
          browserNotification: notification,
          timeoutId: durationSeconds > 0 ? setTimeout(() => {
            const index = this.notificationHistory.findIndex(item => item.id === notificationId);
            if (index > -1) {
              this.notificationHistory.splice(index, 1);
            }
          }, durationSeconds * 1000) : null
        });
      }
  
      async validateImageUrl(url) {
        if (!url || url.trim() === '') {
          return '';
        }
        
        if (this.imageCache.has(url)) {
          return this.imageCache.get(url);
        }
        
        try {
          if (url.startsWith('http://') && !url.startsWith('http://localhost')) {
            console.warn(Scratch.translate("图片加载失败") + ': ' + url + ' (HTTP不安全)');
            return '';
          }
          
          const response = await fetch(url, { method: 'HEAD' });
          if (!response.ok) {
            console.warn(Scratch.translate("图片加载失败") + ': ' + url);
            return '';
          }
          
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.startsWith('image/')) {
            console.warn(Scratch.translate("图片加载失败") + ': ' + url + ' (不是图片)');
            return '';
          }
          
          this.imageCache.set(url, url);
          return url;
        } catch (error) {
          console.warn(Scratch.translate("图片加载失败") + ': ' + url, error);
          return '';
        }
      }
  
      setToastDuration(toastXml, durationSeconds) {
        try {
          const toastElements = toastXml.getElementsByTagName('toast');
          if (toastElements.length > 0) {
            const toastElement = toastElements[0];
            
            if (durationSeconds <= 7) {
              toastElement.setAttribute('duration', 'short');
            } else if (durationSeconds <= 25) {
              toastElement.setAttribute('duration', 'long');
            } else {
              toastElement.setAttribute('duration', 'long');
            }
          }
        } catch (error) {}
      }
  
      setExpirationTime(toast, durationSeconds) {
        try {
          if (toast && typeof toast.expirationTime !== 'undefined') {
            const expirationTime = new Date(Date.now() + (durationSeconds * 1000));
            toast.expirationTime = expirationTime;
          } else if (toast && typeof toast.ExpirationTime !== 'undefined') {
            const expirationTime = new Date(Date.now() + (durationSeconds * 1000));
            toast.ExpirationTime = expirationTime;
          }
        } catch (error) {}
      }
  
      showFallbackAlert(iconUrl, title, content, soundUrl, durationSeconds) {
        let message = Scratch.translate("Toast通知已发送") + ' (模拟):\n' + 
                     Scratch.translate("通知标题") + ': ' + title + '\n' + 
                     Scratch.translate("通知内容") + ': ' + content + '\n' + 
                     '显示时长: ' + durationSeconds + '秒';
        
        if (iconUrl && iconUrl.trim() !== '') {
          message += '\n图标URL: ' + iconUrl;
        }
        if (soundUrl && soundUrl.trim() !== '') {
          message += '\n音效URL: ' + soundUrl;
        }
        
        alert(message);
      }
  
      playSound(soundUrl) {
        if (!soundUrl || soundUrl.trim() === '') {
          return;
        }
        
        try {
          const audio = new Audio(soundUrl);
          
          audio.play().then(() => {
            audio.onended = () => {
              const index = this.audioElements.indexOf(audio);
              if (index > -1) {
                this.audioElements.splice(index, 1);
              }
            };
            
            this.audioElements.push(audio);
          }).catch(error => {
            document.addEventListener('click', function playOnInteraction() {
              audio.play().then(() => {
                document.removeEventListener('click', playOnInteraction);
              }).catch(() => {
                document.removeEventListener('click', playOnInteraction);
              });
            }, { once: true });
          });
        } catch (error) {}
      }
  
      dismissAll() {
        try {
          this.stopAllSounds();
          
          this.notificationHistory.forEach(item => {
            if (item.timeoutId) {
              clearTimeout(item.timeoutId);
            }
          });
          
          if (typeof Windows !== 'undefined' && Windows.UI && Windows.UI.Notifications) {
            const notifications = Windows.UI.Notifications;
            
            if (notifications.ToastNotificationManager && notifications.ToastNotificationManager.History) {
              notifications.ToastNotificationManager.History.clear();
            }
            
            if (notifications.ToastNotificationManagerCompat && notifications.ToastNotificationManagerCompat.History) {
              notifications.ToastNotificationManagerCompat.History.clear();
            }
          }
          
          if ('Notification' in window) {
            this.notificationHistory.forEach(item => {
              if (item.browserNotification && item.browserNotification.close) {
                try {
                  item.browserNotification.close();
                } catch (e) {}
              }
            });
            
            this.notificationHistory = [];
          }
          
        } catch (error) {}
      }
      
      stopAllSounds() {
        for (let i = 0; i < this.audioElements.length; i++) {
          const audio = this.audioElements[i];
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch (error) {}
        }
        
        this.audioElements = [];
      }
    }
  
    Scratch.extensions.register(new WindowsToastExtension());
  })(Scratch);
