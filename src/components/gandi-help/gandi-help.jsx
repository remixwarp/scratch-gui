import React from 'react';
import PropTypes from 'prop-types';
import {defineMessages, FormattedMessage, injectIntl} from 'react-intl';
import styles from './gandi-help.css';

const messages = defineMessages({
    ariaLabel: {
        defaultMessage: 'Gandi 帮助',
        description: 'Accessibility label for the Gandi help dialog',
        id: 'tw.gandiHelp.ariaLabel'
    },
    title: {
        defaultMessage: 'Gandi 扩展库说明',
        description: 'Title of the Gandi help dialog',
        id: 'tw.gandiHelp.title'
    },
    notFoundTitle: {
        defaultMessage: '扩展未找到问题',
        description: 'Heading for the extension not found issue',
        id: 'tw.gandiHelp.notFoundTitle'
    },
    notFoundDesc: {
        defaultMessage: '当您在 Gandi 编辑器中导入转换后的项目时，可能会看到以下错误：',
        description: 'Description shown before the error message',
        id: 'tw.gandiHelp.notFoundDesc'
    },
    notFoundError: {
        defaultMessage: '很遗憾，工程内的扩展【xxx】没有找到，请尝试删除后再导入',
        description: 'Error message shown when an extension is not found',
        id: 'tw.gandiHelp.notFoundError'
    },
    solutionTitle: {
        defaultMessage: '解决方案',
        description: 'Heading for the solution section',
        id: 'tw.gandiHelp.solutionTitle'
    },
    solutionDesc: {
        defaultMessage: '要解决这个问题，您需要：',
        description: 'Description shown before the solution steps',
        id: 'tw.gandiHelp.solutionDesc'
    },
    step1: {
        defaultMessage: '在 RemixWarp 编辑器中，开启高级设置中的实验性超级重构功能',
        description: 'Solution step 1',
        id: 'tw.gandiHelp.step1'
    },
    step2: {
        defaultMessage: '使用超级重构功能修改工程内的扩展代码',
        description: 'Solution step 2',
        id: 'tw.gandiHelp.step2'
    },
    step3: {
        defaultMessage: '将扩展 ID 修改为 Gandi 扩展实验广场中存在的 ID',
        description: 'Solution step 3',
        id: 'tw.gandiHelp.step3'
    },
    step4: {
        defaultMessage: '再次使用兼容性转换功能转换为 Gandi 格式',
        description: 'Solution step 4',
        id: 'tw.gandiHelp.step4'
    },
    notesTitle: {
        defaultMessage: '注意事项',
        description: 'Heading for the notes section',
        id: 'tw.gandiHelp.notesTitle'
    },
    note1: {
        defaultMessage: '确保您使用的扩展 ID 在 Gandi 扩展实验广场中存在',
        description: 'Note 1',
        id: 'tw.gandiHelp.note1'
    },
    note2: {
        defaultMessage: '修改扩展 ID 后，可能需要更新相关的代码引用',
        description: 'Note 2',
        id: 'tw.gandiHelp.note2'
    },
    note3: {
        defaultMessage: '如果遇到其他问题，请尝试删除扩展后再导入项目',
        description: 'Note 3',
        id: 'tw.gandiHelp.note3'
    },
    close: {
        defaultMessage: '关闭',
        description: 'Close button label',
        id: 'tw.gandiHelp.close'
    }
});

const GandiHelp = ({ onClose, intl }) => {
    return (
        <div className={styles.overlay}>
            <div className={styles.panel} role="dialog" aria-label={intl.formatMessage(messages.ariaLabel)}>
                <div className={styles.header}>
                    <h3 className={styles.title}><FormattedMessage {...messages.title} /></h3>
                    <button className={styles.closeButton} onClick={onClose}>
                        ×
                    </button>
                </div>
                
                <div className={styles.content}>
                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}><FormattedMessage {...messages.notFoundTitle} /></h4>
                        <p className={styles.paragraph}>
                            <FormattedMessage {...messages.notFoundDesc} />
                        </p>
                        <div className={styles.errorMessage}>
                            <FormattedMessage {...messages.notFoundError} />
                        </div>
                    </div>
                    
                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}><FormattedMessage {...messages.solutionTitle} /></h4>
                        <p className={styles.paragraph}>
                            <FormattedMessage {...messages.solutionDesc} />
                        </p>
                        <ol className={styles.steps}>
                            <li className={styles.step}>
                                <FormattedMessage {...messages.step1} />
                            </li>
                            <li className={styles.step}>
                                <FormattedMessage {...messages.step2} />
                            </li>
                            <li className={styles.step}>
                                <FormattedMessage {...messages.step3} />
                            </li>
                            <li className={styles.step}>
                                <FormattedMessage {...messages.step4} />
                            </li>
                        </ol>
                    </div>
                    
                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}><FormattedMessage {...messages.notesTitle} /></h4>
                        <ul className={styles.notes}>
                            <li className={styles.note}>
                                <FormattedMessage {...messages.note1} />
                            </li>
                            <li className={styles.note}>
                                <FormattedMessage {...messages.note2} />
                            </li>
                            <li className={styles.note}>
                                <FormattedMessage {...messages.note3} />
                            </li>
                        </ul>
                    </div>
                    
                    <div className={styles.multilangSection}>
                        <p>RemixWarp的所有扩展在兼容性转换为Gandi项目时扩展并不会被正确转译。暂时统一不了六国，请友商们放心。</p>
                        <p>When converting RemixWarp extensions to Gandi projects for compatibility, the extensions are not correctly transpiled. Unable to unify the six editors for now, please rest assured, fellow vendors.</p>
                        <p>RemixWarpの拡張機能をGandiプロジェクトに互換性変換する際、拡張機能は正しくトランスパイルされません。当面は六つのエディタを統一できませんので、他社の皆様ご安心ください。</p>
                        <p>RemixWarp의 모든 확장 기능을 Gandi 프로젝트로 호환성 변환할 때 확장 기능이 올바르게 트랜스파일되지 않습니다. 당분간 여섯 개의 에디터를 통일할 수 없으니 다른 업체들은 안심하십시오.</p>
                        <p>Lors de la conversion des extensions RemixWarp vers les projets Gandi pour des raisons de compatibilité, les extensions ne sont pas correctement transpilées. Impossible d'unifier les six éditeurs pour l'instant, soyez rassurés, chers concurrents.</p>
                        <p>Beim Kompatibilitäts-Transfer von RemixWarp-Erweiterungen zu Gandi-Projekten werden die Erweiterungen nicht korrekt transpiliert. Vorübergehend können die sechs Editoren nicht vereinheitlicht werden, seien Sie unbesorgt, liebe Mitbewerber.</p>
                    </div>
                </div>
                
                <div className={styles.actions}>
                    <button onClick={onClose} className={styles.button}>
                        <FormattedMessage {...messages.close} />
                    </button>
                </div>
            </div>
        </div>
    );
};

GandiHelp.propTypes = {
    onClose: PropTypes.func.isRequired,
    intl: PropTypes.shape({
        formatMessage: PropTypes.func.isRequired
    }).isRequired
};

export default injectIntl(GandiHelp);
