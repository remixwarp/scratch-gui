import React from 'react';
import PropTypes from 'prop-types';
import {VAPTCHA_VID, exchangeVaptchaForSession} from '../../lib/constants/api-keys.js';
import {unlockAchievement} from '../../lib/achievements.js';

const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    minHeight: '400px'
};

const titleStyle = {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '12px',
    color: 'var(--text-primary)'
};

const descStyle = {
    fontSize: '14px',
    color: 'var(--ui-text-primary-transparent)',
    marginBottom: '24px',
    textAlign: 'center'
};

const verifyingStyle = {
    marginTop: '16px',
    color: 'var(--looks-secondary)',
    fontSize: '14px'
};

const errorStyle = {
    marginTop: '16px',
    color: 'var(--error-primary)',
    fontSize: '14px'
};

class VaptchaVerifier extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            loading: true,
            error: null,
            verifying: false
        };
        this.vaptchaObj = null;
        this.consecutiveFailures = 0;
        this.initRetries = 0;
        this.maxInitRetries = 5;
        this.handleVerifyClick = this.handleVerifyClick.bind(this);
    }

    componentDidMount () {
        this.initVaptcha();
    }

    componentWillUnmount () {
        if (this.scriptTag && this.scriptTag.parentNode) {
            this.scriptTag.parentNode.removeChild(this.scriptTag);
        }
    }

    initVaptcha () {
        if (typeof window.vaptcha === 'function') {
            this.initializeVaptcha();
            return;
        }

        if (this.initRetries >= this.maxInitRetries) {
            this.setState({loading: false, error: '验证组件加载失败，请刷新页面重试'});
            return;
        }

        // If script already exists in DOM but window.vaptcha isn't ready yet,
        // poll for it. Otherwise inject the script.
        const existingScript = document.querySelector('script[src="https://cdn4.vaptcha.com/src/v4.js"]');
        if (existingScript) {
            this.pollForVaptcha();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdn4.vaptcha.com/src/v4.js';
        script.onload = () => this.pollForVaptcha();
        script.onerror = () => {
            this.initRetries++;
            if (this.initRetries < this.maxInitRetries) {
                setTimeout(() => this.initVaptcha(), 500);
            } else {
                this.setState({loading: false, error: '无法加载验证组件，请检查网络连接'});
            }
        };
        this.scriptTag = script;
        document.head.appendChild(script);
    }

    pollForVaptcha () {
        if (typeof window.vaptcha === 'function') {
            this.initializeVaptcha();
            return;
        }
        this.initRetries++;
        if (this.initRetries < this.maxInitRetries * 4) {
            setTimeout(() => this.pollForVaptcha(), 200);
        } else {
            this.setState({loading: false, error: '验证组件初始化超时，请刷新页面重试'});
        }
    }

    initializeVaptcha () {
        this.setState({loading: false, error: null});

        // Try up to 3 times with delay for SDK initialization
        this.tryInit(0);
    }

    tryInit (attempt) {
        if (attempt >= 3) {
            this.setState({loading: false, error: '验证组件初始化失败，请刷新页面重试'});
            return;
        }

        const container = document.getElementById('vaptcha-container');
        if (!container) {
            setTimeout(() => this.tryInit(attempt + 1), 100);
            return;
        }

        // Clear any previous DOM state so re-init won't conflict
        if (typeof container.replaceChildren === 'function') {
            container.replaceChildren();
        } else {
            container.innerHTML = '';
        }

        window.vaptcha({
            vid: VAPTCHA_VID,
            container: '#vaptcha-container'
        }).then((vaptchaObj) => {
            if (!vaptchaObj || typeof vaptchaObj.validate !== 'function') {
                console.warn('Vaptcha obj missing validate method, retrying...');
                setTimeout(() => this.tryInit(attempt + 1), 300);
                return;
            }
            this.vaptchaObj = vaptchaObj;
        }).catch((err) => {
            const msg = (err && (err.message || err.msg)) || '未知错误';
            console.error('Vaptcha init error:', err);
            // Terminal errors (wrong vid / domain mismatch / unit disabled) — do not retry
            if (/验证单元|不匹配|invalid|forbid|not match|unit/i.test(msg)) {
                this.setState({
                    loading: false,
                    error: '验证单元不可用：' + msg + '（请在 Vaptcha 控制台检查该 VID 的域名绑定）'
                });
                return;
            }
            setTimeout(() => this.tryInit(attempt + 1), 500);
        });
    }

    recordFailure () {
        this.consecutiveFailures += 1;
        if (this.consecutiveFailures >= 3) {
            unlockAchievement('captcha-human');
        }
    }

    async handleVerifyClick () {
        if (!this.vaptchaObj || typeof this.vaptchaObj.validate !== 'function') {
            this.setState({error: '验证组件未就绪，请刷新页面重试'});
            return;
        }
        if (this.state.verifying) return;

        this.setState({verifying: true, error: null});

        try {
            const result = await this.vaptchaObj.validate();
            if (!result || !result.token) {
                throw new Error('请先完成验证');
            }

            const token = result.token;
            const knock = result.knock || '';
            const dfu = result.dfu || '';

            await exchangeVaptchaForSession(token, knock, dfu);
            this.consecutiveFailures = 0;
            this.setState({verifying: false});
            this.props.onSuccess();
        } catch (err) {
            this.recordFailure();
            this.setState({verifying: false, error: '验证失败：' + (err.message || '请重试')});
            if (this.vaptchaObj && typeof this.vaptchaObj.reset === 'function') {
                this.vaptchaObj.reset();
            }
        }
    }

    render () {
        const title = this.props.title || '人机验证';
        const description = this.props.description || (
            <>请点击下方按钮完成验证以使用AI功能<br />验证有效期为30分钟</>
        );
        return (
            <div style={containerStyle}>
                <div style={titleStyle}>{title}</div>
                <div style={descStyle}>{description}</div>
                {this.state.loading && <div style={descStyle}>正在加载验证组件...</div>}
                <div
                    id="vaptcha-container"
                    style={{minHeight: '65px', width: '240px'}}
                />
                {!this.state.loading && (
                    <button
                        onClick={this.handleVerifyClick}
                        disabled={this.state.verifying}
                        style={{
                            marginTop: '16px',
                            padding: '10px 24px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            color: '#fff',
                            backgroundColor: this.state.verifying ? '#ccc' : '#4C97FF',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: this.state.verifying ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {this.state.verifying ? '正在验证...' : '点击验证'}
                    </button>
                )}
                {this.state.error && <div style={errorStyle}>{this.state.error}</div>}
            </div>
        );
    }
}

VaptchaVerifier.propTypes = {
    onSuccess: PropTypes.func.isRequired,
    title: PropTypes.string,
    description: PropTypes.node
};

export default VaptchaVerifier;
