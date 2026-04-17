/**
 * 云端还原点保存模块
 * 
 * 功能：
 * 1. 监听项目变更
 * 2. 保存作品到本地目录
 * 3. 由 monitor.js 自动推送到 GitHub
 * 
 * 集成方式：
 * 在编辑器中引入此模块即可
 */

class CloudRestorePointSaver {
    constructor(options) {
        this.vm = options.vm;
        this.saveInterval = options.saveInterval || 5000; // 默认 5 秒
        this.uploadDir = options.uploadDir || '/uploads'; // 保存目录
        
        this._saveTimer = null;
        this._pendingChanges = false;
        this._lastSaveTime = 0;
        this._enabled = false;
        this._projectId = null;
        
        this._bindEvents();
    }
    
    /**
     * 绑定项目变更事件
     */
    _bindEvents() {
        if (!this.vm) return;
        
        // 监听项目变更
        this.vm.on('PROJECT_CHANGED', () => {
            this._onProjectChanged();
        });
        
        // 监听项目加载
        this.vm.on('projectLoaded', () => {
            this._onProjectLoaded();
        });
        
        // 监听项目标题变更
        this.vm.on('PROJECT_TITLE_CHANGED', (title) => {
            this._onProjectTitleChanged(title);
        });
    }
    
    /**
     * 项目变更处理
     */
    _onProjectChanged() {
        if (!this._enabled) return;
        
        this._pendingChanges = true;
        
        // 防抖：在用户停止操作后保存
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
        }
        
        this._saveTimer = setTimeout(() => {
            if (this._pendingChanges) {
                this._saveProject();
            }
        }, this.saveInterval);
    }
    
    /**
     * 项目加载处理
     */
    _onProjectLoaded() {
        this._pendingChanges = false;
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
        }
    }
    
    /**
     * 项目标题变更处理
     */
    _onProjectTitleChanged(title) {
        // 可以使用标题作为文件名的一部分
        console.log('[CloudSave] Project title changed:', title);
    }
    
    /**
     * 生成项目 ID
     */
    _generateProjectId() {
        if (!this._projectId) {
            // 使用时间戳作为项目 ID
            this._projectId = Date.now().toString();
        }
        return this._projectId;
    }
    
    /**
     * 生成文件名（使用时间戳）
     */
    _generateFilename() {
        const projectId = this._generateProjectId();
        const timestamp = Date.now();
        return `${timestamp}.sb3`;
    }
    
    /**
     * 保存项目
     */
    async _saveProject() {
        if (!this._enabled || !this.vm) return;
        
        try {
            // 获取项目数据
            const sb3ArrayBuffer = await this.vm.saveProjectSb3('arraybuffer');
            
            if (!sb3ArrayBuffer || sb3ArrayBuffer.byteLength === 0) {
                throw new Error('Failed to save project');
            }
            
            // 生成文件名
            const filename = this._generateFilename();
            const filePath = `${this.uploadDir}/${filename}`;
            
            // 保存到本地目录
            await this._saveToFilesystem(filePath, sb3ArrayBuffer);
            
            this._lastSaveTime = Date.now();
            this._pendingChanges = false;
            
            console.log('[CloudSave] Saved:', filename);
            
            // 触发保存成功事件
            this._dispatchEvent('saved', {
                filename,
                filePath,
                timestamp: this._lastSaveTime
            });
            
        } catch (error) {
            console.error('[CloudSave] Save failed:', error);
            
            // 触发错误事件
            this._dispatchEvent('saveError', { error });
        }
    }
    
    /**
     * 保存到文件系统
     * 
     * 注意：在浏览器环境中，这需要使用文件系统 API
     * 在实际部署时，需要配合本地服务使用
     */
    async _saveToFilesystem(filePath, data) {
        // 在浏览器环境中，这里需要使用特殊的 API
        // 实际使用时，这个函数会被本地服务替换
        
        if (typeof window !== 'undefined' && window.fsSave) {
            // 使用本地服务提供的保存函数
            await window.fsSave(filePath, data);
        } else {
            // 降级处理：保存到 IndexedDB 或 localStorage
            console.warn('[CloudSave] No filesystem access, saving to memory');
            
            // 这里可以添加 IndexedDB 保存逻辑
            const key = `cloud_restore_${filePath}`;
            const base64Data = this._arrayBufferToBase64(data);
            localStorage.setItem(key, base64Data);
        }
    }
    
    /**
     * 启用自动保存
     */
    enable() {
        this._enabled = true;
        console.log('[CloudSave] Enabled');
        
        this._dispatchEvent('enabled');
    }
    
    /**
     * 禁用自动保存
     */
    disable() {
        this._enabled = false;
        
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
            this._saveTimer = null;
        }
        
        console.log('[CloudSave] Disabled');
        
        this._dispatchEvent('disabled');
    }
    
    /**
     * 手动保存
     */
    async saveNow() {
        if (!this._enabled) return;
        
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
            this._saveTimer = null;
        }
        
        await this._saveProject();
    }
    
    /**
     * 设置保存间隔
     */
    setSaveInterval(ms) {
        this.saveInterval = ms;
        console.log('[CloudSave] Save interval:', ms, 'ms');
    }
    
    /**
     * 设置上传目录
     */
    setUploadDir(dir) {
        this.uploadDir = dir;
        console.log('[CloudSave] Upload directory:', dir);
    }
    
    /**
     * 获取状态
     */
    getStatus() {
        return {
            enabled: this._enabled,
            pendingChanges: this._pendingChanges,
            lastSaveTime: this._lastSaveTime,
            projectId: this._projectId,
            uploadDir: this.uploadDir
        };
    }
    
    /**
     * 触发自定义事件
     */
    _dispatchEvent(eventName, detail) {
        const event = new CustomEvent(`cloud-save:${eventName}`, { detail });
        window.dispatchEvent(event);
    }
    
    /**
     * 添加事件监听器
     */
    on(event, callback) {
        window.addEventListener(`cloud-save:${event}`, callback);
    }
    
    /**
     * 移除事件监听器
     */
    off(event, callback) {
        window.removeEventListener(`cloud-save:${event}`, callback);
    }
    
    /**
     * 销毁
     */
    destroy() {
        this.disable();
        this.vm = null;
    }
    
    /**
     * ArrayBuffer 转 Base64
     */
    _arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    
    /**
     * Base64 转 ArrayBuffer
     */
    _base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CloudRestorePointSaver;
} else if (typeof window !== 'undefined') {
    window.CloudRestorePointSaver = CloudRestorePointSaver;
}
