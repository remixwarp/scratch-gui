import fs from 'fs';
import path from 'path';
import {TextEncoder as NodeTextEncoder} from 'util';
import JSZip from 'jszip';
import {zipHasEntryUnder} from '../../../src/lib/git/zip-probe';

// jest 21 ships a jsdom old enough to predate TextEncoder, which the probe uses
// to encode its prefix. Every browser this editor supports has it natively, so
// the gap is the test environment's, not the module's.
if (typeof global.TextEncoder !== 'function') {
    global.TextEncoder = NodeTextEncoder;
}

const PREFIX = '.remixwarp-git/';

// `null` content creates the directory entry itself.
const buildZip = (entries, options = {}) => {
    const zip = new JSZip();
    entries.forEach(([name, content]) => {
        if (content === null) zip.folder(name);
        else zip.file(name, content);
    });
    return zip.generateAsync
        ? zip.generateAsync({type: 'nodebuffer', ...options})
        : Promise.resolve(zip.generate({type: 'nodebuffer', ...options}));
};

describe('zip-probe', () => {
    test('finds a file under the prefix', async () => {
        const bytes = await buildZip([
            ['project.json', '{}'],
            ['asset.svg', '<svg/>'],
            ['.remixwarp-git/HEAD', 'ref: refs/heads/main\n']
        ]);
        expect(zipHasEntryUnder(bytes, PREFIX)).toBe(true);
    });

    test('reports a project with no embedded repository', async () => {
        const bytes = await buildZip([
            ['project.json', '{}'],
            ['asset.svg', '<svg/>']
        ]);
        expect(zipHasEntryUnder(bytes, PREFIX)).toBe(false);
    });

    // The old JSZip-based check required `!entry.dir`; a bare directory entry
    // must not be mistaken for an embedded repository, otherwise every project
    // saved with an empty folder would be treated as carrying history.
    test('ignores the directory entry on its own', async () => {
        const bytes = await buildZip([
            ['.remixwarp-git/', null],
            ['project.json', '{}']
        ]);
        expect(zipHasEntryUnder(bytes, PREFIX)).toBe(false);
    });

    // An archive comment pushes the end-of-central-directory record away from
    // the end of the file, so the backward scan has to work for its living.
    test('finds the repository when the archive carries a comment', async () => {
        const bytes = await buildZip(
            [
                ['project.json', '{}'],
                ['.remixwarp-git/objects/ab/cdef', 'x']
            ],
            {comment: 'remixwarp archive comment '.repeat(64)}
        );
        expect(zipHasEntryUnder(bytes, PREFIX)).toBe(true);
    });

    test('accepts an ArrayBuffer', async () => {
        const bytes = await buildZip([['project.json', '{}'], ['.remixwarp-git/HEAD', 'x']]);
        const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        expect(zipHasEntryUnder(arrayBuffer, PREFIX)).toBe(true);
    });

    // `projectData` is not always a zero-offset view of its own buffer; reading
    // the DataView from offset 0 would silently parse the wrong bytes. Buffer
    // pooling makes the offset large and unpredictable, which is the point.
    test('honours a non-zero byteOffset on a typed array view', async () => {
        const bytes = await buildZip([['project.json', '{}'], ['.remixwarp-git/HEAD', 'x']]);
        const padded = Buffer.concat([Buffer.alloc(7, 0xff), bytes]);
        const view = new Uint8Array(padded.buffer, padded.byteOffset + 7, bytes.byteLength);
        expect(view.byteOffset).not.toBe(0);
        expect(zipHasEntryUnder(view, PREFIX)).toBe(true);
    });

    test('decides on a real project fixture', async () => {
        const fixture = path.join(__dirname, '../../fixtures/project1.sb3');
        const bytes = fs.readFileSync(fixture);
        expect(zipHasEntryUnder(bytes, PREFIX)).toBe(false);
    });

    // Anything undecidable must return null so the caller can fall back to
    // JSZip rather than acting on a guess.
    test('declines on input that is not a ZIP', () => {
        expect(zipHasEntryUnder(Buffer.from('definitely not a zip '.repeat(64)), PREFIX)).toBe(null);
    });

    test('declines on a truncated archive', async () => {
        const bytes = await buildZip([['project.json', '{}'], ['.remixwarp-git/HEAD', 'x']]);
        const truncated = bytes.slice(0, Math.floor(bytes.length / 2));
        expect(zipHasEntryUnder(truncated, PREFIX)).toBe(null);
    });

    test('declines on an empty buffer', () => {
        expect(zipHasEntryUnder(Buffer.alloc(0), PREFIX)).toBe(null);
    });

    test('declines on a File-like object', () => {
        expect(zipHasEntryUnder({size: 10, name: 'x.sb3'}, PREFIX)).toBe(null);
    });

    test('declines on null', () => {
        expect(zipHasEntryUnder(null, PREFIX)).toBe(null);
    });
});
