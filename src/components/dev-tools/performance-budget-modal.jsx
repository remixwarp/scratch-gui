import {defineMessages, injectIntl, intlShape} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';

import Box from '../box/box.jsx';
import ModalComponent from '../modal/modal.jsx';
import {formatBytes} from '../../lib/utils/bytes.js';

import styles from './dev-tools.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Performance Budget',
        description: 'Title of the performance budget modal',
        id: 'rw.devtools.budget.title'
    },
    preset: {
        defaultMessage: 'Preset',
        description: 'Preset selector label',
        id: 'rw.devtools.budget.preset'
    },
    threshold: {
        defaultMessage: 'Threshold',
        description: 'Threshold column heading',
        id: 'rw.devtools.budget.threshold'
    },
    usage: {
        defaultMessage: 'Usage',
        description: 'Usage column heading',
        id: 'rw.devtools.budget.usage'
    },
    status: {
        defaultMessage: 'Status',
        description: 'Status column heading',
        id: 'rw.devtools.budget.status'
    },
    metric: {
        defaultMessage: 'Metric',
        description: 'Metric column heading',
        id: 'rw.devtools.budget.metric'
    },
    under: {
        defaultMessage: 'Under budget',
        description: 'Metric under budget',
        id: 'rw.devtools.budget.under'
    },
    over: {
        defaultMessage: 'Over budget',
        description: 'Metric over budget',
        id: 'rw.devtools.budget.over'
    },
    export: {
        defaultMessage: 'Export',
        description: 'Export budget button',
        id: 'rw.devtools.budget.export'
    },
    import: {
        defaultMessage: 'Import',
        description: 'Import budget button',
        id: 'rw.devtools.budget.import'
    },
    reset: {
        defaultMessage: 'Reset',
        description: 'Reset budget button',
        id: 'rw.devtools.budget.reset'
    },
    blocks: {
        defaultMessage: 'Blocks',
        description: 'Blocks metric name',
        id: 'rw.devtools.budget.metric.blocks'
    },
    scripts: {
        defaultMessage: 'Scripts',
        description: 'Scripts metric name',
        id: 'rw.devtools.budget.metric.scripts'
    },
    sprites: {
        defaultMessage: 'Sprites',
        description: 'Sprites metric name',
        id: 'rw.devtools.budget.metric.sprites'
    },
    variables: {
        defaultMessage: 'Variables',
        description: 'Variables metric name',
        id: 'rw.devtools.budget.metric.variables'
    },
    lists: {
        defaultMessage: 'Lists',
        description: 'Lists metric name',
        id: 'rw.devtools.budget.metric.lists'
    },
    memory: {
        defaultMessage: 'Memory',
        description: 'Memory metric name',
        id: 'rw.devtools.budget.metric.memory'
    },
    perBlock: {
        defaultMessage: ' per block',
        description: 'Per block suffix',
        id: 'rw.devtools.budget.perBlock'
    }
});

const PRESETS = {
    relaxed: {
        blocks: 5000,
        scripts: 2000,
        sprites: 200,
        variables: 500,
        lists: 100,
        memory: 200 * 1024 * 1024
    },
    balanced: {
        blocks: 1500,
        scripts: 600,
        sprites: 80,
        variables: 200,
        lists: 40,
        memory: 100 * 1024 * 1024
    },
    strict: {
        blocks: 500,
        scripts: 200,
        sprites: 30,
        variables: 80,
        lists: 15,
        memory: 50 * 1024 * 1024
    }
};

const METRIC_ORDER = ['blocks', 'scripts', 'sprites', 'variables', 'lists', 'memory'];

class PerformanceBudgetModal extends React.Component {
    constructor (props) {
        super(props);
        this.handleRequestClose = this.handleRequestClose.bind(this);
        this.handleThresholdChange = this.handleThresholdChange.bind(this);
        this.handlePresetChange = this.handlePresetChange.bind(this);
        this.handleExport = this.handleExport.bind(this);
        this.handleImport = this.handleImport.bind(this);
        this.handleReset = this.handleReset.bind(this);
        this._importInput = null;
        this.state = {
            thresholds: {...PRESETS.balanced},
            usage: {},
            preset: 'balanced',
            _mountError: false
        };
    }

    componentDidMount () {
        try {
            this.collectUsage();
        } catch (e) {
            console.error('[PerformanceBudget] mount failed:', e);
            this.setState({_mountError: true});
        }
    }

    componentDidUpdate (prevProps) {
        try {
            if (prevProps.vm !== this.props.vm) {
                this.collectUsage();
            }
        } catch (e) {
            console.error('[PerformanceBudget] update failed:', e);
        }
    }

    collectUsage () {
        try {
            const vm = this.props.vm;
            if (!vm || !vm.runtime) return;
            const runtime = vm.runtime;
            const targets = runtime.targets ? runtime.targets.filter(t => !t.isStage) : [];
            let blocks = 0;
            let scripts = 0;
            let variables = 0;
            let lists = 0;
            const allTargets = runtime.targets || [];
            allTargets.forEach(target => {
                const blocksObj = target.blocks ? target.blocks._blocks : {};
                const blockCount = Object.keys(blocksObj).length;
                blocks += blockCount;
                scripts += Object.values(blocksObj)
                    .filter(b => b.topLevel).length;
                const vars = target.variables ? target.variables : {};
                Object.values(vars).forEach(v => {
                    if (Array.isArray(v.value) && v.value.length >= 2 &&
                        (typeof v.value[1] === 'string')) {
                        lists += 1;
                    } else {
                        variables += 1;
                    }
                });
            });
            const memory = (performance && performance.memory) ? performance.memory.usedJSHeapSize : 0;
            this.setState({
                usage: {
                    blocks,
                    scripts,
                    sprites: targets.length,
                    variables,
                    lists,
                    memory
                }
            });
        } catch (e) {
            console.error('[PerformanceBudget] collectUsage failed:', e);
        }
    }

    handleRequestClose () {
        if (this.props.onRequestClose) {
            this.props.onRequestClose();
        }
    }

    handlePresetChange (e) {
        const preset = e.target.value;
        this.setState({
            preset,
            thresholds: {...PRESETS[preset]}
        });
    }

    handleThresholdChange (metric) {
        return e => {
            const value = Number(e.target.value);
            if (Number.isNaN(value)) return;
            this.setState(prev => ({
                thresholds: {
                    ...prev.thresholds,
                    [metric]: value
                },
                preset: 'custom'
            }));
        };
    }

    handleExport () {
        const data = JSON.stringify(this.state.thresholds, null, 2);
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'performance-budget.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    handleImportClick () {
        if (this._importInput) {
            this._importInput.click();
        }
    }

    handleImport (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result);
                const merged = {...PRESETS.balanced, ...parsed};
                this.setState({thresholds: merged, preset: 'custom'});
            } catch (err) {
                // ignore invalid file
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    handleReset () {
        this.setState({thresholds: {...PRESETS.balanced}, preset: 'balanced'});
        this.collectUsage();
    }

    setImportInputRef (node) {
        this._importInput = node;
    }

    render () {
        const {intl} = this.props;
        try {
            if (this.state._mountError) {
                return this._renderErrorFallback();
            }
            const {thresholds, usage, preset} = this.state;
            return (
            <ModalComponent
                className={styles.devToolsModal}
                contentLabel={intl.formatMessage(messages.title)}
                onRequestClose={this.handleRequestClose}
            >
                <Box className={styles.devToolsBody}>
                    <Box className={styles.devToolsToolbar}>
                        <label className={styles.devToolsLabel}>
                            {intl.formatMessage(messages.preset)}
                            <select
                                className={styles.devToolsSelect}
                                onChange={this.handlePresetChange}
                                value={preset}
                            >
                                <option value="relaxed">
                                    {'Relaxed'}
                                </option>
                                <option value="balanced">
                                    {'Balanced'}
                                </option>
                                <option value="strict">
                                    {'Strict'}
                                </option>
                                <option value="custom">
                                    {'Custom'}
                                </option>
                            </select>
                        </label>
                        <Box className={styles.devToolsToolbarButtons}>
                            <button
                                className={styles.devToolsButton}
                                onClick={this.handleExport}
                                type="button"
                            >
                                {intl.formatMessage(messages.export)}
                            </button>
                            <button
                                className={styles.devToolsButton}
                                onClick={this.handleImportClick}
                                type="button"
                            >
                                {intl.formatMessage(messages.import)}
                            </button>
                            <button
                                className={styles.devToolsButton}
                                onClick={this.handleReset}
                                type="button"
                            >
                                {intl.formatMessage(messages.reset)}
                            </button>
                            <input
                                ref={this.setImportInputRef}
                                style={{display: 'none'}}
                                type="file"
                                accept="application/json"
                                onChange={this.handleImport}
                            />
                        </Box>
                    </Box>

                    <table className={styles.devToolsTable}>
                        <thead>
                            <tr>
                                <th>{intl.formatMessage(messages.metric)}</th>
                                <th>{intl.formatMessage(messages.usage)}</th>
                                <th>{intl.formatMessage(messages.threshold)}</th>
                                <th>{intl.formatMessage(messages.status)}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {METRIC_ORDER.map(metric => {
                                const threshold = thresholds[metric];
                                const used = usage[metric] || 0;
                                const over = used > threshold;
                                const ratio = threshold ? used / threshold : 0;
                                return (
                                    <tr
                                        className={over ? styles.devToolsRowOver : ''}
                                        key={metric}
                                    >
                                        <td>{intl.formatMessage(messages[metric])}</td>
                                        <td>
                                            <Box className={styles.devToolsBarOuter}>
                                                <Box
                                                    className={over ?
                                                        styles.devToolsBarInnerBad :
                                                        styles.devToolsBarInner}
                                                    style={{width: `${Math.min(ratio * 100, 100)}%`}}
                                                />
                                            </Box>
                                            <span className={styles.devToolsBarLabel}>
                                                {metric === 'memory' ?
                                                    formatBytes(used) :
                                                    used}
                                            </span>
                                        </td>
                                        <td>
                                            <input
                                                className={styles.devToolsInput}
                                                min="0"
                                                onChange={this.handleThresholdChange(metric)}
                                                type="number"
                                                value={threshold}
                                            />
                                            {metric === 'memory' ?
                                                <span className={styles.devToolsSuffix}>
                                                    {' bytes'}
                                                </span> : null}
                                        </td>
                                        <td>
                                            <span
                                                className={over ? styles.badgeBad : styles.badgeGood}
                                            >
                                                {over ?
                                                    intl.formatMessage(messages.over) :
                                                    intl.formatMessage(messages.under)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </Box>
            </ModalComponent>
            );
        } catch (e) {
            console.error('[PerformanceBudget] render failed:', e);
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
                contentLabel={intl ? intl.formatMessage(messages.title) : 'Performance Budget'}
                onRequestClose={close}
            >
                <Box className={styles.devToolsBody}>
                    <p style={{color: '#f66', margin: '12px 0'}}>
                        性能预算面板加载失败，请关闭后重试。
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

PerformanceBudgetModal.propTypes = {
    intl: intlShape,
    onRequestClose: PropTypes.func,
    vm: PropTypes.shape({
        runtime: PropTypes.shape({
            targets: PropTypes.array
        })
    })
};

export default injectIntl(PerformanceBudgetModal);
