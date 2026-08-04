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
        this.containerRef = React.createRef();
        this.consecutiveFailures = 0;
        this.handleVaptchaCallback = this.handleVaptchaCallback.bind(this);
        this.recordFailure = this.recordFailure.bind(this);
        this.handleVerifyClick = this.handleVerifyClick.bind(this);
    }

    componentDidMount () {
        this.loadVaptchaScript();
    }

    componentWillUnmount () {
        if (this.scriptTag && this.scriptTag.parentNode) {
            this.scriptTag.parentNode.removeChild(this.scriptTag);
        }
    }

    loadVaptchaScript () {
        if (window.vaptcha) {
            this.initializeVaptcha();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn4.vaptcha.com/src/v4.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            this.initializeVaptcha();
        };
        script.onerror = () => {
            this.setState({loading: false, error: '无法加载验证组件，请检查网络连接'});
        };
        this.scriptTag = script;
        document.head.appendChild(script);
    }

    initializeVaptcha () {
        if (!window.vaptcha || !this.containerRef.current) {
            this.setState({loading: false, error: '验证组件加载失败'});
            return;
        }
        this.setState({loading: false, error: null});

        window.vaptcha({
            vid: VAPTCHA_VID,
            container: '#vaptcha-container',
            lang: 'zh-CN'
        }).then((vaptchaObj) => {
            this.vaptchaObj = vaptchaObj;
        }).catch((err) => {
            console.error('Vaptcha init error:', err);
            this.setState({loading: false, error: '验证组件初始化失败'});
        });
    }

    recordFailure () {
        this.consecutiveFailures += 1;
        if (this.consecutiveFailures >= 3) {
            unlockAchievement('captcha-human');
        }
    }

    async handleVerifyClick () {
        if (!this.vaptchaObj) {
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
            if (this.vaptchaObj) {
                this.vaptchaObj.reset();
            }
        }
    }

    handleVaptchaCallback () {
        // This is called when the user clicks the validate button
        this.handleVerifyClick();
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
                    ref={this.containerRef}
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
