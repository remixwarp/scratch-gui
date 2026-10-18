import {defineMessages} from 'react-intl';

const M = defineMessages({
    scratch:        {id: 'tw.extensionTag.scratch',       defaultMessage: 'Scratch',          description: 'Extension sidebar category — Scratch'      },
    turboWarp:      {id: 'tw.extensionTag.turboWarp',     defaultMessage: 'TurboWarp',        description: 'Extension sidebar category — TurboWarp'    },
    remixWarp:      {id: 'tw.extensionTag.remixWarp',    defaultMessage: 'RemixWarp',        description: 'Extension sidebar category — RemixWarp'    },
    astraEditor:    {id: 'tw.extensionTag.astraEditor',  defaultMessage: 'AstraEditor',      description: 'Extension sidebar category — AstraEditor'  },
    mistium:        {id: 'tw.extensionTag.mistium',      defaultMessage: 'Mistium',          description: 'Extension sidebar category — Mistium'      },
    penguinMod:     {id: 'tw.extensionTag.penguinMod',   defaultMessage: 'PenguinMod',       description: 'Extension sidebar category — PenguinMod'   },
    zeroTwoEngine:  {id: 'tw.extensionTag.zeroTwoEngine',defaultMessage: '02Engine',          description: 'Extension sidebar category — 02Engine'     },
    openWarp:       {id: 'tw.extensionTag.openWarp',     defaultMessage: 'OpenWarp',         description: 'Extension sidebar category — OpenWarp'     },
    bilup:          {id: 'tw.extensionTag.bilup',        defaultMessage: 'Bilup',            description: 'Extension sidebar category — Bilup'        },
    cyScrExtHub:    {id: 'tw.extensionTag.cyScrExtHub',  defaultMessage: 'CY ScrExt Hub',    description: 'Extension sidebar category — CY ScrExt Hub'},
    experimentPlaza:{id: 'tw.extensionTag.experimentPlaza',defaultMessage: 'Extension Lab',  description: 'Extension sidebar category — Extension Experiment Lab (扩展实验广场)'}
});

export default [
    {tag: 'scratch',        intlLabel: M.scratch},
    {tag: 'tw',             intlLabel: M.turboWarp},
    {tag: 'remixwarp',      intlLabel: M.remixWarp},
    {tag: 'ae',             intlLabel: M.astraEditor},
    {tag: 'mistium',        intlLabel: M.mistium},
    {tag: 'penguinmod',     intlLabel: M.penguinMod},
    {tag: '02engine',       intlLabel: M.zeroTwoEngine},
    {tag: 'ow',             intlLabel: M.openWarp},
    {tag: 'bilup',          intlLabel: M.bilup},
    {tag: 'cy-scr-ext-hub', intlLabel: M.cyScrExtHub},
    {tag: 'experiment-plaza',intlLabel: M.experimentPlaza}
];
