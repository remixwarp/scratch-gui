import React from 'react';
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

const FramerateIndicator = ({framerate, interpolation, actualFps, isSmall, isEditor}) => {
    const maxFps = framerate === 0 ? 60 : framerate;
    const hasActualFps = actualFps !== null;
    const displayFps = hasActualFps ? actualFps : framerate;
    const fpsColor = hasActualFps ?
        getFpsColor(actualFps, maxFps) :
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
    actualFps: PropTypes.number,
    isSmall: PropTypes.bool,
    isEditor: PropTypes.bool
};

FramerateIndicator.defaultProps = {
    actualFps: null,
    isSmall: false,
    isEditor: true
};

export default FramerateIndicator;
