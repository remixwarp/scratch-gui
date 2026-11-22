/**
 * PointerE 协作后端（protocol 2）。
 *
 * 负责：access_token → 房间协作令牌 → WebSocket join → seq/ack/sync 状态机，
 * 并把 ops / presence / chat / locks 等消息分发给上层。
 * 不直接操作 Blockly/VM —— 那部分在 ops-bridge.js。
 */

import {getConfig, isValidRoomCode} from './config.js';
import {ensureAccessToken} from './auth.js';

const SYNC_WAIT_MS = 800;
const MAX_BUFFERED = 2000;

class PointerECollab {
    constructor () {
        this.ws = null;
        this.room = '';
        this.token = '';
        this.name = '';
        this.password = '';
        this.clientId = null;
        this.hostId = null;
        this.peers = [];
        this.protocol = 2;
        this.lamport = 0;
        this.seq = 0;
        this.epoch = 0;
        this.connected = false;
        this.joining = false;
        this.intentionalClose = false;
        this.locks = null;
        this.pending = new Map();
        this.opBuffer = new Map();
        this.syncTimer = null;
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.listeners = new Map();
    }

    on (type, fn) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Set());
        this.listeners.get(type).add(fn);
        return () => this.off(type, fn);
    }

    off (type, fn) {
        const set = this.listeners.get(type);
        if (set) set.delete(fn);
    }

    emit (type, payload) {
        const set = this.listeners.get(type);
        if (set) {
            for (const fn of Array.from(set)) {
                try {
                    fn(payload);
                } catch (e) {
                    // 单个监听者异常不影响协作
                }
            }
        }
    }

    getStatus () {
        return {
            connected: this.connected,
            joining: this.joining,
            room: this.room,
            clientId: this.clientId,
            hostId: this.hostId,
            isHost: !!(this.clientId && this.hostId && this.clientId === this.hostId),
            peers: this.peers.slice(),
            protocol: this.protocol,
            seq: this.seq,
            epoch: this.epoch,
            locks: this.locks,
            error: this.error || null
        };
    }

    async _requestCollabToken (room) {
        const access = await ensureAccessToken();
        if (!access) {
            const error = new Error('请先登录 PointerE 账号');
            error.code = 'auth';
            throw error;
        }
        const config = getConfig();
        const response = await fetch(`${config.httpBase}/api/collab-token`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${access}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({room})
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body.token) {
            const error = new Error(body.error || body.message || `申请协作令牌失败（${response.status}）`);
            error.code = response.status === 401 ? 'auth' : 'guard';
            throw error;
        }
        return body.token;
    }

    /**
     * 加入房间。
     * @param {{room:string, password?:string, name?:string}} options
     */
    async join (options = {}) {
        const room = String(options.room || this.room || '').toUpperCase();
        if (!isValidRoomCode(room)) {
            throw new Error('房间码需为 4-12 位字母或数字');
        }
        if (this.connected || this.joining) return this.getStatus();

        this.joining = true;
        this.error = null;
        this.intentionalClose = false;
        this.emit('status', this.getStatus());
        try {
            this.token = await this._requestCollabToken(room);
            this.room = room;
            this.password = options.password || '';
            this.name = options.name || '';
            this.protocol = 2;
            await this._openSocket();
        } catch (e) {
            this.joining = false;
            this.error = e.message;
            this.emit('status', this.getStatus());
            this.emit('error', {code: e.code || 'guard', message: e.message});
            throw e;
        }
        return this.getStatus();
    }

    _openSocket () {
        const config = getConfig();
        return new Promise((resolve, reject) => {
            let settled = false;
            const finish = (ok, error) => {
                if (settled) return;
                settled = true;
                if (ok) resolve();
                else reject(error || new Error('协作 WebSocket 连接失败'));
            };

            let ws;
            try {
                ws = new WebSocket(config.wsUrl);
            } catch (e) {
                finish(false, e);
                return;
            }
            this.ws = ws;

            ws.onopen = () => {
                ws.send(JSON.stringify({
                    type: 'join',
                    room: this.room,
                    token: this.token,
                    password: this.password || undefined,
                    protocol: 2,
                    name: this.name || undefined
                }));
            };

            ws.onmessage = event => {
                let message;
                try {
                    message = JSON.parse(event.data);
                } catch (e) {
                    return;
                }
                this._handleMessage(message, finish);
            };

            ws.onerror = () => {
                this.emit('error', {code: 'network', message: '协作连接错误'});
                finish(false, new Error('协作 WebSocket 连接错误'));
            };

            ws.onclose = event => {
                const wasConnected = this.connected;
                this.connected = false;
                this.joining = false;
                this.ws = null;
                this.emit('status', this.getStatus());
                this.emit('disconnected', {code: event && event.code});
                if (wasConnected && !this.intentionalClose) this._scheduleReconnect();
            };

            // 服务端 join 成功后会显式 resolve
            this._resolveJoin = () => finish(true);
            this._rejectJoin = error => finish(false, error);
        });
    }

    _handleMessage (message, finish) {
        if (!message || typeof message.type !== 'string') return;
        switch (message.type) {
            case 'joined': {
                this.clientId = message.id;
                this.hostId = message.hostId;
                this.peers = Array.isArray(message.peers) ? message.peers : [];
                this.protocol = message.protocol || 2;
                this.seq = Number(message.seq || 0);
                this.epoch = Number(message.epoch || 0);
                this.connected = true;
                this.joining = false;
                this.reconnectAttempts = 0;
                this.emit('status', this.getStatus());
                this.emit('joined', message);
                if (this._resolveJoin) this._resolveJoin();
                if (this.protocol !== 2) {
                    this.emit('mode', {protocol: this.protocol});
                }
                break;
            }
            case 'peers':
                this.peers = Array.isArray(message.peers) ? message.peers.slice() : [];
                this.emit('peers', this.peers);
                this.emit('status', this.getStatus());
                break;
            case 'locks':
                this.locks = message;
                this.emit('locks', message);
                this.emit('status', this.getStatus());
                break;
            case 'state':
                this.emit('state', message);
                break;
            case 'ops':
                this._handleRemoteOps(message);
                break;
            case 'ack': {
                const cb = this.pending.get(message.batchId);
                if (cb) {
                    this.pending.delete(message.batchId);
                    cb(null, message);
                }
                this.emit('ack', message);
                break;
            }
            case 'presence':
                this.emit('presence', message);
                break;
            case 'chat':
                this.emit('chat', message);
                break;
            case 'notice':
                this.emit('notice', message);
                break;
            case 'sync-state':
                this.emit('sync-state', message);
                break;
            case 'mode':
                this.protocol = Number(message.protocol || 1);
                this.emit('mode', message);
                break;
            case 'error': {
                const code = message.code;
                if (code === 'auth') {
                    this.emit('error', {code, message: 'PointerE 令牌已失效，请重新登录'});
                    this.leave();
                } else if (code === 'resync') {
                    this.emit('resync', message);
                    this.requestSync(this.seq);
                } else if (code === 'guard') {
                    this.emit('error', {code, message: message.message || '操作过于频繁或被服务端拦截'});
                } else {
                    this.emit('error', {code, message: message.message || '协作服务返回错误'});
                }
                if (this._rejectJoin && code === 'auth') {
                    this._rejectJoin(new Error('协作令牌无效，请重新登录'));
                }
                break;
            }
            default:
                this.emit('message', message);
        }
    }

    _handleRemoteOps (message) {
        const seq = Number(message.seq || 0);
        if (!seq) {
            this.emit('ops', message);
            return;
        }
        if (seq === this.seq + 1) {
            this.seq = seq;
            this.emit('ops', message);
            this._drainBuffer();
            return;
        }
        if (seq > this.seq + 1) {
            this.opBuffer.set(seq, message);
            if (!this.syncTimer) {
                this.syncTimer = setTimeout(() => {
                    this.syncTimer = null;
                    if (this.opBuffer.size) this.requestSync(this.seq);
                }, SYNC_WAIT_MS);
            }
            return;
        }
        // 服务端重放的旧消息：忽略
    }

    _drainBuffer () {
        while (this.opBuffer.has(this.seq + 1)) {
            const next = this.opBuffer.get(this.seq + 1);
            this.opBuffer.delete(this.seq + 1);
            this.seq += 1;
            this.emit('ops', next);
        }
        if (this.opBuffer.size > MAX_BUFFERED) {
            this.opBuffer.clear();
            this.requestSync(this.seq);
        }
    }

    _send (payload) {
        if (!this.connected || !this.ws || this.ws.readyState !== 1) return false;
        this.ws.send(JSON.stringify(payload));
        return true;
    }

    /** 发送一批操作。返回 Promise，在收到 ack 时 resolve。 */
    sendOps (targetId, ops, batchId) {
        if (!ops || !ops.length) return Promise.resolve(null);
        const id = batchId || `${this.clientId || 'local'}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error('发送操作超时'));
            }, 10000);
            this.pending.set(id, (error, result) => {
                clearTimeout(timer);
                if (error) reject(error);
                else resolve(result);
            });
            if (!this._send({
                type: 'ops',
                targetId,
                batchId: id,
                lamport: ++this.lamport,
                epoch: this.epoch,
                ops
            })) {
                clearTimeout(timer);
                this.pending.delete(id);
                reject(new Error('协作连接未建立'));
            }
        });
    }

    requestSync (sinceSeq = this.seq) {
        return this._send({type: 'sync-request', sinceSeq});
    }

    requestState () {
        return this._send({type: 'state-request'});
    }

    sendState (data) {
        return this._send({type: 'state', data, from: this.clientId});
    }

    sendPresence (payload) {
        return this._send(Object.assign({type: 'presence'}, payload));
    }

    sendChat (text) {
        return this._send({type: 'chat', text: String(text || '').slice(0, 500)});
    }

    claim (targetId) {
        return this._send({type: 'claim', targetId});
    }

    release (targetId) {
        return this._send({type: 'release', targetId});
    }

    editorLock (targetId, locked) {
        return this._send({type: 'editor-lock', targetId, locked: !!locked});
    }

    forceUnlock (targetId) {
        return this._send({type: 'force-unlock', targetId});
    }

    hostLock (locked) {
        return this._send({type: 'host-lock', locked: !!locked});
    }

    _scheduleReconnect () {
        if (this.reconnectTimer) return;
        const delay = Math.min(15000, 1000 * (2 ** Math.min(this.reconnectAttempts, 4)));
        this.reconnectAttempts += 1;
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            try {
                await this.join({room: this.room, password: this.password, name: this.name});
            } catch (e) {
                this.emit('error', {code: 'reconnect', message: `自动重连失败：${e.message}`});
            }
        }, delay);
    }

    leave () {
        this.intentionalClose = true;
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
            this.syncTimer = null;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            try {
                this.ws.close();
            } catch (e) {
                // ignore
            }
        }
        this.ws = null;
        this.connected = false;
        this.joining = false;
        this.clientId = null;
        this.hostId = null;
        this.peers = [];
        this.opBuffer.clear();
        this.pending.clear();
        this.emit('status', this.getStatus());
        this.emit('disconnected', {code: 1000, intentional: true});
    }
}

let instance = null;
export const getInstance = () => {
    if (!instance) instance = new PointerECollab();
    return instance;
};

export default getInstance();
