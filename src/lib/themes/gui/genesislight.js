const guiColors = {
    'color-scheme': 'light',

     'ui-primary': '#FFFFFF',
    'ui-secondary': '#E0E0E0',
    'ui-tertiary': '#DBDBDB',

    'ui-modal-overlay': 'var(--looks-secondary)',
    'ui-modal-background': 'white', /* #FFFFFF */
    'ui-modal-foreground': 'black', /* #575E75 */
    'ui-modal-header-background': 'white',
    'ui-modal-header-foreground': 'var(--looks-secondary-dark)', /* #FFFFFF */

    'ui-white': 'hsla(0, 100%, 100%, 1)', /* #FFFFFF */
    'ui-white-dim': 'hsla(0, 100%, 100%, 0.55)', /* 25% transparent version of ui-white */
    'ui-white-transparent': 'hsla(0, 100%, 100%, 0.45)', /* 25% transparent version of ui-white */
    'ui-transparent': 'hsla(0, 100%, 100%, 0)', /* 25% transparent version of ui-white */

    'ui-black-transparent': '#00000015', /* 15% transparent version of black */

    'text-primary': '#000000', /* #575E75 */
    'text-primary-transparent': '#00000075',

    'motion-primary': 'hsla(215, 100%, 65%, 1)', /* #4C97FF */
    'motion-primary-transparent': 'hsla(215, 100%, 65%, 0.9)', /* 90% transparent version of motion-primary */
    'motion-tertiary': 'hsla(215, 60%, 50%, 1)', /* #3373CC */

    'looks-secondary': 'hsla(260, 60%, 60%, 1)', /* #855CD6 */
    'looks-transparent': 'hsla(260, 60%, 60%, 0.35)', /* 35% transparent version of looks-tertiary */
    'looks-light-transparent': 'hsla(260, 60%, 60%, 0.15)', /* 15% transparent version of looks-tertiary */
    'looks-secondary-dark': 'hsla(260, 42%, 51%, 1)', /* #714EB6 */

    'red-primary': 'white', /* #FF661A */
    'red-tertiary': 'var(--looks-secondary)', /* #E64D00 */

    'sound-primary': 'hsla(300, 53%, 60%, 1)', /* #CF63CF */
    'sound-tertiary': 'hsla(300, 48%, 50%, 1)', /* #BD42BD */

    'control-primary': 'hsla(38, 100%, 55%, 1)', /* #FFAB19 */

    'data-primary': 'hsla(30, 100%, 55%, 1)', /* #FF8C1A */

    'pen-primary': 'hsla(163, 85%, 40%, 1)', /* #0FBD8C */
    'pen-transparent': 'hsla(163, 85%, 40%, 0.25)', /* #0FBD8C */
    'pen-tertiary': 'hsla(163, 86%, 30%, 1)', /* #0B8E69 */

    'error-primary': 'hsla(30, 100%, 55%, 1)', /* #FF8C1A */
    'error-light': 'hsla(30, 100%, 70%, 1)', /* #FFB366 */
    'error-transparent': 'hsla(30, 100%, 55%, 0.25)', /* #FF8C1A */

    'extensions-primary': 'hsla(163, 85%, 40%, 1)', /* #0FBD8C */
    'extensions-tertiary': 'hsla(163, 85%, 30%, 1)', /* #0B8E69 */
    'extensions-transparent': 'hsla(163, 85%, 40%, 0.35)', /* 35% transparent version of extensions-primary */
    'extensions-light': 'hsla(163, 57%, 85%, 1)', /* opaque version of extensions-transparent, on white bg */

    'drop-highlight': 'white', /* lighter than motion-primary */

    'menu-bar-background': '#D9D9D9',
    'menu-bar-background-image': 'var(--looks-secondary)',
    'menu-bar-foreground': '#000000',

    'assets-background': '#ffffff',

    'input-background': '#ffffff',

    'popover-background': '#ffffff',

    'shadow': 'hsla(0, 0%, 0%, 0.15)',

    'badge-background': 'var(--looks-secondary)',
    'badge-border': 'black',

    'fullscreen-background': '#ffffff',
    'fullscreen-accent': '#e8edf1',

    'page-background': '#ffffff',
    'page-foreground': '#000000',

    'project-title-inactive': 'var(--ui-white-transparent)',
    'project-title-hover': '#ffffff',

    'link-color': '#2255dd',

    'filter-icon-black': '#ffffff',
    'filter-icon-gray': 'grayscale(100%)',
    'filter-icon-white': 'var(--looks-secondary-dark)',

    'paint-ui-pane-border': 'var(--ui-black-transparent)',
    'paint-text-primary': 'var(--text-primary)',
    'paint-form-border': 'var(--ui-black-transparent)',
    'paint-looks-secondary': 'var(--looks-secondary)',
    'paint-looks-transparent': 'var(--looks-transparent)',
    'paint-input-background': 'var(--input-background)',
    'paint-popover-background': 'var(--popover-background)',
    'paint-filter-icon-gray': 'none'
};

const blockColors = {};

export {
    guiColors,
    blockColors
};
