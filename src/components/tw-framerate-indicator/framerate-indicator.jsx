import React, {useState, useEffect} from 'react';
import PropTypes from 'prop-types';
import {FormattedMessage} from 'react-intl';

import styles from './framerate-indicator.css';

const getFpsColor = (fps, maxFps) => {
    const ratio = fps / maxFps;
    if (ratio > 0.7) return '#82c1ff';
    if (ratio > 0.5) return '#82ff97';
    if (ratio > 0.2) return 'rgb(255, 197, 130)';
    return 'rgb(255, 130, 130)';
};

const FramerateIndicator = ({framerate, interpolation, isSmall, isEditor}) => {
    const [realFps, setRealFps] = useState(() => {
        if (typeof window !== 'undefined' && typeof window.__currentFps === 'number') {
            return window.__currentFps;
        }
        return 0;
    });

    // 实时轮询 window.__currentFps（与状态栏共用同一数据源）
    useEffect(() => {
        const update = () => {
            const val = (typeof window.__currentFps === 'number') ? window.__currentFps : 0;
            setRealFps(val);
        };
        update();
        const id = setInterval(update, 500);
        return () => clearInterval(id);
    }, []);

    const maxFps = framerate === 0 ? 60 : framerate;
    // 优先使用实时 FPS；未运行时回退到目标帧率
    const displayFps = realFps > 0 ? realFps : maxFps;
    const fpsColor = realFps > 0 ?
        getFpsColor(realFps, maxFps) :
        '#82c1ff';

    if (!isEditor || isSmall) {
        return null;
    }

    return (
        <React.Fragment>
            <div className={styles.framerateContainerContainer}>
                <div
                    className={styles.framerateContainer}
                    style={{color: fpsColor}}
                    data-content={`${displayFps} FPS`}
                />
            </div>
            {interpolation && (
                <div className={styles.framerateContainerContainer}>
                    <div className={styles.framerateLabel}>
                        <FormattedMessage
                            defaultMessage="Interpolation"
                            description="Label to indicate interpolation is enabled"
                            id="tw.interpolationEnabled"
                        />
                    </div>
                </div>
            )}
        </React.Fragment>
    );
};

FramerateIndicator.propTypes = {
    framerate: PropTypes.number,
    interpolation: PropTypes.bool,
    isSmall: PropTypes.bool,
    isEditor: PropTypes.bool
};

FramerateIndicator.defaultProps = {
    isSmall: false,
    isEditor: true
};

export default FramerateIndicator;
