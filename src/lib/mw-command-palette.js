export const COMMAND_PALETTE_TOGGLE_EVENT = 'rw-command-palette-toggle';

export const toggleCommandPalette = () => {
    window.dispatchEvent(new Event(COMMAND_PALETTE_TOGGLE_EVENT));
};
