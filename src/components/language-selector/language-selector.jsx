import PropTypes from 'prop-types';
import React from 'react';

import locales from '@remixwarp/scratch-l10n';
import styles from './language-selector.css';

// 发布版 @remixwarp/scratch-l10n 可能尚未包含这些自定义语言，在此补充。
const EXTRA_LOCALES = {
    'geng': {name: '梗体中文测试'}
};
const allLocales = Object.assign({}, locales, EXTRA_LOCALES);

// supported languages to exclude from the menu, but allow as a URL option
const ignore = [];

const LanguageSelector = ({currentLocale, label, onChange}) => (
    <select
        aria-label={label}
        className={styles.languageSelect}
        value={currentLocale}
        onChange={onChange}
    >
        {
            Object.keys(allLocales)
                .filter(l => !ignore.includes(l))
                .map(locale => (
                    <option
                        key={locale}
                        value={locale}
                    >
                        {allLocales[locale].name}
                    </option>
                ))
        }
    </select>
);

LanguageSelector.propTypes = {
    currentLocale: PropTypes.string,
    label: PropTypes.string,
    onChange: PropTypes.func
};

export default LanguageSelector;
