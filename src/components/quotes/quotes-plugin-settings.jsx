import React, {useState} from 'react';
import PropTypes from 'prop-types';
import styles from './quotes-plugin-settings.css';

const QuotesPluginSettings = ({
    initialInterval,
    initialQuotes,
    initialMode,
    onSave,
    onCancel
}) => {
    const [value, setValue] = useState(initialInterval);
    const [quotes, setQuotes] = useState(initialQuotes);
    const [mode, setMode] = useState(initialMode);

    const handleSave = () => {
        // Parse quotes from textarea (split by newline)
        const quotesList = quotes
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
        
        if (quotesList.length === 0) {
            window.alert('请至少输入一句内容。');
            return;
        }
        
        if (Number.isFinite(value) && value > 0) {
            onSave({
                interval: Number(value),
                quotes: quotesList,
                mode: mode
            });
        } else {
            window.alert('请输入正整数秒数。');
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.panel} role="dialog" aria-label="日常一句 插件设置">
                <h3 className={styles.title}>日常一句 - 插件设置</h3>
                
                <label className={styles.row}>
                    切换间隔（秒）：
                    <input
                        className={styles.input}
                        type="number"
                        min="1"
                        value={value}
                        onChange={e => setValue(Number(e.target.value))}
                    />
                </label>
                
                <label className={styles.row}>
                    显示模式：
                    <select
                        className={styles.select}
                        value={mode}
                        onChange={e => setMode(e.target.value)}
                    >
                        <option value="sequential">顺序显示</option>
                        <option value="random">随机显示</option>
                    </select>
                </label>
                
                <label className={styles.textareaRow}>
                    自定义内容（每行一句）：
                    <textarea
                        className={styles.textarea}
                        value={quotes}
                        onChange={e => setQuotes(e.target.value)}
                        rows={10}
                        placeholder="请输入内容，每行一句..."
                    />
                </label>
                
                <div className={styles.actions}>
                    <button onClick={handleSave} className={styles.save}>保存</button>
                    <button onClick={onCancel} className={styles.cancel}>取消</button>
                </div>
            </div>
        </div>
    );
};

QuotesPluginSettings.propTypes = {
    initialInterval: PropTypes.number.isRequired,
    initialQuotes: PropTypes.string.isRequired,
    initialMode: PropTypes.string.isRequired,
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
};

export default QuotesPluginSettings;
