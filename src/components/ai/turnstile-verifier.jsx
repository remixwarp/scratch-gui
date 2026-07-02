import React from 'react';
import PropTypes from 'prop-types';
import {TURNSTILE_SITE_KEY} from '../../lib/constants/api-keys.js';

class TurnstileVerifier extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            verified: false,
            loading: false,
            error: null
        };
        this.widgetRef = React.createRef();
        this.handleVerify = this.handleVerify.bind(this);
    }

    componentDidMount () {
        if (!window.turnstile) {
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
            script.async = true;
            script.onload = () => this.renderWidget();
            script.onerror = () => {
                this.setState({error: '无法加载验证组件，请稍后重试'});
            };
            document.body.appendChild(script);
        } else {
            this.renderWidget();
        }
    }

    componentWillUnmount () {
        if (window.turnstile && this.widgetId) {
            window.turnstile.remove(this.widgetId);
        }
    }

    renderWidget () {
        if (!window.turnstile || !this.widgetRef.current) return;
        
        this.widgetId = window.turnstile.render(this.widgetRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            theme: 'light',
            size: 'normal',
            onSuccess: this.handleVerify,
            onError: () => {
                this.setState({error: '验证失败，请重试'});
            }
        });
    }

    handleVerify (token) {
        this.setState({verified: true, loading: false});
        if (this.props.onVerify) {
            this.props.onVerify(token);
        }
    }

    render () {
        const {title} = this.props;
        const {verified, error} = this.state;

        if (verified) {
            return (
                <div className="turnstile-verified">
                    <div className="turnstile-icon">✓</div>
                    <div className="turnstile-message">验证通过，正在打开...</div>
                </div>
            );
        }

        return (
            <div className="turnstile-container">
                <h2 className="turnstile-title">{title || '请完成人机验证'}</h2>
                <div className="turnstile-widget" ref={this.widgetRef} />
                {error && (
                    <div className="turnstile-error">{error}</div>
                )}
                <p className="turnstile-hint">点击验证按钮完成验证</p>
            </div>
        );
    }
}

TurnstileVerifier.propTypes = {
    title: PropTypes.string,
    onVerify: PropTypes.func
};

export default TurnstileVerifier;
