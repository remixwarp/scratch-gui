import React from 'react';
import {unlockAchievement} from './achievements.js';

let realScratchPaint;
const paintColorsUsed = new Set();

const recordPaintColor = action => {
    if (!action || !/scratch-paint\/(?:fill-style|stroke-style)\/CHANGE_(?:FILL|STROKE)_COLOR$/.test(action.type)) {
        return;
    }

    const color = Object.values(action).find(value => typeof value === 'string' && (
        /^#(?:[0-9a-f]{3}){1,2}$/i.test(value) ||
        /^rgba?\(/i.test(value) ||
        /^hsla?\(/i.test(value)
    ));
    if (!color) return;

    paintColorsUsed.add(color.toLowerCase());
    if (paintColorsUsed.size >= 5) {
        unlockAchievement('colorful');
    }
};

const getRealScratchPaint = () => {
    if (!realScratchPaint) {
        realScratchPaint = require('scratch-paint');
    }
    return realScratchPaint;
};

const PaintEditor = props => React.createElement(getRealScratchPaint().default, props);

let hasSetupReducer = false;
const ScratchPaintReducer = (state, action) => {
    if (!hasSetupReducer && action.type === 'scratch-gui/navigation/ACTIVATE_TAB' && action.activeTabIndex === 1) {
        hasSetupReducer = true;
    }
    if (hasSetupReducer) {
        recordPaintColor(action);
        return getRealScratchPaint().ScratchPaintReducer(state, action);
    }
    return {};
};

export {
    PaintEditor as default,
    ScratchPaintReducer
};
