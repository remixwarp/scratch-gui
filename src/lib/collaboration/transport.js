import Peer from 'peerjs';
import Emitter from './emitter.js';
import {validateEnvelope, makeCtrl, KIND, CTRL} from './protocol.js';
import {APP_NAME} from '../constants/brand.js';

const DEFAULT_PEER_CONFIG = {
    // Matches upstream MistWarp's collaboration PeerServer.
    host: 'collab_warp.mistium.com',
    port: 443,
    path: '/',
    secure: true,
    config: {
        iceServers: [
            {urls: 'stun:vpn.mikedev101.cc:5349'},
            {urls: 'turn:vpn.mikedev101.cc:5349', username: 'free', credential: 'free'},
            {urls: 'stun:stun.l.google.com:19302'},
            {urls: 'stun:freeturn.net:3478'},
            {urls: 'stun:freeturn.net:5349'},
            {urls: 'turn:freeturn.net:3478', username: 'free', credential: 'free'},
            {urls: 'turns:freeturn.net:5349', username: 'free', credential: 'free'}
        ],
        iceCandidatePoolSize: 10,
        iceTransportPolicy: 'all'
    },
    debug: 1
};

const PEER_CONFIG_STORAGE_KEY = 'tw.collaboration.peerConfig';
const PEER_CONFIG_KEYS = ['host', 'port', 'key', 'path', 'secure'];
// Bump this when the default broker changes. Configurations saved by older
// builds have no version tag; they are discarded once so the settings input
// and new Transports fall back to the upstream DEFAULT_PEER_CONFIG.host
// instead of silently keeping an obsolete / self-hosted broker.
const PEER_CONFIG_VERSION = 2;

/** Remove broker settings written by older builds (localStorage + ?collab=). */
const clearLegacyPeerConfig = () => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(PEER_CONFIG_STORAGE_KEY);
    } catch (error) {
        // Storage may be unavailable; the URL cleanup below still applies.
    }
    try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('collab')) {
            url.searchParams.delete('collab');
            window.history.replaceState(null, null, url.toString());
        }
    } catch (error) {
        // History API may be unavailable; nothing else to do.
    }
};

/**
 * Read the broker settings saved by the collaboration settings modal.
 * The URL ?collab= parameter wins (so a shared room link can carry its own
 * broker); localStorage is the durable fallback. Only the five connection
 * fields are returned — the ICE/STUN/debug defaults stay in
 * DEFAULT_PEER_CONFIG and are merged by the Transport constructor.
 */
const readUserPeerConfig = () => {
    if (typeof window === 'undefined') return null;
    let parsed = null;
    try {
        const raw = new URLSearchParams(window.location.search).get('collab');
        if (raw) {
            try {
                parsed = JSON.parse(raw);
            } catch (error) {
                // Older builds stored an extra encodeURIComponent() layer.
                try {
                    parsed = JSON.parse(decodeURIComponent(raw));
                } catch (error2) {
                    parsed = null;
                }
            }
        }
    } catch (error) {
        parsed = null;
    }
    if (!parsed || typeof parsed !== 'object') {
        try {
            const saved = window.localStorage.getItem(PEER_CONFIG_STORAGE_KEY);
            if (saved) parsed = JSON.parse(saved);
        } catch (error) {
            parsed = null;
        }
    }
    const source = (parsed && parsed.peer && typeof parsed.peer === 'object') ? parsed.peer : parsed;
    if (!source || typeof source !== 'object') return null;
    // Configs persisted before the upstream-default fix carry no version tag.
    // Drop them once: they are exactly what hides the upstream host in the
    // settings input and keeps connections pinned to a retired broker.
    if (parsed.v !== PEER_CONFIG_VERSION) {
        clearLegacyPeerConfig();
        return null;
    }
    const config = {};
    PEER_CONFIG_KEYS.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
            config[key] = source[key];
        }
    });
    // An empty host means "not configured", so keep using the default broker.
    if (!config.host) return null;
    return config;
};

/** Persist broker settings so every newly created Transport picks them up. */
const saveUserPeerConfig = config => {
    if (typeof window === 'undefined') return;
    const peerConfig = {};
    PEER_CONFIG_KEYS.forEach(key => {
        if (config && Object.prototype.hasOwnProperty.call(config, key)) {
            peerConfig[key] = config[key];
        }
    });
    if (peerConfig.key === undefined) peerConfig.key = '';
    // Tag the entry with the current schema version. readUserPeerConfig()
    // ignores untagged (legacy) entries so a stale broker can never shadow
    // the upstream DEFAULT_PEER_CONFIG.host in the settings input.
    const envelope = {peer: peerConfig, v: PEER_CONFIG_VERSION};
    try {
        window.localStorage.setItem(PEER_CONFIG_STORAGE_KEY, JSON.stringify(envelope));
        const url = new URL(window.location.href);
        url.searchParams.set('collab', JSON.stringify(envelope));
        window.history.replaceState(null, null, url.toString());
    } catch (error) {
        // Storage or history may be restricted; one of the two is enough.
    }
};

const HEARTBEAT_INTERVAL_MS = 10 * 1000;
const DEAD_PEER_TIMEOUT_MS = 30 * 1000;
const DIAL_TIMEOUT_MS = 15 * 1000;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 16 * 1000;

const sanitizeRoomId = roomId => String(roomId || '').replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

const collabError = (code, message) => {
    const error = new Error(message);
    error.collabCode = code;
    return error;
};

const roomIdError = roomId => (sanitizeRoomId(roomId) ?
    null :
    collabError('INVALID_ROOM', 'A room code needs at least one letter or number.'));

const generateHostPeerId = roomId => `${APP_NAME}-collab-${sanitizeRoomId(roomId)}-host`;

const generateClientPeerId = roomId => {
    const randomString = Math.random()
        .toString(36)
        .substring(2, 11);
    return `${APP_NAME}-collab-${sanitizeRoomId(roomId)}-user-${Date.now()}-${randomString}`;
};

/**
 * PeerJS wrapper for the collaboration engine. Owns connection lifecycle:
 * peer registration with the broker, dialing the host, accepting client
 * connections, heartbeat-based dead peer detection, client reconnection
 * with exponential backoff, and host broker re-registration.
 *
 * Every inbound message is validated against the protocol before being
 * surfaced. No collaboration semantics live here.
 *
 * Events:
 *  - 'connected' () — (client) data channel to the host is open
 *  - 'peer-connected' (peerId, metadata) — (host) a client channel opened
 *  - 'peer-disconnected' (peerId) — a channel closed or timed out
 *  - 'message' (peerId, envelope) — validated inbound envelope
 *  - 'reconnecting' ({attempt, delayMs}) — (client) redial scheduled
 *  - 'reconnected' () — (client) redial succeeded
 *  - 'invalid-message' ({peerId, error}) — dropped inbound message
 *  - 'fatal' ({error}) — unrecoverable; the session should shut down
 */
class Transport extends Emitter {
    constructor (options = {}) {
        super();
        // Merge user broker settings over the defaults so ICE/STUN servers
        // and debug options are never lost when only host/port/key/path/secure
        // are supplied by the settings modal.
        this._peerConfig = Object.assign(
            {},
            DEFAULT_PEER_CONFIG,
            options.peerConfig || readUserPeerConfig() || {}
        );
        this._createPeer = options.createPeer || ((id, config) => new Peer(id, config));
        this._heartbeatIntervalMs = options.heartbeatIntervalMs || HEARTBEAT_INTERVAL_MS;
        this._deadPeerTimeoutMs = options.deadPeerTimeoutMs || DEAD_PEER_TIMEOUT_MS;
        this._dialTimeoutMs = options.dialTimeoutMs || DIAL_TIMEOUT_MS;

        this.peer = null;
        this.isHost = false;
        this.roomId = null;
        this.hostPeerId = null;
        this.destroyed = false;
        this.droppedMessageCount = 0;

        this._connections = new Map();
        this._heartbeatTimer = null;
        this._reconnectTimer = null;
        this._reconnectAttempts = 0;
        this._reconnectAborted = false;
        this._joinMetadata = null;
        this._onPeerUnavailable = null;
    }

    _describeError (error) {
        switch (error && error.type) {
        case 'unavailable-id':
            return collabError(
                'ROOM_TAKEN',
                `Room "${this.roomId}" is already being hosted. Join it instead of creating it.`
            );
        case 'network':
        case 'server-error':
        case 'socket-error':
        case 'socket-closed':
            return collabError(
                'SERVER_UNREACHABLE',
                'Could not reach the collaboration server. Check your connection and try again.'
            );
        case 'browser-incompatible':
            return collabError(
                'BROWSER_UNSUPPORTED',
                'This browser cannot use collaboration; it does not support WebRTC data channels.'
            );
        default:
            return error instanceof Error ? error : new Error(String(error));
        }
    }

    get id () {
        return this.peer ? this.peer.id : null;
    }

    peers () {
        return Array.from(this._connections.keys());
    }

    isOpen (peerId) {
        const entry = this._connections.get(peerId);
        return Boolean(entry && entry.conn.open);
    }

    /**
     * Register with the broker as the room's host and accept connections.
     * @param {string} roomId The room to host.
     * @returns {Promise<string>} Resolves with our peer id.
     */
    host (roomId) {
        const invalid = roomIdError(roomId);
        if (invalid) return Promise.reject(invalid);
        this.isHost = true;
        this.roomId = roomId;
        return this._openPeer(generateHostPeerId(roomId)).then(id => {
            this.hostPeerId = id;
            this.peer.on('connection', conn => this._wireConnection(conn));
            this._startHeartbeat();
            return id;
        });
    }

    /**
     * Register with the broker and dial the room's host.
     * @param {string} roomId The room to join.
     * @param {object} metadata Attached to the connection (username etc).
     * @returns {Promise<string>} Resolves with our peer id once the data
     * channel to the host is open.
     */
    join (roomId, metadata) {
        const invalid = roomIdError(roomId);
        if (invalid) return Promise.reject(invalid);
        this.isHost = false;
        this.roomId = roomId;
        this.hostPeerId = generateHostPeerId(roomId);
        this._joinMetadata = metadata || {};
        return this._openPeer(generateClientPeerId(roomId))
            .then(() => this._dialHost())
            .then(() => {
                this._startHeartbeat();
                return this.peer.id;
            });
    }

    /**
     * Send an envelope to one peer.
     * @param {string} peerId Destination peer.
     * @param {object} envelope Protocol envelope.
     * @returns {boolean} Whether the message was handed to the channel.
     */
    send (peerId, envelope) {
        const entry = this._connections.get(peerId);
        if (!entry || !entry.conn.open) return false;
        try {
            entry.conn.send(envelope);
            return true;
        } catch (error) {
            return false;
        }
    }

    sendToHost (envelope) {
        if (this.isHost || !this.hostPeerId) return false;
        return this.send(this.hostPeerId, envelope);
    }

    /**
     * Bytes still queued on a peer's data channel. Bulk senders use this to
     * pace themselves, so a large transfer does not park ops and presence
     * behind megabytes of backlog on the same ordered channel.
     * @param {string} peerId Peer, or 'host' from a client.
     * @returns {number} Queued bytes (0 when the channel is unknown).
     */
    bufferedAmount (peerId) {
        const entry = this._connections.get(peerId === 'host' ? this.hostPeerId : peerId);
        if (!entry) return 0;
        // PeerJS buffers internally before the channel exists; count both.
        const channel = entry.conn.dataChannel;
        return (channel ? channel.bufferedAmount : 0) + (entry.conn.bufferSize || 0);
    }

    /**
     * Send an envelope to every open connection except one.
     * @param {object} envelope Protocol envelope.
     * @param {string} [exceptPeerId] Peer to skip.
     */
    broadcast (envelope, exceptPeerId) {
        this._connections.forEach((entry, peerId) => {
            if (peerId === exceptPeerId) return;
            if (!entry.conn.open) return;
            try {
                entry.conn.send(envelope);
            } catch (error) {
                // Dead channel; heartbeat or close event will reap it.
            }
        });
    }

    /**
     * Close the channel to one peer (host-side kick).
     * @param {string} peerId Peer to disconnect.
     */
    closeConnection (peerId) {
        const entry = this._connections.get(peerId);
        if (!entry) return;
        this._connections.delete(peerId);
        try {
            entry.conn.close();
        } catch (error) {
            // Already closed.
        }
    }

    destroy () {
        this.destroyed = true;
        this._onPeerUnavailable = null;
        this._stopHeartbeat();
        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }
        this._connections.forEach(entry => {
            try {
                entry.conn.close();
            } catch (error) {
                // Already closed.
            }
        });
        this._connections.clear();
        if (this.peer) {
            try {
                this.peer.destroy();
            } catch (error) {
                // Already destroyed.
            }
            this.peer = null;
        }
        this.removeAllListeners();
    }

    _openPeer (peerId) {
        return new Promise((resolve, reject) => {
            let settled = false;
            const peer = this._createPeer(peerId, this._peerConfig);
            this.peer = peer;

            peer.on('open', id => {
                if (!settled) {
                    settled = true;
                    resolve(id);
                }
            });

            peer.on('error', error => {
                if (!settled) {
                    settled = true;
                    reject(this._describeError(error));
                    return;
                }
                if (this.destroyed) return;
                if (error && error.type === 'peer-unavailable') {
                    if (this._onPeerUnavailable) this._onPeerUnavailable();
                    return;
                }
                this.emit('fatal', {error: this._describeError(error)});
            });

            // The broker connection dropped. PeerJS keeps datachannels
            // alive but we can no longer accept new dials; re-register.
            peer.on('disconnected', () => {
                if (this.destroyed || peer.destroyed) return;
                try {
                    peer.reconnect();
                } catch (error) {
                    this.emit('fatal', {error});
                }
            });
        });
    }

    _dialHost () {
        return new Promise((resolve, reject) => {
            let conn = null;
            let timeout = null;
            const settle = (error, openConn) => {
                if (timeout === null) return;
                clearTimeout(timeout);
                timeout = null;
                this._onPeerUnavailable = null;
                if (!error) {
                    this._registerConnection(openConn);
                    this.emit('connected');
                    resolve();
                    return;
                }
                if (conn) {
                    try {
                        conn.close();
                    } catch (closeError) {
                        // Ignore.
                    }
                }
                reject(error);
            };

            timeout = setTimeout(() => settle(collabError(
                'DIAL_TIMEOUT',
                `Room "${this.roomId}" did not respond. The host may have a slow or blocked connection.`
            )), this._dialTimeoutMs);

            this._onPeerUnavailable = () => settle(collabError(
                'ROOM_NOT_FOUND',
                `Nobody is hosting room "${this.roomId}" right now.`
            ));

            try {
                conn = this.peer.connect(this.hostPeerId, {
                    label: 'collaboration',
                    metadata: this._joinMetadata,
                    reliable: true
                });
            } catch (error) {
                settle(this._describeError(error));
                return;
            }

            conn.on('open', () => settle(null, conn));
            conn.on('error', error => settle(this._describeError(
                error || new Error(`Could not connect to room "${this.roomId}".`)
            )));
        });
    }

    _wireConnection (conn) {
        // Host side: a client dialed us. Register handlers now; announce
        // once the channel actually opens.
        if (conn.open) {
            this._registerConnection(conn);
            this.emit('peer-connected', conn.peer, conn.metadata || {});
        } else {
            conn.on('open', () => {
                if (this.destroyed) return;
                this._registerConnection(conn);
                this.emit('peer-connected', conn.peer, conn.metadata || {});
            });
        }
        conn.on('error', () => {
            this._handleConnectionDown(conn.peer);
        });
    }

    _registerConnection (conn) {
        this._connections.set(conn.peer, {conn, lastSeen: Date.now()});

        conn.on('data', data => {
            if (this.destroyed) return;
            const entry = this._connections.get(conn.peer);
            if (entry) entry.lastSeen = Date.now();

            const error = validateEnvelope(data);
            if (error) {
                this.droppedMessageCount++;
                this.emit('invalid-message', {peerId: conn.peer, error});
                return;
            }
            if (data.kind === KIND.CTRL && data.type === CTRL.PING) {
                this.send(conn.peer, makeCtrl(CTRL.PONG, {}));
                return;
            }
            if (data.kind === KIND.CTRL && data.type === CTRL.PONG) {
                return;
            }
            this.emit('message', conn.peer, data);
        });

        conn.on('close', () => {
            this._handleConnectionDown(conn.peer);
        });
    }

    _handleConnectionDown (peerId) {
        if (this.destroyed) return;
        if (!this._connections.has(peerId)) return;
        this._connections.delete(peerId);
        this.emit('peer-disconnected', peerId);

        if (!this.isHost && peerId === this.hostPeerId) {
            this._scheduleReconnect();
        }
    }

    /**
     * Permanently stop any pending or future reconnection attempts. Used
     * when the host has explicitly denied the join: a denied client must
     * not redial (which would re-send HELLO and re-trigger another join
     * request, looping forever).
     */
    abortReconnect () {
        this._reconnectAborted = true;
        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }
    }

    _scheduleReconnect () {
        if (this.destroyed || this._reconnectAborted || this._reconnectTimer) return;
        this._reconnectAttempts++;
        if (this._reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
            this.emit('fatal', {
                error: new Error(
                    'Unable to establish a stable connection after multiple attempts. ' +
                    'Please check your network connection and try again.'
                )
            });
            return;
        }
        const delayMs = Math.min(
            RECONNECT_BASE_DELAY_MS * Math.pow(2, this._reconnectAttempts - 1),
            RECONNECT_MAX_DELAY_MS
        );
        this.emit('reconnecting', {attempt: this._reconnectAttempts, delayMs});

        this._reconnectTimer = setTimeout(() => {
            this._reconnectTimer = null;
            if (this.destroyed) return;
            this._redial();
        }, delayMs);
    }

    _redial () {
        const attemptDial = () => this._dialHost().then(() => {
            this._reconnectAttempts = 0;
            this.emit('reconnected');
        });

        let dialPromise;
        if (!this.peer || this.peer.destroyed) {
            dialPromise = this._openPeer(generateClientPeerId(this.roomId)).then(attemptDial);
        } else {
            dialPromise = attemptDial();
        }
        dialPromise.catch(() => {
            if (this.destroyed) return;
            this._scheduleReconnect();
        });
    }

    _startHeartbeat () {
        if (this._heartbeatTimer) return;
        this._heartbeatTimer = setInterval(() => {
            const now = Date.now();
            this._connections.forEach((entry, peerId) => {
                if (now - entry.lastSeen > this._deadPeerTimeoutMs) {
                    try {
                        entry.conn.close();
                    } catch (error) {
                        // Ignore.
                    }
                    this._handleConnectionDown(peerId);
                    return;
                }
                if (entry.conn.open) {
                    try {
                        entry.conn.send(makeCtrl(CTRL.PING, {}));
                    } catch (error) {
                        // Dead channel; the timeout above will reap it.
                    }
                }
            });
        }, this._heartbeatIntervalMs);
    }

    _stopHeartbeat () {
        if (this._heartbeatTimer) {
            clearInterval(this._heartbeatTimer);
            this._heartbeatTimer = null;
        }
    }
}

export {
    Transport,
    DEFAULT_PEER_CONFIG,
    sanitizeRoomId,
    generateHostPeerId,
    generateClientPeerId,
    HEARTBEAT_INTERVAL_MS,
    DEAD_PEER_TIMEOUT_MS,
    readUserPeerConfig,
    saveUserPeerConfig
};
