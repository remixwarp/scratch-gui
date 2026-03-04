import React, {useState} from 'react';
import PropTypes from 'prop-types';
import styles from './quotes-plugin-settings.css';

const QuotesPluginSettings = ({initialInterval, onSave, onCancel}) => {
    const [value, setValue] = useState(initialInterval);

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
                <div className={styles.actions}>
                    <button onClick={() => onSave(Number(value))} className={styles.save}>保存</button>
                    <button onClick={onCancel} className={styles.cancel}>取消</button>
                </div>
            </div>
        </div>
    );
};

QuotesPluginSettings.propTypes = {
    initialInterval: PropTypes.number.isRequired,
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
};

export default QuotesPluginSettings;
