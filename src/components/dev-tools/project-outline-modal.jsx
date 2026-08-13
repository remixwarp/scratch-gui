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
            selectedId: null
        };
    }

    componentDidMount () {
        this.collectTargets();
    }

    componentDidUpdate (prevProps) {
        if (prevProps.vm !== this.props.vm) {
            this.collectTargets();
        }
    }

    handleRequestClose () {
        if (this.props.onRequestClose) {
            this.props.onRequestClose();
        }
    }

    handleSearchChange (e) {
        this.setState({query: e.target.value});
    }

    handleSelectTarget (event) {
        const id = event.currentTarget.dataset.id;
        const vm = this.props.vm;
        if (!vm) return;
        const target = vm.runtime.targets.find(t => t.id === id);
        if (target) {
            vm.setEditingTarget(id);
            this.setState({selectedId: id});
        }
    }

    collectTargets () {
        const vm = this.props.vm;
        if (!vm || !vm.runtime) return;
        const runtime = vm.runtime;
        const targets = (runtime.targets || []).map(target => {
            const blocksObj = target.blocks ? target.blocks._blocks : {};
            const blockCount = Object.keys(blocksObj).length;
            const variables = [];
            const lists = [];
            const vars = target.variables ? target.variables : {};
            Object.values(vars).forEach(v => {
                if (Array.isArray(v.value) && v.value.length >= 2 &&
                    typeof v.value[1] === 'string') {
                    lists.push(v.name);
                } else {
                    variables.push(v.name);
                }
            });
            return {
                id: target.id,
                name: target.isStage ?
                    this.props.intl.formatMessage(messages.stage) :
                    target.getName(),
                isStage: !!target.isStage,
                blocks: blockCount,
                variables,
                lists
            };
        });
        this.setState({targets});
    }

    render () {
        const {intl} = this.props;
        const {targets, query, selectedId} = this.state;
        const lower = query.toLowerCase();
        const filtered = targets.filter(t => {
            if (!lower) return true;
            if (t.name.toLowerCase().includes(lower)) return true;
            if (t.variables.some(v => v.toLowerCase().includes(lower))) return true;
            if (t.lists.some(v => v.toLowerCase().includes(lower))) return true;
            return false;
        });

        const totalBlocks = targets.reduce((sum, t) => sum + t.blocks, 0);
        const totalVars = targets.reduce((sum, t) => sum + t.variables.length, 0);
        const totalLists = targets.reduce((sum, t) => sum + t.lists.length, 0);
        const spriteCount = targets.filter(t => !t.isStage).length;

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
