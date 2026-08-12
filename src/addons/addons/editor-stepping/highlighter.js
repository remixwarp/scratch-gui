const SVG_NS = "http://www.w3.org/2000/svg";

const containerSvg = document.createElementNS(SVG_NS, "svg");
// unfortunately we can't use display: none on this as that breaks filters
containerSvg.style.position = "fixed";
containerSvg.style.top = "-999999px";
containerSvg.style.width = "0";
containerSvg.style.height = "0";
document.body.appendChild(containerSvg);

// 执行流箭头样式与动画
const arrowStyle = document.createElement("style");
arrowStyle.textContent = `
  .rw-step-arrow {
    width: 0;
    height: 0;
    border-left: 11px solid #ffab19;
    border-top: 7px solid transparent;
    border-bottom: 7px solid transparent;
    position: fixed;
    z-index: 2147483000;
    pointer-events: none;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.45));
    animation: rw-step-pulse 0.5s ease-in-out infinite;
  }
  @keyframes rw-step-pulse {
    0%, 100% { transform: translateX(0); opacity: 1; }
    50% { transform: translateX(5px); opacity: 0.65; }
  }
`;
document.head.appendChild(arrowStyle);

let nextGlowerId = 0;

const highlightsPerElement = new WeakMap();

const getHighlightersForElement = (element) => {
  if (!highlightsPerElement.get(element)) {
    highlightsPerElement.set(element, new Set());
  }
  return highlightsPerElement.get(element);
};

const updateHighlight = (element, highlighters) => {
  let result;
  for (const i of highlighters) {
    if (!result || i.priority > result.priority) {
      result = i;
    }
  }
  if (result) {
    element.style.filter = result.filter;
  } else {
    element.style.filter = "";
  }
};

const addHighlight = (element, highlighter) => {
  const highlighters = getHighlightersForElement(element);
  highlighters.add(highlighter);
  updateHighlight(element, highlighters);
};

const removeHighlight = (element, highlighter) => {
  const highlighters = getHighlightersForElement(element);
  highlighters.delete(highlighter);
  updateHighlight(element, highlighters);
};

class Highlighter {
  constructor(priority, color) {
    this.priority = priority;

    const id = `sa_glower_filter${nextGlowerId++}`;
    this.filter = `url("#${id}")`;

    this.previousElements = new Set();

    const filterElement = document.createElementNS(SVG_NS, "filter");
    filterElement.id = id;
    filterElement.setAttribute("width", "180%");
    filterElement.setAttribute("height", "160%");
    filterElement.setAttribute("x", "-40%");
    filterElement.setAttribute("y", "-30%");

    const filterBlur = document.createElementNS(SVG_NS, "feGaussianBlur");
    filterBlur.setAttribute("in", "SourceGraphic");
    filterBlur.setAttribute("stdDeviation", "4");
    filterElement.appendChild(filterBlur);

    const filterTransfer = document.createElementNS(SVG_NS, "feComponentTransfer");
    filterTransfer.setAttribute("result", "outBlur");
    filterElement.appendChild(filterTransfer);

    const filterTransferTable = document.createElementNS(SVG_NS, "feFuncA");
    filterTransferTable.setAttribute("type", "table");
    filterTransferTable.setAttribute("tableValues", "0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1");
    filterTransfer.appendChild(filterTransferTable);

    const filterFlood = document.createElementNS(SVG_NS, "feFlood");
    filterFlood.setAttribute("flood-opacity", "1");
    filterFlood.setAttribute("result", "outColor");
    filterElement.appendChild(filterFlood);
    this.filterFlood = filterFlood;

    const filterComposite = document.createElementNS(SVG_NS, "feComposite");
    filterComposite.setAttribute("in", "outColor");
    filterComposite.setAttribute("in2", "outBlur");
    filterComposite.setAttribute("operator", "in");
    filterComposite.setAttribute("result", "outGlow");
    filterElement.appendChild(filterComposite);

    const filterFinalComposite = document.createElementNS(SVG_NS, "feComposite");
    filterFinalComposite.setAttribute("in", "SourceGraphic");
    filterFinalComposite.setAttribute("in2", "outGlow");
    filterFinalComposite.setAttribute("operator", "over");
    filterElement.appendChild(filterFinalComposite);

    containerSvg.appendChild(filterElement);
    this.setColor(color);
  }

  setColor(color) {
    this.filterFlood.setAttribute("flood-color", color);
  }

  // 在当前执行位置的积木左侧显示脉冲箭头指示
  setCurrentBlockArrow(blockId) {
    this.removeArrow();
    if (!blockId) return;
    const workspace = Blockly.getMainWorkspace();
    if (!workspace) return;
    const block = workspace.getBlockById(blockId);
    if (!block || !block.svgPath_ || typeof block.getBoundingRectangle !== "function") return;
    try {
      const rect = block.getBoundingRectangle();
      const metrics = workspace.getMetrics();
      const scale = workspace.scale || 1;
      const x = (rect.left - metrics.contentLeft) * scale + metrics.absoluteLeft - 16;
      const y = ((rect.top - metrics.contentTop) * scale + metrics.absoluteTop +
        ((rect.bottom - rect.top) * scale) / 2) - 7;
      const arrow = document.createElement("div");
      arrow.className = "rw-step-arrow";
      arrow.style.left = `${x}px`;
      arrow.style.top = `${y}px`;
      document.body.appendChild(arrow);
      this.arrowElement = arrow;
    } catch (e) {
      this.arrowElement = null;
    }
  }

  removeArrow() {
    if (this.arrowElement) {
      this.arrowElement.remove();
      this.arrowElement = null;
    }
  }

  setGlowingThreads(threads) {
    const elementsToHighlight = new Set();
    const workspace = Blockly.getMainWorkspace();
    let currentBlockId = null;

    if (workspace) {
      for (const thread of threads) {
        thread.stack.forEach((blockId) => {
          const block = workspace.getBlockById(blockId);
          if (!block) {
            return;
          }
          const childblock = thread.stack.find((i) => {
            let b = block;
            while (b.childBlocks_.length) {
              b = b.childBlocks_[b.childBlocks_.length - 1];
              if (i === b.id) return true;
            }
            return false;
          });
          if (!childblock && block.svgPath_) {
            const svgPath = block.svgPath_;
            elementsToHighlight.add(svgPath);
          }
        });
        // 记录每个线程栈顶作为"当前执行"位置指示
        if (thread.stack && thread.stack.length) {
          currentBlockId = thread.stack[thread.stack.length - 1];
        }
      }
    }

    for (const element of this.previousElements) {
      if (!elementsToHighlight.has(element)) {
        removeHighlight(element, this);
      }
    }
    for (const element of elementsToHighlight) {
      if (!this.previousElements.has(element)) {
        addHighlight(element, this);
      }
    }
    this.previousElements = elementsToHighlight;

    // 更新执行流箭头
    if (threads && threads.length) {
      this.setCurrentBlockArrow(currentBlockId);
    } else {
      this.removeArrow();
    }
  }
}

export default Highlighter;
