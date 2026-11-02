import React from 'react';
import PropTypes from 'prop-types';
import styles from './gandi-help.css';

const GandiHelp = ({ onClose }) => {
    const isChinese = navigator.language === 'zh-CN' || navigator.language === 'zh';

    return (
        <div className={styles.overlay}>
            <div className={styles.panel} role="dialog" aria-label={isChinese ? "Gandi 帮助" : "Gandi Help"}>
                <div className={styles.header}>
                    <h3 className={styles.title}>{isChinese ? "Gandi 扩展库说明" : "Gandi Extension Library Guide"}</h3>
                    <button className={styles.closeButton} onClick={onClose}>
                        ×
                    </button>
                </div>
                
                <div className={styles.content}>
                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>{isChinese ? "扩展未找到问题" : "Extension Not Found Issue"}</h4>
                        <p className={styles.paragraph}>
                            {isChinese ? "当您在 Gandi 编辑器中导入转换后的项目时，可能会看到以下错误：" : "When importing the converted project in Gandi Editor, you may see the following error:"}
                        </p>
                        <div className={styles.errorMessage}>
                            {isChinese ? "很遗憾，工程内的扩展【xxx】没有找到，请尝试删除后再导入" : "Unfortunately, the extension [xxx] in the project was not found. Please try deleting it and then import again."}
                        </div>
                    </div>
                    
                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>{isChinese ? "解决方案" : "Solution"}</h4>
                        <p className={styles.paragraph}>
                            {isChinese ? "要解决这个问题，您需要：" : "To solve this issue, you need to:"}
                        </p>
                        <ol className={styles.steps}>
                            <li className={styles.step}>
                                {isChinese ? "在 RemixWarp 编辑器中，开启高级设置中的实验性超级重构功能" : "In RemixWarp Editor, enable the experimental Super Refactor feature in Advanced Settings"}
                            </li>
                            <li className={styles.step}>
                                {isChinese ? "使用超级重构功能修改工程内的扩展代码" : "Use the Super Refactor feature to modify the extension code in the project"}
                            </li>
                            <li className={styles.step}>
                                {isChinese ? "将扩展 ID 修改为 Gandi 扩展实验广场中存在的 ID" : "Change the extension ID to one that exists in Gandi's Extension Experiment Square"}
                            </li>
                            <li className={styles.step}>
                                {isChinese ? "再次使用兼容性转换功能转换为 Gandi 格式" : "Use the compatibility conversion feature again to convert to Gandi format"}
                            </li>
                        </ol>
                    </div>
                    
                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>{isChinese ? "注意事项" : "Notes"}</h4>
                        <ul className={styles.notes}>
                            <li className={styles.note}>
                                {isChinese ? "确保您使用的扩展 ID 在 Gandi 扩展实验广场中存在" : "Ensure the extension ID you use exists in Gandi's Extension Experiment Square"}
                            </li>
                            <li className={styles.note}>
                                {isChinese ? "修改扩展 ID 后，可能需要更新相关的代码引用" : "After changing the extension ID, you may need to update related code references"}
                            </li>
                            <li className={styles.note}>
                                {isChinese ? "如果遇到其他问题，请尝试删除扩展后再导入项目" : "If you encounter other issues, try deleting the extension and then importing the project"}
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
                        {isChinese ? "关闭" : "Close"}
                    </button>
                </div>
            </div>
        </div>
    );
};

GandiHelp.propTypes = {
    onClose: PropTypes.func.isRequired
};

export default GandiHelp;