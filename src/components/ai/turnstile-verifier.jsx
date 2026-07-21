import React from 'react';
import PropTypes from 'prop-types';
import {TURNSTILE_SITE_KEY, exchangeTurnstileForSession} from '../../lib/constants/api-keys.js';
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

class TurnstileVerifier extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            loading: true,
            error: null,
            verifying: false
        };
        this.widgetId = null;
        this.containerRef = React.createRef();
        this.consecutiveFailures = 0;
        this.handleTurnstileCallback = this.handleTurnstileCallback.bind(this);
        this.recordFailure = this.recordFailure.bind(this);
    }

    componentDidMount () {
        this.loadTurnstileScript();
    }

    componentWillUnmount () {
        if (this.scriptTag && this.scriptTag.parentNode) {
            this.scriptTag.parentNode.removeChild(this.scriptTag);
        }
    }

    loadTurnstileScript () {
        if (window.turnstile) {
            this.renderWidget();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            this.renderWidget();
        };
        script.onerror = () => {
            this.setState({loading: false, error: '无法加载验证组件，请检查网络连接'});
        };
        this.scriptTag = script;
        document.head.appendChild(script);
    }

    renderWidget () {
        if (!window.turnstile || !this.containerRef.current) {
            this.setState({loading: false, error: '验证组件加载失败'});
            return;
        }
        this.setState({loading: false, error: null});
        this.widgetId = window.turnstile.render(this.containerRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            callback: this.handleTurnstileCallback,
            'error-callback': () => {
                this.recordFailure();
                this.setState({error: '验证失败，请重试'});
            },
            'expired-callback': () => {
                this.setState({error: '验证已过期，请重新验证'});
                if (this.widgetId !== null && window.turnstile) {
                    window.turnstile.reset(this.widgetId);
                }
            }
        });
    }

    recordFailure () {
        this.consecutiveFailures += 1;
        if (this.consecutiveFailures >= 3) {
            unlockAchievement('captcha-human');
        }
    }

    async handleTurnstileCallback (token) {
        if (this.state.verifying) return;
        this.setState({verifying: true, error: null});
        try {
            await exchangeTurnstileForSession(token);
            this.consecutiveFailures = 0;
            this.setState({verifying: false});
            this.props.onSuccess();
        } catch (err) {
            this.recordFailure();
            this.setState({verifying: false, error: '验证失败：' + err.message});
            if (this.widgetId !== null && window.turnstile) {
                window.turnstile.reset(this.widgetId);
            }
        }
    }

    render () {
        const title = this.props.title || '人机验证';
        const description = this.props.description || (
            <>请完成下方验证以使用AI功能<br />验证有效期为30分钟</>
        );
        return (
            <div style={containerStyle}>
                <div style={titleStyle}>{title}</div>
                <div style={descStyle}>{description}</div>
                {this.state.loading && <div style={descStyle}>正在加载验证组件...</div>}
                <div ref={this.containerRef} style={{minHeight: '65px'}} />
                {this.state.verifying && <div style={verifyingStyle}>正在验证...</div>}
                {this.state.error && <div style={errorStyle}>{this.state.error}</div>}
            </div>
        );
    }
}

TurnstileVerifier.propTypes = {
    onSuccess: PropTypes.func.isRequired,
    title: PropTypes.string,
    description: PropTypes.node
};

export default TurnstileVerifier;
