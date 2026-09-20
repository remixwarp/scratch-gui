export default async function ({ addon, console, msg }) {
  const paper = await addon.tab.traps.getPaper();

  //
  // Controls below editor
  //

  const createGroup = () => {
    const el = document.createElement("div");
    el.className = "sa-resize-group";
    return el;
  };

  const createButton = () => {
    const el = document.createElement("span");
    el.className = "sa-resize-button";
    el.setAttribute("role", "button");
    return el;
  };

  const createButtonImage = (name) => {
    const el = document.createElement("img");
    el.className = "sa-resize-image";
    el.draggable = false;
    el.dataset.image = name;
    el.loading = "lazy";
    el.src = addon.self.getResource("/" + name + ".svg") /* rewritten by pull.js */;
    return el;
  };

  const controlsGroup = createGroup();
  addon.tab.displayNoneWhileDisabled(controlsGroup, { display: "flex" });

  // Settings popup
  const settingPageWrapper = document.createElement("div");
  settingPageWrapper.className = "sa-resize-settings-wrapper";
  controlsGroup.appendChild(settingPageWrapper);

  const settingsPage = document.createElement("div");
  settingsPage.className = "sa-resize-settings";

  const setSettingsOpen = (open) => {
    settingsPage.dataset.visible = open ? "true" : "false";
    if (open) {
      updateDimensions();
    }
  };
  const areSettingsOpen = () => settingsPage.dataset.visible === "true";

  // Tip arrow
  const SVG_NS = "http://www.w3.org/2000/svg";
  const settingsTip = document.createElementNS(SVG_NS, "svg");
  settingsTip.setAttribute("class", "sa-resize-settings-tip");
  settingsTip.setAttribute("width", "14");
  settingsTip.setAttribute("height", "7");
  const settingsTipShape = document.createElementNS(SVG_NS, "polygon");
  settingsTipShape.setAttribute("class", "sa-resize-settings-polygon");
  settingsTipShape.setAttribute("points", "0,0 7,7 14,0");
  settingsTip.appendChild(settingsTipShape);
  settingsPage.appendChild(settingsTip);

  // Size section label
  const sizeLabel = document.createElement("div");
  sizeLabel.className = "sa-resize-settings-label sa-resize-settings-section-label";
  sizeLabel.textContent = msg("size");
  settingsPage.appendChild(sizeLabel);

  // Width input
  const widthContainer = document.createElement("label");
  widthContainer.className = "sa-resize-settings-line";
  const widthLabel = document.createElement("div");
  widthLabel.className = "sa-resize-settings-label";
  widthLabel.textContent = msg("width");
  widthContainer.appendChild(widthLabel);
  const widthInput = document.createElement("input");
  widthInput.className = "sa-resize-settings-input";
  widthInput.type = "number";
  widthInput.min = "1";
  widthInput.step = "0.001";
  widthInput.value = "100";
  widthContainer.appendChild(widthInput);
  settingsPage.appendChild(widthContainer);

  // Height input
  const heightContainer = document.createElement("label");
  heightContainer.className = "sa-resize-settings-line";
  const heightLabel = document.createElement("div");
  heightLabel.className = "sa-resize-settings-label";
  heightLabel.textContent = msg("height");
  heightContainer.appendChild(heightLabel);
  const heightInput = document.createElement("input");
  heightInput.className = "sa-resize-settings-input";
  heightInput.type = "number";
  heightInput.min = "1";
  heightInput.step = "0.001";
  heightInput.value = "100";
  heightContainer.appendChild(heightInput);
  settingsPage.appendChild(heightContainer);

  // Constrain proportions checkbox
  const constrainContainer = document.createElement("label");
  constrainContainer.className = "sa-resize-settings-line sa-resize-settings-constrain";
  const constrainCheckbox = document.createElement("input");
  constrainCheckbox.type = "checkbox";
  constrainCheckbox.checked = true;
  constrainContainer.appendChild(constrainCheckbox);
  const constrainLabel = document.createElement("div");
  constrainLabel.className = "sa-resize-settings-label";
  constrainLabel.textContent = msg("constrainProportions");
  constrainContainer.appendChild(constrainLabel);
  settingsPage.appendChild(constrainContainer);

  // Divider
  const divider = document.createElement("hr");
  divider.className = "sa-resize-settings-divider";
  settingsPage.appendChild(divider);

  // Position section label
  const posLabel = document.createElement("div");
  posLabel.className = "sa-resize-settings-label sa-resize-settings-section-label";
  posLabel.textContent = msg("position");
  settingsPage.appendChild(posLabel);

  // X input
  const xContainer = document.createElement("label");
  xContainer.className = "sa-resize-settings-line";
  const xLabel = document.createElement("div");
  xLabel.className = "sa-resize-settings-label";
  xLabel.textContent = msg("x");
  xContainer.appendChild(xLabel);
  const xInput = document.createElement("input");
  xInput.className = "sa-resize-settings-input";
  xInput.type = "number";
  xInput.step = "0.001";
  xInput.value = "0";
  xContainer.appendChild(xInput);
  settingsPage.appendChild(xContainer);

  // Y input
  const yContainer = document.createElement("label");
  yContainer.className = "sa-resize-settings-line";
  const yLabel = document.createElement("div");
  yLabel.className = "sa-resize-settings-label";
  yLabel.textContent = msg("y");
  yContainer.appendChild(yLabel);
  const yInput = document.createElement("input");
  yInput.className = "sa-resize-settings-input";
  yInput.type = "number";
  yInput.step = "0.001";
  yInput.value = "0";
  yContainer.appendChild(yInput);
  settingsPage.appendChild(yContainer);

  // Direction input (Scratch direction: 0 = right, 90 = up, counterclockwise positive, range -180..180)
  const directionContainer = document.createElement("label");
  directionContainer.className = "sa-resize-settings-line";
  const directionLabel = document.createElement("div");
  directionLabel.className = "sa-resize-settings-label";
  directionLabel.textContent = msg("direction");
  directionContainer.appendChild(directionLabel);
  const directionInput = document.createElement("input");
  directionInput.className = "sa-resize-settings-input";
  directionInput.type = "number";
  directionInput.min = "-180";
  directionInput.max = "180";
  directionInput.step = "0.001";
  directionInput.value = "0";
  directionContainer.appendChild(directionInput);
  settingsPage.appendChild(directionContainer);

  // Toggle button
  const toggleButton = createButton();
  toggleButton.addEventListener("click", (e) => {
    e.stopPropagation();
    if (areSettingsOpen()) {
      setSettingsOpen(false);
    } else {
      setSettingsOpen(true);
    }
  });
  toggleButton.title = msg("resize");
  toggleButton.appendChild(createButtonImage("icon"));
  controlsGroup.appendChild(toggleButton);

  document.body.addEventListener("click", (e) => {
    if (areSettingsOpen() && !e.target.matches(".sa-resize-group *")) {
      setSettingsOpen(false);
    }
  });

  // State
  let originalAspectRatio = 1;

  // Helper: round to at most 3 decimal places
  const toPrecision = (value) => {
    const rounded = Math.round(value * 1000) / 1000;
    return rounded;
  };

  // Normalize an angle to the range [-180, 180), matching Scratch's direction display
  const normalizeDirection = (value) => {
    let d = value % 360;
    if (d > 180) d -= 360;
    if (d <= -180) d += 360;
    return d;
  };

  // Get the dominant visual rotation (paper.js convention, clockwise positive) of an item
  // and its descendants. Scratch bakes item transforms into geometry (applyMatrix = true),
  // so the root item's matrix is usually identity and item.rotation is 0 even after rotating.
  // Recurse into children and pick the rotation of the largest child that actually has one.
  const getVisualRotation = (item) => {
    let bestRotation = 0;
    let bestArea = -1;
    const walk = (node) => {
      const area = Math.abs(node.bounds.width * node.bounds.height);
      const rotation = node.matrix.rotation;
      if (Math.abs(rotation) > 1e-9 && area > bestArea) {
        bestRotation = rotation;
        bestArea = area;
      }
      if (node.children) {
        for (const child of node.children) {
          walk(child);
        }
      }
    };
    walk(item);
    return bestRotation;
  };

  // For single Paths with applyMatrix = true the rotation is baked into the geometry and
  // cannot be recovered from any matrix, so keep track of rotations we apply ourselves.
  const rotationCache = new Map(); // item.id -> rotation

  const getItemRotation = (item) => {
    if (rotationCache.has(item.id)) {
      // If the rotation is still readable from a matrix (e.g. group children that
      // weren't baked), trust the visual value and sync the cache, so manual
      // rotations done outside this addon are picked up too.
      const visual = getVisualRotation(item);
      if (Math.abs(visual) > 1e-9 && Math.abs(visual - rotationCache.get(item.id)) > 1e-6) {
        rotationCache.set(item.id, normalizeDirection(visual));
      }
      return rotationCache.get(item.id);
    }
    return getVisualRotation(item);
  };

  const updateDimensions = () => {
    if (!paper || !paper.project) return;
    const items = paper.project.selectedItems;
    if (items.length === 0) return;

    let bounds = null;
    for (const item of items) {
      if (item instanceof paper.Layer || item.data?.isHelperItem || item.guide) continue;
      if (bounds) {
        bounds = bounds.unite(item.bounds);
      } else {
        bounds = item.bounds.clone();
      }
    }
    if (!bounds) return;

    // paper.js reports bounds at 2x resolution (ART_BOARD_WIDTH = 2 * SVG_ART_BOARD_WIDTH)
    // Divide by 2 to get the actual displayed size that user expects to see
    const w = toPrecision(bounds.width / 2);
    const h = toPrecision(bounds.height / 2);
    widthInput.value = w;
    heightInput.value = h;
    if (w > 0 && h > 0) {
      originalAspectRatio = w / h;
    }

    // Position (center of bounds, relative to canvas center, Y axis: up = positive)
    // Canvas center in display coords: (240, 180) for 480x360 stage
    xInput.value = toPrecision(bounds.center.x / 2 - 240);
    yInput.value = toPrecision(180 - bounds.center.y / 2);

    // Direction: paper.js rotation is clockwise positive (screen Y grows downward).
    // Scratch direction is also clockwise positive but offset by 90 degrees:
    // a non-rotated asset faces right by default, which is Scratch direction 90.
    // Scratch direction = 90 + rotation, normalized to [-180, 180).
    let totalRotation = 0;
    let rotCount = 0;
    for (const item of items) {
      if (item instanceof paper.Layer || item.data?.isHelperItem || item.guide) continue;
      totalRotation += getItemRotation(item);
      rotCount++;
    }
    if (rotCount > 0) {
      directionInput.value = toPrecision(normalizeDirection(90 + totalRotation / rotCount));
    }
  };

  // Debounced resize execution
  let resizeTimer = null;
  const doResize = () => {
    if (!paper || !paper.project) return;
    const items = paper.project.selectedItems;
    if (items.length === 0) return;

    const newWidth = parseFloat(widthInput.value);
    const newHeight = parseFloat(heightInput.value);
    if (isNaN(newWidth) || isNaN(newHeight) || newWidth <= 0 || newHeight <= 0) return;

    let bounds = null;
    const validItems = [];
    for (const item of items) {
      if (item instanceof paper.Layer || item.data?.isHelperItem || item.guide) continue;
      validItems.push(item);
      if (bounds) {
        bounds = bounds.unite(item.bounds);
      } else {
        bounds = item.bounds.clone();
      }
    }
    if (!bounds || validItems.length === 0) return;

    // paper.js uses 2x resolution (ART_BOARD_WIDTH = 2 * SVG_ART_BOARD_WIDTH)
    // Multiply user input by 2 to match paper.js coordinate space
    const currentWidth = bounds.width;
    const currentHeight = bounds.height;
    if (currentWidth === 0 || currentHeight === 0) return;

    const sx = (newWidth * 2) / currentWidth;
    const sy = (newHeight * 2) / currentHeight;

    // Scale each item directly around the selection center. (Avoid wrapping items in
    // a temporary Group: folding the group's transform back into children can corrupt
    // gradient fills, causing wrong colors.)
    for (const item of validItems) {
      item.scale(sx, sy, bounds.center);
    }

    // Update displayed values with precision
    widthInput.value = toPrecision(newWidth);
    heightInput.value = toPrecision(newHeight);
    if (newWidth > 0 && newHeight > 0) {
      originalAspectRatio = newWidth / newHeight;
    }

    // Sync position inputs after resize
    let syncBounds = null;
    for (const item of validItems) {
      if (syncBounds) {
        syncBounds = syncBounds.unite(item.bounds);
      } else {
        syncBounds = item.bounds.clone();
      }
    }
    if (syncBounds) {
      xInput.value = toPrecision(syncBounds.center.x / 2 - 240);
      yInput.value = toPrecision(180 - syncBounds.center.y / 2);
    }

    paper.view.update();

    // Update the bounding box selection handles to reflect the new size
    if (paper.tool && paper.tool.boundingBoxTool && typeof paper.tool.boundingBoxTool.setSelectionBounds === 'function') {
      paper.tool.boundingBoxTool.setSelectionBounds();
    }

    // Commit changes to SVG file via the paint editor's tool
    if (paper.tool && typeof paper.tool.onUpdateImage === 'function') {
      paper.tool.onUpdateImage();
    }
  };

  const scheduleResize = () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      doResize();
      resizeTimer = null;
    }, 50);
  };

  // Immediate resize on input change
  const onDimensionChange = () => {
    if (constrainCheckbox.checked && originalAspectRatio > 0) {
      // Determine which field was changed by checking which one doesn't match the constrained value
      const w = parseFloat(widthInput.value);
      const h = parseFloat(heightInput.value);
      if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return;
      const expectedH = toPrecision(w / originalAspectRatio);
      const expectedW = toPrecision(h * originalAspectRatio);
      // If width changed, constrain height; if height changed, constrain width
      if (h !== expectedH && w === toPrecision(expectedW)) {
        // height changed, so constrain width
        widthInput.value = expectedW;
      } else if (w !== expectedW && h === toPrecision(expectedH)) {
        // width changed, so constrain height
        heightInput.value = expectedH;
      }
    }
    scheduleResize();
  };

  widthInput.addEventListener("input", onDimensionChange);
  heightInput.addEventListener("input", onDimensionChange);

  // Debounced position move execution
  let moveTimer = null;
  const doMovePosition = () => {
    if (!paper || !paper.project) return;
    const items = paper.project.selectedItems;
    if (items.length === 0) return;

    const newX = parseFloat(xInput.value);
    const newY = parseFloat(yInput.value);
    if (isNaN(newX) || isNaN(newY)) return;

    let bounds = null;
    const validItems = [];
    for (const item of items) {
      if (item instanceof paper.Layer || item.data?.isHelperItem || item.guide) continue;
      validItems.push(item);
      if (bounds) {
        bounds = bounds.unite(item.bounds);
      } else {
        bounds = item.bounds.clone();
      }
    }
    if (!bounds || validItems.length === 0) return;

    // paper.js uses 2x resolution, multiply user input by 2
    // Convert from center-relative display coords to paper.js absolute coords
    // Y axis: user input up = positive, but paper.js Y increases downward
    const targetCenterX = (newX + 240) * 2;
    const targetCenterY = (180 - newY) * 2;
    const dx = targetCenterX - bounds.center.x;
    const dy = targetCenterY - bounds.center.y;

    for (const item of validItems) {
      item.translate(dx, dy);
    }

    // Force paper.js to repaint the canvas
    paper.view.update();

    // Update the bounding box selection handles to reflect the new position
    if (paper.tool && paper.tool.boundingBoxTool && typeof paper.tool.boundingBoxTool.setSelectionBounds === 'function') {
      paper.tool.boundingBoxTool.setSelectionBounds();
    }

    // Update displayed values with precision
    xInput.value = toPrecision(newX);
    yInput.value = toPrecision(newY);

    // Sync width/height inputs after position move
    let syncMoveBounds = null;
    for (const item of validItems) {
      if (syncMoveBounds) {
        syncMoveBounds = syncMoveBounds.unite(item.bounds);
      } else {
        syncMoveBounds = item.bounds.clone();
      }
    }
    if (syncMoveBounds) {
      widthInput.value = toPrecision(syncMoveBounds.width / 2);
      heightInput.value = toPrecision(syncMoveBounds.height / 2);
    }

    // Commit changes to SVG file via the paint editor's tool
    if (paper.tool && typeof paper.tool.onUpdateImage === 'function') {
      paper.tool.onUpdateImage();
    }
  };

  const scheduleMove = () => {
    if (moveTimer) clearTimeout(moveTimer);
    moveTimer = setTimeout(() => {
      doMovePosition();
      moveTimer = null;
    }, 50);
  };

  xInput.addEventListener("input", scheduleMove);
  yInput.addEventListener("input", scheduleMove);

  // Debounced direction (rotation) execution
  let directionTimer = null;
  const doRotate = () => {
    if (!paper || !paper.project) return;
    const items = paper.project.selectedItems;
    if (items.length === 0) return;

    const newDirection = parseFloat(directionInput.value);
    if (isNaN(newDirection)) return;

    let bounds = null;
    const validItems = [];
    let totalRotation = 0;
    for (const item of items) {
      if (item instanceof paper.Layer || item.data?.isHelperItem || item.guide) continue;
      validItems.push(item);
      totalRotation += getItemRotation(item);
      if (bounds) {
        bounds = bounds.unite(item.bounds);
      } else {
        bounds = item.bounds.clone();
      }
    }
    if (!bounds || validItems.length === 0) return;

    // paper.js rotation is clockwise positive; Scratch direction = 90 + rotation.
    // Rotating by +delta in paper.js increases Scratch direction by the same amount.
    const currentScratchDir = normalizeDirection(90 + totalRotation / validItems.length);
    let deltaScratch = normalizeDirection(newDirection) - currentScratchDir;
    // Take the shortest rotation path
    if (deltaScratch > 180) deltaScratch -= 360;
    if (deltaScratch < -180) deltaScratch += 360;
    if (deltaScratch === 0) return;

    // Rotate each item directly around the center of the selection bounds.
    // (Avoid wrapping items in a temporary Group: folding the group's transform
    // back into children can corrupt gradient fills, causing wrong colors.)
    for (const item of validItems) {
      // Read the rotation *before* rotating: for baked (applyMatrix = true) items
      // getVisualRotation() already sees the new angle after rotating, so adding
      // delta again would double-count it.
      const before = getItemRotation(item);
      item.rotate(deltaScratch, bounds.center);
      // Record the rotation we applied so it stays readable even when baked
      // into the geometry (applyMatrix = true).
      rotationCache.set(item.id, normalizeDirection(before + deltaScratch));
    }

    paper.view.update();

    // Update the bounding box selection handles to reflect the new rotation
    if (paper.tool && paper.tool.boundingBoxTool && typeof paper.tool.boundingBoxTool.setSelectionBounds === 'function') {
      paper.tool.boundingBoxTool.setSelectionBounds();
    }

    // Sync width/height/position inputs after rotation (bounds change when rotated)
    let syncBounds = null;
    for (const item of validItems) {
      if (syncBounds) {
        syncBounds = syncBounds.unite(item.bounds);
      } else {
        syncBounds = item.bounds.clone();
      }
    }
    if (syncBounds) {
      widthInput.value = toPrecision(syncBounds.width / 2);
      heightInput.value = toPrecision(syncBounds.height / 2);
      if (syncBounds.width > 0 && syncBounds.height > 0) {
        originalAspectRatio = (syncBounds.width / 2) / (syncBounds.height / 2);
      }
      xInput.value = toPrecision(syncBounds.center.x / 2 - 240);
      yInput.value = toPrecision(180 - syncBounds.center.y / 2);
    }

    // Update displayed direction value (normalized)
    directionInput.value = toPrecision(normalizeDirection(newDirection));

    // Commit changes to SVG file via the paint editor's tool
    if (paper.tool && typeof paper.tool.onUpdateImage === 'function') {
      paper.tool.onUpdateImage();
    }
  };

  directionInput.addEventListener("input", () => {
    if (directionTimer) clearTimeout(directionTimer);
    directionTimer = setTimeout(() => {
      doRotate();
      directionTimer = null;
    }, 50);
  });

  // Update visibility when selection changes
  const updateButtonVisibility = () => {
    if (!paper || !paper.project) {
      controlsGroup.style.display = "none";
      return;
    }
    const hasSelection = paper.project.selectedItems.length > 0;
    controlsGroup.style.display = hasSelection ? "" : "none";
    if (!hasSelection) {
      setSettingsOpen(false);
    }
  };

  addon.tab.redux.initialize();
  addon.tab.redux.addEventListener("statechanged", (e) => {
    const action = e.detail.action;
    if (
      action.type === "scratch-paint/selected-items/SET_SELECTED_ITEMS" ||
      action.type === "scratch-paint/modes/CHANGE_MODE" ||
      action.type === "scratch-paint/clipboard/SET_CLIPBOARD" ||
      action.type === "scratch-gui/targets/UPDATE_TARGET_LIST"
    ) {
      updateButtonVisibility();
    }
  });

  // Main loop
  const controlsLoop = async () => {
    let hasRunOnce = false;
    while (true) {
      const canvasControls = await addon.tab.waitForElement("[class^='paint-editor_canvas-controls']", {
        markAsSeen: true,
        reduxEvents: [
          "scratch-gui/navigation/ACTIVATE_TAB",
          "scratch-gui/mode/SET_PLAYER",
          "fontsLoaded/SET_FONTS_LOADED",
          "scratch-gui/locales/SELECT_LOCALE",
          "scratch-gui/targets/UPDATE_TARGET_LIST",
        ],
        reduxCondition: (state) =>
          state.scratchGui.editorTab.activeTabIndex === 1 && !state.scratchGui.mode.isPlayerOnly,
      });
      const zoomControlsContainer = canvasControls.querySelector("[class^='paint-editor_zoom-controls']");

      addon.tab.appendToSharedSpace({
        space: "paintEditorZoomControls",
        element: controlsGroup,
        order: 0,
      });
      settingPageWrapper.appendChild(settingsPage);

      if (!hasRunOnce) {
        hasRunOnce = true;
        const groupClass = zoomControlsContainer.firstChild.className;
        const buttonClass = zoomControlsContainer.firstChild.firstChild.className;
        const imageClass = zoomControlsContainer.firstChild.firstChild.firstChild.className;
        for (const el of document.querySelectorAll(".sa-resize-group")) {
          el.className += " " + groupClass;
        }
        for (const el of document.querySelectorAll(".sa-resize-button")) {
          el.className += " " + buttonClass;
        }
        for (const el of document.querySelectorAll(".sa-resize-image")) {
          el.className += " " + imageClass;
        }
        // Only register the polling interval once; each loop iteration used to add
        // another interval, accumulating timers over time.
        setInterval(updateButtonVisibility, 500);
      }

      updateButtonVisibility();
    }
  };

  controlsLoop();
}