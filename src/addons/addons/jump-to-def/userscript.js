import Utils from "../find-bar/blockly/Utils.js";
export default async function ({ addon, msg, console }) {
  const utils = new Utils(addon);

  const Blockly = await addon.tab.traps.getBlockly();

  Object.defineProperty(Blockly.Gesture.prototype, "jumpToDef", {
    get() {
      return !addon.self.disabled;
    },
  });

  // 从 procedures_call 的 procCode 找到对应的 procedures_definition
  const findDefinition = (procCode) => {
    const topBlocks = utils.getWorkspace().getTopBlocks();
    for (const root of topBlocks) {
      if (root.type === "procedures_definition") {
        const label = root.getChildren()[0];
        const labelProcCode = label && label.getProcCode && label.getProcCode();
        if (labelProcCode && labelProcCode === procCode) {
          return root;
        }
      }
    }
    return null;
  };

  // 反向引用：查找所有调用指定自定义积木的 procedures_call 积木
  const findReferences = (procCode) => {
    const refs = [];
    const allBlocks = utils.getWorkspace().getAllBlocks(false);
    for (const block of allBlocks) {
      if (block.type === "procedures_call") {
        let callProcCode = null;
        if (typeof block.getProcCode === "function") {
          callProcCode = block.getProcCode();
        } else if (block.getProcedureInfo && block.getProcedureInfo()) {
          const info = block.getProcedureInfo();
          callProcCode = info.getCode && info.getCode();
        }
        if (callProcCode && callProcCode === procCode) {
          refs.push(block);
        }
      }
    }
    return refs;
  };

  // 反向引用游标：在定义积木上重复点击可循环浏览所有调用点
  let refCursor = -1;
  let lastProcCode = null;

  const _doBlockClick_ = Blockly.Gesture.prototype.doBlockClick_;
  Blockly.Gesture.prototype.doBlockClick_ = function () {
    if (!addon.self.disabled && (this.mostRecentEvent_.button === 1 || this.mostRecentEvent_.shiftKey)) {
      let block = this.startBlock_;
      for (; block; block = block.getSurroundParent()) {
        if (block.type === "procedures_call") {
          let findProcCode = null;
          if (typeof block.getProcCode === "function") {
            findProcCode = block.getProcCode();
          } else if (block.getProcedureInfo && block.getProcedureInfo()) {
            const info = block.getProcedureInfo();
            findProcCode = info.getCode && info.getCode();
          }
          if (findProcCode) {
            // 正向：调用点 → 定义
            const def = findDefinition(findProcCode);
            if (def) {
              utils.scrollBlockIntoView(def);
              return;
            }
          }
        }
        if (block.type === "procedures_definition") {
          // 反向：定义 → 所有调用点（反向引用查找）
          const label = block.getChildren()[0];
          let procCode = label && label.getProcCode && label.getProcCode();
          if (!procCode && block.getProcedureInfo && block.getProcedureInfo()) {
            const info = block.getProcedureInfo();
            procCode = info.getCode && info.getCode();
          }
          if (procCode) {
            const refs = findReferences(procCode);
            if (refs.length > 0) {
              // 连续点击定义积木可循环浏览引用
              if (lastProcCode !== procCode) {
                lastProcCode = procCode;
                refCursor = -1;
              }
              refCursor = (refCursor + 1) % refs.length;
              utils.scrollBlockIntoView(refs[refCursor]);
              return;
            }
          }
        }
      }
    }

    _doBlockClick_.call(this);
  };
}
