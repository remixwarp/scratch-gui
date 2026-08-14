import {defineMessages, injectIntl, intlShape} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';

import Box from '../box/box.jsx';
import ModalComponent from '../modal/modal.jsx';

import styles from './dev-tools.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Project Outline',
        description: 'Title of the project outline modal',
        id: 'rw.devtools.outline.title'
    },
    search: {
        defaultMessage: 'Search targets, blocks or variables...',
        description: 'Search placeholder',
        id: 'rw.devtools.outline.search'
    },
    totalSprites: {
        defaultMessage: 'Sprites',
        description: 'Total sprites',
        id: 'rw.devtools.outline.totalSprites'
    },
    totalBlocks: {
        defaultMessage: 'Blocks',
        description: 'Total blocks',
        id: 'rw.devtools.outline.totalBlocks'
    },
    totalVariables: {
        defaultMessage: 'Variables',
        description: 'Total variables',
        id: 'rw.devtools.outline.totalVariables'
    },
    totalLists: {
        defaultMessage: 'Lists',
        description: 'Total lists',
        id: 'rw.devtools.outline.totalLists'
    },
    stage: {
        defaultMessage: 'Stage',
        description: 'Stage target name',
        id: 'rw.devtools.outline.stage'
    },
    blocks: {
        defaultMessage: '{count} blocks',
        description: 'Block count for a target',
        id: 'rw.devtools.outline.blocks'
    },
    noMatch: {
        defaultMessage: 'No matching items.',
        description: 'Empty search result',
        id: 'rw.devtools.outline.noMatch'
    },
    variables: {
        defaultMessage: 'Variables',
        description: 'Variables section heading',
        id: 'rw.devtools.outline.variablesHeading'
    },
    lists: {
        defaultMessage: 'Lists',
        description: 'Lists section heading',
        id: 'rw.devtools.outline.listsHeading'
    }
});

class ProjectOutlineModal extends React.Component {
    constructor (props) {
        super(props);
        this.handleRequestClose = this.handleRequestClose.bind(this);
        this.handleSearchChange = this.handleSearchChange.bind(this);
        this.handleSelectTarget = this.handleSelectTarget.bind(this);
        this.collectTargets = this.collectTargets.bind(this);
        this.state = {
            targets: [],
            query: '',
            selectedId: null,
            _mountError: false
        };
    }

    componentDidMount () {
        try {
            this.collectTargets();
        } catch (e) {
            console.error('[ProjectOutline] mount failed:', e);
            this.setState({_mountError: true});
        }
    }

    componentDidUpdate (prevProps) {
        try {
            if (prevProps.vm !== this.props.vm) {
                this.collectTargets();
            }
        } catch (e) {
            console.error('[ProjectOutline] update failed:', e);
        }
    }

    handleRequestClose () {
        if (this.props.onRequestClose) {
            this.props.onRequestClose();
        }
    }

    handleSearchChange (e) {
        try {
            this.setState({query: e.target.value});
        } catch (e) {
            console.error('[ProjectOutline] search change failed:', e);
        }
    }

    handleSelectTarget (event) {
        try {
            const id = event && event.currentTarget && event.currentTarget.dataset && event.currentTarget.dataset.id;
            const vm = this.props.vm;
            if (!id || !vm || !vm.runtime || !vm.runtime.targets) return;
            const targets = vm.runtime.targets;
            if (!Array.isArray(targets)) return;
            const target = targets.find(t => t && t.id === id);
            if (target && typeof vm.setEditingTarget === 'function') {
                vm.setEditingTarget(id);
                this.setState({selectedId: id});
            }
        } catch (e) {
            console.error('[ProjectOutline] select target failed:', e);
        }
    }

    collectTargets () {
        try {
            const vm = this.props.vm;
            if (!vm || !vm.runtime) return;
            const runtime = vm.runtime;
            const rawTargets = runtime.targets || [];
            if (!Array.isArray(rawTargets)) return;
            const targets = rawTargets.map(target => {
                if (!target) return null;
                const blocksObj = target.blocks ? target.blocks._blocks : {};
                const blockCount = blocksObj ? Object.keys(blocksObj).length : 0;
                const variables = [];
                const lists = [];
                const vars = target.variables ? target.variables : {};
                if (vars) {
                    Object.values(vars).forEach(v => {
                        if (!v) return;
                        if (Array.isArray(v.value) && v.value.length >= 2 &&
                            typeof v.value[1] === 'string') {
                            if (v.name) lists.push(v.name);
                        } else {
                            if (v.name) variables.push(v.name);
                        }
                    });
                }
                const displayName = target.isStage ?
                    this.props.intl.formatMessage(messages.stage) :
                    (typeof target.getName === 'function' ? target.getName() : (target.name || 'Sprite'));
                return {
                    id: target.id,
                    name: displayName,
                    isStage: !!target.isStage,
                    blocks: blockCount,
                    variables,
                    lists
                };
            }).filter(Boolean);
            this.setState({targets});
        } catch (e) {
            console.error('[ProjectOutline] collect targets failed:', e);
        }
    }

    render () {
        const {intl} = this.props;
        try {
            if (this.state._mountError) {
                return this._renderErrorFallback();
            }
            const {targets, query, selectedId} = this.state;
            const lower = (query || '').toLowerCase();
            const filtered = (targets || []).filter(t => {
                if (!lower) return true;
                const tName = t.name || '';
                if (tName.toLowerCase && tName.toLowerCase().includes(lower)) return true;
                if (t.variables && t.variables.some(v => v && v.toLowerCase && v.toLowerCase().includes(lower))) return true;
                if (t.lists && t.lists.some(v => v && v.toLowerCase && v.toLowerCase().includes(lower))) return true;
                return false;
            });

            const totalBlocks = (targets || []).reduce((sum, t) => sum + (t.blocks || 0), 0);
            const totalVars = (targets || []).reduce((sum, t) => sum + ((t.variables && t.variables.length) || 0), 0);
            const totalLists = (targets || []).reduce((sum, t) => sum + ((t.lists && t.lists.length) || 0), 0);
            const spriteCount = (targets || []).filter(t => t && !t.isStage).length;

            return (
            <ModalComponent
                className={styles.devToolsModal}
                contentLabel={intl.formatMessage(messages.title)}
                onRequestClose={this.handleRequestClose}
            >
                <Box className={styles.devToolsBody}>
                    <Box className={styles.devToolsStatsRow}>
                        <StatCard
                            label={intl.formatMessage(messages.totalSprites)}
                            value={spriteCount}
                        />
                        <StatCard
                            label={intl.formatMessage(messages.totalBlocks)}
                            value={totalBlocks}
                        />
                        <StatCard
                            label={intl.formatMessage(messages.totalVariables)}
                            value={totalVars}
                        />
                        <StatCard
                            label={intl.formatMessage(messages.totalLists)}
                            value={totalLists}
                        />
                    </Box>

                    <input
                        className={styles.devToolsSearch}
                        onChange={this.handleSearchChange}
                        placeholder={intl.formatMessage(messages.search)}
                        type="text"
                        value={query}
                    />

                    <Box className={styles.devToolsOutlineList}>
                        {filtered.length === 0 ? (
                            <p className={styles.devToolsPlaceholder}>
                                {intl.formatMessage(messages.noMatch)}
                            </p>
                        ) : (
                            filtered.map(target => (
                                <Box
                                    className={`${styles.devToolsOutlineItem} ${
                                        selectedId === target.id ? styles.devToolsOutlineSelected : ''}`}
                                    data-id={target.id}
                                    key={target.id}
                                    onClick={this.handleSelectTarget}
                                >
                                    <Box className={styles.devToolsOutlineItemHead}>
                                        <span className={styles.devToolsOutlineName}>
                                            {target.name}
                                        </span>
                                        <span className={styles.devToolsOutlineMeta}>
                                            {intl.formatMessage(messages.blocks, {count: target.blocks})}
                                        </span>
                                    </Box>
                                    {target.variables.length > 0 && (
                                        <Box className={styles.devToolsOutlineSub}>
                                            <span className={styles.devToolsOutlineSubTitle}>
                                                {intl.formatMessage(messages.variables)}
                                            </span>
                                            <span className={styles.devToolsOutlineTags}>
                                                {target.variables.map(v => (
                                                    <span
                                                        className={styles.devToolsTag}
                                                        key={v}
                                                    >
                                                        {v}
                                                    </span>
                                                ))}
                                            </span>
                                        </Box>
                                    )}
                                    {target.lists.length > 0 && (
                                        <Box className={styles.devToolsOutlineSub}>
                                            <span className={styles.devToolsOutlineSubTitle}>
                                                {intl.formatMessage(messages.lists)}
                                            </span>
                                            <span className={styles.devToolsOutlineTags}>
                                                {target.lists.map(v => (
                                                    <span
                                                        className={styles.devToolsTag}
                                                        key={v}
                                                    >
                                                        {v}
                                                    </span>
                                                ))}
                                            </span>
                                        </Box>
                                    )}
                                </Box>
                            ))
                        )}
                    </Box>
                </Box>
            </ModalComponent>
            );
        } catch (e) {
            console.error('[ProjectOutline] render failed:', e);
            return this._renderErrorFallback();
        }
    }

    _renderErrorFallback () {
        const {intl, onRequestClose} = this.props;
        const close = () => {
            try { onRequestClose && onRequestClose(); } catch (_e) { /* ignore */ }
        };
        return (
            <ModalComponent
                className={styles.devToolsModal}
                contentLabel={intl && intl.formatMessage ? intl.formatMessage(messages.title) : 'Project Outline'}
                onRequestClose={close}
            >
                <Box className={styles.devToolsBody}>
                    <p style={{color: '#f66', margin: '12px 0'}}>
                        项目大纲加载失败，请关闭后重试。
                    </p>
                    <button
                        onClick={close}
                        style={{padding: '8px 16px', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer'}}
                    >
                        关闭
                    </button>
                </Box>
            </ModalComponent>
        );
    }
}

const StatCard = ({label, value}) => (
    <Box className={styles.devToolsStatCard}>
        <span className={styles.devToolsStatLabel}>{label}</span>
        <span className={styles.devToolsStatValue}>{value}</span>
    </Box>
);

StatCard.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

ProjectOutlineModal.propTypes = {
    intl: intlShape,
    onRequestClose: PropTypes.func,
    vm: PropTypes.shape({
        runtime: PropTypes.shape({
            targets: PropTypes.array
        }),
        setEditingTarget: PropTypes.func
    })
};

export default injectIntl(ProjectOutlineModal);
