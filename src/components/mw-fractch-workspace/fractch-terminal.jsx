import PropTypes from 'prop-types';
import React from 'react';
import '@fontsource/jetbrains-mono/latin-400.css';
import '!!style-loader!css-loader!./code-font.css';

const TERMINAL_FONT_FAMILY = '"JetBrains Mono"';
const CODE_FONT = `${TERMINAL_FONT_FAMILY}, ui-monospace, Menlo, Consolas, monospace`;

const terminalTheme = () => ({
    background: '#ffffff',
    cursor: '#575e75',
    cursorAccent: '#ffffff',
    foreground: '#575e75',
    selectionBackground: '#00000026'
});

// Terminal 功能已移除（依赖 @xterm/xterm 未安装）
const FractchTerminal = () => null;

FractchTerminal.propTypes = {
    className: PropTypes.string,
    onWorktreeChanged: PropTypes.func,
    style: PropTypes.object,
    themeId: PropTypes.number,
    vm: PropTypes.shape({
        runtime: PropTypes.object
    })
};

export {CODE_FONT, TERMINAL_FONT_FAMILY, terminalTheme};
export default FractchTerminal;
