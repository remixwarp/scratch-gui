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
        loginButton: '登录 / 注册并打开账号窗口',
        settings: '设置',
        room: '房间码', join: '加入房间', leave: '离开房间',
        connected: '已连接', connecting: '连接中', offline: '未连接',
        members: '成员', host: '房主', you: '你', error: '错误',
        needValidRoom: '房间码需为 4-12 位字母或数字',
        openAccount: '打开账号窗口', requestState: '获取项目快照',
        hint: '设置里可修改 API 接口、WebSocket 地址、client_id 与回调地址。'
    },
    en: {
        loginTitle: 'Not signed in to PointerE',
        loginHint: 'Sign in to PointerE to join collaborative rooms and edit the same project together.',
        loginButton: 'Sign in / open account window',
        settings: 'Settings',
        room: 'Room code', join: 'Join room', leave: 'Leave room',
        connected: 'Connected', connecting: 'Connecting', offline: 'Not connected',
        members: 'Members', host: 'Host', you: 'You', error: 'Error',
        needValidRoom: 'Room code must be 4-12 letters or digits',
        openAccount: 'Open account window', requestState: 'Request project snapshot',
        hint: 'API base, WebSocket URL, client_id and redirect URI can be changed in Settings.'
    }
};

const S = {
    root: {height: '100%', overflowY: 'auto', padding: '20px 24px',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, "Microsoft YaHei", sans-serif'},
    center: {display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', minHeight: 320, textAlign: 'center', gap: 14},
    card: {borderRadius: 10, padding: 16, marginBottom: 14,
        background: 'var(--ui-secondary, rgba(128,128,128,.1))'},
    row: {display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12},
    label: {display: 'block', fontSize: 12, opacity: .75, marginBottom: 4},
    input: {width: '100%', boxSizing: 'border-box', padding: '9px 10px', borderRadius: 6,
        border: '1px solid var(--ui-black-transparent, rgba(0,0,0,.2))',
        background: 'var(--ui-modal-background, #fff)', color: 'inherit', fontFamily: 'inherit'},
    btn: primary => ({padding: '8px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 13,
        border: primary ? 'none' : '1px solid var(--ui-black-transparent, rgba(0,0,0,.2))',
        background: primary ? 'var(--looks-secondary, #4c97ff)' : 'transparent',
        color: primary ? '#fff' : 'inherit'}),
    hint: {fontSize: 12, opacity: .7, lineHeight: 1.7},
    err: {fontSize: 13, color: '#e35b5b', marginBottom: 10},
    list: {listStyle: 'none', padding: 0, margin: 0, fontSize: 13},
    item: {padding: '5px 0', borderBottom: '1px solid var(--ui-black-transparent, rgba(0,0,0,.08))'}
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
            room: getConfig().defaultRoom || '',
            error: ''
        };
    }

    componentDidMount () {
        this.t = (T[this.props.locale] || T['zh-cn']);
        this.handleAuth = () => this.setState({auth: getAuthState()});
        this.handleStatus = status => this.setState({status});
        window.addEventListener(AUTH_CHANGED, this.handleAuth);
        this.unStatus = this.collab.on('status', this.handleStatus);
        this.unError = this.collab.on('error', payload => {
            this.setState({error: payload && payload.message || ''});
        });
    }

    componentWillUnmount () {
        window.removeEventListener(AUTH_CHANGED, this.handleAuth);
        if (this.unStatus) this.unStatus();
        if (this.unError) this.unError();
        // Tab 关闭不主动离开房间：用户可能只是切回原协作 Tab
    }

    handleJoin = async () => {
        const {room} = this.state;
        if (!isValidRoomCode(room)) {
            this.setState({error: this.t.needValidRoom});
            return;
        }
        this.setState({error: ''});
        try {
            await this.collab.join({room});
            this.bridge.start();
        } catch (e) {
            this.setState({error: e.message});
        }
    };

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
                    <PointereIconButton
                        title={this.t.settings}
                        onClick={() => this.props.onOpenSettings && this.props.onOpenSettings('collab')}
                    />
                </div>
            </div>
        );
    }

    renderLoggedIn () {
        const {status, room, error} = this.state;
        const t = this.t;
        return (
            <div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14}}>
                    <div style={{fontSize: 16, fontWeight: 600}}>PointerE</div>
                    <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                        <div style={status.connected ? {fontSize: 12, color: '#2f9e44'} : S.hint}>
                            {status.connected ? `● ${t.connected} · ${this.state.room}` :
                                (status.joining ? t.connecting : t.offline)}
                        </div>
                        <PointereIconButton
                            title={t.settings}
                            onClick={() => this.props.onOpenSettings && this.props.onOpenSettings('collab')}
                        />
                    </div>
                </div>
                {error ? <div style={S.err}>{error}</div> : null}
                <div style={S.card}>
                    <div style={S.row}>
                        <div style={{flex: 1, minWidth: 150}}>
                            <span style={S.label}>{t.room}</span>
                            <input style={S.input} value={room} maxLength={12}
                                disabled={status.connected}
                                onChange={e => this.setState({room: e.target.value.toUpperCase()})} />
                        </div>
                        <button style={S.btn(true)} disabled={status.connected || status.joining}
                            onClick={this.handleJoin}>{t.join}</button>
                        <button style={S.btn(false)} disabled={!status.connected}
                            onClick={() => { this.bridge.stop(); this.collab.leave(); }}>{t.leave}</button>
                        <button style={S.btn(false)}
                            onClick={() => this.setState({room: generateRoomCode()})}>↻</button>
                    </div>
                    <div style={S.row}>
                        <button style={S.btn(false)}
                            onClick={() => this.props.onOpenAccount && this.props.onOpenAccount('room')}>
                            {t.openAccount}
                        </button>
                        <button style={S.btn(false)} disabled={!status.connected}
                            onClick={() => this.collab.requestState()}>{t.requestState}</button>
                    </div>
                </div>
                <div style={S.card}>
                    <div style={{fontSize: 13, fontWeight: 600, marginBottom: 8}}>{t.members}</div>
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
                <div style={S.hint}>{t.hint}</div>
            </div>
        );
    }

    render () {
        return (
            <div style={S.root}>
                {this.state.auth.loggedIn ? this.renderLoggedIn() : this.renderLoggedOut()}
            </div>
        );
    }
}

PointereCollabTab.propTypes = {
    locale: PropTypes.string,
    onOpenAccount: PropTypes.func,
    onOpenSettings: PropTypes.func
};

export default PointereCollabTab;
