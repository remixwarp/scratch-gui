/**
 * Block disable extension entry point.
 *
 * Previously contained JS Code context menu items ("为此积木链创建 JS Code",
 * "Copy JS Code", "创建 JS Code") — these have been removed per user request.
 * The module is kept as a no-op to avoid breaking the import.
 *
 * @param {*} _vm The Scratch VM instance (unused).
 */
const initializeBlockDisableExtension = _vm => {
    // No-op: JSCode context menu items removed.
};

export default initializeBlockDisableExtension;
