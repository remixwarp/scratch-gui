/**
 * PointerE 方形齿轮图标按钮。
 *
 * 账号窗口与协作窗口共用同一枚按钮外观，点击后各自打开「独立」的设置窗口。
 * 图标为内联 SVG，避免依赖图标库；颜色全部走主题变量。
 */
import React from 'react';
import PropTypes from 'prop-types';

const S = {
    square: {
        width: 30,
        height: 30,
        padding: 0,
        flex: '0 0 auto',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        cursor: 'pointer',
        border: '1px solid var(--ui-black-transparent, rgba(0,0,0,.2))',
        background: 'transparent',
        color: 'inherit'
    }
};

export const GearIcon = ({size = 17}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

GearIcon.propTypes = {
    size: PropTypes.number
};

const PointereIconButton = ({onClick, title, disabled}) => (
    <button
        type="button"
        style={S.square}
        title={title}
        aria-label={title}
        onClick={onClick}
        disabled={disabled}
    >
        <GearIcon />
    </button>
);

PointereIconButton.propTypes = {
    onClick: PropTypes.func,
    title: PropTypes.string,
    disabled: PropTypes.bool
};

export default PointereIconButton;
