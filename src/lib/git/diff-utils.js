/**
 * Myers diff algorithm implementation for line-based text comparison
 * Based on Eugene Myers' 1986 paper "An O(ND) Difference Algorithm"
 */

const MyersDiff = {
    /**
     * 单侧允许参与 Myers 算法比较的最大行数。
     * Myers 是 O(ND) 算法（D 最坏可达 N+M），且实现中 trace 数组每步复制
     * 整个 V 数组，内存开销为 O((N+M)²)。对超大文件会长时间阻塞主线程
     * （表现为应用卡死/无响应），因此超过阈值时退化为全量替换 diff。
     */
    MAX_DIFF_LINES: 2000,

    /**
     * Compute the edit script (diff) between two texts
     * @param {string} textA - Original text
     * @param {string} textB - Modified text
     * @returns {DiffResult} Diff result with hunks and changes
     */
    compute (textA, textB) {
        const linesA = this._splitLines(textA);
        const linesB = this._splitLines(textB);

        if (linesA.length === 0 && linesB.length === 0) {
            return this._createEmptyResult();
        }

        if (linesA.length === 0) {
            return this._createAddAllResult(linesB);
        }

        if (linesB.length === 0) {
            return this._createRemoveAllResult(linesA);
        }

        // 超大输入保护：避免 Myers O(ND) 卡死主线程。
        // 结果仍是正确 diff（全量替换），只是不再尝试找出最少编辑步数。
        if (linesA.length > this.MAX_DIFF_LINES || linesB.length > this.MAX_DIFF_LINES) {
            return this._createReplaceAllResult(linesA, linesB);
        }

        const editScript = this._myersDiffAlgorithm(linesA, linesB);
        return this._convertToDiffHunks(linesA, linesB, editScript);
    },

    /**
     * Split text into lines, preserving line endings
     * @param {string} text - Text to split
     * @returns {string[]} Array of lines
     */
    _splitLines (text) {
        if (!text) return [];
        const lines = text.split('\n');
        if (lines[lines.length - 1] === '') {
            lines.pop();
        }
        return lines;
    },

    /**
     * Core Myers O(ND) algorithm
     * @param {string[]} linesA - Original lines
     * @param {string[]} linesB - Modified lines
     * @returns {Array} Edit script entries
     */
    _myersDiffAlgorithm (linesA, linesB) {
        const N = linesA.length;
        const M = linesB.length;
        const MAX = N + M;

        const V = new Int32Array((2 * MAX) + 1);
        V[MAX] = 0;

        const trace = [];

        let x; let y;
        for (let D = 0; D <= MAX; D++) {
            trace.push(new Int32Array(V));

            for (let k = -D; k <= D; k += 2) {
                if (k === -D || (k !== D && V[MAX + k - 1] < V[MAX + k + 1])) {
                    x = V[MAX + k + 1];
                } else {
                    x = V[MAX + k - 1] + 1;
                }

                y = x - k;

                while (x < N && y < M && linesA[x] === linesB[y]) {
                    x++;
                    y++;
                }

                V[MAX + k] = x;

                if (x >= N && y >= M) {
                    return this._backtrace(trace, N, M, linesA, linesB);
                }
            }
        }

        return [];
    },

    /**
     * Backtrace to find edit script
     * @param {Array} trace - Recorded V snapshots
     * @param {number} x - End x coordinate
     * @param {number} y - End y coordinate
     * @param {string[]} linesA - Original lines
     * @param {string[]} linesB - Modified lines
     * @returns {Array} Edit script entries
     */
    _backtrace (trace, x, y, linesA, linesB) {
        const result = [];
        let D = trace.length - 1;

        let V = trace[D];
        let k = x - y;
        const offset = linesA.length + linesB.length;
        let prevK; let prevX; let prevY;

        while (D > 0) {
            V = trace[D];

            if (k === -D || (k !== D && V[offset + k - 1] < V[offset + k + 1])) {
                prevK = k + 1;
            } else {
                prevK = k - 1;
            }

            prevX = V[offset + prevK];
            prevY = prevX - prevK;

            while (x > prevX && y > prevY) {
                result.unshift({
                    type: 'same',
                    lineA: x - 1,
                    lineB: y - 1
                });
                x--;
                y--;
            }

            if (x > prevX) {
                result.unshift({
                    type: 'remove',
                    lineA: x - 1,
                    lineB: y
                });
                x--;
            } else if (y > prevY) {
                result.unshift({
                    type: 'add',
                    lineA: x,
                    lineB: y - 1
                });
                y--;
            }

            D--;
            k = prevK;
        }

        while (x > 0 && y > 0) {
            result.unshift({
                type: 'same',
                lineA: x - 1,
                lineB: y - 1
            });
            x--;
            y--;
        }

        return result;
    },

    /**
     * Convert edit script to diff hunks
     * @param {string[]} linesA - Original lines
     * @param {string[]} linesB - Modified lines
     * @param {Array} editScript - Edit script entries
     * @returns {object} Diff result
     */
    _convertToDiffHunks (linesA, linesB, editScript) {
        const hunks = [];
        let currentHunk = null;

        for (const change of editScript) {
            if (change.type === 'same') {
                if (currentHunk) {
                    hunks.push(currentHunk);
                    currentHunk = null;
                }
                continue;
            }

            if (!currentHunk) {
                currentHunk = {
                    oldStart: change.lineA + 1,
                    oldLines: 0,
                    newStart: change.lineB + 1,
                    newLines: 0,
                    changes: []
                };
            }

            if (change.type === 'remove') {
                currentHunk.oldLines++;
                currentHunk.changes.push({
                    type: 'remove',
                    content: linesA[change.lineA],
                    lineA: change.lineA,
                    lineB: null
                });
            } else if (change.type === 'add') {
                currentHunk.newLines++;
                currentHunk.changes.push({
                    type: 'add',
                    content: linesB[change.lineB],
                    lineA: null,
                    lineB: change.lineB
                });
            }
        }

        if (currentHunk) {
            hunks.push(currentHunk);
        }

        return {
            hunks,
            linesA,
            linesB,
            totalAdditions: editScript.filter(c => c.type === 'add').length,
            totalDeletions: editScript.filter(c => c.type === 'remove').length
        };
    },

    /**
     * Create empty result
     * @returns {object} Empty diff result
     */
    _createEmptyResult () {
        return {
            hunks: [],
            linesA: [],
            linesB: [],
            totalAdditions: 0,
            totalDeletions: 0
        };
    },

    /**
     * Create result with all additions
     * @param {string[]} linesB - Modified lines
     * @returns {object} Diff result
     */
    _createAddAllResult (linesB) {
        const changes = linesB.map((line, i) => ({
            type: 'add',
            content: line,
            lineA: null,
            lineB: i
        }));

        return {
            hunks: [{
                oldStart: 1,
                oldLines: 0,
                newStart: 1,
                newLines: linesB.length,
                changes
            }],
            linesA: [],
            linesB,
            totalAdditions: linesB.length,
            totalDeletions: 0
        };
    },

    /**
     * Create result with all deletions
     * @param {string[]} linesA - Original lines
     * @returns {object} Diff result
     */
    _createRemoveAllResult (linesA) {
        const changes = linesA.map((line, i) => ({
            type: 'remove',
            content: line,
            lineA: i,
            lineB: null
        }));

        return {
            hunks: [{
                oldStart: 1,
                oldLines: linesA.length,
                newStart: 1,
                newLines: 0,
                changes
            }],
            linesA,
            linesB: [],
            totalAdditions: 0,
            totalDeletions: linesA.length
        };
    },

    /**
     * Create result with all lines replaced (remove all + add all).
     * 用于超大输入保护：结果正确但不保证最小编辑步数。
     * @param {string[]} linesA - Original lines
     * @param {string[]} linesB - Modified lines
     * @returns {object} Diff result
     */
    _createReplaceAllResult (linesA, linesB) {
        const changes = [];
        for (let i = 0; i < linesA.length; i++) {
            changes.push({
                type: 'remove',
                content: linesA[i],
                lineA: i,
                lineB: null
            });
        }
        for (let i = 0; i < linesB.length; i++) {
            changes.push({
                type: 'add',
                content: linesB[i],
                lineA: null,
                lineB: i
            });
        }
        return {
            hunks: [{
                oldStart: 1,
                oldLines: linesA.length,
                newStart: 1,
                newLines: linesB.length,
                changes
            }],
            linesA,
            linesB,
            totalAdditions: linesB.length,
            totalDeletions: linesA.length
        };
    },

    /**
     * Compute hash of text for quick comparison
     * @param {string} text - Text to hash
     * @returns {string} Hash string
     */
    computeHash (text) {
        let hash = 0;
        if (!text) return '0';

        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }

        return hash.toString(16);
    },

    /**
     * Compare two texts for equality
     * @param {string} textA - First text
     * @param {string} textB - Second text
     * @returns {boolean} True if equal
     */
    areEqual (textA, textB) {
        return textA === textB;
    }
};

export default MyersDiff;
