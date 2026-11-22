import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {
    AUTH_CHANGED,
    getAuthState,
    beginLogin,
    logout,
    notifyAuthChanged
} from '../../lib/pointere/auth.js';
import {getConfig, isValidRoomCode, generateRoomCode} from '../../lib/pointere/config.js';
import {getInstance as getCollab} from '../../lib/pointere/collab.js';
import PointerEOpsBridge from '../../lib/pointere/ops-bridge.js';
import PointereIconButton from './pointere-icon-button.jsx';

const T = {
    en: {
        account: 'Account', room: 'Room', chat: 'Chat', login: 'Sign in to PointerE',
        loginHint: 'Use your PointerE account to join collaborative rooms. No password is collected here.',
        loggedInAs: 'Signed in as', logout: 'Sign out', settings: 'Settings',
        roomCode: 'Room code', password: 'Password (optional)', displayName: 'Display name',
        join: 'Join room', leave: 'Leave room', connected: 'Connected', connecting: 'Connecting',
        notConnected: 'Not connected', invalidRoom: 'Room code must be 4-12 letters or digits',
        needLogin: 'Please sign in first', peers: 'Members', host: 'Host', you: 'You',
        requestState: 'Request project snapshot', sendState: 'Send my snapshot',
        sync: 'Resync', lock: 'Lock my sprites', hostLock: 'Lock whole project',
        messages: 'Messages', send: 'Send', typeMessage: 'Type a message...',
        error: 'Error', protocol1: 'Room is using legacy protocol; collaboration is limited.'
    },
    'zh-cn': {
        account: '账号', room: '协作房间', chat: '聊天', login: '登录 PointerE 账号',
        loginHint: '使用 PointerE 账号登录以加入协作房间，本编辑器不会收集你的密码。',
        loggedInAs: '当前账号', logout: '退出登录', settings: '设置',
        roomCode: '房间码', password: '房间密码（可选）', displayName: '显示名称',
        join: '加入房间', leave: '离开房间', connected: '已连接', connecting: '连接中',
        notConnected: '未连接', invalidRoom: '房间码需为 4-12 位字母或数字',
        needLogin: '请先登录', peers: '房间成员', host: '房主', you: '你',
        requestState: '请求项目快照', sendState: '发送我的快照',
        sync: '重新同步', lock: '锁定我的角色', hostLock: '锁定整个项目',
        messages: '消息', send: '发送', typeMessage: '输入消息…',
        error: '错误', protocol1: '房间使用旧协议，协作功能受限。'
    }
};

const makeT = locale => ({
    en: T.en,
    'zh-cn': T['zh-cn'],
    zh_cn: T['zh-cn'],
    wenyan: T['zh-cn'],
    geng: T['zh-cn']
}[locale] || T['zh-cn']);

const S = {
    root: {display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0,
        background: 'var(--ui-modal-background, #fff)', color: 'var(--ui-modal-foreground, var(--text-primary, #1f2937))',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, "Microsoft YaHei", sans-serif'},
    tabs: {display: 'flex', borderBottom: '1px solid var(--ui-black-transparent, rgba(0,0,0,.12))',
        background: 'var(--ui-secondary, #f5f5f5)', margin: 0, padding: 0},
    tab: active => ({flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer', fontSize: 14,
        background: active ? 'var(--ui-modal-background, #fff)' : 'var(--ui-secondary, #f5f5f5)',
        borderBottom: active ? '3px solid var(--looks-secondary, #4c97ff)' : '1px solid var(--ui-black-transparent, rgba(0,0,0,.12))',
        color: 'var(--ui-modal-foreground, var(--text-primary, #1f2937))'}),
    body: {flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px'},
    center: {display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', minHeight: 220, textAlign: 'center', gap: 14},
    card: {padding: 16, borderRadius: 10, background: 'var(--ui-secondary, rgba(128,128,128,.1))', marginBottom: 14},
    row: {display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap'},
    label: {display: 'block', fontSize: 12, opacity: .75, marginBottom: 4},
    input: {width: '100%', boxSizing: 'border-box', padding: '9px 10px', borderRadius: 6,
        border: '1px solid var(--ui-black-transparent, rgba(0,0,0,.2))',
        background: 'var(--ui-modal-background, #fff)', color: 'inherit', fontFamily: 'inherit'},
    btn: primary => ({padding: '8px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 13,
        border: primary ? 'none' : '1px solid var(--ui-black-transparent, rgba(0,0,0,.2))',
        background: primary ? 'var(--looks-secondary, #4c97ff)' : 'transparent',
        color: primary ? '#fff' : 'inherit'}),
    hint: {fontSize: 12, opacity: .7, lineHeight: 1.7},
    err: {color: '#e35b5b', fontSize: 13, marginBottom: 10},
    ok: {color: '#2f9e44', fontSize: 13},
    list: {listStyle: 'none', padding: 0, margin: 0, fontSize: 13},
    listItem: {padding: '6px 0', borderBottom: '1px solid var(--ui-black-transparent, rgba(0,0,0,.08))'},
    chatLog: {height: 260, overflowY: 'auto', border: '1px solid var(--ui-black-transparent, rgba(0,0,0,.12))',
        borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 13, background: 'var(--ui-secondary, rgba(128,128,128,.06))'},
    header: {display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14}
};

class PointerePanel extends Component {
    constructor (props) {
        super(props);
        this.collab = getCollab();
        this.bridge = new PointerEOpsBridge(this.collab);
        this.state = {
            tab: props.initialTab || (getAuthState().loggedIn ? 'room' : 'account'),
            auth: getAuthState(),
            room: getConfig().defaultRoom || '',
            password: '',
            name: '',
            status: this.collab.getStatus(),
            error: '',
            notice: '',
            text: '',
            messages: []
        };
        this.t = makeT(props.locale || (props.intl && props.intl.locale));
    }

    componentDidMount () {
        this.handleAuthChange = () => {
            const auth = getAuthState();
            this.setState({auth});
            if (auth.loggedIn && this.state.tab === 'account') this.setState({tab: 'room'});
        };
        this.handleStatus = status => this.setState({status});
        this.handleNotice = message => this.setState({notice: String(message.message || message.text || '')});
        this.handleChat = message => {
            this.setState(prev => ({
                messages: prev.messages.concat([`${message.name || '?'}：${message.text}`]).slice(-200)
            }));
        };
        window.addEventListener(AUTH_CHANGED, this.handleAuthChange);
        this.unStatus = this.collab.on('status', this.handleStatus);
        this.unNotice = this.collab.on('notice', this.handleNotice);
        this.unChat = this.collab.on('chat', this.handleChat);
        if (this.props._onRef) this.props._onRef(this);
        // 让协作 tab 也能通过本面板打开：全局句柄
        window.PointerePanelRef = this;
    }

    componentWillUnmount () {
        window.removeEventListener(AUTH_CHANGED, this.handleAuthChange);
        if (this.unStatus) this.unStatus();
        if (this.unNotice) this.unNotice();
        if (this.unChat) this.unChat();
        if (window.PointerePanelRef === this) window.PointerePanelRef = null;
        if (this.props._onRef) this.props._onRef(null);
    }

    switchTab = tab => {
        this.setState({tab, error: ''});
        if (this.props.onTabChange) this.props.onTabChange(tab);
    };

    handleLogin = async () => {
        this.setState({error: ''});
        try {
            await beginLogin();
        } catch (e) {
            this.setState({error: e.message});
        }
    };

    handleLogout = async () => {
        this.collab.leave();
        this.bridge.stop();
        await logout().catch(() => {});
        notifyAuthChanged();
        this.setState({tab: 'account', messages: []});
    };

    handleJoin = async () => {
        this.setState({error: '', notice: ''});
        const {room} = this.state;
        if (!isValidRoomCode(room)) {
            this.setState({error: this.t.invalidRoom});
            return;
        }
        if (!this.state.auth.loggedIn) {
            this.setState({error: this.t.needLogin});
            return;
        }
        try {
            await this.collab.join({room, password: this.state.password, name: this.state.name});
            this.bridge.start();
        } catch (e) {
            this.setState({error: e.message});
        }
    };

    handleLeave = () => {
        this.bridge.stop();
        this.collab.leave();
        this.setState({messages: []});
    };

    handleSend = () => {
        const text = this.state.text.trim();
        if (!text) return;
        if (!this.collab.sendChat(text)) {
            this.setState({error: this.t.notConnected});
            return;
        }
        this.setState(prev => ({
            messages: prev.messages.concat([`${this.state.auth.user && this.state.auth.user.nickname || '你'}：${text}`]).slice(-200),
            text: ''
        }));
    };

    renderAccount () {
        const {auth, error} = this.state;
        const user = auth.user || {};
        return (
            <div style={S.center}>
                {auth.loggedIn ? (
                    <div style={{width: '100%', maxWidth: 440}}>
                        <div style={S.card}>
                            <div style={{fontSize: 18, fontWeight: 600, marginBottom: 8}}>
                                {this.t.loggedInAs}
                            </div>
                            <div style={{marginBottom: 4}}>{user.nickname || user.username || user.sub || 'PointerE'}</div>
                            {user.email ? <div style={S.hint}>{user.email}</div> : null}
                        </div>
                        <div style={S.row}>
                            <button style={S.btn(true)} onClick={() => this.switchTab('room')}>{this.t.room}</button>
                            <button style={S.btn(false)} onClick={this.handleLogout}>{this.t.logout}</button>
                        </div>
                    </div>
                ) : (
                    <div style={{maxWidth: 420}}>
                        <div style={{fontSize: 20, fontWeight: 600, marginBottom: 10}}>{this.t.login}</div>
                        <p style={S.hint}>{this.t.loginHint}</p>
                        {error ? <div style={S.err}>{error}</div> : null}
                        <div style={{...S.row, justifyContent: 'center'}}>
                            <button style={S.btn(true)} onClick={this.handleLogin}>{this.t.login}</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    renderRoom () {
        const {status, room, error, notice} = this.state;
        return (
            <div>
                <div style={S.header}>
                    <div style={{fontSize: 16, fontWeight: 600}}>{this.t.room}</div>
                    <div style={status.connected ? S.ok : S.hint}>
                        {status.connected ? `● ${this.t.connected} · ${room}` :
                            (status.joining ? this.t.connecting : this.t.notConnected)}
                    </div>
                </div>
                {error ? <div style={S.err}>{error}</div> : null}
                {notice ? <div style={S.hint}>{notice}</div> : null}
                {status.protocol !== 2 && status.connected ? <div style={S.err}>{this.t.protocol1}</div> : null}

                <div style={S.card}>
                    <div style={S.row}>
                        <div style={{flex: 2, minWidth: 150}}>
                            <div style={S.label}>{this.t.roomCode}</div>
                            <input style={S.input} value={room} maxLength={12}
                                disabled={status.connected}
                                onChange={e => this.setState({room: e.target.value.toUpperCase()})} />
                        </div>
                        <div style={{flex: 1, minWidth: 110}}>
                            <div style={S.label}>{this.t.displayName}</div>
                            <input style={S.input} value={this.state.name}
                                onChange={e => this.setState({name: e.target.value})} />
                        </div>
                        <div style={{flex: 1, minWidth: 110}}>
                            <div style={S.label}>{this.t.password}</div>
                            <input style={S.input} type="password" value={this.state.password}
                                onChange={e => this.setState({password: e.target.value})} />
                        </div>
                    </div>
                    <div style={S.row}>
                        <button style={S.btn(true)} disabled={status.connected || status.joining}
                            onClick={this.handleJoin}>{this.t.join}</button>
                        <button style={S.btn(false)} disabled={!status.connected}
                            onClick={this.handleLeave}>{this.t.leave}</button>
                        <button style={S.btn(false)}
                            onClick={() => this.setState({room: generateRoomCode()})}>↻</button>
                    </div>
                </div>

                <div style={S.card}>
                    <div style={{fontSize: 13, fontWeight: 600, marginBottom: 8}}>{this.t.peers}</div>
                    <ul style={S.list}>
                        {status.peers.map(peer => (
                            <li key={peer.id} style={S.listItem}>
                                {peer.name || peer.id}
                                {peer.host ? ` · ${this.t.host}` : ''}
                                {peer.id === status.clientId ? ` · ${this.t.you}` : ''}
                            </li>
                        ))}
                        {!status.peers.length ? <li style={{...S.listItem, opacity: .6}}>—</li> : null}
                    </ul>
                </div>

                <div style={S.row}>
                    <button style={S.btn(false)} disabled={!status.connected}
                        onClick={() => this.collab.requestState()}>{this.t.requestState}</button>
                    <button style={S.btn(false)} disabled={!status.connected}
                        onClick={() => this.bridge.exportSnapshot().then(data => {
                            if (data) this.collab.sendState(data);
                        })}>{this.t.sendState}</button>
                    <button style={S.btn(false)} disabled={!status.connected}
                        onClick={() => this.collab.requestSync(this.collab.seq)}>{this.t.sync}</button>
                </div>
                <div style={S.row}>
                    <button style={S.btn(false)} disabled={!status.connected}
                        onClick={() => this.collab.editorLock('stage', true)}>{this.t.lock}</button>
                    <button style={S.btn(false)} disabled={!status.connected}
                        onClick={() => this.collab.hostLock(true)}>{this.t.hostLock}</button>
                </div>
            </div>
        );
    }

    renderChat () {
        return (
            <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
                <div style={S.chatLog}>
                    {this.state.messages.map((line, i) => <div key={i}>{line}</div>)}
                    {!this.state.messages.length ? <div style={S.hint}>{this.t.messages}</div> : null}
                </div>
                <div style={S.row}>
                    <input style={{...S.input, flex: 1}} value={this.state.text}
                        placeholder={this.t.typeMessage}
                        onChange={e => this.setState({text: e.target.value})}
                        onKeyDown={e => { if (e.key === 'Enter') this.handleSend(); }} />
                    <button style={S.btn(true)} onClick={this.handleSend}>{this.t.send}</button>
                </div>
            </div>
        );
    }

    render () {
        const tab = this.state.tab;
        const content = tab === 'account' ? this.renderAccount() :
            (tab === 'chat' ? this.renderChat() : this.renderRoom());
        return (
            <div style={S.root}>
                <div style={S.tabs}>
                    {['account', 'room', 'chat'].map(id => (
                        <button key={id} style={S.tab(tab === id)} onClick={() => this.switchTab(id)}>
                            {this.t[id]}
                        </button>
                    ))}
                    <div style={{display: 'flex', alignItems: 'center', padding: '0 8px', flex: '0 0 auto'}}>
                        <PointereIconButton
                            title={this.t.settings}
                            onClick={() => this.props.onOpenSettings && this.props.onOpenSettings('account')}
                        />
                    </div>
                </div>
                <div style={S.body}>{content}</div>
            </div>
        );
    }
}

PointerePanel.propTypes = {
    initialTab: PropTypes.string,
    locale: PropTypes.string,
    intl: PropTypes.object,
    onOpenSettings: PropTypes.func,
    onTabChange: PropTypes.func,
    _onRef: PropTypes.func
};

export default PointerePanel;
