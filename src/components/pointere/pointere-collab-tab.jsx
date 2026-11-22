import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {AUTH_CHANGED, getAuthState} from '../../lib/pointere/auth.js';
import {getConfig, isValidRoomCode, generateRoomCode} from '../../lib/pointere/config.js';
import {getInstance as getCollab} from '../../lib/pointere/collab.js';
import PointerEOpsBridge from '../../lib/pointere/ops-bridge.js';
import PointereIconButton from './pointere-icon-button.jsx';

const T = {
    'zh-cn': {
        loginTitle: '尚未登录 PointerE',
        loginHint: '登录 PointerE 后即可加入协作房间，与队友实时编辑同一份作品。',
        loginButton: '登录并打开账号窗口',
        settings: '协作设置',
        room: '房间码', join: '加入房间', leave: '离开房间',
        connected: '协作中', connecting: '连接中', offline: '未连接',
        members: '房间成员', host: '房主', you: '你', error: '错误',
        needValidRoom: '房间码需为 4-12 位字母或数字',
        needLogin: '请先登录 PointerE 账号',
        openAccount: '账号窗口', copyInvite: '复制邀请链接', copyRoom: '复制房间号',
        copied: '已复制', copyFail: '复制失败，请手动复制',
        requestState: '获取项目快照',
        roles: '角色与代码锁定', lockAll: '锁定全部代码', unlockAll: '解锁全部代码',
        stage: '舞台', claim: '认领', release: '释放', lock: '锁定', unlock: '解锁',
        forceUnlock: '强制解锁', editRequest: '申请编辑', lockedBy: '已锁定', editable: '可编辑',
        claimed: '已认领', people: '人', hostOnly: '仅房主可用',
        chat: '聊天', typeMessage: '输入消息…', send: '发送',
        hint: '设置里可修改 API 接口、WebSocket 地址、client_id 与回调地址。',
        noticeLabel: '协作提示'
    },
    en: {
        loginTitle: 'Not signed in to PointerE',
        loginHint: 'Sign in to PointerE to join collaborative rooms and edit the same project together.',
        loginButton: 'Sign in / open account window',
        settings: 'Collaboration settings',
        room: 'Room code', join: 'Join room', leave: 'Leave room',
        connected: 'Live', connecting: 'Connecting', offline: 'Offline',
        members: 'Members', host: 'Host', you: 'You', error: 'Error',
        needValidRoom: 'Room code must be 4-12 letters or digits',
        needLogin: 'Please sign in to PointerE first',
        openAccount: 'Account window', copyInvite: 'Copy invite link', copyRoom: 'Copy room code',
        copied: 'Copied', copyFail: 'Copy failed, please copy manually',
        requestState: 'Request project snapshot',
        roles: 'Roles & code locks', lockAll: 'Lock all code', unlockAll: 'Unlock all code',
        stage: 'Stage', claim: 'Claim', release: 'Release', lock: 'Lock', unlock: 'Unlock',
        forceUnlock: 'Force unlock', editRequest: 'Request edit', lockedBy: 'Locked', editable: 'Editable',
        claimed: 'Claimed', people: 'people', hostOnly: 'Host only',
        chat: 'Chat', typeMessage: 'Type a message...', send: 'Send',
        hint: 'API base, WebSocket URL, client_id and redirect URI can be changed in Settings.',
        noticeLabel: 'Collaboration notice'
    }
};

const S = {
    root: {height: '100%', overflowY: 'auto', padding: '18px 22px',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, "Microsoft YaHei", sans-serif',
        color: 'var(--ui-modal-foreground, var(--text-primary, #1f2937))'},
    center: {display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 320, textAlign: 'center', gap: 14},
    card: {borderRadius: 10, padding: 14, marginBottom: 12,
        background: 'var(--ui-secondary, rgba(128,128,128,.08))'},
    row: {display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10},
    label: {display: 'block', fontSize: 12, opacity: .75, marginBottom: 4},
    input: {width: '100%', boxSizing: 'border-box', padding: '9px 10px', borderRadius: 6,
        border: '1px solid var(--ui-black-transparent, rgba(0,0,0,.2))',
        background: 'var(--ui-modal-background, #fff)', color: 'inherit', fontFamily: 'inherit'},
    btn: primary => ({padding: '8px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 12,
        border: primary ? 'none' : '1px solid var(--ui-black-transparent, rgba(0,0,0,.2))',
        background: primary ? 'var(--looks-secondary, #4c97ff)' : 'transparent',
        color: primary ? '#fff' : 'inherit'}),
    chip: (on = false) => ({display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11,
        background: on ? 'rgba(47,158,68,.15)' : 'rgba(128,128,128,.15)',
        color: on ? '#2f9e44' : 'inherit'}),
    hint: {fontSize: 12, opacity: .7, lineHeight: 1.7},
    err: {fontSize: 13, color: '#e35b5b', marginBottom: 10},
    notice: {borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 13,
        background: 'rgba(76,151,255,.12)', borderLeft: '3px solid var(--looks-secondary, #4c97ff)'},
    list: {listStyle: 'none', padding: 0, margin: 0, fontSize: 13},
    item: {padding: '5px 0', borderBottom: '1px solid var(--ui-black-transparent, rgba(0,0,0,.08))'},
    roleRow: {display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
        borderBottom: '1px solid var(--ui-black-transparent, rgba(0,0,0,.08))'},
    statusBar: {display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#2f9e44', marginBottom: 12}
};

const getVM = () => {
    try {
        const state = window.ReduxStore && window.ReduxStore.getState && window.ReduxStore.getState();
        return state && state.scratchGui && state.scratchGui.vm || null;
    } catch (e) {
        return null;
    }
};

/** 列出稳定角色键 + 本地角色名 */
const listTargets = () => {
    const vm = getVM();
    if (!vm || !vm.runtime || !Array.isArray(vm.runtime.targets)) return [];
    const stage = vm.runtime.targets.find(t => t.isStage);
    const out = [];
    if (stage) out.push({id: 'stage', name: stage.getName ? stage.getName() : 'Stage', isStage: true});
    let idx = 0;
    for (const t of vm.runtime.targets) {
        if (t.isStage) continue;
        out.push({id: `sprite-${idx++}`, name: t.getName ? t.getName() : `Sprite ${idx}`, isStage: false});
    }
    return out;
};

class PointereCollabTab extends Component {
    constructor (props) {
        super(props);
        this.collab = getCollab();
        this.bridge = new PointerEOpsBridge(this.collab);
        this.t = T[props.locale] || T['zh-cn'];
        this.state = {
            auth: getAuthState(),
            status: this.collab.getStatus(),
            room: (props.autoRoom || getConfig().defaultRoom || '').toUpperCase(),
            error: '',
            notice: '',
            text: '',
            messages: [],
            roles: listTargets(),
            copied: ''
        };
        this._autoJoinedFor = '';
    }

    componentDidMount () {
        this.t = (T[this.props.locale] || T['zh-cn']);
        this.handleAuth = () => this.setState({auth: getAuthState()});
        this.handleStatus = status => {
            this.setState({status, roles: listTargets()});
            // 邀请链接自动连接：登录且未连接时，对 autoRoom 加入一次
            this.maybeAutoJoin();
        };
        this.handleNotice = message => {
            this.setState({notice: String(message.message || message.text || '')});
        };
        this.handleChat = message => {
            this.setState(prev => ({
                messages: prev.messages.concat([`${message.name || '?'}：${message.text}`]).slice(-200)
            }));
        };
        window.addEventListener(AUTH_CHANGED, this.handleAuth);
        this.unStatus = this.collab.on('status', this.handleStatus);
        this.unNotice = this.collab.on('notice', this.handleNotice);
        this.unChat = this.collab.on('chat', this.handleChat);
        this.maybeAutoJoin();
    }

    componentWillUnmount () {
        window.removeEventListener(AUTH_CHANGED, this.handleAuth);
        if (this.unStatus) this.unStatus();
        if (this.unNotice) this.unNotice();
        if (this.unChat) this.unChat();
        // Tab 关闭不主动离开房间：用户可能只是切回原协作 Tab
    }

    maybeAutoJoin = () => {
        const room = this.state.room;
        if (!room || !isValidRoomCode(room)) return;
        if (this._autoJoinedFor === room) return;
        if (!this.state.auth.loggedIn) return;
        if (this.collab.connected || this.collab.joining) return;
        this._autoJoinedFor = room;
        this.handleJoin();
    };

    handleJoin = async () => {
        const {room} = this.state;
        if (!isValidRoomCode(room)) {
            this.setState({error: this.t.needValidRoom});
            return;
        }
        if (!this.state.auth.loggedIn) {
            this.setState({error: this.t.needLogin || this.t.loginHint});
            return;
        }
        this.setState({error: '', notice: ''});
        try {
            await this.collab.join({room});
            this.bridge.start();
        } catch (e) {
            this.setState({error: e.message});
        }
    };

    handleLeave = () => {
        this.bridge.stop();
        this.collab.leave();
        this.setState({messages: [], notice: ''});
        this._autoJoinedFor = '';
    };

    copyText = async (text, key) => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            this.setState({copied: key});
            setTimeout(() => this.setState({copied: ''}), 1500);
        } catch (e) {
            this.setState({error: this.t.copyFail});
        }
    };

    handleCopyInvite = () => {
        const room = this.state.room;
        if (!isValidRoomCode(room)) {
            this.setState({error: this.t.needValidRoom});
            return;
        }
        const url = new URL(window.location.href);
        url.searchParams.set('peroom', room);
        this.copyText(url.toString(), 'invite');
    };

    handleCopyRoom = () => {
        const room = this.state.room;
        if (!isValidRoomCode(room)) {
            this.setState({error: this.t.needValidRoom});
            return;
        }
        this.copyText(room, 'room');
    };

    handleSend = () => {
        const text = this.state.text.trim();
        if (!text) return;
        if (!this.collab.sendChat(text)) {
            this.setState({error: this.t.offline});
            return;
        }
        this.setState(prev => ({
            messages: prev.messages.concat([`${(this.state.auth.user && (this.state.auth.user.nickname || this.state.auth.user.username)) || '你'}：${text}`]).slice(-200),
            text: ''
        }));
    };

    /** 锁定信息：从 status.locks 中取某角色的持有者 / 锁定状态 */
    lockInfoFor (targetId) {
        const locks = this.state.status.locks;
        if (!locks) return {owner: '', locked: false};
        const claims = Array.isArray(locks.claims) ? locks.claims : [];
        const claim = claims.find(c => c && (c.targetId === targetId || c.id === targetId));
        return {
            owner: (claim && (claim.name || claim.clientId || claim.id)) || '',
            locked: !!(claim && (claim.locked || claim.isLocked))
        };
    }

    renderLoggedOut () {
        return (
            <div style={S.center}>
                <div style={{fontSize: 20, fontWeight: 600}}>{this.t.loginTitle}</div>
                <div style={{...S.hint, maxWidth: 380}}>{this.t.loginHint}</div>
                <button style={S.btn(true)} onClick={() => this.props.onOpenAccount && this.props.onOpenAccount('account')}>
                    {this.t.loginButton}
                </button>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: 4}}>
                    <span style={S.hint}>{this.t.settings}</span>
                    <PointereIconButton title={this.t.settings}
                        onClick={() => this.props.onOpenSettings && this.props.onOpenSettings('collab')} />
                </div>
            </div>
        );
    }

    renderRoles () {
        const {roles, status} = this.state;
        const isHost = status.isHost;
        const projectLocked = !!(status.locks && status.locks.projectLocked);
        return (
            <div style={S.card}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6}}>
                    <div style={{fontSize: 13, fontWeight: 600}}>{this.t.roles}</div>
                    <button style={S.btn(false)} disabled={!status.connected || !isHost}
                        title={isHost ? '' : this.t.hostOnly}
                        onClick={() => this.collab.hostLock(!projectLocked)}>
                        {projectLocked ? this.t.unlockAll : this.t.lockAll}
                    </button>
                </div>
                {projectLocked ? <div style={S.notice}>🔒 {this.t.lockAll}</div> : null}
                {roles.map(role => {
                    const info = this.lockInfoFor(role.id);
                    return (
                        <div key={role.id} style={S.roleRow}>
                            <div style={{flex: 1, minWidth: 80}}>
                                {role.isStage ? this.t.stage : role.name}
                            </div>
                            <span style={S.chip(!!info.owner)}>
                                {info.owner ? `${info.locked ? this.t.lockedBy : this.t.claimed} · ${info.owner}` : this.t.editable}
                            </span>
                            <button style={S.btn(false)} disabled={!status.connected}
                                title={this.t.editRequest}
                                onClick={() => this.collab.claim(role.id)}>{this.t.claim}</button>
                            <button style={S.btn(false)} disabled={!status.connected}
                                onClick={() => this.collab.release(role.id)}>{this.t.release}</button>
                            <button style={S.btn(false)} disabled={!status.connected}
                                onClick={() => this.collab.editorLock(role.id, !info.locked)}>
                                {info.locked ? this.t.unlock : this.t.lock}
                            </button>
                            {isHost && info.owner ? (
                                <button style={S.btn(false)} disabled={!status.connected}
                                    onClick={() => this.collab.forceUnlock(role.id)}>{this.t.forceUnlock}</button>
                            ) : null}
                        </div>
                    );
                })}
                {!roles.length ? <div style={S.hint}>—</div> : null}
            </div>
        );
    }

    renderRoom () {
        const {status, room, error, notice, text, messages, copied} = this.state;
        const t = this.t;
        const memberCount = (status.peers && status.peers.length) || (status.connected ? 1 : 0);
        return (
            <div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
                    <div style={{fontSize: 16, fontWeight: 600}}>PointerE</div>
                    <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                        <PointereIconButton title={t.settings}
                            onClick={() => this.props.onOpenSettings && this.props.onOpenSettings('collab')} />
                    </div>
                </div>

                {status.connected ? (
                    <div style={S.statusBar}>
                        <span>● {t.connected}</span>
                        <span>· {status.room}</span>
                        <span>· {memberCount} {t.people}</span>
                    </div>
                ) : null}

                {error ? <div style={S.err}>{error}</div> : null}
                {notice ? <div style={S.notice}>{t.noticeLabel}：{notice}</div> : null}
                {status.protocol !== 2 && status.connected ? <div style={S.err}>protocol 1</div> : null}

                <div style={S.card}>
                    <div style={S.row}>
                        <div style={{flex: 1, minWidth: 130}}>
                            <span style={S.label}>{t.room}</span>
                            <input style={S.input} value={room} maxLength={12}
                                disabled={status.connected}
                                onChange={e => this.setState({room: e.target.value.toUpperCase()})} />
                        </div>
                        <button style={S.btn(false)}
                            onClick={() => this.setState({room: generateRoomCode()})}>↻</button>
                    </div>
                    <div style={S.row}>
                        <button style={S.btn(true)} disabled={status.connected || status.joining}
                            onClick={this.handleJoin}>{t.join}</button>
                        <button style={S.btn(false)} disabled={!status.connected}
                            onClick={this.handleLeave}>{t.leave}</button>
                        <button style={S.btn(false)}
                            onClick={this.handleCopyInvite}>{copied === 'invite' ? t.copied : t.copyInvite}</button>
                        <button style={S.btn(false)}
                            onClick={this.handleCopyRoom}>{copied === 'room' ? t.copied : t.copyRoom}</button>
                    </div>
                    <div style={S.row}>
                        <button style={S.btn(false)}
                            onClick={() => this.props.onOpenAccount && this.props.onOpenAccount('account')}>{t.openAccount}</button>
                        <button style={S.btn(false)} disabled={!status.connected}
                            onClick={() => this.collab.requestState()}>{t.requestState}</button>
                    </div>
                </div>

                <div style={S.card}>
                    <div style={{fontSize: 13, fontWeight: 600, marginBottom: 6}}>{t.members}</div>
                    <ul style={S.list}>
                        {status.peers.map(peer => (
                            <li key={peer.id} style={S.item}>
                                {peer.name || peer.id}
                                {peer.host ? ` · ${t.host}` : ''}
                                {peer.id === status.clientId ? ` · ${t.you}` : ''}
                            </li>
                        ))}
                        {!status.peers.length ? <li style={{...S.item, opacity: .6}}>—</li> : null}
                    </ul>
                </div>

                {this.renderRoles()}

                <div style={S.card}>
                    <div style={{fontSize: 13, fontWeight: 600, marginBottom: 6}}>{t.chat}</div>
                    <div style={{maxHeight: 140, overflowY: 'auto', marginBottom: 8, fontSize: 12}}>
                        {messages.map((line, i) => <div key={i}>{line}</div>)}
                        {!messages.length ? <div style={S.hint}>{t.typeMessage}</div> : null}
                    </div>
                    <div style={S.row}>
                        <input style={{...S.input, flex: 1}} value={text}
                            placeholder={t.typeMessage}
                            onChange={e => this.setState({text: e.target.value})}
                            onKeyDown={e => { if (e.key === 'Enter') this.handleSend(); }} />
                        <button style={S.btn(true)} onClick={this.handleSend}>{t.send}</button>
                    </div>
                </div>

                <div style={S.hint}>{t.hint}</div>
            </div>
        );
    }

    render () {
        return (
            <div style={S.root}>
                {this.state.auth.loggedIn ? this.renderRoom() : this.renderLoggedOut()}
            </div>
        );
    }
}

PointereCollabTab.propTypes = {
    locale: PropTypes.string,
    autoRoom: PropTypes.string,
    onOpenAccount: PropTypes.func,
    onOpenSettings: PropTypes.func
};

export default PointereCollabTab;
