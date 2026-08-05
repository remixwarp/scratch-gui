/**
 * 将指定积木滚动到 Blockly 工作区可视区域。
 * 兼容 gandi-plugins ai-assistant 对 utils/block-helper 的引用。
 */
export const scrollBlockIntoView = (block: any, workspace: any) => {
  if (!block || !workspace) return;
  try {
    // Blockly 原生方式：让积木居中
    if (typeof workspace.centerOnBlock === "function") {
      const blockId = typeof block === "string" ? block : block.id;
      if (blockId) workspace.centerOnBlock(blockId);
    }
    // 确保积木可见
    if (typeof workspace.scrollBoundsIntoView === "function" && typeof block !== "string") {
      const svgRoot = block.svgRoot_ || (block.getSvgRoot && block.getSvgRoot());
      if (svgRoot) {
        const xy = block.getRelativeToSurfaceXY ? block.getRelativeToSurfaceXY() : { x: 0, y: 0 };
        const bounds = {
          left: xy.x,
          top: xy.y,
          right: xy.x + (svgRoot.getBBox ? svgRoot.getBBox().width : 100),
          bottom: xy.y + (svgRoot.getBBox ? svgRoot.getBBox().height : 40),
        };
        workspace.scrollBoundsIntoView(bounds);
      }
    }
  } catch (e) {
    // 静默忽略，不影响聊天流程
  }
};
