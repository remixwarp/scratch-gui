import React from 'react';
import classNames from 'classnames';
import styles from '../button/button.css';

const BlockCounterToggle = ({ isVisible, onClick }) => {
    if (!isVisible) return null;

    return (
        <span
            className={classNames(styles.outlinedButton, 'stage-button')}
            onClick={onClick}
            role="button"
        >
            <svg
                width="18"
                height="18"
                viewBox="0 0 1024 1024"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'block' }}
            >
                <path
                    d="M326.802286 137.728h84.845714l155.355429 300.544V139.044571h73.142857v444.269715h-80.457143L399.872 274.285714v310.710857h-73.142857zM247.076571 137.801143v73.142857h-129.462857a36.571429 36.571429 0 0 0-35.986285 29.988571l-0.585143 6.582858v222.134857a36.571429 36.571429 0 0 0 29.988571 35.986285l6.582857 0.585143h129.462857v73.142857h-129.462857A109.714286 109.714286 0 0 1 8.411429 480.256L7.899429 469.577143V247.515429a109.714286 109.714286 0 0 1 99.181714-109.202286l10.532571-0.512h129.462857zM995.254857 137.801143v73.142857h-101.083428V585.142857h-73.142858V210.944H719.945143v-73.142857h275.309714zM1024 782.409143v73.142857H0v-73.142857z"
                    fill="#4ecdc4"
                    pId="8144"
                />
            </svg>
        </span>
    );
};

export default BlockCounterToggle;
