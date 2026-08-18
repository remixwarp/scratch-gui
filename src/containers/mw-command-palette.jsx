import React from 'react';
import PropTypes from 'prop-types';
import bindAll from 'lodash.bindall';
import {connect} from 'react-redux';
import VM from 'scratch-vm';
import CommandPalette from '../components/mw-command-palette/command-palette.jsx';
import {
    getCommands,
    CATEGORY_ORDER,
    CATEGORY_LABELS
} from '../lib/mw-commands.js';

class MWCommandPalette extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleToggle',
            'handleGlobalKeyDown',
            'handleQueryChange',
            'handleInputKeyDown',
            'handleRun',
            'handleSelectIndex',
            'handleClose',
            'buildHandlers'
        ]);
        this.inputRef = React.createRef();
        this.state = {
            visible: false,
            query: '',
            selectedIndex: 0
        };
        this.handlers = this.buildHandlers();
    }
    componentDidMount () {
        document.addEventListener('keydown', this.handleGlobalKeyDown);
        window.addEventListener('rw-command-palette-toggle', this.handleToggle);
    }
    componentWillUnmount () {
        document.removeEventListener('keydown', this.handleGlobalKeyDown);
        window.removeEventListener('rw-command-palette-toggle', this.handleToggle);
    }
    handleToggle () {
        this.setState(prevState => ({
            visible: !prevState.visible,
            query: '',
            selectedIndex: 0
        }));
    }
    buildHandlers () {
        return {
            dispatch: this.props.dispatch,
            vm: this.props.vm,
            setVisible: visible => this.setState({visible, query: '', selectedIndex: 0})
        };
    }
    handleGlobalKeyDown (e) {
        // Esc 关闭命令面板（打开/切换由快捷键管理器处理）
        if (e.key === 'Escape' && this.state.visible) {
            e.preventDefault();
            this.setState({visible: false, query: '', selectedIndex: 0});
        }
    }
    handleQueryChange (query) {
        this.setState({query, selectedIndex: 0});
    }
    handleSelectIndex (index) {
        this.setState({selectedIndex: index});
    }
    handleInputKeyDown (e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = Math.min(this.getFlatCommands().length - 1, this.state.selectedIndex + 1);
            this.setState({selectedIndex: next});
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const next = Math.max(0, this.state.selectedIndex - 1);
            this.setState({selectedIndex: next});
        } else if (e.key === 'Enter') {
            e.preventDefault();
            this.handleRun(this.state.selectedIndex);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            this.setState({visible: false, query: '', selectedIndex: 0});
        }
    }
    getFilteredCommands () {
        const query = this.state.query.trim().toLowerCase();
        const all = getCommands(this.handlers);
        if (!query) {
            return all.map(cmd => ({
                ...cmd,
                checked: typeof cmd.state === 'function' ? !!cmd.state(this.handlers) : false
            }));
        }
        return all
            .filter(cmd => {
                const haystack = [
                    cmd.id,
                    cmd.label,
                    cmd.labelZh,
                    cmd.descZh,
                    cmd.keywords,
                    CATEGORY_LABELS[cmd.category]
                ].join(' ').toLowerCase();
                return haystack.includes(query);
            })
            .map(cmd => ({
                ...cmd,
                checked: typeof cmd.state === 'function' ? !!cmd.state(this.handlers) : false
            }));
    }
    getFlatCommands () {
        return this.getFilteredCommands();
    }
    getRows () {
        const commands = this.getFilteredCommands();
        const rows = [];
        let index = 0;
        CATEGORY_ORDER.forEach(category => {
            const group = commands.filter(c => c.category === category);
            if (group.length === 0) {
                return;
            }
            rows.push({type: 'header', label: CATEGORY_LABELS[category]});
            group.forEach(cmd => {
                rows.push({type: 'command', index, command: cmd});
                index += 1;
            });
        });
        return rows;
    }
    handleRun (index) {
        const commands = this.getFilteredCommands();
        const command = commands[index];
        if (!command) {
            return;
        }
        this.setState({visible: false, query: '', selectedIndex: 0});
        if (typeof command.run === 'function') {
            command.run(this.handlers);
        }
    }
    handleClose () {
        this.setState({visible: false, query: '', selectedIndex: 0});
    }
    render () {
        return (
            <CommandPalette
                visible={this.state.visible}
                query={this.state.query}
                rows={this.getRows()}
                selectedIndex={this.state.selectedIndex}
                inputRef={this.inputRef}
                onQueryChange={this.handleQueryChange}
                onInputKeyDown={this.handleInputKeyDown}
                onRun={this.handleRun}
                onSelectIndex={this.handleSelectIndex}
                onClose={this.handleClose}
            />
        );
    }
}

MWCommandPalette.propTypes = {
    dispatch: PropTypes.func,
    vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = state => ({
    vm: state.scratchGui.vm
});

const mapDispatchToProps = dispatch => ({
    dispatch
});

export default connect(mapStateToProps, mapDispatchToProps)(MWCommandPalette);
