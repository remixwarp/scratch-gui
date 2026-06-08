import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import {defineMessages, FormattedMessage, intlShape, injectIntl} from 'react-intl';
import {Download, AlertTriangle, CheckCircle2, ExternalLink} from 'lucide-react';

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
    }
});

const platforms = [
    {id: 'Scratch', name: 'Scratch', url: 'https://scratch.mit.edu', extension: '.sb3'},
    {id: 'TurboWarp', name: 'TurboWarp', url: 'https://turbowarp.org', extension: '.sb3'},
    {id: '02Engine', name: '02Engine', url: 'https://02engine.02studio.xyz/', extension: '.sb3'},
    {id: 'AstraEditor', name: 'AstraEditor', url: 'https://editors.astras.top/', extension: '.sb3'},
    {id: 'Bilup', name: 'Bilup', url: 'https://editor.bilup.org/', extension: '.sb3'},
    {id: 'Gandi', name: 'Gandi', url: 'https://getgandi.com/', extension: '.sb3'},
    {id: 'Kitten4', name: 'Kitten4', url: 'https://www.codemao.cn/', extension: '.bcm4'}
];

class CompatibilityModal extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            selectedPlatform: 'Scratch',
            isConverting: false,
            conversionSuccess: false,
            issues: []
        };
        this.handleConvert = this.handleConvert.bind(this);
        this.handlePlatformChange = this.handlePlatformChange.bind(this);
    }

    handlePlatformChange (event) {
        this.setState({
            selectedPlatform: event.target.value,
            conversionSuccess: false,
            issues: []
        });
    }

    async handleConvert () {
        const {selectedPlatform} = this.state;
        this.setState({isConverting: true, conversionSuccess: false});

        try {
            // 获取兼容性问题
            const issues = this.props.getCompatibilityIssues(selectedPlatform);
            
            if (issues.length > 0) {
                this.setState({issues});
                this.setState({isConverting: false});
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

    render () {
        const {selectedPlatform, isConverting, conversionSuccess, issues} = this.state;
        const {intl} = this.props;
        const selectedPlatformInfo = platforms.find(p => p.id === selectedPlatform);
        
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

                {selectedPlatform === 'Kitten4' && (
                    <div className={styles.kitten4Warning}>
                        <AlertTriangle size={16} className={styles.warningIconSmall} />
                        <span>测试版：不稳定，不要过度依赖此工具</span>
                    </div>
                )}

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