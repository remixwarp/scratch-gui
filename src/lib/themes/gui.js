// This file defines all GUI themes available in the Scratch GUI

// The GUI pulls from here, you only need to update this file to add a new GUI theme

import * as guiLight from './gui/light';
import * as guiGenesisLight from './gui/genesislight';
import * as guiModenWhite from './gui/modern_white';
import * as guiDark from './gui/dark';
import * as guiDeepDark  from './gui/deep_dark';
import * as guiGenesisDark from './gui/genesisdark';
import * as guiMidnight from './gui/midnight';

const GUI_LIGHT = 'light';
const GUI_GENESIS_LIGHT = 'genesis light';
const GUI_MODENWHITE = 'modernwhite';
const GUI_DARK = 'dark';
const GUI_GENESIS_DARK = 'genesis dark';
const GUI_DEEPDARK = 'deepdark';
const GUI_MIDNIGHT = 'midnight';

const GUI_MAP = {
    [GUI_LIGHT]: guiLight,
    [GUI_GENESIS_LIGHT]: guiGenesisLight,
    [GUI_MODENWHITE]: guiModenwhite,
    [GUI_DARK]: guiDark,
    [GUI_GENESIS_DARK]: guiGenesisDark,
    [GUI_DEEPDARK]: guiDeepDark,
    [GUI_MIDNIGHT]: guiMidnight
};
const GUI_DEFAULT = GUI_LIGHT;

export {
    GUI_MAP,
    GUI_DEFAULT
};
