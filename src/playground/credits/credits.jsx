import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import render from '../app-target';
import styles from './credits.css';
import ReactDOM from 'react-dom';

import {APP_NAME} from '../../lib/constants/brand';
import {applyGuiColors} from '../../lib/themes/guiHelpers';
import {detectTheme} from '../../lib/themes/themePersistance';
import UserData from './users';

/* eslint-disable react/jsx-no-literals */

applyGuiColors(detectTheme());
document.documentElement.lang = 'en';

const User = ({image, text, href}) => (
    <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={styles.user}
    >
        <img
            loading="lazy"
            className={styles.userImage}
            src={image}
            width="60"
            height="60"
        />
        <div className={styles.userInfo}>
            {text}
        </div>
    </a>
);
User.propTypes = {
    image: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    href: PropTypes.string
};

const UserList = ({users}) => (
    <div className={styles.users}>
        {users.map((data, index) => (
            <User
                key={index}
                {...data}
            />
        ))}
    </div>
);
UserList.propTypes = {
    users: PropTypes.arrayOf(PropTypes.object)
};

const Credits = () => {
    const [language, setLanguage] = useState('en');

    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);

    const toggleLanguage = (lang) => {
        setLanguage(lang);
    };

    return (
        <main className={styles.main}>
            <div className={styles.languageSelector}>
                <button 
                    className={language === 'en' ? styles.active : ''}
                    onClick={() => toggleLanguage('en')}
                >
                    English
                </button>
                <button 
                    className={language === 'zh' ? styles.active : ''}
                    onClick={() => toggleLanguage('zh')}
                >
                    中文
                </button>
            </div>
            <header className={styles.headerContainer}>
                <h1 className={styles.headerText}>
                    {language === 'en' ? `${APP_NAME} Credits` : `${APP_NAME} 鸣谢`}
                </h1>
            </header>
            <section>
                <p>
                    {language === 'en' 
                        ? `The ${APP_NAME} project is made possible by the work of many volunteers.` 
                        : `${APP_NAME} 项目由许多志愿者的工作得以实现。`}
                </p>
            </section>
            {APP_NAME !== 'TurboWarp' && (
                // Be kind and considerate. Don't remove this :)
                <section>
                    <h2>{language === 'en' ? 'TurboWarp' : 'TurboWarp'}</h2>
                    <p>
                        {language === 'en' 
                            ? `${APP_NAME} is based on `
                            : `${APP_NAME} 基于 `}
                        <a href="https://turbowarp.org/">TurboWarp</a>
                        {language === 'en' ? '.' : '。'}
                    </p>
                </section>
            )}
            <section>
                <h2>{language === 'en' ? 'Scratch' : 'Scratch'}</h2>
                <p>
                    {language === 'en' 
                        ? `${APP_NAME} is based on the work of the `
                        : `${APP_NAME} 基于 `}
                    <a href="https://scratch.mit.edu/credits">
                        {language === 'en' ? 'Scratch contributors' : 'Scratch 贡献者'}
                    </a>
                    {language === 'en' 
                        ? ' but is not endorsed by Scratch in any way.' 
                        : '的工作，但不以任何方式得到 Scratch 的认可。'}
                </p>
                <p>
                    <a href="https://scratch.mit.edu/donate">
                        {language === 'en' ? 'Donate to support Scratch.' : '捐款支持 Scratch。'}
                    </a>
                </p>
            </section>
            <section>
                <h2>{language === 'en' ? 'Contributors' : '贡献者'}</h2>
                <UserList users={UserData.contributors} />
            </section>
            <section>
                <h2>{language === 'en' ? 'Addons' : '插件'}</h2>
                <UserList users={UserData.addonDevelopers} />
            </section>
            {/* <section>
                <h2>RemixWarp Extension Gallery</h2>
                <UserList users={UserData.extensionDevelopers} />
            </section> */}
            <section>
                <h2>{language === 'en' ? 'Documentation' : '文档'}</h2>
                <UserList users={UserData.docs} />
            </section>
            <section>
                <h2>{language === 'en' ? 'Translators' : '翻译者'}</h2>
                <UserList users={UserData.translators} />
            </section>
            <section>
                <p>
                    <i>
                        {language === 'en' 
                            ? 'Individual contributors and organizations are listed in no particular order. The order is randomized each visit.' 
                            : '个人贡献者和组织的列出顺序没有特别安排。每次访问时顺序都会随机化。'}
                    </i>
                </p>
                <p>
                    {language === 'en' 
                        ? `Special thanks to 02Engine, AstraEditor, and RemixWarp for their open-source code, which made compatibility conversion for ${APP_NAME} possible. We have maintained compatibility with their theme colors. Thank you very much for their contributions.` 
                        : `特别感谢02Engine和AstraEditor、RemixWarp的开源代码，它们为${APP_NAME}的兼容性转换提供了可能。我们兼容了他们的主题色。非常感谢他们的贡献。`}
                </p>
            </section>
            <section>
                <h2>{language === 'en' ? `Support ${APP_NAME}` : `支持 ${APP_NAME}`}</h2>
                <p>
                    {language === 'en' 
                        ? `${APP_NAME} is a free, open-source project. Your donations help us cover server costs, renew domains, and develop new features.` 
                        : `${APP_NAME} 是一个免费的开源项目。您的捐款将帮助我们支付服务器费用、续费域名和开发新功能。`}
                </p>
                <p>
                    <a href="/donate.html">
                        {language === 'en' ? `Donate to support ${APP_NAME}` : `捐款支持 ${APP_NAME}`}
                    </a>
                </p>
            </section>
        </main>
    );
};

render(<Credits />);