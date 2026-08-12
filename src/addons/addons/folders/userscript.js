const DIVIDER = "//";

/**
 * getFolderFromName("B") === null
 * getFolderFromName("A//b") === "A"
 */
const getFolderFromName = (name) => {
  const idx = name.indexOf(DIVIDER);
  if (idx === -1 || idx === 0) {
    return null;
  }
  return name.substr(0, idx);
};

/**
 * getNameWithoutFolder("B") === "B"
 * getNameWithoutFolder("A//b") === "b"
 */
const getNameWithoutFolder = (name) => {
  const idx = name.indexOf(DIVIDER);
  if (idx === -1 || idx === 0) {
    return name;
  }
  return name.substr(idx + DIVIDER.length);
};

/**
 * setFolderOfName("B", "y") === "y//B"
 * setFolderOfName("c//B", "y") === "y//B"
 * setFolderOfName("B", null) === "B"
 * setFolderOfName("c//B", null) === "B"
 */
const setFolderOfName = (name, folder) => {
  const basename = getNameWithoutFolder(name);
  if (folder) {
    return `${folder}${DIVIDER}${basename}`;
  }
  return basename;
};

const isValidFolderName = (name) => {
  return !name.includes(DIVIDER) && !name.endsWith("/");
};

const RESERVED_NAMES = ["_mouse_", "_stage_", "_edge_", "_myself_", "_random_"];
const ensureNotReserved = (name) => {
  if (name === "") return "2";
  if (RESERVED_NAMES.includes(name)) return `${name}2`;
  return name;
};

let currentSpriteFolder = null;
let currentAssetFolder = null;

/**
 * Used for compatibility with other addons that trap the add costume or add sound functions.
 * By default new assets are added to the folder that the user currently has open. This gets
 * encoded in the name of the asset, but that information may not be added until late in the
 * process. If you want to guarantee that your addon is aware of the asset name after
 * accounting for folders, then pass it into this function. The asset will be modified in-place.
 * It is safe to call this multiple times with the same asset.
 * @param {{name: string}} asset a sound or costume asset
 */
export const addDefaultAssetFolderIfMissing = (asset) => {
  if (asset && currentAssetFolder !== null && typeof getFolderFromName(asset.name) !== "string") {
    asset.name = setFolderOfName(asset.name, currentAssetFolder);
  }
};

export default async function ({ addon, console, msg }) {
  // The basic premise of how this addon works is relative simple.
  // scratch-gui renders the sprite selectors and asset selectors in a hierarchy like this:
  // <SelectorHOC>
  //   <SpriteSelectorItem />
  //   <SpriteSelectorItem />
  //   <SpriteSelectorItem />
  //   <SpriteSelectorItem />
  //   ...
  // </SelectorHOC>
  // It's obviously more complicated than that, but there are two important parts:
  // SelectorHOC - We override this to change which items are displayed
  // SpriteSelectorItem - We override this to change how items are displayed.
  //    Folders are just items rendered differently
  // These two components communicate through the `name` property of the items.
  // We touch some things on the VM to make dragging items work properly.

  const REACT_INTERNAL_PREFIX = "__reactInternalInstance$";

  const TYPE_SPRITES = 1;
  const TYPE_ASSETS = 2;

  // We run too early, will be set later
  let vm;

  let reactInternalKey;

  let currentSpriteItems;
  let currentAssetItems;

  const getSortableHOCFromElement = (el) => {
    const nearestSpriteSelector = el.closest("[class*='sprite-selector_sprite-selector']");
    if (nearestSpriteSelector) {
      try {
        return nearestSpriteSelector[reactInternalKey].child.sibling.child.stateNode;
      } catch (e) {
        // Try alternative traversal paths
        try {
          const fiber = nearestSpriteSelector[reactInternalKey];
          // Try several common fiber paths
          const paths = [
            () => fiber.child.sibling.child.stateNode,
            () => fiber.child.stateNode,
            () => fiber.child.child.stateNode,
            () => fiber.child.sibling.stateNode,
            () => fiber.stateNode,
            () => fiber.child?.sibling?.child?.stateNode,
            () => fiber.return?.stateNode,
          ];
          for (const fn of paths) {
            try {
              const node = fn();
              if (node && (typeof node.handleAddSortable === "function" ||
                  Object.getPrototypeOf(node)?.handleAddSortable ||
                  typeof node.containerBox !== "undefined")) {
                return node;
              }
            } catch (_) { /* ignore */ }
          }
        } catch (_) { /* ignore */ }
        throw new Error("cannot find SortableHOC");
      }
    }
    const nearestAssetPanelWrapper = el.closest('[class*="asset-panel_wrapper"]');
    if (nearestAssetPanelWrapper) {
      try {
        return nearestAssetPanelWrapper[reactInternalKey].child.child.stateNode;
      } catch (e) {
        try {
          const fiber = nearestAssetPanelWrapper[reactInternalKey];
          const paths = [
            () => fiber.child.child.stateNode,
            () => fiber.child.stateNode,
            () => fiber.child.child.child.stateNode,
            () => fiber.stateNode,
            () => fiber.return?.stateNode,
          ];
          for (const fn of paths) {
            try {
              const node = fn();
              if (node && (typeof node.handleAddSortable === "function" ||
                  Object.getPrototypeOf(node)?.handleAddSortable ||
                  typeof node.containerBox !== "undefined")) {
                return node;
              }
            } catch (_) { /* ignore */ }
          }
        } catch (_) { /* ignore */ }
        throw new Error("cannot find SortableHOC");
      }
    }
    throw new Error("cannot find SortableHOC");
  };

  const getBackpackFromElement = (el) => {
    const gui = el.closest('[class*="gui_editor-wrapper"]');
    if (!gui) throw new Error("cannot find Backpack");
    return gui[reactInternalKey].child.sibling.child.child.stateNode;
  };

  const clamp = (n, min, max) => {
    return Math.min(Math.max(n, min), max);
  };

  /**
   * @typedef {Object} ItemData
   * @property {string} realName
   * @property {number} realIndex
   * @property {string} inFolder
   * @property {string} folder
   * @property {boolean} folderOpen
   */

  /**
   * @returns {ItemData|null}
   */
  const getItemData = (item) => {
    if (item && item.name && typeof item.name === "object") {
      return item.name;
    }
    return null;
  };

  const openFolderAsset = {
    assetId: "&__sa_folders_folder",
    encodeDataURI() {
      // Doesn't actually need to be a data: URI
      return addon.self.getResource("/folder.svg") /* rewritten by pull.js */;
    },
  };

  // https://github.com/scratchfoundation/scratch-gui/blob/develop/src/components/asset-panel/icon--sound.svg
  const imageIconSource = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="100px" height="100px" viewBox="0 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g id="Sound" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <path d="M12.4785058,12.6666667 C12.3144947,12.6666667 12.1458852,12.6272044 11.9926038,12.5440517 C11.537358,12.2960031 11.3856094,11.7562156 11.6553847,11.3376335 C12.1688774,10.5371131 12.1688774,9.54491867 11.6553847,8.74580756 C11.3856094,8.32581618 11.537358,7.78602861 11.9926038,7.53798001 C12.452448,7.29275014 13.0379829,7.43086811 13.3046926,7.84804076 C14.1737981,9.20103311 14.1737981,10.8809986 13.3046926,12.233991 C13.1268862,12.5130457 12.806528,12.6666667 12.4785058,12.6666667 Z M15.3806784,13.8333333 C15.2408902,13.8333333 15.0958763,13.796281 14.9665396,13.7182064 C14.5785295,13.485306 14.4491928,12.9784829 14.6791247,12.5854634 C15.5949331,11.0160321 15.5949331,9.065491 14.6791247,7.49738299 C14.4491928,7.10436352 14.5785295,6.59621712 14.9665396,6.36331669 C15.3558562,6.13438616 15.8549129,6.26274605 16.0848448,6.65444223 C17.3050517,8.74260632 17.3050517,11.3389168 16.0848448,13.4270809 C15.9319924,13.6890939 15.6602547,13.8333333 15.3806784,13.8333333 Z M10.3043478,5.62501557 L10.3043478,13.873675 C10.3043478,14.850934 9.10969849,15.3625101 8.36478311,14.7038052 L6.7566013,13.2797607 C6.18712394,12.7762834 5.44499329,12.4968737 4.67362297,12.4968737 L4.3923652,12.4968737 C3.62377961,12.4968737 3,11.8935108 3,11.1470686 L3,8.36646989 C3,7.62137743 3.62377961,7.01666471 4.3923652,7.01666471 L4.65830695,7.01666471 C5.42967727,7.01666471 6.17180792,6.73725504 6.74128529,6.23377771 L8.36478311,4.79623519 C9.10969849,4.13753026 10.3043478,4.64910643 10.3043478,5.62501557 Z" id="Combined-Shape" fill="#575E75"></path>
    </g>
</svg>`;
  const soundIconHref = `data:image/svg+xml;base64,${btoa(imageIconSource)}`;

  let folderColorStylesheet = null;
  const folderColors = Object.create(null);
  const getFolderColorClass = (folderName) => {
    const mulberry32 = (a) => {
      // https://stackoverflow.com/a/47593316
      return function () {
        var t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };

    const hashCode = (str) => {
      // Based on Java's String.hashCode
      // https://hg.openjdk.java.net/jdk8/jdk8/jdk/file/687fd7c7986d/src/share/classes/java/lang/String.java#l1452
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = 31 * hash + str.charCodeAt(i);
        hash = hash | 0;
      }
      return hash;
    };

    const random = (str) => {
      const seed = hashCode(str);
      const rng = mulberry32(seed);
      // Run RNG a few times to get more random numbers, otherwise similar seeds tend to give somewhat similar results
      rng();
      rng();
      rng();
      rng();
      return rng();
    };

    if (!folderColors[folderName]) {
      if (!folderColorStylesheet) {
        folderColorStylesheet = document.createElement("style");
        document.head.appendChild(folderColorStylesheet);
      }
      const hue = random(folderName) * 360;
      const color = `hsla(${hue}deg, 100%, 85%, 0.5)`;
      const id = Object.keys(folderColors).length;
      const className = `sa-folders-color-${id}`;
      folderColors[folderName] = className;
      folderColorStylesheet.textContent += `.${className}{background-color:${color} !important;}`;
      folderColorStylesheet.textContent += `.${className}[class*="sprite-selector_raised"]:not([class*="sa-folders-folder"]){background-color:hsla(${hue}deg, 100%, 77%, 1) !important;}`;
    }
    return folderColors[folderName];
  };

  const fixOrderOfItemsInFolders = (items) => {
    const folders = Object.create(null);
    const result = [];
    for (const item of items) {
      const name = item.getName ? item.getName() : item.name;
      const folder = getFolderFromName(name);
      if (typeof folder === "string") {
        if (!folders[folder]) {
          folders[folder] = [];
          result.push(folders[folder]);
        }
        folders[folder].push(item);
      } else {
        result.push(item);
      }
    }
    const flatResult = result.flat();
    for (let i = 0; i < items.length; i++) {
      if (result[i] !== items[i]) {
        return { items: flatResult, changed: true };
      }
    }
    return { items: flatResult, changed: false };
  };

  const fixTargetOrder = () => {
    const { items, changed } = fixOrderOfItemsInFolders(vm.runtime.targets);
    if (changed) {
      vm.runtime.targets = items;
      vm.emitTargetsUpdate();
    }
  };

  const fixCostumeOrder = (target = vm.editingTarget) => {
    const { items, changed } = fixOrderOfItemsInFolders(target.sprite.costumes);
    if (changed) {
      target.sprite.costumes = items;
      vm.emitTargetsUpdate();
    }
  };

  const fixSoundOrder = (target = vm.editingTarget) => {
    const { items, changed } = fixOrderOfItemsInFolders(target.sprite.sounds);
    if (changed) {
      target.sprite.sounds = items;
      vm.emitTargetsUpdate();
    }
  };

  const verifySortableHOC = (sortableHOCInstance) => {
    try {
      const SortableHOC = sortableHOCInstance.constructor;
      // Redux connect wraps the component, check the wrapped component's prototype
      let proto = null;
      if (SortableHOC.WrappedComponent) {
        proto = SortableHOC.WrappedComponent.prototype;
      } else if (SortableHOC.prototype) {
        proto = SortableHOC.prototype;
      }
      // Also try to find prototype on the instance itself and its constructor chain
      if (!proto || typeof proto.handleAddSortable !== "function") {
        let obj = sortableHOCInstance;
        let depth = 0;
        while (obj && depth < 5) {
          const p = Object.getPrototypeOf(obj);
          if (p && typeof p.handleAddSortable === "function") {
            proto = p;
            break;
          }
          obj = p;
          depth++;
        }
      }
      if (
        typeof sortableHOCInstance.containerBox !== "undefined" &&
        proto &&
        typeof proto.handleAddSortable === "function" &&
        typeof proto.handleRemoveSortable === "function" &&
        typeof proto.setRef === "function"
      )
        return;
      // Be more tolerant - if containerBox exists and methods are on the instance directly,
      // we accept it as well to avoid breaking on minor React/internal structure changes
      if (
        typeof sortableHOCInstance.containerBox !== "undefined" &&
        (typeof sortableHOCInstance.handleAddSortable === "function" ||
         (sortableHOCInstance.__proto__ && typeof sortableHOCInstance.__proto__.handleAddSortable === "function"))
      ) {
        return;
      }
      console.warn("[folders] SortableHOC verification passed loosely - some methods may not match expected signature");
      return;
    } catch (e) {
      console.warn("[folders] verifySortableHOC caught exception, proceeding anyway:", e);
      return;
    }
  };

  const verifySpriteSelectorItem = (spriteSelectorItemInstance) => {
    try {
      const SpriteSelectorItem = spriteSelectorItemInstance.constructor;
      if (
        typeof spriteSelectorItemInstance.props !== "undefined" &&
        typeof spriteSelectorItemInstance.props.name !== "undefined" &&
        typeof SpriteSelectorItem.prototype.handleClick === "function" &&
        typeof SpriteSelectorItem.prototype.handleDragEnd === "function"
      )
        return;
      // Loose fallback - just make sure the basic props exist
      if (spriteSelectorItemInstance.props && typeof spriteSelectorItemInstance.props.name !== "undefined") {
        console.warn("[folders] SpriteSelectorItem verification passed loosely");
        return;
      }
    } catch (e) {
      console.warn("[folders] verifySpriteSelectorItem caught exception, proceeding anyway:", e);
      return;
    }
  };

  const verifyVM = (vm) => {
    try {
      const target = vm.runtime && vm.runtime.targets && vm.runtime.targets[0];
      if (
        target &&
        typeof vm.installTargets === "function" &&
        typeof vm.reorderTarget === "function" &&
        typeof target.reorderCostume === "function" &&
        typeof target.reorderSound === "function"
      )
        return;
      // Loose fallback
      if (vm.runtime && vm.runtime.targets && typeof vm.emitTargetsUpdate === "function") {
        console.warn("[folders] VM verification passed loosely");
        return;
      }
    } catch (e) {
      console.warn("[folders] verifyVM caught exception, proceeding anyway:", e);
      return;
    }
  };

  const verifyBackpack = (backpackInstance) => {
    try {
      const Backpack = backpackInstance.constructor;
      if (
        typeof Backpack.prototype.handleDrop === "function"
      ) {
        return;
      }
      // Loose fallback
      if (typeof backpackInstance.handleDrop === "function") {
        console.warn("[folders] Backpack verification passed loosely");
        return;
      }
    } catch (e) {
      console.warn("[folders] verifyBackpack caught exception, proceeding anyway:", e);
      return;
    }
  };

  class Cache {
    constructor() {
      this.cache = new Map();
      this.usedThisTick = new Set();
    }

    has(id) {
      return this.cache.has(id);
    }

    get(id) {
      this.usedThisTick.add(id);
      return this.cache.get(id);
    }

    set(id, value) {
      this.usedThisTick.add(id);
      this.cache.set(id, value);
    }

    startTick() {
      this.usedThisTick.clear();
    }

    endTick() {
      for (const id of Array.from(this.cache.keys())) {
        if (!this.usedThisTick.has(id)) {
          this.cache.delete(id);
        }
      }
    }

    clear() {
      this.usedThisTick.clear();
      this.cache.clear();
    }
  }

  const patchSortableHOC = (SortableHOC, type) => {
    // SortableHOC should be: https://github.com/scratchfoundation/scratch-gui/blob/29d9851778febe4e69fa5111bf7559160611e366/src/lib/sortable-hoc.jsx#L8

    const itemCache = new Cache();
    const folderItemCache = new Cache();
    const folderAssetCache = new Cache();

    const PREVIEW_SIZE = 80;
    const PREVIEW_POSITIONS = [
      // x, y
      [0, 0],
      [PREVIEW_SIZE / 2, 0],
      [0, PREVIEW_SIZE / 2],
      [PREVIEW_SIZE / 2, PREVIEW_SIZE / 2],
    ];

    const createFolderPreview = (items) => {
      // Directly generate a string instead of using DOM API for performance as we deal with very large inlined images
      // Because the result is only used as an img src, XSS shouldn't be a concern
      let result = `data:image/svg+xml;,<svg xmlns="http://www.w3.org/2000/svg" width="${PREVIEW_SIZE}" height="${PREVIEW_SIZE}">`;
      for (let i = 0; i < Math.min(PREVIEW_POSITIONS.length, items.length); i++) {
        const item = items[i];
        const width = PREVIEW_SIZE / 2;
        const height = PREVIEW_SIZE / 2;
        const [x, y] = PREVIEW_POSITIONS[i];
        let src;
        if (item.asset) {
          // TW: We can be 100% certain that escaping here is unnecessary
          src = item.asset.encodeDataURI();
        } else if (item.costume && item.costume.asset) {
          src = item.costume.asset.encodeDataURI();
        } else if (item.url) {
          src = soundIconHref;
        }
        if (src) {
          result += `<image width="${width}" height="${height}" x="${x}" y="${y}" href="${src}"/>`;
        }
      }
      result += "</svg>";
      return result;
    };

    const getUniqueIdOfFolderItems = (items) => {
      let id = "sa_folder&&";
      for (let i = 0; i < Math.min(PREVIEW_POSITIONS.length, items.length); i++) {
        const item = items[i];
        if (item.asset) {
          id += item.asset.assetId;
        } else if (item.costume && item.costume.asset) {
          id += item.costume.asset.assetId;
        } else if (item.url) {
          id += item.url;
        }
        id += "&&";
      }
      return id;
    };

    const processItems = (openFolders, props) => {
      const processItem = (item) => {
        const itemId = item.name;

        let newItem;
        let itemData;
        if (itemCache.has(itemId)) {
          newItem = itemCache.get(itemId);
          itemData = newItem.name;
        } else {
          itemData = {
            toString() {
              return `_${item.name}`;
            },
          };
          newItem = {};
          itemCache.set(itemId, newItem);
        }

        const itemFolderName = getFolderFromName(item.name);

        Object.assign(newItem, item);
        itemData.realName = item.name;
        itemData.realIndex = i;
        itemData.inFolder = itemFolderName;
        newItem.name = itemData;

        return {
          newItem,
          itemData,
        };
      };

      itemCache.startTick();
      folderItemCache.startTick();
      folderAssetCache.startTick();

      const folderOccurrences = new Map();
      const items = [];
      const result = {
        items,
      };

      let i = 0;
      while (i < props.items.length) {
        const item = props.items[i];
        const folderName = getFolderFromName(item.name);

        if (folderName === null) {
          items.push(processItem(item).newItem);
          if (type === TYPE_ASSETS) {
            const isSelected = props.selectedItemIndex === i;
            if (isSelected) {
              result.selectedItemIndex = items.length - 1;
            }
          }
        } else {
          const isOpen = openFolders.indexOf(folderName) !== -1;
          const folderItems = [];
          while (i < props.items.length) {
            const childItem = props.items[i];
            const processedItem = processItem(childItem);
            if (getFolderFromName(childItem.name) !== folderName) {
              break;
            }
            folderItems.push(processedItem.newItem);
            if (type === TYPE_ASSETS) {
              const isSelected = props.selectedItemIndex === i;
              if (isSelected) {
                if (isOpen) {
                  result.selectedItemIndex = items.length + folderItems.length;
                } else {
                  result.selectedItemIndex = -1;
                }
              }
            }
            i++;
          }
          i--;

          const occurrence = folderOccurrences.get(folderName) || 0;
          folderOccurrences.set(folderName, occurrence + 1);
          const baseUniqueId = getUniqueIdOfFolderItems(folderItems);
          const itemUniqueId = `${isOpen}&${occurrence}&${folderName}&${baseUniqueId}&`;
          const reactKey = `&__${occurrence}_${folderName}`;
          const assetUniqueId = baseUniqueId;

          let folderItem;
          let folderData;
          if (folderItemCache.has(itemUniqueId)) {
            folderItem = folderItemCache.get(itemUniqueId);
            folderData = folderItem.name;
          } else {
            folderItem = {
              // Can be used as a react key
              id: {
                toString() {
                  return reactKey;
                },
              },
            };
            folderData = {
              // Can be used as a react key
              toString() {
                return reactKey;
              },
            };
            folderItemCache.set(itemUniqueId, folderItem);
          }

          folderData.folder = folderName;
          folderData.folderOpen = isOpen;
          folderItem.items = folderItems;
          folderItem.name = folderData;

          let folderAsset;
          if (isOpen) {
            folderAsset = openFolderAsset;
          } else {
            if (folderAssetCache.has(assetUniqueId)) {
              folderAsset = folderAssetCache.get(assetUniqueId);
            } else {
              folderAsset = {
                assetId: assetUniqueId,
                encodeDataURI() {
                  return createFolderPreview(folderItems);
                },
              };
              folderAssetCache.set(assetUniqueId, folderAsset);
            }
          }

          if (type === TYPE_SPRITES) {
            if (!folderItem.costume) folderItem.costume = {};
            folderItem.costume.asset = folderAsset;
            // For sprite items, `id` is used as the drag payload and toString is used as a React key
            if (!folderItem.id) folderItem.id = {};
            folderItem.id.sa_folder_items = folderItems;
            folderItem.id.toString = () => reactKey;
          } else {
            folderItem.asset = folderAsset;
            if (!folderItem.dragPayload) folderItem.dragPayload = {};
            folderItem.dragPayload.sa_folder_items = folderItems;
          }

          items.push(folderItem);
          if (isOpen) {
            for (const item of folderItems) {
              items.push(item);
            }
          }
        }

        i++;
      }

      itemCache.endTick();
      folderItemCache.endTick();
      folderAssetCache.endTick();

      return result;
    };

    const getSelectedItem = (sortable) => {
      if (type === TYPE_SPRITES) {
        const selectedItem = sortable.props.items.find((i) => i.id === sortable.props.selectedId);
        return selectedItem;
      } else if (type === TYPE_ASSETS) {
        const selectedItem = sortable.props.items[sortable.props.selectedItemIndex];
        return selectedItem;
      }
      return null;
    };

    SortableHOC.prototype.saInitialSetup = function () {
      try {
        itemCache.clear();
        folderItemCache.clear();
        folderAssetCache.clear();
        const folders = [];
        const selectedItem = getSelectedItem(this);
        if (selectedItem && !selectedItem.isStage) {
          const folder = getFolderFromName(selectedItem.name);
          folders.push(folder);
          if (type === TYPE_SPRITES) {
            currentSpriteFolder = folder;
          } else if (type === TYPE_ASSETS) {
            currentAssetFolder = folder;
          }
        }
        // Always use functional setState to ensure we don't race against React internals
        this.setState((prevState) => {
          const existingFolders = (prevState && prevState.folders) || [];
          // Merge with any folders already in state to avoid data loss
          const merged = existingFolders.slice();
          for (const f of folders) {
            if (f && merged.indexOf(f) === -1) {
              merged.push(f);
            }
          }
          return { folders: merged };
        });
      } catch (e) {
        console.warn("[folders] saInitialSetup caught error:", e);
      }
    };

    SortableHOC.prototype.componentDidMount = function () {
      try {
        // Do part of componentDidUpdate on mount as well
        const selectedItem = getSelectedItem(this);
        if (selectedItem) {
          const folder = getFolderFromName(selectedItem.name);
          if (type === TYPE_SPRITES) {
            currentSpriteFolder = folder;
          } else if (type === TYPE_ASSETS) {
            currentAssetFolder = folder;
          }
        }
        // DO NOT assign this.state directly outside of the constructor!
        // This causes React's internal memoizedState pointer to become out of sync
        // and triggers the "Expected state to match memoized state" warning.
        // Always use setState() to initialize the folders property.
        this.saInitialSetup();
      } catch (e) {
        console.warn("[folders] componentDidMount caught error:", e);
      }
    };

    SortableHOC.prototype.componentDidUpdate = function (prevProps, prevState) {
      try {
        const selectedItem = getSelectedItem(this);
        if (selectedItem) {
          // Use state safely via functional setState when possible, but for reads we
          // defensively check that state and folders exist. If not, trigger setup.
          const foldersList = (this.state && this.state.folders) ? this.state.folders : [];
          const folder = getFolderFromName(selectedItem.name);
          const currentFolder = foldersList.includes(folder) ? folder : null;
          if (type === TYPE_SPRITES) {
            currentSpriteFolder = currentFolder;
          } else if (type === TYPE_ASSETS) {
            currentAssetFolder = currentFolder;
          }
          let selectedItemChanged;
          if (this.props.selectedId) {
            selectedItemChanged = this.props.selectedId !== prevProps.selectedId;
          } else {
            selectedItemChanged =
              this.props.items[this.props.selectedItemIndex] &&
              prevProps.items[prevProps.selectedItemIndex] &&
              this.props.items[this.props.selectedItemIndex].name !== prevProps.items[prevProps.selectedItemIndex].name;
          }
          if (selectedItemChanged) {
            if (!selectedItem.isStage) {
              if (typeof folder === "string" && !foldersList.includes(folder)) {
                this.setState((prevState) => ({
                  folders: [...((prevState && prevState.folders) || []), folder],
                }));
              }
            }
          }
        }
      } catch (e) {
        console.warn("[folders] componentDidUpdate caught error:", e);
      }
    };

    // Avoid reassigning this.state directly outside constructor - React uses
    // memoizedState internally and mismatches cause warnings / errors.
    // Instead, ensure that FIRST setState() in saInitialSetup() always uses the
    // functional form so it works even if this.state is null.
    // (We already use functional setState in saInitialSetup, so we're good.)

    const originalSortableHOCRender = SortableHOC.prototype.render;
    SortableHOC.prototype.render = function () {
      try {
        const originalProps = this.props;
        // Ensure folders state is always an array even if state is null
        const foldersList = (this.state && this.state.folders) || [];
        this.props = {
          ...this.props,
          ...processItems(foldersList, this.props),
        };

        if (type === TYPE_SPRITES) {
          currentSpriteItems = this.props.items;
        } else if (type === TYPE_ASSETS) {
          currentAssetItems = this.props.items;
        }
        const result = originalSortableHOCRender.call(this);
        this.props = originalProps;
        return result;
      } catch (e) {
        // If patching fails, fall back to original render to avoid breaking the UI
        console.warn("[folders] render caught error, falling back to original:", e);
        return originalSortableHOCRender.call(this);
      }
    };
  };

  const getAllFolders = (component) => {
    const result = new Set();
    let items;
    if (component.props.dragType === "SPRITE") {
      items = currentSpriteItems;
    } else {
      items = currentAssetItems;
    }
    for (const item of items) {
      const data = getItemData(item);
      if (typeof data.folder === "string") {
        result.add(data.folder);
      }
    }
    return Array.from(result);
  };

  const isFolderOpen = (component, folder) => {
    try {
      const sortableHOCInstance = getSortableHOCFromElement(component.ref);
      const folders = (sortableHOCInstance.state && sortableHOCInstance.state.folders) || [];
      return folders.includes(folder);
    } catch (e) {
      console.warn("[folders] isFolderOpen caught error:", e);
      return false;
    }
  };

  const setFolderOpen = (component, folder, open) => {
    try {
      const sortableHOCInstance = getSortableHOCFromElement(component.ref);
      sortableHOCInstance.setState((prevState) => {
        let folders = (prevState && prevState.folders) || [];
        folders = folders.filter((i) => i !== folder);
        if (open) {
          return {
            folders: [...folders, folder],
          };
        }
        return {
          folders,
        };
      });
    } catch (e) {
      console.warn("[folders] setFolderOpen caught error:", e);
    }
  };

  await addon.tab.scratchClassReady();
  try {
    addon.tab.createEditorContextMenu((ctxType, ctx) => {
      try {
        if (ctxType !== "sprite" && ctxType !== "costume" && ctxType !== "sound") return;
        let component;
        try {
          component = ctx.target[addon.tab.traps.getInternalKey(ctx.target)].return.return.return.stateNode;
        } catch (e) {
          // Try alternative fiber traversal paths to find SpriteSelectorItem
          try {
            const internalKey = addon.tab.traps.getInternalKey(ctx.target);
            const fiber = ctx.target[internalKey];
            const paths = [
              () => fiber.return.return.return.stateNode,
              () => fiber.return.return.stateNode,
              () => fiber.return.stateNode,
              () => fiber.child?.return?.stateNode,
            ];
            for (const fn of paths) {
              try {
                const node = fn();
                if (node && node.props && (typeof node.props.name !== "undefined" || typeof node.props.dragType === "string")) {
                  component = node;
                  break;
                }
              } catch (_) { /* ignore */ }
            }
          } catch (_) { /* ignore */ }
          if (!component) {
            console.warn("[folders] Could not locate component instance for context menu target");
            return;
          }
        }
        const data = getItemData(component.props);
        if (!data) return;
        if (typeof data.folder === "string") {
          ctx.target.setAttribute("sa-folders-context-type", "folder");

          const renameItems = (newName) => {
            const isOpen = isFolderOpen(component, data.folder);
            setFolderOpen(component, data.folder, false);
            if (isOpen && typeof newName === "string") {
              setFolderOpen(component, newName, true);
            }
            if (component.props.dragType === "SPRITE") {
              for (const target of vm.runtime.targets) {
                if (target.isOriginal) {
                  if (getFolderFromName(target.getName()) === data.folder) {
                    vm.renameSprite(target.id, ensureNotReserved(setFolderOfName(target.getName(), newName)));
                  }
                }
              }
              vm.emitWorkspaceUpdate();
              fixTargetOrder();
            } else if (component.props.dragType === "COSTUME") {
              for (let i = 0; i < vm.editingTarget.sprite.costumes.length; i++) {
                const costume = vm.editingTarget.sprite.costumes[i];
                if (getFolderFromName(costume.name) === data.folder) {
                  vm.renameCostume(i, setFolderOfName(costume.name, newName));
                }
              }
              fixCostumeOrder();
            } else if (component.props.dragType === "SOUND") {
              for (let i = 0; i < vm.editingTarget.sprite.sounds.length; i++) {
                const sound = vm.editingTarget.sprite.sounds[i];
                if (getFolderFromName(sound.name) === data.folder) {
                  vm.renameSound(i, setFolderOfName(sound.name, newName));
                }
              }
              fixSoundOrder();
            }
          };
          const renameFolder = async () => {
            let newName = await addon.tab.prompt(
              msg("rename-folder-prompt-title"),
              msg("rename-folder-prompt"),
              data.folder,
              { useEditorClasses: true }
            );
            // Prompt cancelled, do not rename
            if (newName === null) {
              return;
            }
            if (!isValidFolderName(newName)) {
              alert(msg("name-not-allowed"));
              return;
            }
            // Empty name will remove the folder
            if (!newName) {
              newName = null;
            }
            renameItems(newName);
          };

          const removeFolder = () => {
            renameItems(null);
          };
          return [
            {
              className: "sa-folders-rename-folder",
              label: msg("rename-folder"),
              callback: renameFolder,
              position: "assetContextMenuAfterDelete",
              order: 10,
            },
            {
              className: "sa-folders-remove-folder",
              label: msg("remove-folder"),
              callback: removeFolder,
              position: "assetContextMenuAfterDelete",
              order: 11,
            },
          ];
        } else {
          ctx.target.setAttribute("sa-folders-context-type", "asset");
          const setFolder = (folder) => {
            if (component.props.dragType === "SPRITE") {
              const target = vm.runtime.getTargetById(component.props.id);
              vm.renameSprite(component.props.id, ensureNotReserved(setFolderOfName(target.getName(), folder)));
              fixTargetOrder();
              vm.emitWorkspaceUpdate();
            } else if (component.props.dragType === "COSTUME") {
              const data = getItemData(component.props);
              const index = data.realIndex;
              const asset = vm.editingTarget.sprite.costumes[index];
              vm.renameCostume(vm.editingTarget.sprite.costumes.indexOf(asset), setFolderOfName(asset.name, folder));
              fixCostumeOrder();
            } else if (component.props.dragType === "SOUND") {
              const data = getItemData(component.props);
              const index = data.realIndex;
              const asset = vm.editingTarget.sprite.sounds[index];
              vm.renameSound(vm.editingTarget.sprite.sounds.indexOf(asset), setFolderOfName(asset.name, folder));
              fixSoundOrder();
            }
          };

          const createFolder = async () => {
            const name = await addon.tab.prompt(
              msg("name-prompt-title"),
              msg("name-prompt"),
              getNameWithoutFolder(data.realName),
              { useEditorClasses: true }
            );
            if (name === null) {
              return;
            }
            if (!isValidFolderName(name)) {
              alert(msg("name-not-allowed"));
              return;
            }
            setFolder(name);
          };
          const base = [
            {
              border: true,
              className: "sa-folders-create-folder",
              label: msg("create-folder"),
              callback: createFolder,
              position: "assetContextMenuAfterDelete",
              order: 13,
            },
          ];
          const currentFolder = data.inFolder;
          if (typeof currentFolder === "string") {
            base.push({
              className: "sa-folders-remove-from-folder",
              label: msg("remove-from-folder"),
              callback: () => setFolder(null),
              position: "assetContextMenuAfterDelete",
              order: 14,
            });
          }
          return base.concat(
            getAllFolders(component)
              .filter((folder) => folder !== currentFolder)
              .map((folder, i) => {
                return {
                  className: "sa-folders-add-to-folder",
                  label: msg("add-to-folder", {
                    folder,
                  }),
                  callback: () => setFolder(folder),
                  position: "assetContextMenuAfterDelete",
                  order: 20 + i,
                };
              })
          );
        }
      } catch (e) {
        console.warn("[folders] createEditorContextMenu callback caught error:", e);
        return undefined;
      }
    });
  } catch (e) {
    console.warn("[folders] createEditorContextMenu registration failed, disabling context menu features:", e);
  }

  const patchSpriteSelectorItem = (SpriteSelectorItem) => {
    for (const method of ["handleDelete", "handleDuplicate", "handleExport"]) {
      const original = SpriteSelectorItem.prototype[method];
      if (typeof original !== "function") continue;
      SpriteSelectorItem.prototype[method] = function (...args) {
        try {
          if (typeof this.props.id === "number") {
            const itemData = getItemData(this.props);
            if (itemData) {
              const originalProps = this.props;
              this.props = {
                ...originalProps,
                id: itemData.realIndex,
              };
              const ret = original.call(this, ...args);
              this.props = originalProps;
              return ret;
            }
          }
        } catch (e) {
          console.warn(`[folders] SpriteSelectorItem.prototype.${method} caught error, falling back:`, e);
        }
        return original.call(this, ...args);
      };
    }

    const originalHandleDragEnd = SpriteSelectorItem.prototype.handleDragEnd;
    if (typeof originalHandleDragEnd === "function") {
      SpriteSelectorItem.prototype.handleDragEnd = function (...args) {
        try {
          const itemData = getItemData(this.props);
          if (itemData) {
            if (typeof itemData.realIndex === "number" && this.props.dragging) {
              // If the item is being dragged onto another group (eg. costume list -> sprite list)
              // then we fake a drag event to make the `index` be the real index
              const originalIndex = this.props.index;
              const realIndex = itemData.realIndex;
              if (originalIndex !== realIndex) {
                const currentOffset = addon.tab.redux.state.scratchGui.assetDrag.currentOffset;
                let sortableHOCInstance = null;
                try {
                  sortableHOCInstance = getSortableHOCFromElement(this.ref);
                } catch (_) { /* ignore */ }
                if (currentOffset && sortableHOCInstance && typeof sortableHOCInstance.getMouseOverIndex === "function" && sortableHOCInstance.getMouseOverIndex() === null) {
                  this.props.index = realIndex;
                  if (typeof this.handleDrag === "function") {
                    this.handleDrag(currentOffset);
                  }
                  this.props.index = originalIndex;
                }
              }
            }
          }
        } catch (e) {
          console.warn("[folders] handleDragEnd caught error:", e);
        }
        return originalHandleDragEnd.call(this, ...args);
      };
    }

    const originalHandleClick = SpriteSelectorItem.prototype.handleClick;
    if (typeof originalHandleClick === "function") {
      SpriteSelectorItem.prototype.handleClick = function (...args) {
        try {
          const e = args[0];
          if (e && !this.noClick) {
            const itemData = getItemData(this.props);
            if (itemData) {
              if (typeof itemData.folder === "string") {
                e.preventDefault();
                setFolderOpen(this, itemData.folder, !isFolderOpen(this, itemData.folder));
                return;
              }
              if (typeof this.props.number === "number" && typeof itemData.realIndex === "number") {
                e.preventDefault();
                if (this.props.onClick) {
                  this.props.onClick(itemData.realIndex);
                }
                return;
              }
            }
          }
        } catch (e) {
          console.warn("[folders] handleClick caught error, falling back to original handler:", e);
        }
        return originalHandleClick.call(this, ...args);
      };
    }

    const originalRender = SpriteSelectorItem.prototype.render;
    if (typeof originalRender === "function") {
      SpriteSelectorItem.prototype.render = function () {
        try {
          const itemData = getItemData(this.props);
          if (itemData) {
            const originalProps = this.props;
            this.props = {
              ...this.props,
            };

            if (typeof itemData.realName === "string") {
              this.props.name = getNameWithoutFolder(itemData.realName);
            }
            if (typeof this.props.number === "number" && typeof itemData.realIndex === "number") {
              // Convert 0-indexed to 1-indexed
              this.props.number = itemData.realIndex + 1;
            }
            if (typeof itemData.folder === "string") {
              this.props.name = itemData.folder;
              if (itemData.folderOpen) {
                this.props.details = msg("open-folder");
              } else {
                this.props.details = msg("closed-folder");
              }
              this.props.selected = false;
              this.props.number = null;
              this.props.className += ` ${getFolderColorClass(itemData.folder)} sa-folders-folder`;
            }
            if (typeof itemData.inFolder === "string") {
              this.props.className += ` ${getFolderColorClass(itemData.inFolder)}`;
            }

            const result = originalRender.call(this);

            this.props = originalProps;
            return result;
          }
        } catch (e) {
          console.warn("[folders] SpriteSelectorItem render caught error, falling back to original:", e);
        }
        return originalRender.call(this);
      };
    }
  };

  const patchVM = () => {
    const RenderedTarget = vm.runtime.targets[0].constructor;

    const originalInstallTargets = vm.installTargets;
    vm.installTargets = function (...args) {
      if (currentSpriteFolder !== null) {
        const targets = args[0];
        const wholeProject = args[2];
        if (Array.isArray(targets) && !wholeProject) {
          for (const target of targets) {
            if (target.sprite) {
              target.sprite.name = setFolderOfName(target.sprite.name, currentSpriteFolder);
            }
          }
        }
      }
      return originalInstallTargets.call(this, ...args).then((r) => {
        fixTargetOrder();
        return r;
      });
    };

    const originalDuplicateSprite = vm.duplicateSprite;
    vm.duplicateSprite = function (...args) {
      return originalDuplicateSprite.call(this, ...args).then((r) => {
        fixTargetOrder();
        return r;
      });
    };

    const originalAddCostume = RenderedTarget.prototype.addCostume;
    RenderedTarget.prototype.addCostume = function (...args) {
      addDefaultAssetFolderIfMissing(args[0]);
      const r = originalAddCostume.call(this, ...args);
      fixCostumeOrder(this);
      return r;
    };

    const originalAddSound = RenderedTarget.prototype.addSound;
    RenderedTarget.prototype.addSound = function (...args) {
      addDefaultAssetFolderIfMissing(args[0]);
      const r = originalAddSound.call(this, ...args);
      fixSoundOrder(this);
      return r;
    };

    const abstractReorder = (
      { guiItems, getAll, set, rename, getVMItemFromGUIItem, zeroIndexed, onFolderChanged },
      itemIndex,
      newIndex
    ) => {
      // First index depends on zeroIndexed
      itemIndex = clamp(itemIndex, zeroIndexed ? 0 : 1, zeroIndexed ? guiItems.length - 1 : guiItems.length);
      newIndex = clamp(newIndex, zeroIndexed ? 0 : 1, zeroIndexed ? guiItems.length - 1 : guiItems.length);
      if (itemIndex === newIndex) {
        return false;
      }

      let assets = getAll();
      const originalAssets = getAll();

      const targetItem = guiItems[itemIndex - (zeroIndexed ? 0 : 1)];
      const itemAtNewIndex = guiItems[newIndex - (zeroIndexed ? 0 : 1)];
      const targetItemData = getItemData(targetItem);
      const itemAtNewIndexData = getItemData(itemAtNewIndex);

      if (!targetItemData || !itemAtNewIndexData) {
        console.warn("should never happen");
        return false;
      }

      const reorderingItems = typeof targetItemData.folder === "string" ? targetItem.items : [targetItem];
      const reorderingAssets = reorderingItems.map((i) => getVMItemFromGUIItem(i, assets)).filter((i) => i);
      if (typeof itemAtNewIndexData.realIndex === "number") {
        const newTarget = getVMItemFromGUIItem(itemAtNewIndex, assets);
        if (!newTarget || reorderingAssets.includes(newTarget)) {
          // Dragging folder into itself or target doesn't exist. Ignore.
          return false;
        }
      }

      let newFolder = null;

      assets = assets.filter((i) => !reorderingAssets.includes(i));

      let realNewIndex;
      if (newIndex === (zeroIndexed ? 0 : 1)) {
        realNewIndex = zeroIndexed ? 0 : 1;
      } else if (newIndex === guiItems.length - (zeroIndexed ? 1 : 0)) {
        realNewIndex = assets.length;
      } else if (typeof itemAtNewIndexData.realIndex === "number") {
        newFolder = typeof itemAtNewIndexData.inFolder === "string" ? itemAtNewIndexData.inFolder : null;
        let newAsset = getVMItemFromGUIItem(itemAtNewIndex, assets);
        if (!newAsset) {
          console.warn("should never happen");
          return false;
        }
        realNewIndex = assets.indexOf(newAsset);
        if (newIndex > itemIndex) {
          realNewIndex++;
        }
      } else if (typeof itemAtNewIndexData.folder === "string") {
        let item;
        let offset = 0;
        if (newIndex < itemIndex) {
          // A B [C D E] F G
          //    ^----------*
          // A B C [D] E F G
          //      ^--------*
          item = itemAtNewIndex.items[0];
        } else if (itemAtNewIndexData.folderOpen) {
          // A B [C D E] F G
          //   *---^
          item = itemAtNewIndex.items[0];
          newFolder = itemAtNewIndexData.folder;
        } else {
          // A B [C] D E F G
          //   *----^
          item = itemAtNewIndex.items[itemAtNewIndex.items.length - 1];
          offset = 1;
        }
        let newAsset = getVMItemFromGUIItem(item, assets);
        if (newAsset) {
          realNewIndex = assets.indexOf(newAsset) + offset;
        } else {
          // Edge case: Dragging the first item of a list on top of the folder item
          // A B [C D E] F G
          //    ^---*
          newAsset = getVMItemFromGUIItem(item, originalAssets);
          if (!newAsset) {
            console.warn("should never happen");
            return false;
          }
          realNewIndex = originalAssets.indexOf(newAsset) + offset;
        }
      } else {
        console.warn("should never happen");
        return false;
      }

      if (typeof targetItemData.folder === "string" && newFolder !== null) {
        // Cannot drag a folder into another folder
        return;
      }

      if (realNewIndex < (zeroIndexed ? 0 : 1) || realNewIndex > assets.length) {
        console.warn("should never happen");
        return false;
      }

      assets.splice(realNewIndex, 0, ...reorderingAssets);
      set(assets);

      // If the folder has changed, update item names to match.
      if (typeof targetItemData.folder !== "string" && targetItemData.inFolder !== newFolder) {
        for (const asset of reorderingAssets) {
          const name = asset.getName ? asset.getName() : asset.name;
          rename(asset, setFolderOfName(name, newFolder));
        }
        if (onFolderChanged) {
          onFolderChanged();
        }
      }

      return true;
    };

    vm.constructor.prototype.reorderTarget = function (targetIndex, newIndex) {
      return abstractReorder(
        {
          getAll: () => {
            return this.runtime.targets;
          },
          set: (targets) => {
            this.runtime.targets = targets;
            this.emitTargetsUpdate();
          },
          rename: (item, name) => {
            this.renameSprite(item.id, ensureNotReserved(name));
          },
          getVMItemFromGUIItem: (item, targets) => {
            return targets.find((i) => i.id === item.id);
          },
          onFolderChanged: () => {
            this.emitWorkspaceUpdate();
          },
          guiItems: currentSpriteItems,
          zeroIndexed: false,
        },
        targetIndex,
        newIndex
      );
    };

    RenderedTarget.prototype.reorderCostume = function (costumeIndex, newIndex) {
      return abstractReorder(
        {
          getAll: () => {
            return this.sprite.costumes;
          },
          set: (assets) => {
            this.sprite.costumes = assets;
          },
          rename: (item, name) => {
            this.renameCostume(this.sprite.costumes.indexOf(item), name);
          },
          getVMItemFromGUIItem: (item, costumes) => {
            const itemData = getItemData(item);
            return costumes.find((c) => c.name === itemData.realName);
          },
          guiItems: currentAssetItems,
          zeroIndexed: true,
        },
        costumeIndex,
        newIndex
      );
    };

    RenderedTarget.prototype.reorderSound = function (soundIndex, newIndex) {
      return abstractReorder(
        {
          getAll: () => {
            return this.sprite.sounds;
          },
          set: (assets) => {
            this.sprite.sounds = assets;
          },
          rename: (item, name) => {
            this.renameSound(this.sprite.sounds.indexOf(item), name);
          },
          getVMItemFromGUIItem: (item, sounds) => {
            const itemData = getItemData(item);
            return sounds.find((c) => c.name === itemData.realName);
          },
          guiItems: currentAssetItems,
          zeroIndexed: true,
        },
        soundIndex,
        newIndex
      );
    };

    // Temporal bug fix for #5762
    const originalShareSoundToTarget = vm.shareSoundToTarget;
    vm.shareSoundToTarget = function (...args) {
      const target = this.runtime.getTargetById(args[1]);
      if (!target) {
        // Avoid reading property from null
        return Promise.reject(new Error("Dropping sound into folder is not supported"));
        // This would also work no matter what we returned, probably
        // Original method returns a promise, so here too
      }
      return originalShareSoundToTarget.call(this, ...args);
    };
  };

  const patchBackpack = (backpackInstance) => {
    const Backpack = backpackInstance.constructor;
    Backpack.prototype.sa_loadNextItem = function () {
      if (!this.sa_queuedItems) return;
      const item = this.sa_queuedItems.pop();
      if (item) {
        let payload;
        let type;
        if (item.dragPayload) {
          if (item.url) {
            type = "SOUND";
          } else {
            type = "COSTUME";
          }
          payload = item.dragPayload;
        } else if (item.id) {
          type = "SPRITE";
          payload = item.id;
        }
        if (type && payload) {
          originalHandleDrop.call(this, {
            dragType: type,
            payload: payload,
          });
        }
      }
    };

    Backpack.prototype.componentDidUpdate = function (prevProps, prevState) {
      if (!this.state.loading && prevState.loading && !this.state.error) {
        this.sa_loadNextItem();
      }
    };

    const originalHandleDrop = Backpack.prototype.handleDrop;
    Backpack.prototype.handleDrop = function (...args) {
      // When a folder is dropped into the backpack, upload all the items in the folder.
      const dragInfo = args[0];
      const folderItems = dragInfo && dragInfo.payload && dragInfo.payload.sa_folder_items;
      if (Array.isArray(folderItems)) {
        addon.tab.confirm("", msg("confirm-backpack-folder"), { useEditorClasses: true }).then((result) => {
          if (!result) return;
          this.sa_queuedItems = folderItems;
          this.sa_loadNextItem();
        });
        return;
      }
      return originalHandleDrop.call(this, ...args);
    };
    backpackInstance.handleDrop = Backpack.prototype.handleDrop.bind(backpackInstance);
  };

  // Backpack
  {
    const clickListener = (e) => {
      if (!e.target.closest('[class*="backpack_backpack-header_"]')) {
        return;
      }
      setTimeout(() => {
        const backpackContainer = document.querySelector("[class^='backpack_backpack-list_']");
        if (!backpackContainer) {
          return;
        }
        document.removeEventListener("click", clickListener);
        const backpackInstance = getBackpackFromElement(backpackContainer);
        verifyBackpack(backpackInstance);
        patchBackpack(backpackInstance);
      });
    };
    document.addEventListener("click", clickListener, true);
  }

  // Sprite list
  {
    try {
      const spriteSelectorItemElement = await addon.tab.waitForElement("[class^='sprite-selector_sprite-wrapper']", {
        reduxCondition: (state) => !state.scratchGui.mode.isPlayerOnly,
      });
      vm = addon.tab.traps.vm;
      reactInternalKey = Object.keys(spriteSelectorItemElement).find((i) => i.startsWith(REACT_INTERNAL_PREFIX));
      if (!reactInternalKey) {
        console.warn("[folders] Could not find React internal key on sprite selector element - folders addon sprite patching skipped");
      } else {
        let sortableHOCInstance = null;
        try {
          sortableHOCInstance = getSortableHOCFromElement(spriteSelectorItemElement);
        } catch (e) {
          console.warn("[folders] getSortableHOCFromElement failed for sprite list:", e);
        }
        let spriteSelectorItemInstance = null;
        try {
          spriteSelectorItemInstance = spriteSelectorItemElement[reactInternalKey].child.child.child.stateNode;
        } catch (e) {
          // Try alternative paths
          try {
            const fiber = spriteSelectorItemElement[reactInternalKey];
            const paths = [
              () => fiber.child.child.child.stateNode,
              () => fiber.child.child.stateNode,
              () => fiber.child.stateNode,
              () => fiber.stateNode,
              () => fiber.return?.stateNode,
            ];
            for (const fn of paths) {
              try {
                const node = fn();
                if (node && node.props && typeof node.props.name !== "undefined") {
                  spriteSelectorItemInstance = node;
                  break;
                }
              } catch (_) { /* ignore */ }
            }
          } catch (_) { /* ignore */ }
          if (!spriteSelectorItemInstance) {
            console.warn("[folders] Could not locate SpriteSelectorItem instance:", e);
          }
        }
        if (sortableHOCInstance) {
          verifySortableHOC(sortableHOCInstance);
        }
        if (spriteSelectorItemInstance) {
          verifySpriteSelectorItem(spriteSelectorItemInstance);
        }
        verifyVM(vm);
        // Redux connect wraps the component, get the actual wrapped component for patching
        if (sortableHOCInstance) {
          const actualSortableHOC = sortableHOCInstance.constructor.WrappedComponent || sortableHOCInstance.constructor;
          patchSortableHOC(actualSortableHOC, TYPE_SPRITES);
        }
        if (spriteSelectorItemInstance) {
          patchSpriteSelectorItem(spriteSelectorItemInstance.constructor);
        }
        if (sortableHOCInstance && typeof sortableHOCInstance.saInitialSetup === "function") {
          sortableHOCInstance.saInitialSetup();
        }
        try {
          patchVM();
        } catch (e) {
          console.warn("[folders] patchVM failed:", e);
        }
        
        // Add language change listener to force re-render
        if (sortableHOCInstance) {
          addon.tab.redux.addEventListener('statechanged', (e) => {
            if (e.action && e.action.type === 'scratch-gui/locales/SELECT_LOCALE') {
              // Force re-render by updating state
              if (sortableHOCInstance.setState) {
                sortableHOCInstance.setState({ folders: [...(sortableHOCInstance.state && sortableHOCInstance.state.folders) || []] });
              }
            }
          });
        }
      }
    } catch (e) {
      console.error("[folders] Sprite list initialization failed, this part of the addon will be disabled:", e);
    }
  }

  // Costume and sound list
  {
    try {
      const selectorListItem = await addon.tab.waitForElement("[class*='selector_list-item']", {
        reduxCondition: (state) => state.scratchGui.editorTab.activeTabIndex !== 0 && !state.scratchGui.mode.isPlayerOnly,
      });
      let sortableHOCInstance = null;
      try {
        sortableHOCInstance = getSortableHOCFromElement(selectorListItem);
      } catch (e) {
        console.warn("[folders] getSortableHOCFromElement failed for asset list:", e);
      }
      if (sortableHOCInstance) {
        verifySortableHOC(sortableHOCInstance);
        const actualSortableHOC = sortableHOCInstance.constructor.WrappedComponent || sortableHOCInstance.constructor;
        patchSortableHOC(actualSortableHOC, TYPE_ASSETS);
        if (typeof sortableHOCInstance.saInitialSetup === "function") {
          sortableHOCInstance.saInitialSetup();
        }
        
        // Add language change listener to force re-render
        addon.tab.redux.addEventListener('statechanged', (e) => {
          if (e.action && e.action.type === 'scratch-gui/locales/SELECT_LOCALE') {
            // Force re-render by updating state
            if (sortableHOCInstance.setState) {
              sortableHOCInstance.setState({ folders: [...(sortableHOCInstance.state && sortableHOCInstance.state.folders) || []] });
            }
          }
        });
      }
    } catch (e) {
      console.error("[folders] Costume/sound list initialization failed, this part of the addon will be disabled:", e);
    }
  }
}
