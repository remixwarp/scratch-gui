import { scratchToUCF } from "./ucf";

export const registerContextMenu = (vm: any) => {
  const menuItemId = window.Blockly.ContextMenu.addDynamicMenuItem(
    (items: any[], target: any) => {
      items.push({
        id: "nova-add-context",
        text: "加入对话",
        enabled: true,
        callback: () => {
          if (!target || !target.id || !vm.editingTarget) return;

          const targetId = target.id;
          const allBlocks = vm.editingTarget.blocks._blocks;
          console.log("[Bilup Nova Jump][contextMenu] raw target", target);
          console.log("[Bilup Nova Jump][contextMenu] target.id used as blockId", targetId);
          console.log("[Bilup Nova Jump][contextMenu] vm.editingTarget.id", vm.editingTarget.id);
          if (!allBlocks) return;

          const blocksArray = Object.values(allBlocks).map((b: any) => ({
            ...b,
            topLevel: b.id === targetId,
          }));

          const ucfText = scratchToUCF(blocksArray);
          if (ucfText) {
            console.log("[Bilup Nova Jump][contextMenu] dispatching attachment", {
              targetId: vm.editingTarget.id,
              blockId: targetId,
              ucfPreview: ucfText.slice(0, 150),
            });
            window.dispatchEvent(
              new CustomEvent("nova-add-context", {
                detail: {
                  content: ucfText,
                  targetId: vm.editingTarget.id,
                  blockId: targetId,
                  name: "选中积木",
                },
              }),
            );
          }
        },
      });
      return items;
    },
    {
      targetNames: ["blocks"],
    },
  );

  return {
    dispose: () => {
      window.Blockly.ContextMenu.deleteDynamicMenuItem(menuItemId);
    },
  };
};
