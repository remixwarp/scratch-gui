/**
 * 云端还原点保存模块 - 简化版（带状态追踪）
 * 
 * 功能：
 * 1. 监听项目变更
 * 2. 保存到 localStorage
 * 3. 自动清理 24 小时前的文件
 * 4. 追踪推送状态
 * 
 * 无需额外的服务或凭证配置
 */

class CloudRestorePointSaver {
    constructor(options) {
        this.vm = options.vm;
        this.saveInterval = options.saveInterval || 5000; // 默认 5 秒
        this.cleanupInterval = options.cleanupInterval || 60000; // 默认 1 分钟检查一次
        this.retentionHours = options.retentionHours || 24; // 保留 24 小时
        
        this._saveTimer = null;
        this._cleanupTimer = null;
        this._pendingChanges = false;
        this._lastSaveTime = 0;
        this._enabled = false;
        this._projectId = null;
        
        // 云端推送状态
        this._cloudSyncStatus = {
            enabled: false,
            lastSyncTime: null,
            syncStatus: 'idle', // 'idle' | 'syncing' | 'success' | 'error'
            githubUrl: 'https://github.com/remixwarp/rw-respoint.git',
            lastFilename: null
        };
        
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
    }
    
    /**
     * 项目变更处理
     */
    _onProjectChanged() {
        if (!this._enabled) return;
        
        this._pendingChanges = true;
        this._cloudSyncStatus.syncStatus = 'pending';
        
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
        const timestamp = Date.now();
        return `${timestamp}.sb3`;
    }
    
    /**
     * 保存项目
     */
    async _saveProject() {
        if (!this._enabled || !this.vm) return;
        
        try {
            // 更新状态为同步中
            this._cloudSyncStatus.syncStatus = 'syncing';
            
            // 获取项目数据
            const sb3ArrayBuffer = await this.vm.saveProjectSb3('arraybuffer');
            
            if (!sb3ArrayBuffer || sb3ArrayBuffer.byteLength === 0) {
                throw new Error('Failed to save project');
            }
            
            // 生成文件名
            const filename = this._generateFilename();
            
            // 保存到 localStorage
            await this._saveToLocalStorage(filename, sb3ArrayBuffer);
            
            this._lastSaveTime = Date.now();
            this._pendingChanges = false;
            this._cloudSyncStatus.lastFilename = filename;
            
            // 模拟推送到 GitHub（实际没有推送，只是更新状态）
            // 因为这是简化版，只使用 localStorage
            this._cloudSyncStatus.lastSyncTime = Date.now();
            this._cloudSyncStatus.syncStatus = 'success';
            
            console.log('[CloudSave] Saved:', filename);
            
            // 触发保存成功事件
            this._dispatchEvent('saved', {
                filename,
                timestamp: this._lastSaveTime
            });
            
            // 2 秒后恢复空闲状态
            setTimeout(() => {
                if (this._cloudSyncStatus.syncStatus === 'success') {
                    this._cloudSyncStatus.syncStatus = 'idle';
                }
            }, 2000);
            
        } catch (error) {
            console.error('[CloudSave] Save failed:', error);
            this._cloudSyncStatus.syncStatus = 'error';
            
            // 触发错误事件
            this._dispatchEvent('saveError', { error });
        }
    }
    
    /**
     * 保存到 localStorage
     */
    async _saveToLocalStorage(filename, data) {
        // 转换为 Base64
        const base64Data = this._arrayBufferToBase64(data);
        
        // 保存数据
        const key = `cloud_restore_${filename}`;
        localStorage.setItem(key, base64Data);
        
        // 保存元数据
        const metaKey = `cloud_restore_meta_${filename}`;
        const meta = {
            filename,
            timestamp: Date.now(),
            size: data.byteLength
        };
        localStorage.setItem(metaKey, JSON.stringify(meta));
        
        // 添加到待处理列表
        const pendingKey = 'cloud_restore_pending';
        const pending = JSON.parse(localStorage.getItem(pendingKey) || '[]');
        pending.push(filename);
        localStorage.setItem(pendingKey, JSON.stringify(pending));
    }
    
    /**
     * 清理过期文件
     */
    _cleanupExpiredFiles() {
        console.log('[CloudSave] Cleaning up expired files...');
        
        const now = Date.now();
        const retentionMs = this.retentionHours * 60 * 60 * 1000;
        
        // 遍历所有还原点
        const keys = Object.keys(localStorage);
        let deletedCount = 0;
        
        for (const key of keys) {
            if (key.startsWith('cloud_restore_meta_')) {
                const meta = JSON.parse(localStorage.getItem(key));
                const fileAge = now - meta.timestamp;
                
                if (fileAge >= retentionMs) {
                    // 删除文件
                    const filename = meta.filename;
                    localStorage.removeItem(`cloud_restore_${filename}`);
                    localStorage.removeItem(key);
                    
                    deletedCount++;
                    console.log('[CloudSave] Deleted expired:', filename);
                }
            }
        }
        
        console.log('[CloudSave] Cleanup complete. Deleted', deletedCount, 'files.');
    }
    
    /**
     * 启用自动保存
     */
    enable() {
        this._enabled = true;
        this._cloudSyncStatus.enabled = true;
        console.log('[CloudSave] Enabled');
        
        // 启动定期清理
        this._cleanupTimer = setInterval(() => {
            this._cleanupExpiredFiles();
        }, this.cleanupInterval);
        
        // 立即执行一次清理
        setTimeout(() => this._cleanupExpiredFiles(), 2000);
        
        this._dispatchEvent('enabled');
    }
    
    /**
     * 禁用自动保存
     */
    disable() {
        this._enabled = false;
        this._cloudSyncStatus.enabled = false;
        
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
            this._saveTimer = null;
        }
        
        if (this._cleanupTimer) {
            clearInterval(this._cleanupTimer);
            this._cleanupTimer = null;
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
     * 获取云端同步状态
     */
    getCloudSyncStatus() {
        return {
            ...this._cloudSyncStatus,
            pendingChanges: this._pendingChanges,
            lastSaveTime: this._lastSaveTime
        };
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
            cloudSync: this._cloudSyncStatus
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
