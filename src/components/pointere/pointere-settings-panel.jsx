import React, {Component} from 'react';
import PropTypes from 'prop-types';

import {
    getConfig,
    saveConfig,
    resetConfig
} from '../../lib/pointere/config.js';

/**
 * PointerE 设置面板。section='account' 为账号（登录）设置，
 * section='collab' 为协作设置。两者字段与标题各自独立。
 */
const L = {
    'zh-cn': {
        accountTitle: 'PointerE 账号设置',
        collabTitle: 'PointerE 协作设置',
        http: 'API 接口地址',
        ws: '协作 WebSocket 地址',
        client: 'OAuth client_id',
        redirect: '回调地址（留空 = 当前页面）',
        scope: '授权范围',
        room: '默认房间码',
        skew: '令牌提前刷新（毫秒）',
        save: '保存',
        reset: '恢复默认',
        saved: '已保存',
        accountHint: '登录相关设置：修改后请重新登录以生效。',
        collabHint: '协作相关设置：修改后请重新加入房间以生效。'
    },
    en: {
        accountTitle: 'PointerE Account Settings',
        collabTitle: 'PointerE Collaboration Settings',
        http: 'API base URL',
        ws: 'Collaboration WebSocket URL',
        client: 'OAuth client_id',
        redirect: 'Redirect URI (blank = current page)',
        scope: 'Scope',
        room: 'Default room code',
        skew: 'Token refresh skew (ms)',
        save: 'Save',
        reset: 'Reset',
        saved: 'Saved',
        accountHint: 'Sign-in settings: sign in again for changes to take effect.',
        collabHint: 'Collaboration settings: rejoin the room for changes to take effect.'
    }
};

const input = {
    width: '100%', boxSizing: 'border-box', padding: '9px 10px', borderRadius: 6,
    border: '1px solid var(--ui-black-transparent, rgba(0,0,0,.2))',
    background: 'var(--ui-modal-background, #fff)', color: 'inherit', fontFamily: 'inherit',
    fontSize: 13
};
const label = {display: 'block', fontSize: 12, opacity: .75, marginBottom: 4};
const btn = primary => ({padding: '8px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 13,
    border: primary ? 'none' : '1px solid var(--ui-black-transparent, rgba(0,0,0,.2))',
    background: primary ? 'var(--looks-secondary, #4c97ff)' : 'transparent',
    color: primary ? '#fff' : 'inherit'});

class PointereSettingsPanel extends Component {
    constructor (props) {
        super(props);
        const config = getConfig();
        this.state = {
            config: Object.assign({}, config),
            message: ''
        };
        this.locale = props.locale || (props.intl && props.intl.locale) || 'zh-cn';
        this.section = props.section === 'collab' ? 'collab' : 'account';
    }

    field (key, text, extra = {}) {
        return (
            <div style={{marginBottom: 12}}>
                <label style={label}>{text}</label>
                <input
                    style={input}
                    value={this.state.config[key]}
                    onChange={e => this.setState(prev => ({
                        config: Object.assign({}, prev.config, {[key]: e.target.value}),
                        message: ''
                    }))}
                    {...extra}
                />
            </div>
        );
    }

    handleSave = () => {
        saveConfig(this.state.config);
        this.setState({message: this.t.saved});
        if (this.props.onSaved) this.props.onSaved(getConfig());
    };

    handleReset = () => {
        this.setState({config: Object.assign({}, resetConfig()), message: this.t.saved});
    };

    renderAccountFields (t) {
        return (
            <div>
                {this.field('httpBase', t.http)}
                {this.field('clientId', t.client)}
                {this.field('redirectUri', t.redirect)}
                {this.field('scope', t.scope)}
                <div style={{marginBottom: 12}}>
                    <label style={label}>{t.skew}</label>
                    <input
                        style={input}
                        type="number"
                        min="0"
                        step="1000"
                        value={this.state.config.refreshSkewMs}
                        onChange={e => this.setState(prev => ({
                            config: Object.assign({}, prev.config, {refreshSkewMs: Number(e.target.value) || 0}),
                            message: ''
                        }))}
                    />
                </div>
            </div>
        );
    }

    renderCollabFields (t) {
        return (
            <div>
                {this.field('wsUrl', t.ws)}
                {this.field('defaultRoom', t.room, {maxLength: 12})}
            </div>
        );
    }

    render () {
        const t = (L[this.locale] || L['zh-cn']);
        this.t = t;
        const isCollab = this.section === 'collab';
        return (
            <div style={{
                height: '100%', overflowY: 'auto', padding: '20px 24px',
                background: 'var(--ui-modal-background, #fff)',
                color: 'var(--ui-modal-foreground, var(--text-primary, #1f2937))',
                fontFamily: '"Helvetica Neue", Helvetica, Arial, "Microsoft YaHei", sans-serif'
            }}>
                <div style={{fontSize: 18, fontWeight: 600, marginBottom: 6}}>
                    {isCollab ? t.collabTitle : t.accountTitle}
                </div>
                <div style={{fontSize: 12, opacity: .7, marginBottom: 18}}>
                    {isCollab ? t.collabHint : t.accountHint}
                </div>

                {isCollab ? this.renderCollabFields(t) : this.renderAccountFields(t)}

                <div style={{display: 'flex', gap: 10, marginTop: 20, alignItems: 'center'}}>
                    <button style={btn(true)} onClick={this.handleSave}>{t.save}</button>
                    <button style={btn(false)} onClick={this.handleReset}>{t.reset}</button>
                    {this.state.message ? <span style={{fontSize: 12, color: '#2f9e44'}}>{this.state.message}</span> : null}
                </div>
            </div>
        );
    }
}

PointereSettingsPanel.propTypes = {
    section: PropTypes.string,
    locale: PropTypes.string,
    intl: PropTypes.object,
    onSaved: PropTypes.func
};

export default PointereSettingsPanel;
