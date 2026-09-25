import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, FormattedMessage, intlShape, injectIntl} from 'react-intl';
import {
    Download,
    AlertTriangle,
    CheckCircle2,
    ExternalLink,
    Circle,
    Loader2,
    XCircle
} from 'lucide-react';

import Box from '../box/box.jsx';
import Button from '../button/button.jsx';
import styles from './compatibility-modal.css';

const messages = defineMessages({
    title: {
        defaultMessage: '兼容性转换',
        description: 'Title of compatibility conversion modal',
        id: 'tw.compatibilityModal.title'
    },
    selectEditor: {
        defaultMessage: '选择目标编辑器',
        description: 'Label for platform selection',
        id: 'tw.compatibilityModal.selectEditor'
    },
    issuesFound: {
        defaultMessage: '发现问题',
        description: 'Title for issues section',
        id: 'tw.compatibilityModal.issuesFound'
    },
    warnings: {
        defaultMessage: '警告',
        description: 'Title for warnings section',
        id: 'tw.compatibilityModal.warnings'
    },
    success: {
        defaultMessage: '转换成功！文件已下载。',
        description: 'Success message after conversion',
        id: 'tw.compatibilityModal.success'
    },
    cancel: {
        defaultMessage: '取消',
        description: 'Cancel button',
        id: 'tw.compatibilityModal.cancel'
    },
    converting: {
        defaultMessage: '转换中...',
        description: 'Converting loading text',
        id: 'tw.compatibilityModal.converting'
    },
    convertAndDownload: {
        defaultMessage: '转换并下载',
        description: 'Convert button text',
        id: 'tw.compatibilityModal.convertAndDownload'
    },
    workflowTitle: {
        defaultMessage: 'Gandi 工作流',
        description: 'Title of the Gandi workflow pipeline section',
        id: 'tw.compatibilityModal.workflowTitle'
    }
});

const platforms = [
    {id: 'Scratch', name: 'Scratch', url: 'https://scratch.mit.edu', extension: '.sb3'},
    {id: 'TurboWarp', name: 'TurboWarp', url: 'https://turbowarp.org', extension: '.sb3'},
    {id: '02Engine', name: '02Engine', url: 'https://02engine.02studio.xyz/', extension: '.sb3'},
    {id: 'AstraEditor', name: 'AstraEditor', url: 'https://editors.astras.top/', extension: '.sb3'},
    {id: 'Bilup', name: 'Bilup', url: 'https://com.bilup.org/', extension: '.sb3'},
    {id: 'Gandi', name: 'Gandi', url: 'https://getgandi.com/', extension: '.sb3'}
];

class CompatibilityModal extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            selectedPlatform: 'Scratch',
            isConverting: false,
            conversionSuccess: false,
            issues: [],
            // Workflow pipeline state: array of {label, status, message}
            pipeline: []
        };
        this.handleConvert = this.handleConvert.bind(this);
        this.handlePlatformChange = this.handlePlatformChange.bind(this);
        this._onGandiStep = this._onGandiStep.bind(this);
    }

    componentDidMount () {
        // Wire up step listener so the menu-bar's Gandi conversion pipeline
        // can stream progress updates into this modal.
        const inst = window.__remixWarpMenuBarInstance;
        if (inst) inst._gandiStepListener = this._onGandiStep;
    }

    componentWillUnmount () {
        // 注意：不要把 _gandiStepListener 置空。menu-bar 实例
        // （window.__remixWarpMenuBarInstance）的生命周期比 modal 长很多
        // —— 只要转换还在后台跑、还会 emitStep，我们就希望 listener
        // 继续留在那里。modal 只是暂时消失，下次再打开时会重新绑定
        // 同一个 listener；如果这次把它清掉了，后台转换的 success/error
        // 事件就永远丢失了。
    }

    _onGandiStep ({index, status, message, stepCount}) {
        const inst = window.__remixWarpMenuBarInstance;
        if (!inst) return;

        // 优先用 state 里的 selectedPlatform 取 labels；回退到 _gandiPipelineSteps
        // （兼容旧 getter，兜底 Gandi 7 步）
        let steps;
        try {
            if (typeof inst._getPipelineSteps === 'function') {
                steps = inst._getPipelineSteps(this.state.selectedPlatform);
            }
        } catch (e) { /* ignore */ }
        if (!Array.isArray(steps) || steps.length === 0) {
            steps = inst._gandiPipelineSteps;
        }
        if (!Array.isArray(steps)) return;

        this.setState(prev => {
            const next = (prev.pipeline && prev.pipeline.length === steps.length)
                ? prev.pipeline.slice()
                : steps.map(s => ({label: s.label, status: 'pending', message: ''}));
            if (index >= 0 && index < next.length) {
                next[index] = {label: steps[index].label, status, message: message || ''};
            }
            return {pipeline: next};
        });
    }

    handlePlatformChange (event) {
        this.setState({
            selectedPlatform: event.target.value,
            conversionSuccess: false,
            issues: [],
            pipeline: []
        });
    }

    async handleConvert () {
        const {selectedPlatform} = this.state;
        const inst = window.__remixWarpMenuBarInstance;

        // 根据目标平台初始化 pipeline labels（Gandi 7 步 / 其他 2 步）
        if (inst && typeof inst._getPipelineSteps === 'function') {
            const steps = inst._getPipelineSteps(selectedPlatform);
            if (Array.isArray(steps)) {
                this.setState({
                    pipeline: steps.map(s => ({
                        label: s.label,
                        status: 'pending',
                        message: ''
                    }))
                });
            }
        }

        this.setState({isConverting: true, conversionSuccess: false});

        try {
            // 获取兼容性问题
            const issues = this.props.getCompatibilityIssues(selectedPlatform);

            if (issues.length > 0) {
                this.setState({issues, isConverting: false});
                return;
            }

            // 执行转换
            await this.props.handleCompatibilitySave(selectedPlatform);

            this.setState({
                isConverting: false,
                conversionSuccess: true,
                issues: []
            });

            // 3秒后重置成功状态
            setTimeout(() => {
                this.setState({conversionSuccess: false});
            }, 3000);

        } catch (error) {
            console.error('Conversion error:', error);
            this.setState({
                isConverting: false,
                conversionSuccess: false,
                issues: [{
                    type: 'error',
                    severity: 'error',
                    message: `转换失败: ${error.message}`,
                    details: ''
                }]
            });
        }
    }

    renderPipeline () {
        const {pipeline, selectedPlatform} = this.state;
        if (!pipeline || pipeline.length === 0) return null;
        const isGandi = selectedPlatform === 'Gandi';

        return (
            <div className={styles.pipeline}>
                <div className={styles.pipelineHeader}>
                    <span className={styles.pipelineTitle}>
                        {isGandi ? (
                            <FormattedMessage {...messages.workflowTitle} />
                        ) : (
                            `转换流程 (${selectedPlatform})`
                        )}
                    </span>
                    {isGandi && (
                        <a
                            href="https://github.com/remixwarp/gandi-ide-qwq"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.pipelineLink}
                        >
                            gandi-ide-qwq
                        </a>
                    )}
                </div>
                <ol className={styles.pipelineList}>
                    {pipeline.map((step, idx) => {
                        const Icon = step.status === 'running'
                            ? Loader2
                            : step.status === 'success'
                                ? CheckCircle2
                                : step.status === 'error'
                                    ? XCircle
                                    : step.status === 'skipped'
                                        ? CheckCircle2
                                        : Circle;
                        return (
                            <li
                                key={idx}
                                className={classNames(
                                    styles.pipelineStep,
                                    {
                                        [styles.stepPending]: step.status === 'pending',
                                        [styles.stepRunning]: step.status === 'running',
                                        [styles.stepSuccess]: step.status === 'success',
                                        [styles.stepError]: step.status === 'error',
                                        [styles.stepSkipped]: step.status === 'skipped'
                                    }
                                )}
                            >
                                <div className={styles.pipelineStepHead}>
                                    <Icon
                                        className={classNames(
                                            styles.stepIcon,
                                            {[styles.spin]: step.status === 'running'}
                                        )}
                                        size={16}
                                    />
                                    <span className={styles.stepLabel}>{step.label}</span>
                                </div>
                                {step.message && (
                                    <div className={styles.stepMessage}>
                                        {step.message}
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ol>
            </div>
        );
    }

    render () {
        const {selectedPlatform, isConverting, conversionSuccess, issues} = this.state;
        const {intl} = this.props;
        const selectedPlatformInfo = platforms.find(p => p.id === selectedPlatform);
        const isGandi = selectedPlatform === 'Gandi';

        const errors = issues.filter(i => i.severity === 'error');
        const warnings = issues.filter(i => i.severity === 'warning');

        return (
            <Box className={styles.modalContent}>
                <div className={styles.conversionRow}>
                    <div className={styles.sourceBox}>
                        <span className={styles.platformName}>RemixWarp</span>
                        <span className={styles.platformExtension}>.sb3</span>
                    </div>

                    <div className={styles.arrowContainer}>
                        <svg className={styles.arrow} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </div>

                    <select
                        className={styles.targetSelect}
                        value={selectedPlatform}
                        onChange={this.handlePlatformChange}
                        disabled={isConverting}
                    >
                        {platforms.map(platform => (
                            <option key={platform.id} value={platform.id}>
                                {platform.name}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedPlatformInfo && (
                    <div className={styles.infoCard}>
                        <div className={styles.conversionText}>
                            <FormattedMessage
                                defaultMessage="由 {source} 转换为 {target}"
                                description="Conversion description text"
                                id="tw.compatibilityModal.conversionText"
                                values={{
                                    source: <span className={styles.sourceText}>RemixWarp(.sb3)</span>,
                                    target: <span className={styles.targetText}>{selectedPlatformInfo.name}({selectedPlatformInfo.extension})</span>
                                }}
                            />
                        </div>
                        <div className={styles.infoFooter}>
                            <a
                                href={selectedPlatformInfo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.platformLink}
                            >
                                <ExternalLink size={14} />
                                <span className={styles.linkText}>{selectedPlatformInfo.name}</span>
                            </a>
                        </div>
                    </div>
                )}

                {this.renderPipeline()}

                {issues.length > 0 && (
                    <div className={styles.issuesContainer}>
                        {errors.length > 0 && (
                            <div className={styles.errorSection}>
                                <div className={styles.sectionHeader}>
                                    <AlertTriangle className={styles.warningIcon} />
                                    <span className={styles.sectionTitle}>
                                        <FormattedMessage {...messages.issuesFound} />
                                    </span>
                                </div>
                                <ul className={styles.issuesList}>
                                    {errors.map((issue, index) => (
                                        <li key={`error-${index}`} className={styles.issueItem}>
                                            <span className={styles.errorBadge}>!</span>
                                            <span className={styles.issueMessage}>{issue.message}</span>
                                            {issue.details && (
                                                <span className={styles.issueDetails}>{issue.details}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {warnings.length > 0 && (
                            <div className={styles.warningSection}>
                                <div className={styles.sectionHeader}>
                                    <AlertTriangle className={styles.warningIcon} />
                                    <span className={styles.sectionTitle}>
                                        <FormattedMessage {...messages.warnings} />
                                    </span>
                                </div>
                                <ul className={styles.issuesList}>
                                    {warnings.map((issue, index) => (
                                        <li key={`warning-${index}`} className={styles.issueItem}>
                                            <span className={styles.warningBadge}>⚠</span>
                                            <span className={styles.issueMessage}>{issue.message}</span>
                                            {issue.details && (
                                                <span className={styles.issueDetails}>{issue.details}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {conversionSuccess && (
                    <div className={styles.successMessage}>
                        <CheckCircle2 className={styles.successIcon} />
                        <span className={styles.successText}>
                            <FormattedMessage {...messages.success} />
                        </span>
                    </div>
                )}

                <div className={styles.modalFooter}>
                    <Button
                        className={styles.cancelButton}
                        onClick={this.props.onRequestClose}
                        disabled={isConverting}
                    >
                        <FormattedMessage {...messages.cancel} />
                    </Button>
                    <Button
                        className={classNames(styles.convertButton, {[styles.converting]: isConverting})}
                        onClick={this.handleConvert}
                        disabled={isConverting || (errors.length > 0)}
                    >
                        {isConverting ? (
                            <span className={styles.loadingText}>
                                <FormattedMessage {...messages.converting} />
                            </span>
                        ) : (
                            <>
                                <Download size={18} className={styles.downloadIcon} />
                                <FormattedMessage {...messages.convertAndDownload} />
                            </>
                        )}
                    </Button>
                </div>
            </Box>
        );
    }
}

CompatibilityModal.propTypes = {
    getCompatibilityIssues: PropTypes.func.isRequired,
    handleCompatibilitySave: PropTypes.func.isRequired,
    onRequestClose: PropTypes.func.isRequired,
    intl: intlShape.isRequired
};

export default injectIntl(CompatibilityModal);
