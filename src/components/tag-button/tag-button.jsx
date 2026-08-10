import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { useState, useEffect, useRef } from 'react';
import {FormattedMessage} from 'react-intl';

import Button from '../button/button.jsx';

import styles from './tag-button.css';

// 状态圆点 SVG
const StatusDot = ({ color }) => (
    <svg
        className={styles.statusDotSvg}
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
    >
        <path
            d="M512 320a192.064 192.064 0 0 1 0 384 192 192 0 0 1 0-384z"
            fill={color}
        />
    </svg>
);

// 闪烁圆点组件 - 用 JS 定时器驱动，避免 CSS Modules 对 @keyframes 的兼容问题
const BlinkingDot = ({ color }) => {
    const [visible, setVisible] = useState(true);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        const interval = setInterval(() => {
            if (mountedRef.current) {
                setVisible(v => !v);
            }
        }, 500);
        return () => {
            mountedRef.current = false;
            clearInterval(interval);
        };
    }, []);

    return (
        <span
            style={{
                opacity: visible ? 1 : 0.15,
                transition: 'opacity 0.45s ease-in-out',
                display: 'inline-flex'
            }}
        >
            <StatusDot color={color} />
        </span>
    );
};

// 刷新图标 SVG
const RefreshIcon = () => (
    <svg
        className={styles.refreshIcon}
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
    >
        <path
            d="M712.9 295.1c-120.7-110.7-308.3-102.6-419 18.1-87.4 95.3-103 236.3-38.5 348.4 82 141.7 263.2 190.3 405 108.4 66.8-38.6 116-101.7 137-176 8.9-31.5 41.7-49.8 73.2-40.9 31.5 8.9 49.8 41.7 40.9 73.2C849.1 846.8 619.8 975 399.2 912.6 178.7 850.2 50.5 620.9 112.9 400.3S404.6 51.6 625.2 114c64.2 18.2 123.1 51.5 171.6 97.3l79.7-79.7c11.6-11.6 30.3-11.6 41.9-0.1 5.6 5.6 8.7 13.1 8.7 21V407c0 16.4-13.3 29.6-29.6 29.6H642.9c-16.4 0-29.6-13.3-29.6-29.7 0-7.8 3.1-15.3 8.6-20.9l91-90.9z"
        />
    </svg>
);

const STATUS_COLORS = {
    online: '#4CAF50',
    local: '#FFC107',
    loading: '#FFC107',
    error: '#F44336'
};

const TagButtonComponent = ({
    active,
    iconClassName,
    className,
    tag, // eslint-disable-line no-unused-vars
    intlLabel,
    loadStatus,
    onRetry,
    ...props
}) => {
    const handleRefreshClick = (e) => {
        e.stopPropagation();
        if (onRetry && tag) {
            onRetry(tag);
        }
    };

    return (
        <Button
            className={classNames(
                styles.tagButton,
                className, {
                    [styles.active]: active
                }
            )}
            iconClassName={classNames(
                styles.tagButtonIcon,
                iconClassName
            )}
            {...props}
        >
            {loadStatus === 'error' && onRetry && (
                <span
                    className={styles.refreshButton}
                    onClick={handleRefreshClick}
                    title="重新加载"
                >
                    <RefreshIcon />
                </span>
            )}
            <span className={styles.tagButtonContent}>
                {typeof intlLabel === 'string' ? intlLabel : (
                    <FormattedMessage {...intlLabel} />
                )}
            </span>
            {loadStatus && (
                <span className={styles.statusDot}>
                    {loadStatus === 'loading' ? (
                        <BlinkingDot color={STATUS_COLORS[loadStatus]} />
                    ) : (
                        <StatusDot color={STATUS_COLORS[loadStatus] || '#888'} />
                    )}
                </span>
            )}
        </Button>
    );
};

TagButtonComponent.propTypes = {
    ...Button.propTypes,
    active: PropTypes.bool,
    intlLabel: PropTypes.oneOfType([
        PropTypes.shape({
            defaultMessage: PropTypes.string,
            description: PropTypes.string,
            id: PropTypes.string
        }),
        PropTypes.string
    ]).isRequired,
    tag: PropTypes.string.isRequired,
    loadStatus: PropTypes.oneOf(['online', 'local', 'loading', 'error']),
    onRetry: PropTypes.func
};

TagButtonComponent.defaultProps = {
    active: false
};

export default TagButtonComponent;
