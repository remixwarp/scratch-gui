import * as accentPurple from './accent/purple';
import * as accentBlue from './accent/blue';
import * as accentRed from './accent/red';
import * as accentOrange from './accent/orange';
import * as accentYellow from './accent/yellow';
import * as accentGreen from './accent/green';
import * as accentRainbow from './accent/rainbow';
import * as accentGreenTea from './accent/green-tea';
import * as accentPaleBlue from './accent/pale-blue';
import * as accentEggplantPurple from './accent/eggplant-purple';
import * as accentPink from './accent/pink';
import * as accentAE from './accent/ae';
import * as accent02 from './accent/02e';

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
        name: 'Pink',
        accent: accentPink,
        description: 'Pink accent color',
        id: 'tw.accent.pink'
    },
    {
        name: 'AE',
        accent: accentAE,
        description: 'AE accent color',
        id: 'tw.accent.ae'
    },
    {
        name: '02',
        accent: accent02,
        description: '02 accent color',
        id: 'tw.accent.02e'
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
const ACCENT_DEFAULT = ACCENTS[1].name.toLowerCase();

export {
    ACCENTS,
    ACCENT_MAP,
    ACCENT_DEFAULT
};