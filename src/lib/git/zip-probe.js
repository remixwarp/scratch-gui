// Cheap questions about a ZIP archive, answered from the central directory
// instead of from a full parse.
//
// Why this exists: `hasEmbeddedRepo` (workspace/adapter.js) runs on every
// "open from computer" to decide whether an sb3 carries a `.remixwarp-git/`
// repository, and JSZip.loadAsync builds an entry object for every member just
// to answer it -- measured at ~110 ms for a 33 MB project with 1553 assets,
// against ~0.05 ms here.
//
// Nothing in this module imports anything: it is pure byte arithmetic so it can
// be unit tested without webpack and without OPFS.

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_FILE_SIGNATURE = 0x02014b50;
const EOCD_MIN_BYTES = 22;
const CENTRAL_FILE_HEADER_BYTES = 46;
// The end-of-central-directory record is followed by an optional comment of at
// most 64 KiB, so the record can start at most that far from the end.
const MAX_COMMENT_BYTES = 0xffff;
const ZIP64_SENTINEL_16 = 0xffff;
const ZIP64_SENTINEL_32 = 0xffffffff;

/**
 * Does the archive contain a *file* whose path starts with `prefix`?
 *
 * @param {ArrayBuffer|Uint8Array} input raw archive bytes
 * @param {string} prefix path prefix, e.g. `.remixwarp-git/`
 * @returns {boolean|null} true/false when decidable, or null when the input is
 *   not a plain single-disk ZIP (ZIP64, truncated, not a ZIP at all, or not a
 *   buffer) and the caller should fall back to a real ZIP parser.
 */
export const zipHasEntryUnder = (input, prefix) => {
    if (!input || typeof input.byteLength !== 'number') return null;
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
    const length = bytes.byteLength;
    if (length < EOCD_MIN_BYTES) return null;

    const view = new DataView(bytes.buffer, bytes.byteOffset, length);

    // Scan backwards for the end-of-central-directory signature rather than
    // assuming it sits exactly at the end.
    const earliest = Math.max(0, length - EOCD_MIN_BYTES - MAX_COMMENT_BYTES);
    let eocd = -1;
    for (let i = length - EOCD_MIN_BYTES; i >= earliest; i--) {
        if (view.getUint32(i, true) === EOCD_SIGNATURE) {
            eocd = i;
            break;
        }
    }
    if (eocd < 0) return null;

    const entryCount = view.getUint16(eocd + 10, true);
    const directorySize = view.getUint32(eocd + 12, true);
    const directoryOffset = view.getUint32(eocd + 16, true);
    // ZIP64 keeps the real values in a separate record; let JSZip handle it.
    if (
        entryCount === ZIP64_SENTINEL_16 ||
        directorySize === ZIP64_SENTINEL_32 ||
        directoryOffset === ZIP64_SENTINEL_32
    ) {
        return null;
    }
    if (directoryOffset + directorySize > length) return null;

    const wanted = new TextEncoder().encode(prefix);
    let cursor = directoryOffset;
    for (let i = 0; i < entryCount; i++) {
        if (
            cursor + CENTRAL_FILE_HEADER_BYTES > length ||
            view.getUint32(cursor, true) !== CENTRAL_FILE_SIGNATURE
        ) {
            return null;
        }
        const nameLength = view.getUint16(cursor + 28, true);
        const extraLength = view.getUint16(cursor + 30, true);
        const commentLength = view.getUint16(cursor + 32, true);
        const nameStart = cursor + CENTRAL_FILE_HEADER_BYTES;
        if (nameStart + nameLength > length) return null;
        // Strictly longer than the prefix: `prefix` on its own is the directory
        // entry, which does not count as an embedded repository.
        if (nameLength > wanted.length) {
            let matches = true;
            for (let k = 0; k < wanted.length; k++) {
                if (bytes[nameStart + k] !== wanted[k]) {
                    matches = false;
                    break;
                }
            }
            if (matches) return true;
        }
        cursor = nameStart + nameLength + extraLength + commentLength;
    }
    return false;
};

export default zipHasEntryUnder;
