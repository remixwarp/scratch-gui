import * as accentPurple from './accent/purple';
import * as accentBlue from './accent/blue';
import * as accentLightBlue from './accent/light-blue';
import * as accentRed from './accent/red';
import * as accentOrange from './accent/orange';
import * as accentYellow from './accent/yellow';
import * as accentLime from './accent/lime';
import * as accentGreen from './accent/green';
import * as accentRainbow from './accent/rainbow';
import * as accentGreenTea from './accent/green-tea';
import * as accentPaleBlue from './accent/pale-blue';
import * as accentEggplantPurple from './accent/eggplant-purple';
import * as accentTrans from './accent/trans';
import * as accentGay from './accent/gay';
import * as accentRotur from './accent/rotur';
import * as accentPink from './accent/pink';
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

const ACCENTS = [
    {
        name: 'Red',
        accent: accentRed,
        description: 'Red accent color',
        id: 'tw.accent.red'
    },
    {
        name: 'Orange',
        accent: accentOrange,
        description: 'Orange accent color',
        id: 'tw.accent.orange'
    },
    {
        name: 'Yellow',
        accent: accentYellow,
        description: 'Yellow accent color',
        id: 'tw.accent.yellow'
    },
    {
        name: 'Green',
        accent: accentGreen,
        description: 'Green accent color',
        id: 'tw.accent.green'
    },
    {
        name: 'Lime Green',
        accent: accentLime,
        description: 'Lime accent color',
        id: 'tw.accent.lime'
    },
    {
        name: 'Green Tea',
        accent: accentGreenTea,
        description: 'Green Tea accent color',
        id: 'tw.accent.green-tea'
    },
    {
        name: 'Pale Blue',
        accent: accentPaleBlue,
        description: 'Pale Blue accent color',
        id: 'tw.accent.pale-blue'
    },
    {
        name: 'Light Blue',
        accent: accentLightBlue,
        description: 'Light Blue accent color',
        id: 'tw.accent.light-blue'
    },
    {
        name: 'Blue',
        accent: accentBlue,
        description: 'Blue accent color',
        id: 'tw.accent.blue'
    },
    {
        name: 'Purple',
        accent: accentPurple,
        description: 'Purple accent color',
        id: 'tw.accent.purple'
    },
    {
        name: 'Eggplant',
        accent: accentEggplantPurple,
        description: 'Eggplant accent color',
        id: 'tw.accent.eggplant-purple'
    },
    {
        name: 'Rainbow',
        accent: accentRainbow,
        description: 'Rainbow accent color',
        id: 'tw.accent.rainbow'
    },
    {
        name: 'Trans',
        accent: accentTrans,
        description: 'Trans accent color',
        id: 'tw.accent.trans'
    },
    {
        name: 'Gay',
        accent: accentGay,
        description: 'Gay accent color',
        id: 'tw.accent.gay'
    },
    {
        name: 'Rotur',
        accent: accentRotur,
        description: 'Rotur accent color',
        id: 'tw.accent.rotur'
    },
    {
        name: 'Pink',
        accent: accentPink,
        description: 'Pink accent color',
        id: 'tw.accent.pink'
    },
    {
        name: 'Sunset',
        accent: accentSunset,
        description: 'Beautiful sunset gradient',
        id: 'tw.accent.sunset'
    },
    {
        name: 'Ocean',
        accent: accentOcean,
        description: 'Deep ocean gradient',
        id: 'tw.accent.ocean'
    },
    {
        name: 'Aurora',
        accent: accentAurora,
        description: 'Aurora borealis gradient',
        id: 'tw.accent.aurora'
    },
    {
        name: 'Cosmic',
        accent: accentCosmic,
        description: 'Cosmic space gradient',
        id: 'tw.accent.cosmic'
    },
    {
        name: 'Fire',
        accent: accentFire,
        description: 'Fiery gradient',
        id: 'tw.accent.fire'
    },
    {
        name: 'Nebula',
        accent: accentNebula,
        description: 'Stellar nebula gradient',
        id: 'tw.accent.nebula'
    },
    {
        name: 'Lavender',
        accent: accentLavender,
        description: 'Soft lavender to pink gradient',
        id: 'tw.accent.lavender'
    },
    {
        name: 'Mint',
        accent: accentMint,
        description: 'Fresh mint to cyan gradient',
        id: 'tw.accent.mint'
    },
    {
        name: 'Cherry',
        accent: accentCherry,
        description: 'Vibrant cherry to rose gradient',
        id: 'tw.accent.cherry'
    },
    {
        name: 'Sky',
        accent: accentSky,
        description: 'Light sky blue to white gradient',
        id: 'tw.accent.sky'
    },
    {
        name: 'Forest',
        accent: accentForest,
        description: 'Deep forest to bright green gradient',
        id: 'tw.accent.forest'
    },
    {
        name: 'Coral',
        accent: accentCoral,
        description: 'Warm coral to peach gradient',
        id: 'tw.accent.coral'
    },
    {
        name: 'AstraEditor',
        accent: accentAstraEditor,
        description: 'AstraEditor accent color',
        id: 'tw.accent.ae'
    },
    {
        name: '02',
        accent: accent02,
        description: '02 accent color',
        id: 'tw.accent.02e'
    },
    {
        name: 'CE Pink',
        accent: accentCE,
        description: 'CyberExplorer Pink accent color',
        id: 'tw.accent.ce'
    },
    {
        name: 'Miku Green',
        accent: accentMiku,
        description: 'Miku Green accent color',
        id: 'tw.accent.miku'
    },
    {
        name: 'Magenta',
        accent: accentMagenta,
        description: 'Magenta accent color',
        id: 'tw.accent.magenta'
    },
    {
        name: 'Tianyi Blue',
        accent: accentTY,
        description: 'Tianyi Blue accent color',
        id: 'tw.accent.ty'
    },
    {
        name: 'Oubi',
        accent: accentOubi,
        description: 'Oubi gradient',
        id: 'tw.accent.oubi'
    },
    {
        name: 'OmniMAX Blue',
        accent: accentOmniBlue,
        description: 'Default blue color',
        id: 'tw.accent.omniblue'
    }
];

const ACCENT_MAP = {};
for (const accent of ACCENTS) {
    ACCENT_MAP[accent.name.toLowerCase()] = {
        defaultMessage: accent.name,
        accent: accent.accent,
        description: accent.description,
        id: accent.id
    };
}
const ACCENT_DEFAULT = 'red';

export {
    ACCENTS,
    ACCENT_MAP,
    ACCENT_DEFAULT
};
