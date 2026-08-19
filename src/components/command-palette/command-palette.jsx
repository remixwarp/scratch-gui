import React from 'react';
import PropTypes from 'prop-types';
import {Search, Check} from 'lucide-react';
import {getCommands, CATEGORY_LABELS, CATEGORY_ORDER} from '../../lib/mw-commands.js';
import styles from './command-palette.css';

const NO_MATCHES_TEXT = '无匹配命令';
const PLACEHOLDER_TEXT = '输入命令名或关键词…';

const getCtx = props => ({
    vm: props.vm,
    dispatch: props.dispatch
});

class CommandPalette extends React.Component {
    constructor (props) {
        super(props);
        this.vm = props.vm;
        this.dispatch = props.dispatch;
        this.state = {
            query: '',
            selectedIndex: 0
        };
        this.inputRef = React.createRef();
        this.handleInput = this.handleInput.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleSelect = this.handleSelect.bind(this);
        this.handleBackdropClick = this.handleBackdropClick.bind(this);
        this.handleItemEnter = this.handleItemEnter.bind(this);
        this.handleItemClick = this.handleItemClick.bind(this);
    }
    componentDidMount () {
        if (this.inputRef.current) {
            this.inputRef.current.focus();
        }
    }
    getFilteredCommands () {
        const q = this.state.query.trim().toLowerCase();
        const commands = getCommands();
        if (!q) {
            return commands;
        }
        return commands.filter(cmd => {
            const haystack = [
                cmd.label,
                cmd.labelZh,
                cmd.descZh,
                cmd.keywords || ''
            ].join(' ').toLowerCase();
            return haystack.includes(q);
        });
    }
    getGroupedCommands () {
        const filtered = this.getFilteredCommands();
        return CATEGORY_ORDER
            .map(category => ({
                category,
                label: CATEGORY_LABELS[category] || category,
                commands: filtered.filter(cmd => cmd.category === category)
            }))
            .filter(group => group.commands.length > 0);
    }
    getFlatList () {
        return this.getGroupedCommands().reduce((acc, group) => acc.concat(group.commands), []);
    }
    handleInput (event) {
        this.setState({query: event.target.value, selectedIndex: 0});
    }
    handleKeyDown (event) {
        const flat = this.getFlatList();
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.setState(prev => ({
                selectedIndex: Math.min(prev.selectedIndex + 1, flat.length - 1)
            }));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.setState(prev => ({
                selectedIndex: Math.max(prev.selectedIndex - 1, 0)
            }));
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const command = flat[this.state.selectedIndex];
            if (command) {
                this.handleSelect(command);
            }
        } else if (event.key === 'Escape') {
            event.preventDefault();
            this.props.onClose();
        }
    }
    handleSelect (command) {
        const ctx = getCtx(this.props);
        if (command.run) {
            command.run(ctx);
        }
        this.props.onClose();
    }
    handleItemEnter (event) {
        const currentIndex = Number(event.currentTarget.dataset.index);
        if (!Number.isNaN(currentIndex)) {
            this.setState({selectedIndex: currentIndex});
        }
    }
    handleItemClick (event) {
        const currentIndex = Number(event.currentTarget.dataset.index);
        const flat = this.getFlatList();
        const command = flat[currentIndex];
        if (command) {
            this.handleSelect(command);
        }
    }
    handleBackdropClick () {
        this.props.onClose();
    }
    render () {
        const groups = this.getGroupedCommands();
        let index = 0;
        return (
            <React.Fragment>
                <div
                    className={styles.commandPaletteBackdrop}
                    onPointerDown={this.handleBackdropClick}
                />
                <div className={styles.commandPalette}>
                    <div className={styles.commandPaletteInput}>
                        <Search
                            size={16}
                            className={styles.searchIcon}
                        />
                        <input
                            ref={this.inputRef}
                            type="text"
                            value={this.state.query}
                            placeholder={this.props.placeholder || PLACEHOLDER_TEXT}
                            onChange={this.handleInput}
                            onKeyDown={this.handleKeyDown}
                        />
                    </div>
                    <div className={styles.commandPaletteList}>
                        {groups.length === 0 ? (
                            <div className={styles.commandPaletteEmpty}>{NO_MATCHES_TEXT}</div>
                        ) : groups.map(group => (
                            <React.Fragment key={group.category}>
                                <div className={styles.commandPaletteGroupLabel}>{group.label}</div>
                                {group.commands.map(command => {
                                    const currentIndex = index;
                                    index += 1;
                                    const selected = currentIndex === this.state.selectedIndex;
                                    const Icon = command.icon;
                                    const ctx = getCtx(this.props);
                                    const state = Boolean(command.state && command.state(ctx));
                                    return (
                                        <button
                                            key={command.id}
                                            type="button"
                                            data-index={currentIndex}
                                            className={selected ?
                                                styles.commandPaletteItemSelected :
                                                styles.commandPaletteItem}
                                            onPointerEnter={this.handleItemEnter}
                                            onClick={this.handleItemClick}
                                        >
                                            <span className={styles.itemIcon}>
                                                {Icon ? <Icon size={16} /> : null}
                                            </span>
                                            <span className={styles.itemMain}>
                                                <div className={styles.itemLabel}>
                                                    {command.labelZh || command.label}
                                                </div>
                                                <div className={styles.itemDesc}>{command.descZh}</div>
                                            </span>
                                            {state ? (
                                                <span className={styles.itemCheck}>
                                                    <Check size={14} />
                                                </span>
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </React.Fragment>
        );
    }
}

CommandPalette.propTypes = {
    vm: PropTypes.object,
    dispatch: PropTypes.func,
    placeholder: PropTypes.string,
    onClose: PropTypes.func.isRequired
};

export default CommandPalette;
