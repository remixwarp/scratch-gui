import React, { useState } from 'react';
import { FormattedMessage, defineMessages, injectIntl, intlShape } from 'react-intl';
import PropTypes from 'prop-types';
import './security-banner.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Security Warning',
        description: 'Title for security warning banner',
        id: 'tw.securityBanner.title'
    },
    line1: {
        defaultMessage: 'TurboWarp discovered a critical vulnerability in all versions of Scratch. In the desktop app, opening a malicious project could install ransomware on your computer.',
        description: 'First line of security warning',
        id: 'tw.securityBanner.line1'
    },
    line2: {
        defaultMessage: 'TurboWarp reported this to Scratch two years ago, but no fix has been released yet. The latest TurboWarp is not affected. More details on TurboWarp blog.',
        description: 'Second line of security warning with link',
        id: 'tw.securityBanner.line2'
    },
    close: {
        defaultMessage: 'Close',
        description: 'Close button for security banner',
        id: 'tw.securityBanner.close'
    }
});

function SecurityBanner({ intl }) {
    const [isVisible, setIsVisible] = useState(false); // 注释掉安全警告横幅

    const handleClose = () => {
        setIsVisible(false);
        localStorage.setItem('tw-security-banner-dismissed', 'true');
        document.body.style.paddingTop = '0';
    };

    if (!isVisible) {
        document.body.style.paddingTop = '0';
        return null;
    }

    document.body.style.paddingTop = '60px';

    return (
        <div 
            style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                padding: '12px 20px',
                position: 'fixed',
                top: '0',
                left: '0',
                right: '0',
                zIndex: '9999',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                fontSize: '14px'
            }}
        >
            <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                maxWidth: '1200px',
                margin: '0 auto',
                gap: '12px'
            }}>
                <div style={{
                    fontSize: '24px',
                    flexShrink: '0',
                    marginTop: '2px'
                }}>⚠️</div>
                <div style={{
                    flex: '1'
                }}>
                    <p style={{
                        margin: '4px 0',
                        lineHeight: '1.5',
                        color: '#ffffff'
                    }}>
                        <FormattedMessage {...messages.line1} />
                    </p>
                    <p style={{
                        margin: '4px 0',
                        lineHeight: '1.5',
                        color: '#ffffff'
                    }}>
                        <FormattedMessage 
                            {...messages.line2}
                            values={{
                                link: (
                                    <a
                                        href="https://muffin.ink/blog/scratch-vulnerability-disclosure/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            color: '#fcd34d',
                                            textDecoration: 'underline'
                                        }}
                                    >
                                        {'TurboWarp blog'}
                                    </a>
                                )
                            }}
                        />
                    </p>
                </div>
                <button
                    onClick={handleClose}
                    aria-label={intl.formatMessage(messages.close)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '24px',
                        cursor: 'pointer',
                        padding: '0',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        transition: 'background-color 0.2s',
                        flexShrink: '0'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                    ×
                </button>
            </div>
        </div>
    );
}

SecurityBanner.propTypes = {
    intl: intlShape.isRequired
};

export default injectIntl(SecurityBanner);