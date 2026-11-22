import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {
    AUTH_CHANGED,
    getAuthState,
    beginLogin,
    logout,
    notifyAuthChanged
} from '../../lib/pointere/auth.js';
import {
    getBinding,
    bindCommunity,
    unbindCommunity,
    communityLoggedIn,
    communityUser
} from '../../lib/pointere/pointere-binding.js';
import PointereIconButton from './pointere-icon-button.jsx';

const T = {
    en: {
        title: 'PointerE Account',
        login: 'Sign in to PointerE',
        loginHint: 'Use your PointerE account for online collaboration. No password is collected here.',
        loggedInAs: 'Signed in as', logout: 'Sign out', settings: 'Account settings',
        bindTitle: 'Link community account',
        bindHint: 'Link the Maker Community account signed in on this device for display only. The two accounts are managed separately and are not interchangeable.',
        bind: 'Link current community account', unbind: 'Unlink',
        boundAs: 'Linked as', notBound: 'Not linked',
        needCommunityLogin: 'Sign in to Maker Community on this device first',
        needLogin: 'Please sign in to PointerE first',
        error: 'Error', refresh: 'Refresh'
    },
    'zh-cn': {
        title: 'PointerE 账号',
        login: '登录 PointerE 账号',
        loginHint: '使用 PointerE 账号进行在线协作，本编辑器不会收集你的密码。',
        loggedInAs: '当前账号', logout: '退出登录', settings: '账号设置',
        bindTitle: '串号 · 绑定创客次元账号',
        bindHint: '把本机已登录的创客次元账号关联过来，仅用于本机展示。两套账号分开管理、并不互通。',
        bind: '绑定当前社区账号', unbind: '解除绑定',
        boundAs: '已绑定', notBound: '未绑定',
        needCommunityLogin: '请先在本机登录创客次元账号',
        needLogin: '请先登录 PointerE 账号',
        error: '错误', refresh: '刷新'
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
        background: 'var(--ui-modal-background, #fff)',
        color: 'var(--ui-modal-foreground, var(--text-primary, #1f2937))',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, "Microsoft YaHei", sans-serif'},
    header: {display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 16px', borderBottom: '1px solid var(--ui-black-transparent, rgba(0,0,0,.12))',
        background: 'var(--ui-secondary, #f5f5f5)'},
    body: {flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px'},
    card: {padding: 16, borderRadius: 10, background: 'var(--ui-secondary, rgba(128,128,128,.1))', marginBottom: 14},
    row: {display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap'},
    btn: primary => ({padding: '8px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 13,
        border: primary ? 'none' : '1px solid var(--ui-black-transparent, rgba(0,0,0,.2))',
        background: primary ? 'var(--looks-secondary, #4c97ff)' : 'transparent',
        color: primary ? '#fff' : 'inherit'}),
    hint: {fontSize: 12, opacity: .7, lineHeight: 1.7},
    err: {color: '#e35b5b', fontSize: 13, marginBottom: 10},
    ok: {color: '#2f9e44', fontSize: 13}
};

class PointerePanel extends Component {
    constructor (props) {
        super(props);
        const auth = getAuthState();
        const sub = (auth.user && (auth.user.sub || auth.user.id)) || '';
        this.state = {
            auth,
            binding: getBinding(sub),
            community: communityUser(),
            error: ''
        };
        this.t = makeT(props.locale || (props.intl && props.intl.locale));
    }

    componentDidMount () {
        this.handleAuthChange = () => {
            const auth = getAuthState();
            const sub = (auth.user && (auth.user.sub || auth.user.id)) || '';
            this.setState({auth, binding: getBinding(sub), error: ''});
        };
        window.addEventListener(AUTH_CHANGED, this.handleAuthChange);
    }

    componentWillUnmount () {
        window.removeEventListener(AUTH_CHANGED, this.handleAuthChange);
    }

    handleLogin = async () => {
        this.setState({error: ''});
        try {
            await beginLogin();
        } catch (e) {
            this.setState({error: e.message});
        }
    };

    handleLogout = async () => {
        await logout().catch(() => {});
        notifyAuthChanged();
        this.setState({auth: getAuthState(), binding: null});
    };

    handleBind = () => {
        this.setState({error: ''});
        if (!communityLoggedIn()) {
            this.setState({error: this.t.needCommunityLogin});
            return;
        }
        if (!this.state.auth.loggedIn) {
            this.setState({error: this.t.needLogin});
            return;
        }
        const sub = (this.state.auth.user && (this.state.auth.user.sub || this.state.auth.user.id)) || '';
        const binding = bindCommunity(sub);
        this.setState({binding, community: communityUser()});
    };

    handleUnbind = () => {
        const sub = (this.state.auth.user && (this.state.auth.user.sub || this.state.auth.user.id)) || '';
        unbindCommunity(sub);
        this.setState({binding: null});
    };

    render () {
        const t = this.t;
        const {auth, binding, community, error} = this.state;
        const user = auth.user || {};
        return (
            <div style={S.root}>
                <div style={S.header}>
                    <div style={{fontSize: 15, fontWeight: 600}}>{t.title}</div>
                    <PointereIconButton
                        title={t.settings}
                        onClick={() => this.props.onOpenSettings && this.props.onOpenSettings('account')}
                    />
                </div>
                <div style={S.body}>
                    {error ? <div style={S.err}>{error}</div> : null}

                    {auth.loggedIn ? (
                        <div style={S.card}>
                            <div style={{fontSize: 16, fontWeight: 600, marginBottom: 8}}>{t.loggedInAs}</div>
                            <div style={{marginBottom: 4}}>{user.nickname || user.username || user.sub || 'PointerE'}</div>
                            {user.email ? <div style={S.hint}>{user.email}</div> : null}
                            <div style={{...S.row, marginTop: 12, marginBottom: 0}}>
                                <button style={S.btn(false)} onClick={this.handleLogout}>{t.logout}</button>
                            </div>
                        </div>
                    ) : (
                        <div style={S.card}>
                            <div style={{fontSize: 18, fontWeight: 600, marginBottom: 8}}>{t.login}</div>
                            <p style={S.hint}>{t.loginHint}</p>
                            <button style={S.btn(true)} onClick={this.handleLogin}>{t.login}</button>
                        </div>
                    )}

                    <div style={S.card}>
                        <div style={{fontSize: 16, fontWeight: 600, marginBottom: 8}}>{t.bindTitle}</div>
                        <p style={S.hint}>{t.bindHint}</p>
                        {binding ? (
                            <div>
                                <div style={S.ok}>
                                    {t.boundAs}：{binding.nickname || binding.username}
                                </div>
                                <div style={{...S.row, marginTop: 10, marginBottom: 0}}>
                                    <button style={S.btn(false)} onClick={this.handleUnbind}>{t.unbind}</button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div style={S.hint}>
                                    {community ? `${t.notBound}（本机社区账号：${community.username}）` : t.notBound}
                                </div>
                                <div style={{...S.row, marginTop: 10, marginBottom: 0}}>
                                    <button style={S.btn(true)} onClick={this.handleBind}>{t.bind}</button>
                                    <button style={S.btn(false)}
                                        onClick={() => this.setState({community: communityUser()})}>{t.refresh}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
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
