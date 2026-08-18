import React from 'react';
import PropTypes from 'prop-types';
import CommandItem from './command-item.jsx';
import styles from './command-palette.css';

class CommandPalette extends React.Component {
    constructor (props) {
        super(props);
        this.handleQueryChange = this.handleQueryChange.bind(this);
    }
    handleQueryChange (e) {
        this.props.onQueryChange(e.target.value);
    }
    render () {
        const {
            visible,
            query,
            rows,
            selectedIndex,
            inputRef,
            onInputKeyDown,
            onRun,
            onSelectIndex,
            onClose
        } = this.props;
        if (!visible) {
            return null;
        }
        return (
            <React.Fragment>
                <div
                    className={styles.overlay}
                    onMouseDown={onClose}
                />
                <div className={styles.palette}>
                    <div className={styles.inputRow}>
                        <span className={styles.prompt}>{'>'}</span>
                        <input
                            ref={inputRef}
                            className={styles.input}
                            placeholder="输入命令名 / 拼音 / 中文关键词…"
                            value={query}
                            onChange={this.handleQueryChange}
                            onKeyDown={onInputKeyDown}
                            autoFocus
                            spellCheck={false}
                        />
                    </div>
                    {rows.length === 0 ? (
                        <div className={styles.empty}>
                            {'没有找到匹配的命令，试试 “help / 帮助 / 设置 / 运行”'}
                        </div>
                    ) : (
                        <div className={styles.list}>
                            {rows.map((row, i) => {
                                if (row.type === 'header') {
                                    return (
                                        <div
                                            key={`header-${i}`}
                                            className={styles.groupHeader}
                                        >
                                            {row.label}
                                        </div>
                                    );
                                }
                                return (
                                    <CommandItem
                                        key={row.command.id}
                                        command={row.command}
                                        index={row.index}
                                        selected={row.index === selectedIndex}
                                        onRun={onRun}
                                        onSelectIndex={onSelectIndex}
                                    />
                                );
                            })}
                        </div>
                    )}
                    <div className={styles.footer}>
                        <span>{'↑↓ 选择'}</span>
                        <span>{'Enter 执行'}</span>
                        <span>{'Esc 关闭'}</span>
                        <span className={styles.footerHint}>{'命令支持中英文搜索'}</span>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

CommandPalette.propTypes = {
    visible: PropTypes.bool.isRequired,
    query: PropTypes.string.isRequired,
    rows: PropTypes.arrayOf(PropTypes.object).isRequired,
    selectedIndex: PropTypes.number.isRequired,
    inputRef: PropTypes.object,
    onQueryChange: PropTypes.func.isRequired,
    onInputKeyDown: PropTypes.func.isRequired,
    onRun: PropTypes.func.isRequired,
    onSelectIndex: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired
};

export default CommandPalette;
