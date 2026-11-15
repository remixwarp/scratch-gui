import PropTypes from 'prop-types';
import React from 'react';
import VM from 'scratch-vm';
import {STAGE_DISPLAY_SIZES} from '../lib/constants/layout-constants.js';
import StageWrapperComponent from '../components/stage-wrapper/stage-wrapper.jsx';

const StageWrapper = props => <StageWrapperComponent {...props} />;

StageWrapper.propTypes = {
    isRendererSupported: PropTypes.bool.isRequired,
    stageSize: PropTypes.oneOf(Object.keys(STAGE_DISPLAY_SIZES)).isRequired,
    isStageHidden: PropTypes.bool,
    stageContainerWidth: PropTypes.number,
    stageMaxHeight: PropTypes.number,
    vm: PropTypes.instanceOf(VM).isRequired
};

export default StageWrapper;
