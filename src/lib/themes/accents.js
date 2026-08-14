import * as accentPurple from './accent/purple';
import * as accentBlue from './accent/blue';
import * as accentLightBlue from './accent/light-blue';
import * as accentRed from './accent/red';
import * as accentOrange from './accent/orange';
import * as accentYellow from './accent/yellow';
import * as accentGreen from './accent/green';
import * as accentGreenV2 from './accent/green(v2)';
import * as accentDarkGreen from './accent/dark-green';
import * as accentRainbow from './accent/rainbow';
import * as accentGreenTea from './accent/green-tea';
import * as accentPaleBlue from './accent/pale-blue';
import * as accentEggplantPurple from './accent/eggplant-purple';
import * as accentTrans from './accent/trans';
import * as accentGay from './accent/gay';
import * as accentBi from './accent/bi';
import * as accentPan from './accent/pan';
import * as accentLesbian from './accent/lesbian';
import * as accentNonbinary from './accent/nonbinary';
import * as accentAce from './accent/ace';
import * as accentRotur from './accent/rotur';
import * as accentPink from './accent/pink';
import * as accentPinkV2 from './accent/pink(v2)';
import * as accentSunset from './accent/sunset';
import * as accentOcean from './accent/ocean';
import * as accentAurora from './accent/aurora';
import * as accentCosmic from './accent/cosmic';
import * as accentFire from './accent/fire';
import * as accentNebula from './accent/nebula';
import * as accentLavender from './accent/lavender';
import * as accentMint from './accent/mint';
import * as accentCherry from './accent/cherry';
import * as accentSky from './accent/sky';
import * as accentForest from './accent/forest';
import * as accentCoral from './accent/coral';
import * as accentAstraEditor from './accent/astraeditor';
import * as accent02 from './accent/02e';
import * as accentCE from './accent/ce';
import * as accentMiku from './accent/miku';
import * as accentMagenta from './accent/magenta';
import * as accentTY from './accent/ty';
import * as accentOubi from './accent/oubi';
import * as accentOmniBlue from './accent/omnimax-blue';
import * as accentVaporwave from './accent/vaporwave';
import * as accentMatrix from './accent/matrix';
import * as accentHoney from './accent/honey';

const ACCENTS = [
    // ===== 纯色主题 =====
    {
        name: 'Red',
        accent: accentRed,
        description: 'Red accent color',
        id: 'tw.accent.red',
        category: 'solid'
    },
    {
        name: 'Orange',
        accent: accentOrange,
        description: 'Orange accent color',
        id: 'tw.accent.orange',
        category: 'solid'
    },
    {
        name: 'Yellow',
        accent: accentYellow,
        description: 'Yellow accent color',
        id: 'tw.accent.yellow',
        category: 'solid'
    },
    {
        name: 'Green',
        accent: accentGreen,
        description: 'Green accent color',
        id: 'tw.accent.green',
        category: 'solid'
    },
    {
        name: 'Green (V2)',
        accent: accentGreenV2,
        description: 'Green (V2) accent color',
        id: 'tw.accent.greenv2',
        category: 'solid'
    },
    {
        name: 'Dark Green',
        accent: accentDarkGreen,
        description: 'Dark Green accent color',
        id: 'tw.accent.darkgreen',
        category: 'solid'
    },
    {
        name: 'Green Tea',
        accent: accentGreenTea,
        description: 'Green Tea accent color',
        id: 'tw.accent.green-tea',
        category: 'solid'
    },
    {
        name: 'Pale Blue',
        accent: accentPaleBlue,
        description: 'Pale Blue accent color',
        id: 'tw.accent.pale-blue',
        category: 'solid'
    },
    {
        name: 'Light Blue',
        accent: accentLightBlue,
        description: 'Light Blue accent color',
        id: 'tw.accent.light-blue',
        category: 'solid'
    },
    {
        name: 'Blue',
        accent: accentBlue,
        description: 'Blue accent color',
        id: 'tw.accent.blue',
        category: 'solid'
    },
    {
        name: 'Purple',
        accent: accentPurple,
        description: 'Purple accent color',
        id: 'tw.accent.purple',
        category: 'solid'
    },
    {
        name: 'Eggplant',
        accent: accentEggplantPurple,
        description: 'Eggplant accent color',
        id: 'tw.accent.eggplant-purple',
        category: 'solid'
    },
    {
        name: 'Pink',
        accent: accentPink,
        description: 'Pink accent color',
        id: 'tw.accent.pink',
        category: 'solid'
    },
    {
        name: 'Pink (V2)',
        accent: accentPinkV2,
        description: 'Pink (V2) accent color',
        id: 'tw.accent.pinkv2',
        category: 'solid'
    },
    {
        name: 'Magenta',
        accent: accentMagenta,
        description: 'Magenta accent color',
        id: 'tw.accent.magenta',
        category: 'solid'
    },
    {
        name: 'AstraEditor',
        accent: accentAstraEditor,
        description: 'AstraEditor accent color',
        id: 'tw.accent.ae',
        category: 'solid'
    },
    {
        name: '02',
        accent: accent02,
        description: '02 accent color',
        id: 'tw.accent.02e',
        category: 'solid'
    },
    {
        name: 'CE Pink',
        accent: accentCE,
        description: 'CyberExplorer Pink accent color',
        id: 'tw.accent.ce',
        category: 'solid'
    },
    {
        name: 'Miku Green',
        accent: accentMiku,
        description: 'Miku Green accent color',
        id: 'tw.accent.miku',
        category: 'solid'
    },
    {
        name: 'Tianyi Blue',
        accent: accentTY,
        description: 'Tianyi Blue accent color',
        id: 'tw.accent.ty',
        category: 'solid'
    },
    {
        name: 'Oubi',
        accent: accentOubi,
        description: 'Oubi gradient',
        id: 'tw.accent.oubi',
        category: 'solid'
    },
    {
        name: 'OM Blue',
        accent: accentOmniBlue,
        description: 'OmniMAX Blue gradient',
        id: 'tw.accent.omniblue',
        category: 'solid'
    },

    // ===== 渐变色主题 =====
    {
        name: 'Rainbow',
        accent: accentRainbow,
        description: 'Rainbow accent color',
        id: 'tw.accent.rainbow',
        category: 'gradient'
    },
    {
        name: 'Trans',
        accent: accentTrans,
        description: 'Trans accent color',
        id: 'tw.accent.trans',
        category: 'gradient'
    },
    {
        name: 'Gay',
        accent: accentGay,
        description: 'Gay accent color',
        id: 'tw.accent.gay',
        category: 'gradient'
    },
    {
        name: 'Bisexual',
        accent: accentBi,
        description: 'Bisexual pride flag accent',
        id: 'mw.accent.bi',
        category: 'gradient'
    },
    {
        name: 'Pansexual',
        accent: accentPan,
        description: 'Pansexual pride flag accent',
        id: 'mw.accent.pan',
        category: 'gradient'
    },
    {
        name: 'Lesbian',
        accent: accentLesbian,
        description: 'Lesbian pride flag accent',
        id: 'mw.accent.lesbian',
        category: 'gradient'
    },
    {
        name: 'Nonbinary',
        accent: accentNonbinary,
        description: 'Nonbinary pride flag accent',
        id: 'mw.accent.nonbinary',
        category: 'gradient'
    },
    {
        name: 'Asexual',
        accent: accentAce,
        description: 'Asexual pride flag accent',
        id: 'mw.accent.asexual',
        category: 'gradient'
    },
    {
        name: 'Rotur',
        accent: accentRotur,
        description: 'Rotur accent color',
        id: 'tw.accent.rotur',
        category: 'gradient'
    },
    {
        name: 'Sunset',
        accent: accentSunset,
        description: 'Beautiful sunset gradient',
        id: 'tw.accent.sunset',
        category: 'gradient'
    },
    {
        name: 'Ocean',
        accent: accentOcean,
        description: 'Deep ocean gradient',
        id: 'tw.accent.ocean',
        category: 'gradient'
    },
    {
        name: 'Aurora',
        accent: accentAurora,
        description: 'Aurora borealis gradient',
        id: 'tw.accent.aurora',
        category: 'gradient'
    },
    {
        name: 'Cosmic',
        accent: accentCosmic,
        description: 'Cosmic space gradient',
        id: 'tw.accent.cosmic',
        category: 'gradient'
    },
    {
        name: 'Fire',
        accent: accentFire,
        description: 'Fiery gradient',
        id: 'tw.accent.fire',
        category: 'gradient'
    },
    {
        name: 'Nebula',
        accent: accentNebula,
        description: 'Stellar nebula gradient',
        id: 'tw.accent.nebula',
        category: 'gradient'
    },
    {
        name: 'Lavender',
        accent: accentLavender,
        description: 'Soft lavender to pink gradient',
        id: 'tw.accent.lavender',
        category: 'gradient'
    },
    {
        name: 'Mint',
        accent: accentMint,
        description: 'Fresh mint to cyan gradient',
        id: 'tw.accent.mint',
        category: 'gradient'
    },
    {
        name: 'Cherry',
        accent: accentCherry,
        description: 'Vibrant cherry to rose gradient',
        id: 'tw.accent.cherry',
        category: 'gradient'
    },
    {
        name: 'Sky',
        accent: accentSky,
        description: 'Light sky blue to white gradient',
        id: 'tw.accent.sky',
        category: 'gradient'
    },
    {
        name: 'Forest',
        accent: accentForest,
        description: 'Deep forest to bright green gradient',
        id: 'tw.accent.forest',
        category: 'gradient'
    },
    {
        name: 'Coral',
        accent: accentCoral,
        description: 'Warm coral to peach gradient',
        id: 'tw.accent.coral',
        category: 'gradient'
    },
    {
        name: 'Vaporwave',
        accent: accentVaporwave,
        description: 'Retro vaporwave gradient',
        id: 'mw.accent.vaporwave',
        category: 'gradient'
    },
    {
        name: 'Matrix',
        accent: accentMatrix,
        description: 'Digital rain green on black',
        id: 'mw.accent.matrix',
        category: 'gradient'
    },
    {
        name: 'Honey',
        accent: accentHoney,
        description: 'Warm golden honey gradient',
        id: 'mw.accent.honey',
        category: 'gradient'
    }
];

const ACCENT_MAP = {};
for (const accent of ACCENTS) {
    ACCENT_MAP[accent.name.toLowerCase()] = {
        defaultMessage: accent.name,
        accent: accent.accent,
        description: accent.description,
        id: accent.id,
        category: accent.category
    };
}
const ACCENT_DEFAULT = 'pale blue';

export {
    ACCENTS,
    ACCENT_MAP,
    ACCENT_DEFAULT
};
