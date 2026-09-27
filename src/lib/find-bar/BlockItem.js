export default class BlockItem {
    constructor (cls, procCode, labelID, y, opcode = null, searchText = null) {
        this.cls = cls;
        this.procCode = procCode;
        this.labelID = labelID;
        this.y = y;
        this.lower = procCode.toLowerCase();
        this.opcode = opcode;
        this.opcodeSearch = opcode ? opcode.toLowerCase() : null;
        /**
         * 额外的可搜索正文（例如注释的完整内容）。显示名通常只是它的一行摘要，
         * 但搜索应当能命中正文里的任意位置。
         * @type {?string}
         */
        this.searchText = searchText;
        this.searchTextLower = searchText ? searchText.toLowerCase() : null;
        /**
         * An Array of block ids
         * @type {Array.<string>}
         */
        this.clones = null;
        this.eventName = null;
    }

    /**
     * True if the blockID matches a block represented by this BlockItem
     * @param {string} id
     * @returns {boolean}
     */
    matchesID (id) {
        if (this.labelID === id) {
            return true;
        }
        if (this.clones) {
            for (const cloneID of this.clones) {
                if (cloneID === id) {
                    return true;
                }
            }
        }
        return false;
    }
}
