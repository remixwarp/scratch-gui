import {getItem as getStorageItem} from './utils/safe-storage.js';

const STORAGE_KEY = 'bl:frosted-glass';

const DEFAULT_SETTINGS = {
    enabled: false,
    blurRadius: 12,
    opacity: 0.25,
    // "深浅比值"：深色下在用户透明度基础上额外加的幅度（浅色不加）。
    // 越大 → 深浅两种主题的玻璃浓淡差异越明显；越小 → 越接近。
    // 可调范围 0.10–0.55（见设置页滑块）
    themeBoost: 0.15
};

// Style tag ID 前缀
const STYLE_ID_PREFIX = 'bl-frosted-glass-';

// MutationObserver 防抖间隔 (ms) — 避免频繁 DOM 变化(如 xterm 终端渲染)导致性能问题
const OBSERVER_DEBOUNCE_MS = 200;

// 缓存上一次应用时的参数，避免重复更新 style 标签
let _lastApplied = null;

// 缓存主题 RGB 值，避免频繁调用 getComputedStyle()
let _cachedRGB = null;

// Target elements
// CSS Module 类名格式: [name]_[local]_[hash:base64:5] (webpack config 配置)
// 因此必须使用属性选择器 [class*="..."] 来匹配 CSS Module 转换后的类名
const TARGETS = [
    // 窗口 — 编辑器内部弹出的窗口背景（如设置弹窗、扩展管理器等）
    // 覆盖三类窗口形态:
    //   1. windowed-modal 浮动窗口 → .addon-window(.addon-window-header + .addon-window-content > .modal-window-content)
    //   2. react-modal (常规模态框) → [class*="modal-content"].ReactModal__Content (CSS Module)
    //   3. AddonWindow / 命令式 createWindow / 复用窗口 → 内容直接挂在 .addon-window-content 下
    {
        id: 'window',
        labelId: 'bl.frostedGlass.target.window',
        defaultMessage: 'Window',
        css: (blur, alpha, r, g, b) => {
            // 玻璃面板色 / 卡片级淡玻璃底 / 底部发丝线
            // glassTint 是"窗口主体"用的淡玻璃，故意比用户设定更淡：
            // 窗口面积大，若用满 alpha 会像"半透明白板"，把背景压住 = 仍是纯色感。
            const glass = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            const glassTint = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.55).toFixed(3)})`;
            const cardGlass = `rgba(${r}, ${g}, ${b}, ${(alpha * 0.4).toFixed(3)})`;
            // 发丝线：深色主题用黑色线（白线在黑玻璃上过亮），浅色主题用白色线
            const isDarkRGB = r === 0 && g === 0 && b === 0;
            const hairline = isDarkRGB ?
                'inset 0 -1px 0 rgba(0, 0, 0, 0.28)' :
                'inset 0 -1px 0 rgba(255, 255, 255, 0.15)';
            // 模糊强度：窗口主体用满，标题栏/内容区减半，避免叠加后整体糊过头
            const blurSoft = Math.max(4, Math.round(blur * 0.5));
            // 完整 blur 表达式 —— 供 [S] 组"自承载玻璃浮层"直接拼进 backdrop-filter
            const glassBlur = `blur(${blur}px) saturate(150%)`;
            // 品牌色玻璃（[U] 组）：主题色按钮 / 大面积主题色块专用。
            // 不能简单地把品牌色降 alpha 了事，因为 hover 态用的是 $xxx-secondary-dark
            // 这类**另一个** token，透明化后与常态分不出层次。
            // 解法：常态把品牌色混到 alpha，hover 态不换色而是加深比例（视觉上更实）。
            const brandA = Math.round(alpha * 100); // 常态：与用户设定同档
            const brandAHover = Math.min(96, brandA + 18); // hover：更实，模拟"压深"
            // 品牌色混透的通用写法：color-mix 保留色相/饱和度，只降不透明度
            const brandGlass = (token, fallback, pct) =>
                `color-mix(in srgb, var(${token}, ${fallback}) ${pct}%, transparent)`;
            // 窗口内容可能挂在三类容器之下（透明化规则需覆盖全部祖先）：
            //   1. [class*="modal-content"] — React Modal / windowed-modal-content 内容容器
            //   2. .modal-window-content — WindowedModal 内容容器
            //   3. .addon-window-content — AddonWindow(React)、命令式 createWindow、
            //      以及 windowed-modal 复用已有窗口分支 (contentContainer = window.contentElement)
            const inside = '[class*="modal-content"], .modal-window-content, .addon-window-content';
            // ⚠ insideDescendant 必须用 :is() 包住！
            // inside 是"逗号列表"，直接拼 `'${inside} X'` 只会把 X 接到**最后一个**
            // 分支上，前两个分支变成裸选择器（历史写法，全模块如此，一直没暴露问题
            // 是因为裸的 [class*="modal-content"] / .modal-window-content 本来就该透明）。
            // 但当 X 自己也是一个带 [class*=] 的属性选择器、且语义要求"必须是后代"时，
            // 裸写会产生 [class*="a"][class*="b"] 这种"同一元素同时含两个子串"的
            // 永假条件，规则静默失效。凡是既可能被 addon-window 也可能被
            // React modal 承载的元素（如有），必须用 :is() 得到真正的后代匹配。
            const insideDescendant =
                ':is([class*="modal-content"], .modal-window-content, .addon-window-content) ';
            return `
/* ============================================================
   毛玻璃核心策略（与主题背景同源判断）
   ------------------------------------------------------------
   1) 判断来源只有一处：getThemeRGB() 读 documentElement 的 --color-scheme，
      深色 → 纯黑(0,0,0)，浅色 → 纯白(255,255,255)。
      下面所有 rgba(${r},${g},${b},... 都基于它，因此窗口不会再出现
      "与背景无关的固定色块"。
   2) backdrop-filter 只放在最外层固定定位元素(.addon-window)上。
      若放在内部子元素上，子元素与编辑器之间隔了窗口元素，无法正确穿透模糊。
   3) 窗口内每一层都只允许两种状态：
        透明 (transparent)  → 完全融入玻璃
        淡玻璃 (glassTint)  → 保留层级感，但仍是"背景色 + 模糊"，不是实色
      不允许出现 alpha=1 的纯色，也不允许出现与主题无关的固定色。
   ============================================================ */

/* 窗口主体 — 唯一的 backdrop-filter 承载层。
           同时清掉 window-theme 皮肤叠加的 backdrop-filter
           （macOS 在 .addon-window 上是 blur(30px) saturate(180%)），
           否则模糊强度由皮肤决定，与本模块 blurRadius 冲突、三种窗口样式观感不一致。
           使用 :not([class*="addon-window-"]) 排除子元素 (addon-window-header/btn/content 等)，
           确保只匹配到窗口容器本身。
           不限定 modal-window 类名，以覆盖所有插件窗口类型 (如 mw-alert-window 等)。 */
            [class*="addon-window"]:not([class*="addon-window-"]) {
                background-color: transparent !important;
                backdrop-filter: blur(${blur}px) saturate(150%) !important;
                -webkit-backdrop-filter: blur(${blur}px) saturate(150%) !important;
            }
            /* addon 窗口标题栏 — 也有不透明背景（window-manager.js 内联 var(--ui-primary)），
               需透明化让毛玻璃透过。
               ⚠ 特异性必须是 (0,2,0)：window-theme 的 macOS / Windows 10 样式会声明
               [.addon-window-header { background: var(--ui-secondary|--ui-tertiary) !important; }]，
               而这些主题样式由 mw-style-settings.js / 插件 userstyles 追加到 <body> 末尾
               （见 lib/mw-style-settings.js、addons/conditional-style.js，后者注释明确说明
               "放在 <body> 末尾以获得比 <head> 更高的优先级"），本模块却注入在 <head>。
               若这里用单类选择器，两者特异性同为 (0,1,0)，只能由文档顺序决定胜负 —— 主题永远赢，
               于是 macOS / Windows 10 下标题栏残留不透明底色（表现为"毛玻璃只有 MistWarp 样式生效"）。
               双属性选择器把特异性提到 (0,2,0)，使结果与样式表注入顺序无关。
               同时清掉主题额外叠加的 backdrop-filter（macOS: blur(20px)），
               让窗口模糊强度只由本模块的 blurRadius 决定，三种窗口样式观感一致。
               底色用 cardGlass（比窗口主体更淡的一档）：标题栏必须能被辨认出来，
               否则窗口会退化成"一整块无分区的玻璃"，用户看不出哪里能拖动。 */
            [class*="addon-window"][class*="addon-window-header"] {
                background-color: ${cardGlass} !important;
                backdrop-filter: none !important;
                -webkit-backdrop-filter: none !important;
            }
        /* React Modal 内容容器 — 直接渲染在 overlay 上、没有 addon-window 外层，
           所以它自己既是"面板"又是"唯一的模糊承载层"，必须用满 alpha 的 glass
           （它下面没有别的玻璃层可以借，用 glassTint 会糊不住 overlay）。 */
            [class*="modal-content"].ReactModal__Content {
                background-color: ${glass} !important;
                backdrop-filter: blur(${blur}px) saturate(150%) !important;
                -webkit-backdrop-filter: blur(${blur}px) saturate(150%) !important;
                box-shadow: ${hairline} !important;
            }
        /* React Modal 的遮罩层 — 原为 rgba(0,0,0,0.5) 一类深色实幕，
           会整体压暗背景，使毛玻璃"透出来的是黑"而不是编辑器界面。
           改为极淡的透视纱，让背景保留可辨识度（深色主题下略深一点保证文字对比）。
           注意：仅命中 overlay，不碰 modal-content 自身。 */
        [class*="modal-overlay"],
        .ReactModal__Overlay {
            background-color: rgba(${r}, ${g}, ${b}, ${isDarkRGB ? 0.18 : 0.06}) !important;
            backdrop-filter: blur(${blurSoft}px) !important;
            -webkit-backdrop-filter: blur(${blurSoft}px) !important;
        }
        /* 窗口内容区 — 由"实色面板"改为"自承载的淡玻璃层"。
           为什么不能只铺 background-color：window-theme 皮肤（macOS / Windows 10）
           会给 .addon-window-content 铺 var(--ui-modal-background) 实色并带 !important，
           若这里只改色不加模糊，内容区就是一层"半透明白板"——背景被压住，
           看起来仍是纯色窗口，达不到"没有纯色窗口"的目标。
           所以这里同时补上自己的 backdrop-filter：
             · 外层 .addon-window 的 blur 负责模糊"编辑器背景"
             · 内容区自己的 blur 负责模糊"标题栏 + 已透出的背景"，让面板边缘更柔
           模糊取 blurSoft（满值的一半），避免与外层叠加后糊成一片。
           同上：必须是 (0,2,0)，否则会被 window-theme 的
           [.addon-window-content { background: var(--ui-modal-background) !important; }]
           （注入在 <body> 末尾、同特异性）覆盖成纯色，内容区毛玻璃同样失效。 */
        [class*="addon-window"][class*="addon-window-content"] {
            background-color: ${glassTint} !important;
            box-shadow: ${hairline} !important;
            backdrop-filter: blur(${blurSoft}px) saturate(150%) !important;
            -webkit-backdrop-filter: blur(${blurSoft}px) saturate(150%) !important;
        }
        /* WindowedModal 内容容器 — 退为透明，玻璃面板已由 .addon-window-content 承担 */
        .modal-window-content {
            background-color: transparent !important;
        }
        /* ModalSidebar 布局（设置窗口等左侧菜单栏）— 整个侧栏区被铺了 $ui-modal-background
           （见 components/modal-sidebar/modal-sidebar.css 的 .layout / .sidebar / .content），
           这三条实底会把左侧菜单栏挡成一块纯黑，背景完全透不过来，
           表现为"右侧内容区是玻璃、左侧菜单栏是实色"，与窗口其余部分不一致。
           这里与其它区域同样处理：透明融入玻璃面板，只保留一条分隔线。
           类名来自 CSS Module，格式 [name]_[local]_[hash:base64:5]，
           故用 [class*="modal-sidebar_sidebar"] 前缀匹配（同时覆盖 sidebarWide/Narrow）。
           注意 .layout 与 .content 的兜底值已在上面 ${inside} [class*="layout"] /
           [class*="content"] 规则中透明化，这里补的是特异性更明确的 .sidebar 一条。 */
        [class*="modal-sidebar_sidebar"] {
            background-color: transparent !important;
        }
        [class*="modal-sidebar_layout"],
        [class*="modal-sidebar_content"] {
            background-color: transparent !important;
        }
        /* 侧栏内的菜单项本已是 transparent，但 hover 与选中态用的是
           $ui-tertiary / $looks-transparent 实色。在玻璃底上这些实色会破坏通透感，
           统一改为淡玻璃底，既保留交互反馈又不出现纯色块。
           用 glass 而非 cardGlass：侧栏之上已叠着窗口内容区的 glassTint，
           若再用最淡的一档，hover / 选中态在玻璃上几乎看不出变化。 */
        [class*="modal-sidebar_item"]:hover {
            background-color: ${glass} !important;
        }
        [class*="modal-sidebar_item"].itemSelected,
            [class*="modal-sidebar_itemSelected"] {
            background-color: ${glass} !important;
        }
/* ============================================================
   第二轮：全窗口实色清扫
   ------------------------------------------------------------
   上面的规则靠"祖先前缀 + 通配类名"覆盖窗口内部，但有四类实色逃逸：
     A) Modal 自己的 .header / .body（不在 addon-window-content 之下时）
     B) full-screen 模态框（整屏，$ui-secondary 实底）
     C) 分类色标题栏（$pen-tertiary 等品牌色，非 --ui-* 变量）
     D) 具体组件的根容器实底（各 modal 顶层 .body / .modalContent）
   逐类补齐在下面。
   ============================================================ */

/* [A] React Modal 的标题栏与主体。
       modal.css 里 .header 用 $ui-modal-header-background（深色 #333333）、
       .body 由各 modal 自己铺 $ui-modal-background（深色 #111111）。
       这两块加起来就是"整窗实色"——必须一起处理，只处理一个会留下半截实色条。
       标题栏给 cardGlass 保留分区辨识度，主体透明融入。

       ⚠ 类名是 modal_header_<hash>（CSS Module 下划线分隔），但属性子串匹配会误伤
       两类目标，必须排除：
         1. modal.css 自己的子元素 modal_headerItem / modal_headerImage /
            modal_headerItemTitle / modal_headerItemClose —— 它们是标题栏内部的
            图标、标题、关闭按钮位，若一起铺 cardGlass 会在标题栏上叠出多余色块。
            排除办法：:not([class*="modal_headerItem"]):not([class*="modal_headerImage"])
            （modal_headerItemTitle / ItemClose 含 "modal_headerItem"，一条即覆盖）
         2. modal-sidebar_header / telemetry-modal_header 等其它组件里
            恰好含 "modal_header" 子串的类名。
       最终只命中 modal.css 那个 header 容器本身。 */
        [class*="modal_header"]:not([class*="modal_headerItem"]):not([class*="modal_headerImage"]):not([class*="modal-sidebar_"]):not([class*="telemetry-modal_"]) {
            background-color: ${cardGlass} !important;
        }
        /* modal.css 的 .body（modal_body_<hash>）— 由各 modal 自己铺 $ui-modal-background。
           同样排除侧栏的 modal-sidebar_body，避免改到侧栏内部结构。 */
        [class*="modal_body"]:not([class*="modal-sidebar_"]) {
            background-color: transparent !important;
        }
        [class*="modal_contentArea"],
        [class*="modal_pageContent"] {
            background-color: transparent !important;
        }

/* [B] full-screen 模态框 — modal.css 的 .modal-content.full-screen 给同一个元素
       叠了两个类，铺 $ui-secondary（深色 #1e1e1e）整屏实底。
       ⚠ 第二个类经 CSS Module 转换后是 modal_fullScreen_<hash>（camelCase 保留、
       下划线分隔），不是字面的 "full-screen"。所以必须同时写两种形态：
       一种匹配转换后的类名，一种兜底匹配原始字面写法。
       它占满视口，需要自承载模糊，因此用满 alpha 的 glass。 */
        [class*="modal-content"][class*="modal_fullScreen"],
        [class*="modal-content"][class*="full-screen"] {
            background-color: ${glass} !important;
            backdrop-filter: blur(${blur}px) saturate(150%) !important;
            -webkit-backdrop-filter: blur(${blur}px) saturate(150%) !important;
        }

/* [C] 分类色标题栏 — 这类标题栏用的是 $pen-tertiary / $data-primary 等
       品牌色（如 connection-modal 的绿色标题栏 #0B8E69），不是 --ui-* 变量，
       所以前面的 ${r}/${g}/${b} 主题色规则完全没碰到它，它会以纯品牌色保留下来。
       这里不清除品牌色（那会丢掉窗口的类别识别），而是改成半透明的同色玻璃：
       用 color-mix 把品牌色与透明混合到 alpha 档位，再补上模糊。
       这样既保留"这是设备连接窗口"的颜色语义，又不再是纯色块。
       覆盖已知的分类色标题栏：connection-modal。 */
        [class*="connection-modal_header"] {
            background-color: color-mix(in srgb, var(--pen-tertiary, #0B8E69) ${Math.round(alpha * 100)}%, transparent) !important;
            backdrop-filter: blur(${blurSoft}px) saturate(150%) !important;
            -webkit-backdrop-filter: blur(${blurSoft}px) saturate(150%) !important;
        }

/* [D] 具体窗口组件的根容器实底 — 逐个 modal 的顶层容器铺了
       $ui-modal-background，且它们常不在 [class*="modal-content"] 之下
       （有的是窗口系统的 addon-window-content 直挂，有的自己就是根）。
       逐文件核对 components/**/*.css 后列出，全部透明化融入窗口玻璃。
       命名规律：<组件名>_<本地类名>_<hash>，故用 "<组件名>_" 前缀。 */
        [class*="browser-modal_modalContent"],
        [class*="browser-modal_body"],
        [class*="prompt_body"],
        [class*="prompt_modal-content"],
        [class*="record-modal_body"],
        [class*="record-modal_modalContent"],
        [class*="collaboration-modal_body"],
        [class*="collaboration-modal_modalContent"],
        [class*="custom-procedures_container"],
        [class*="assets-modal_body"],
        [class*="fonts-modal_body"],
        [class*="username-modal_body"],
        [class*="invalid-project-modal_body"],
        [class*="unknown-platform-modal_body"],
        [class*="project-metadata-modal_body"],
        [class*="project-theme-modal_body"],
        [class*="restore-point-modal_body"],
        [class*="shortcut-manager_body"],
        [class*="extension-manager-modal_body"],
        [class*="connection-modal_body"] {
            background-color: transparent !important;
            background: transparent !important;
        }

/* [E] 大面积装饰色块 — 这类不是窗口底层，而是内容里的一块彩色底板
       （browser-modal 的空状态插画区：300px 高、铺 $control-primary 品牌橙 #FFAB19，
       上面压一张 <img> 插画）。
       保持不透明时，它会成为窗口里最扎眼的一块纯色矩形，与四周玻璃格格不入。
       改成与其它窗口面同源的处理：透明化让背景透出，插画图仍原样浮在上方；
       同时给它一个很淡的玻璃底（cardGlass）替代原本的品牌色块，
       避免插画直接贴在编辑器背景上失去承载感。 */
        [class*="browser-modal_illustration"] {
            background-color: ${cardGlass} !important;
        }

/* 让窗口内部所有"区域级"容器透明，露出玻璃面板 */
        /* 使用基于模式的广泛选择器替代具体类名列表。内部(inside)祖先覆盖三类内容挂载点:
           - [class*="modal-content"]: React Modal / windowed-modal-content 内容容器
           - .modal-window-content: WindowedModal 内容容器
           - .addon-window-content: AddonWindow(React)/createWindow/复用分支内容区
           覆盖的布局容器:
           - [class*="body"]: 几乎所有模态框内容主体 (settings/connection/browser/telemetry/record/...)
           - [class*="header"]: 模态框标题栏；[class*="footer"]: 底部操作区
           - [class*="layout"] / [class*="sidebar"]: modal-sidebar 布局与侧边栏
           - [class*="content"]: modal-sidebar 右侧内容列 (modal-sidebar_content_*)、以及
             settings 等内容根 (settings-modal_modalContent_* 驼峰不匹配 [class*="modal-content"]，
             但命中此 [class*="content"])。addon-window-content / modal-window-content
             自身是"祖先"不会被自身后代规则命中，安全。
           - [class*="main"] / [class*="page"] / [class*="section"] / [class*="intro"]:
             媒体录制窗 (media-recorder_page/intro/section) 等整页/区块容器
           - [class*="bottom-area"]: connection-modal 底部；[class*="top-area"]: 顶部工具条
           - [class*="search-row"]: library 搜索栏
           - [class*="root"]: 插件窗口内容根元素 (help-modal, share-window) */
        ${inside} [class*="body"],
            ${inside} [class*="header"],
            ${inside} [class*="footer"],
            ${inside} [class*="layout"],
            ${inside} [class*="sidebar"],
            ${inside} [class*="content"],
            ${inside} [class*="main"],
            ${inside} [class*="page"],
            ${inside} [class*="root"],
            ${inside} [class*="bottom-area"],
            ${inside} [class*="top-area"],
            ${inside} [class*="search-row"],
            ${inside} [class*="section"],
            ${inside} [class*="intro"] {
            background-color: transparent !important;
        }
        /* 卡片级内容单元 (card/panel/tile) 不做纯色也不全透明，
           铺一层淡玻璃底维持层次感；深色下 alpha 已整体提升，淡底同样更暗保证可读。
           这里用 glass 而非 cardGlass：卡片之上还叠着内容区的 glassTint，
           若卡片也用 cardGlass，两层相加仍偏淡、卡片边界看不出来。 */
        ${inside} [class*="card"],
            ${inside} [class*="panel"],
            ${inside} [class*="tile"] {
            background-color: ${glass} !important;
        }
        /* ---- [W] 去叠色：上色只作用于"最外层"的卡片本体，内部子部件不再重复上色 ----
           为什么必须要这一步：CSS Module 编译出的类名是 文件名_local_哈希，
           于是宽匹配 [class*="card"] 会把同一组件里**所有以 card 开头的 local**
           一起命中。tw-extension-library 的 DOM 是
             .card > .card-select > .card-text > .card-name
           四层各铺一遍 55% 玻璃，叠起来是 1 - 0.45^4 ≈ 96% 的黑 ——
           用户 2026-09-25 截图里"卡片说明区变成黑框"就是这么来的：
           不是漏改，而是改重了。素材库卡片的 .library-item-name 同理（两层）。
           规则：命中上色族、且自身还嵌在另一个命中元素里的 → 撤销上色。
           写法要点（很重要，动这里之前先读懂）：
             · 祖先与白名单都包在 :where() 里把特异性归零，整条规则的特异性因此
               与上色规则**完全相同**（都是 (0,2,0)），只靠书写顺序取胜。
               于是所有写在更后面的、针对具体部件的规则（[I] 的 ct-panel、
               [U-2c] 的扩展库内嵌图标、[G] 的 ct-snapshot / style-option 等）
               依然按原样生效，本组不会误伤它们。
               反之，若给本组加高特异性（例如把祖先写成裸露的 :is()），
               就会压过后面那些规则 —— 别这么做。
             · 白名单 = 自身源样式就铺了实底的"子部件"。它们不是叠色，
               而是自己就是一块表面（图占位底、已加载徽标、内嵌图标底），
               撤掉底会比叠色更难看。
             · 只写 background-color，不写 background 简写：
               简写会把子部件的内联渐变（如自定义主题色卡的预览）一起清掉。
             · 加新上色族时的扫描办法：列出 src 下所有 css 中"选择器含该关键字
               且声明了不透明 background/background-color"的 local，
               与上色族的类名取交集 —— 交集里除了族根，就是需要进白名单的子部件。 */
        ${insideDescendant}:where([class*="card"], [class*="panel"], [class*="tile"])
            :is([class*="card"], [class*="panel"], [class*="tile"]):where(
                :not([class*="card-icon"]):not([class*="card-loaded-check"]):not([class*="card-inset-icon"]):
                :not([class*="left-card"]):not([class*="ct-card-swatch"]):not([class*="chart-card"]):
                :not([class*="memory-info-card"]) ) {
            background-color: transparent !important;
        }
        /* custom-procedures 的 .container 使用单独的 background 属性，用 background 简写覆盖 */
        ${inside} [class*="custom-procedures_container"] {
            background: transparent !important;
        }
        /* ---- 纯色 → 毛玻璃（与背景同款）第二波：功能窗口/行块/独立浮层 ----
           规则分级：
           T = 区域根/工具条：直接透明，融入 .addon-window-content 玻璃面板
           G = 内容块/卡片/行：改铺淡玻璃底 rgba(主题,α*0.4)，保持单元可辨
           S = 无 addon-window 祖先的独立浮层：需自承载 backdrop-filter */

        /* [T] 计算器窗口 — 整面实底 → 融入窗口玻璃 */
        .sa-calculator .calc-container,
        .sa-calculator .calc-display-container,
        .sa-calculator .calc-buttons {
            background: transparent !important;
            background-color: transparent !important;
        }
        /* [T] dev-inspector 窗口 — 内容根/侧栏/工具条 → 透明 */
        .dev-inspector-container,
        .dev-inspector-sidebar,
        .dev-inspector-pathbar,
        .dev-inspector-toolbar {
            background: transparent !important;
            background-color: transparent !important;
        }
        /* [T] 项目分析窗口顶部条 → 透明 */
        .sa-analyze-header {
            background: transparent !important;
            background-color: transparent !important;
        }

        /* [G] 素材库卡片 / 协作窗口用户·请求行 / Git 窗口行卡 / 登录特性卡 /
           遥测单选行块（CSS Module 前缀精确匹配，不误伤同名其它组件） */
        ${inside} [class*="library-item_library-item"],
        ${inside} [class*="collaboration-modal_userItem"],
        ${inside} [class*="collaboration-modal_requestItem"],
        ${inside} [class*="git-modal_remoteItem"],
        ${inside} [class*="git-modal_remoteRow"],
        ${inside} [class*="git-modal_conflictRow"],
        ${inside} [class*="rotur-login-modal_feature"],
        ${inside} [class*="rotur-login-modal_feature-coming"],
        ${inside} [class*="telemetry-modal_radio-buttons"] label {
            background-color: ${glass} !important;
        }
        /* ---- [W] 去叠色（素材库卡片同族）—— 与上面 card/panel/tile 同一原理：
           .library-item 的子部件 .library-item-image-container-wrapper /
           -image-container / -name 也含 "library-item_library-item" 子串，
           于是卡片本体与 .library-item-name 各铺一层 55% 黑，
           表现为"说明条比卡片明显更暗"。这里同样只保留最外层。
           白名单两项都是自身就有实底的子部件：
             .library-item-image（图片占位底）
             .library-item-inset-image-container（内嵌图标底，[U-2c] 另有专门规则）
           其余族（git-modal 的 remoteItem/chip、rotur 的 feature 等）经扫描确认
           没有"同族子部件 + 本身有实底"的情况，故不铺开，避免误伤。 */
        ${insideDescendant}:where([class*="library-item_library-item"])
            :is([class*="library-item_library-item"]):where(
                :not([class*="library-item-image"])
                :not([class*="library-item-inset-image"]) ) {
            background-color: transparent !important;
        }
        /* [G] 设置窗口里的大块行/编辑区（菜单栏编排行、主题快照、自定义主题编辑器、
           字体行、样式/对齐选择卡、分段/切换轨道）— 玻璃化而非实底 */
        ${inside} [class*="settings-modal_menu-bar-row"],
        ${inside} [class*="settings-modal_ct-snapshot"],
        ${inside} [class*="settings-modal_custom-themes-editor"],
        ${inside} [class*="settings-modal_font-row"],
        ${inside} [class*="settings-modal_style-option"],
        ${inside} [class*="settings-modal_align-option"],
        ${inside} [class*="settings-modal_ct-tabs"],
        ${inside} [class*="settings-modal_ct-mode-switch"] {
            background-color: ${glass} !important;
        }
        /* [G] 设置窗口的功能开关行（Setting 组件）— 这是"勾选后整行变实色块"的典型：
           设置项用 .setting 容器，勾选时加 .active 类，CSS 里 .setting.active 铺
           $badge-background（深色 #16202c 深蓝），hover 铺 $badge-border（#203652）。
           于是"高清画笔""循环计时器"这类**已开启**的开关会渲染成一整条实色矩形，
           在玻璃窗口里非常刺眼（截图反馈的就是这两行）。
           两个状态都要改成玻璃：选中态用 glass（要有明确"已开启"的存在感），
           hover 用 cardGlass（更淡的悬停提示）。
           注意 .setting 本身无背景（transparent），只有 active/hover 才有色 ——
           所以这两个未开启的开关行（"无限克隆"等）本来就是透的，无需处理。 */
        ${inside} [class*="settings-modal_setting"].active,
        ${inside} [class*="settings-modal_setting"][class*="settings-modal_active"] {
            background-color: ${glass} !important;
        }
        ${inside} [class*="settings-modal_setting"]:hover,
        ${inside} [class*="settings-modal_setting"]:focus-within {
            background-color: ${cardGlass} !important;
        }
        /* 同理处理设置窗口里其它"选中/激活"态的实色行（对齐选择卡选中态等） */
        ${inside} [class*="settings-modal_align-option-selected"],
        ${inside} [class*="settings-modal_style-option-selected"] {
            background-color: ${glass} !important;
        }
        /* [G] 其它窗口里的"行/状态块"实色 — 通病是：
           行本身 transparent，但 hover / 选中 / 状态态用 $badge-background（深色 #16202c）
           或 $badge-border（#203652）铺整块实色，在玻璃窗口里成为一条条纯色矩形。
           与上面 .setting.active 同类问题。
           类名逐个核对过源文件（local 名保持 camelCase / kebab-case 原样拼接 hash）：
             project-metadata-modal.css → .row / .status-good / .status-bad / .summary > div
             shortcut-manager.css      → .shortcutRow / .shortcutRowRecording
           注意按钮类（.refresh / .icon-button / .action-button 等）**不在此列**：
           它们是控件而非整行底板，hover 变实色属正常交互反馈，保留。 */
        ${inside} [class*="project-metadata-modal_row"]:hover,
        ${inside} [class*="project-metadata-modal_status-good"],
        ${inside} [class*="project-metadata-modal_status-bad"],
        ${inside} [class*="project-metadata-modal_summary"] > div,
        ${inside} [class*="shortcut-manager_shortcutRow"]:hover,
        ${inside} [class*="shortcut-manager_shortcutRowRecording"] {
            background-color: ${glass} !important;
        }
        /* [G] 项目分析窗口统计卡/图表/评分区/扩展列表（global 类） */
        .sa-analyze-section,
        .sa-analyze-stat,
        .sa-analyze-chart-container,
        .sa-analyze-score-details,
        .sa-analyze-extension-item {
            background: ${glass} !important;
            background-color: ${glass} !important;
        }

/* [H] 输入框 / 搜索框 / 文本域 —— 此前完全没覆盖的一整类逃逸实色。
       来源：表单输入类控件统一铺 $input-background（--input-background），
       深色主题是 #1e1e1e（几乎纯黑的实心条），浅色主题是 #ffffff（纯白条）。
       截图反馈的两处都属于这类：
         · 快捷键管理窗口的「搜索快捷键...」搜索框
           → shortcuts 用的是通用 <Input> 组件，类名是
             input_input-form_<hash> + shortcut-manager_searchInput_<hash>
         · 协作窗口的「房间ID」输入框 → collaboration-modal .input
       这是"窗口里最常见的实色矩形"，但因为它属于"表单控件"而非"面板"，
       之前的扫描一直按控件跳过了 —— 实际它面积大、数量多，最该玻璃化。
       处理：铺淡玻璃（cardGlass，比卡片更淡），保留边框；
       输入框本身不做 backdrop-filter（它下面已有窗口的玻璃层，再叠一层会糊）。
       注意排除与主题无关的固定色控件：
         · [type="color"] 是取色器，必须显示真实颜色，不能玻璃化
         · [type="range"] / slider 的轨道是语义指示器，保留
       ⚠ 用 ${inside} 前缀限定在窗口内，避免影响编辑器主体里的输入框。 */
        ${inside} input[type="text"],
        ${inside} input[type="search"],
        ${inside} input[type="number"],
        ${inside} input[type="email"],
        ${inside} input[type="password"],
        ${inside} input[type="url"],
        ${inside} input[type="tel"],
        ${inside} input:not([type]),
        ${inside} textarea,
        ${inside} [class*="input_input-form"],
        ${inside} [class*="input_input-small"] {
            background-color: ${cardGlass} !important;
            background: ${cardGlass} !important;
        }
        /* 输入框的 focus/hover 态：源样式改的是 border-color + box-shadow，
           不动背景，所以这里只需保证背景仍是玻璃（上面已覆盖），无需额外规则。
           但部分组件（如 settings-modal .setting input）会给 focus 加实底，补一条兜底。 */
        ${inside} input[type="text"]:focus,
        ${inside} input[type="search"]:focus,
        ${inside} input[type="number"]:focus,
        ${inside} textarea:focus {
            background-color: ${cardGlass} !important;
            background: ${cardGlass} !important;
        }
        /* 取色器反例：固定色控件，必须保留真实颜色 → 显式声明不覆盖它的背景。
           （不写任何规则即为不改，这里只作为文档锚点，避免以后误加。） */

/* [I] 下拉选择行 / 分段控件里的"选中但非激活"档位 —— 设置窗口里成片出现。
       来源：settings-modal.css 大量用 $ui-primary（深色 #111111）铺满整块：
         .select(123) / .style-option(166) / .align-option(226) / .menu-bar-row(259)
         / .font-row(599) / .ct-tabs(622) / .ct-button-secondary(843)
         / .ct-mode-switch(873) / .ct-textarea(992) / .custom-themes-editor(1093)
       其中 menu-bar-row / font-row / style-option / align-option / ct-tabs /
       ct-mode-switch / custom-themes-editor 已在上面 [G] 组玻璃化，这里补齐
       剩下几个此前漏掉的：
       注：这些多数是"容器/轨道"而非内容卡，用 cardGlass 更贴合层级。 */
        ${inside} [class*="settings-modal_select"],
        ${inside} [class*="settings-modal_ct-panel"],
        ${inside} [class*="settings-modal_ct-action-card"],
        ${inside} [class*="settings-modal_experimental-group"] {
            background-color: ${cardGlass} !important;
            background: ${cardGlass} !important;
        }
        /* ct-mode-switch 是"轨道"（外层浅底 + 内层按钮），轨道比按钮更淡才对：
           上面 [G] 已把它设成 glass，这里不重复，交给内层 .ct-mode-btn-selected
           的玻璃色来体现"选中"。 */

/* [J] 插件窗口（addon / createWindow 系列）—— 用户要求"顺便排查插件窗口"。
       插件窗口有三条渲染路径，底实色来源各不相同：
         ① WindowManager.createWindow → 内联 style 写
            background: var(--ui-modal-background)（深色 #111111）
         ② window-theme 插件的皮肤 CSS（macos/windows10.css）注入在 <body> 末尾，
            用 .addon-window / .addon-window-header / .addon-window-content 三个
            单类选择器 + !important，把背景写成 var(--ui-modal-background) /
            var(--ui-secondary)（macos 标题栏）/ var(--ui-tertiary)（windows10 标题栏）
         ③ 插件自己的 style.css（如 calculator 的 .calc-container 铺
            var(--ui-primary) #111111、.calc-display-container 铺 var(--ui-secondary)）
       ①②的对抗办法：用双属性选择器 [class*="addon-window"][class*="addon-window-header"]
       把特异性提到 (0,2,0)，压过皮肤的单类 (0,1,0)（本模块注入在 <head>，
       皮肤在 <body> 末尾，同特异性下后置优先，所以必须靠特异性赢）。
       ③ 插件自己的类名逐个列举，统一透明化/玻璃化。
       ⚠ 排除 .addon-window-btn（窗控按钮）：macos 皮肤用它做红黄绿三个圆点，
         那是设计意图；windows10 皮肤按钮本来透明。都不能玻璃化。 */
        [class*="addon-window"]:not([class*="addon-window-"]) {
            backdrop-filter: blur(${blur}px) saturate(150%) !important;
            -webkit-backdrop-filter: blur(${blur}px) saturate(150%) !important;
        }
        [class*="addon-window"][class*="addon-window-header"] {
            background-color: ${cardGlass} !important;
            background: ${cardGlass} !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
        }
        [class*="addon-window"][class*="addon-window-content"] {
            background-color: ${glassTint} !important;
            background: ${glassTint} !important;
            box-shadow: ${hairline} !important;
            backdrop-filter: blur(${blurSoft}px) saturate(150%) !important;
            -webkit-backdrop-filter: blur(${blurSoft}px) saturate(150%) !important;
        }
        /* window-theme 皮肤在 .addon-window-title 上不动背景，只动排版，无需处理。
           但皮肤把 .addon-window 的 border-radius / box-shadow 也改了 —— 那是外观
           设计，保留，所以这里不写 border-radius（尊重 macos 圆角 / win10 直角）。 */

        /* [J-1] 计算器插件窗口（calculator）
           style.css 里 .calc-container / .calc-buttons 铺 var(--ui-primary)，
           .calc-display-container 铺 var(--ui-secondary)，三块连起来就是整窗实底。
           calc-btn 是按钮（数字键/功能键/运算符），属控件级：
             · 数字键 .calc-btn-number 铺 var(--ui-primary)，面积大且成网格 → 玻璃化
             · 功能键 .calc-btn-function 铺 var(--ui-secondary) → 玻璃化
             · 运算符 / 等号铺 var(--looks-secondary) / var(--motion-primary)
               → 这两列是本窗仅有的**品牌色**，按 [U] 的规矩同样玻璃化，
                 否则一整窗玻璃里夹着 8 个饱和蓝方块（截图反馈的就是它们）。 */
        .sa-calculator .calc-container,
        .sa-calculator .calc-buttons,
        .sa-calculator .calc-display-container {
            background: transparent !important;
            background-color: transparent !important;
        }
        .sa-calculator .calc-btn-number,
        .sa-calculator .calc-btn-function {
            background: ${cardGlass} !important;
            background-color: ${cardGlass} !important;
        }
        .sa-calculator .calc-btn-operation,
        .sa-calculator .calc-btn-equals {
            background: ${brandGlass('--looks-secondary', '#4c97ff', brandA)} !important;
            background-color: ${brandGlass('--looks-secondary', '#4c97ff', brandA)} !important;
            border-color: ${brandGlass('--looks-secondary', '#4c97ff', brandA)} !important;
            backdrop-filter: ${glassBlur} !important;
            -webkit-backdrop-filter: ${glassBlur} !important;
        }
        .sa-calculator .calc-btn-equals {
            background: ${brandGlass('--motion-primary', '#4c97ff', brandA)} !important;
            background-color: ${brandGlass('--motion-primary', '#4c97ff', brandA)} !important;
        }
        /* hover：不换 token（否则会跳到 $xxx-secondary-dark 的另一个色），
           而是把混合比例推高 —— 视觉上"更实"，层次与原来一致 */
        .sa-calculator .calc-btn-operation:hover {
            background: ${brandGlass('--looks-secondary', '#4c97ff', brandAHover)} !important;
            background-color: ${brandGlass('--looks-secondary', '#4c97ff', brandAHover)} !important;
            border-color: ${brandGlass('--looks-secondary', '#4c97ff', brandAHover)} !important;
        }
        .sa-calculator .calc-btn-equals:hover {
            background: ${brandGlass('--motion-primary', '#4c97ff', brandAHover)} !important;
            background-color: ${brandGlass('--motion-primary', '#4c97ff', brandAHover)} !important;
            border-color: ${brandGlass('--motion-primary', '#4c97ff', brandAHover)} !important;
        }
        .sa-calculator .calc-btn-number:hover,
        .sa-calculator .calc-btn-function:hover {
            background: ${glass} !important;
            background-color: ${glass} !important;
        }

        /* [J-2] 待办插件窗口（todo）
           userstyle.css 里成片的实色（都是"行/块"级，非按钮）：
             .sa-todo-list-ele(52) / .sa-todo-modal-preview(188) 铺 var(--ui-tertiary)
             .sa-todo-mode-tab-btn.enable(429) 及 :hover/:active 铺 var(--ui-modal-background)
             .sa-todo-group-btn(372) 铺硬编码 #333
           → 前三类改玻璃；.sa-todo-group-btn 是分组标签胶囊，也统一玻璃化
             （它的 .active 态铺 var(--looks-secondary) 品牌色，保留）。
           其余 .sa-todo-add-todo / .sa-todo-modal-create-button 铺
           var(--looks-secondary) 是主操作按钮，保留。
           注意：todo 窗口用 createWindow，祖先有 .addon-window-content，
           所以用 ${inside} 前缀即可命中，不必写 .sa-todo- 全局前缀。 */
        ${inside} .sa-todo-list-ele,
        ${inside} .sa-todo-modal-preview,
        ${inside} .sa-todo-mode-tab-btn.enable,
        ${inside} .sa-todo-mode-tab-btn.unable,
        ${inside} .sa-todo-group-btn:not(.active) {
            background-color: ${cardGlass} !important;
            background: ${cardGlass} !important;
        }
        ${inside} .sa-todo-mode-tab-btn.enable:hover,
        ${inside} .sa-todo-mode-tab-btn.unable:hover,
        ${inside} .sa-todo-mode-tab-btn.enable:active,
        ${inside} .sa-todo-mode-tab-btn.unable:active {
            background-color: ${glass} !important;
            background: ${glass} !important;
        }

        /* [J-3] 变量管理插件窗口（variable-manager）
           根 .mw-vm 本就是 transparent，无需处理；但里面几处实色要玻璃化：
             .mw-vm-search(66) 铺 var(--input-background) → 已被上面 [H] 的
               ${inside} 输入框规则覆盖（它就是 <input>），此处不重复
             .mw-vm-value(328) 铺 var(--input-background) → 它是 textarea/input，
               同样被 [H] 覆盖
             .mw-vm-section-head(205) 铺 var(--ui-modal-background) → 需处理
                 （注意它是 position:sticky，必须不透明一点否则滚动内容会透出来，
                  所以用 glass 而非 cardGlass，保证文字压得住）
             .mw-vm-name:focus(295) 铺 var(--input-background) → 被 [H] focus 规则覆盖 */
        ${inside} .mw-vm-section-head {
            background: ${glass} !important;
            background-color: ${glass} !important;
        }
        ${inside} .mw-vm-segment {
            background: ${cardGlass} !important;
            background-color: ${cardGlass} !important;
        }
        /* .mw-vm-seg-active 铺 var(--looks-secondary) 品牌色 → 保留 */

        /* [J-4] 其它插件浮层/面板的零散实色 —— 逐个核对过源文件后统一处理。
           dev-inspector / simple-project-analyzer / settings-window 等已在
           上面 T 组或其它规则里透明化，这里补剩余几处。 */
        ${inside} [class*="settings-window_"] {
            background-color: transparent !important;
            background: transparent !important;
        }

/* [K] 快捷键管理窗口的状态条 + 键帽
       shortcut-manager.css 的 .toolbar(18) 铺 $ui-modal-background（深色 #111111）
       且 position:sticky —— 它就是截图里搜索框所在的那一条**通栏实底**，
       比搜索框本身更显眼（搜索框在它内部，两者叠加看起来才有"黑框"感）。
       sticky 元素必须有一定不透明度，否则滚动内容会从下面透出来，
       所以用 glass 而非 cardGlass。
       .resetAllButton:hover 铺 $ui-tertiary、.iconButton:hover 铺
       $ui-black-transparent（本身已是半透明），一并统一。
       .keycap / .hintKey 铺 $ui-primary 是"键帽"控件，保留实感更易读
       （它们尺寸小、成对出现，不是整片纯色）—— 判定为控件级，不改。 */
        ${inside} [class*="shortcut-manager_toolbar"] {
            background-color: ${glass} !important;
            background: ${glass} !important;
        }
        ${inside} [class*="shortcut-manager_resetAllButton"]:hover {
            background-color: ${glass} !important;
            background: ${glass} !important;
        }
        /* .recordPrompt 铺 $looks-transparent（本就半透明）+ 虚线边框，保留。
           .sectionDivider 用 border-top 虚线，不是背景，无需处理。 */

/* [L] 协作窗口（collaboration-modal）内剩余实色
       .body(11) 铺 $ui-modal-background → 已被 [D] 组覆盖（collaboration-modal_body）
       .input(292) 铺 $input-background → 已被上面 [H] 输入框规则覆盖
       剩余几处"行/卡"级实色：
         .userItem(462) / .requestItem(610) 铺 $badge-background（深色 #16202c）
         .currentUser(467) / .privacyOptionActive(588) 铺 $looks-transparent
         .editUsernameButton:active(222) / .settingsButton:hover(678) /
         .closeButton:hover(702) 铺 $badge-border
       userItem / requestItem 已在上面 [G] 组玻璃化，这里补状态态与其余几处。
       保留：.primaryButton / .secondaryButton / .dangerButton / .approveButton /
       .denyButton / .kickButton（按钮）、.hostBadge / .youBadge（徽标）、
       .statusIndicator（8px 状态点）、.alphaBanner / .privacyNotice /
       .joinError / .error（语义提示色块，用 $error-transparent /
       $motion-primary 8% 等半透明或品牌语义色）。 */
        ${inside} [class*="collaboration-modal_currentUser"],
        ${inside} [class*="collaboration-modal_privacyOptionActive"] {
            background-color: ${glass} !important;
            background: ${glass} !important;
        }
        ${inside} [class*="collaboration-modal_privacyOption"]:hover {
            background-color: ${cardGlass} !important;
            background: ${cardGlass} !important;
        }

/* [M] 素材库（library）搜索行 —— 与 [K] 的 toolbar 同源问题，
       是窗口顶部一条通栏实底（$ui-modal-background）。 */
        ${inside} [class*="library_search-row"],
        ${inside} [class*="library_searchRow"] {
            background-color: ${glass} !important;
            background: ${glass} !important;
        }

/* [S] 自承载玻璃浮层群 —— body 级 append、无 addon-window 祖先，
       主文档里 [J] 那套「窗体内 content 已铺玻璃、子层只需 transparent」的假设不成立，
       这些浮层必须自己同时给出底色 + backdrop-filter，才能吃到底下的编辑器实色。
       底下的实色来源（都是编辑器面板，不是 body）：
         · 积木画布 → blocks.workspace（深色 #1e1e1e / 浅色 #F9F9F9）
         · 编辑器主区 → gui_body-wrapper 的 $ui-primary（深色 #111111）
         · 舞台面板 → asset-panel.css 的 $assets-background（深色 #111111）
       —— 所以这些浮层的玻璃是真的能被看出来的，不是白做。 */

/* [S-1] 命令面板 spotlight */
        .sa-mcp-container {
            background-color: ${glass} !important;
            backdrop-filter: blur(${blur}px) saturate(150%) !important;
            -webkit-backdrop-filter: blur(${blur}px) saturate(150%) !important;
        }
        .sa-mcp-preview-container,
        .sa-mcp-status-bar {
            background-color: transparent !important;
        }

/* [S-2] 截图插件（canvas-screenshot）的预览浮层
       style.css:42 铺 var(--ui-modal-background)（深色 #111111）→ 深色下整块纯黑。
       userscript.js 里是 document.body.appendChild(preview)，无 addon-window 祖先，
       固定定位在右下角、只盖住舞台/画布一角，底下就是编辑器实色 → 自承载玻璃成立。
       投影（box-shadow）保留，浮层的立体感靠它而不是靠底色。 */
        .sa-screenshot-preview {
            background-color: ${glass} !important;
            background: ${glass} !important;
            backdrop-filter: blur(${blur}px) saturate(150%) !important;
            -webkit-backdrop-filter: blur(${blur}px) saturate(150%) !important;
        }
        /* 图片占位底（var(--ui-black-transparent)），跟着降一档 */
        .sa-screenshot-preview-image {
            background-color: ${cardGlass} !important;
            background: ${cardGlass} !important;
        }

/* [S-3] 查找条下拉（native find-bar）
       container 挂在 ul[class*=gui_tab-list_] 上 → 祖先链是
         .editor-wrapper → .flex-wrapper → .body-wrapper(gui_body-wrapper, $ui-primary 实色)
       下拉是 position:absolute 从积木画布区域弹出，底下是画布/编辑器实色 → 自承载玻璃成立。
       注意 .sa-find-input:focus 铺的是 $ui-white（深色 #111111）—— 它是输入框，
       按既有判定边界归为控件保留；但它在玻璃下拉的同一条轴上会形成"玻璃条 + 实底输入框"的断层，
       这里只统一普通态与 hover，focus 态一并纳入（否则点一下就闪回纯黑）。 */
        .sa-find-dropdown {
            background-color: ${glass} !important;
            background: ${glass} !important;
            backdrop-filter: ${glassBlur} !important;
            -webkit-backdrop-filter: ${glassBlur} !important;
        }
        .sa-find-input,
        .sa-find-input:focus {
            background-color: ${cardGlass} !important;
            background: ${cardGlass} !important;
        }
        /* 下拉里的整行 hover/selected 底板（$ui-tertiary） */
        .sa-find-dropdown > li:hover,
        .sa-find-dropdown > li.sel {
            background-color: ${cardGlass} !important;
            background: ${cardGlass} !important;
        }

/* [S-4] 角色文件夹（sprite-folders）的右键菜单
       style.css:50 铺 var(--ui-white)（深色 #111111），userscript.js:538 document.body.appendChild(menu)
       → 无窗祖先。position:fixed 跟随鼠标弹出，底下是角色列表 / 编辑器实色 → 自承载玻璃。 */
        .sa-folder-context-menu {
            background-color: ${glass} !important;
            background: ${glass} !important;
            backdrop-filter: ${glassBlur} !important;
            -webkit-backdrop-filter: ${glassBlur} !important;
        }
        .sa-context-menu-item:hover {
            background-color: ${cardGlass} !important;
            background: ${cardGlass} !important;
        }
        /* .sa-context-menu-danger 与其 hover 的红色保留（危险语义）。
           .sa-toolbar-button（角色列表工具条按钮）与 .sa-file-list-toolbar（角色列表内条）
           不在此组：前者是按钮控件保留，后者属于角色列表自身的行底板，
           该面板整体是 $assets-background —— 见 [S-5] 的统一处理。 */

/* [S-5] 角色列表工具条（sprite-folders 注入到角色选择器内）
       .sa-file-list-toolbar style.css:13 铺 var(--ui-secondary)。 */
        .sa-file-list-toolbar {
            background-color: ${glass} !important;
            background: ${glass} !important;
        }

/* [S-6] 画板工具（paint-snap / project-size-display）自建的 body 级面板
       .sa-paint-snap-settings userstyle.css:41 铺 var(--ui-modal-background)；
       .sa-project-size-display 铺 var(--ui-secondary)，挂在 spriteSelector 上是整行条。
       两者都浮在画板 / 角色列表实色之上 → 自承载玻璃。 */
        .sa-paint-snap-settings {
            background-color: ${glass} !important;
            background: ${glass} !important;
            backdrop-filter: ${glassBlur} !important;
            -webkit-backdrop-filter: ${glassBlur} !important;
        }
        .sa-project-size-display {
            background-color: ${glass} !important;
            background: ${glass} !important;
        }
        /* .sa-project-size-blocks / .sa-project-size-project 只有文字色，无需处理。
           .sa-paint-snap-button[data-enabled="true"] 的 $looks-secondary 是"开关开启"语义色，保留。 */

/* [T] 舞台面板（asset-panel = 角色 / 背景 tab + 角色列表）—— 截图里最显眼的那块纯黑。
       ★ 根因不是某个窗口没覆盖，而是这个面板**从来就不走 --ui-modal-background**：
         asset-panel.css:8 的 .wrapper 铺 $assets-background，
       而 --assets-background 与 --ui-modal-background 是**同值不同名**的两个 token：
         浅色：assets #ffffff / modal #ffffff
         深色：assets #111111 / modal #111111
         午夜：assets #000000 / modal #000000
       之前所有轮次的规则都只覆盖了 --ui-modal-background 系（窗体内的 modal-content /
       addon-window-content 等），而舞台面板**不在任何窗口内**，是编辑器常驻布局的一列，
       于是它一直保持着整块纯黑 —— 用户截图反馈的就是它。
       ⚠ 关键认识（与 [S] 组相反）：这个面板底下是 body（page-wrapper 自身无背景），
       所以**不能**照搬"自承载 backdrop-filter" —— 玻璃必须铺在面板与 body 之间。
       实测祖先链：body → .page-wrapper → .body-wrapper(gui_body-wrapper, $ui-primary 实色)
       → .flex-wrapper → .stage-and-target-wrapper → .target-wrapper → 面板
       即 [D] 式两段式处理对上号：
         · body-wrapper 是 $ui-primary 实色（深色 #111111）→ 它就是玻璃的"底板"，原样保留；
           一块实色被玻璃隔着看就不再是色块，而是被压暗的背景
         · 面板自身 transparent → 玻璃层的模糊才会作用在 body-wrapper 上
       于是：面板根容器 + 内部 tab 面板 + 角色列表根容器全部透明化。
       逐文件核对的类名（<文件名>_<本地类名>_<hash>）：
         asset-panel.css          → .wrapper / .detail-area
         target-pane.css          → .target-pane / .stage-selector-wrapper
         sprite-selector.css      → .sprite-selector / .sprite-wrapper / .sprite
                                    / .scroll-wrapper / .items-wrapper / .add-button
         sprite-selector-item.css → .sprite-selector-item / .is-selected */
        [class*="asset-panel_wrapper"],
        [class*="asset-panel_detail-area"],
        [class*="target-pane_target-pane"],
        [class*="target-pane_stage-selector-wrapper"],
        [class*="sprite-selector_sprite-selector"],
        [class*="sprite-selector_scroll-wrapper"],
        [class*="sprite-selector_items-wrapper"] {
            background-color: transparent !important;
            background: transparent !important;
        }
        /* 角色 / 背景 卡片：本身无底色（依赖列表底板），选中态铺 $looks-transparent 系 — 统一 */
        [class*="sprite-selector-item_sprite-selector-item"],
        [class*="sprite-selector_sprite-wrapper"] {
            background-color: transparent !important;
            background: transparent !important;
        }
        [class*="sprite-selector-item_is-selected"],
        [class*="sprite-selector-item_sprite-selector-item"]:hover {
            background-color: ${cardGlass} !important;
            background: ${cardGlass} !important;
        }
        /* 角色列表底部的"添加角色"大按钮：按钮控件，铺 $looks-secondary —
           按 [U] 组统一处理（见下）。 */

/* [U] 窗口内的品牌色（主题色）元素 —— 用户明确要求"按钮（主题色的）也要加上毛玻璃"。

       ★ 为什么之前把品牌色全"保留"了，现在要改：
       判定边界原来是"按钮 = 控件 → 保留品牌色"。这条边界在**纯色主题**下没问题
       （按钮本来就是品牌色，不需要玻璃化），但在**毛玻璃主题**下会留下一个一致性的破洞：
       整个窗口已经变成玻璃，却还夹着几个饱和的品牌色实心方块 —— 面积越大越刺眼。
       截图反馈的计算器运算符两列就是典型（8 个饱和蓝方块）。
       所以新的口径是：**品牌色不等于"可以留实色"，只等于"玻璃要带色相"**。
       做法与 [C] 组同源：用 color-mix 把品牌色混到 alpha 档位 → 保留"这是主操作/危险操作"
       的颜色语义，同时不再是纯色块。

       ★ 两条硬约束（否则会破坏可读性/交互反馈）：
       1. **文字保留**。这些按钮基本都用白字（$text-primary-white），玻璃化后白字仍可读 ——
          因为 backdrop-filter 把底下的编辑器背景压暗了，对比度反而被拉起来。
          不要顺手把文字也调透明（用户在选项里选的就是"保留白色文字"）。
       2. **hover 不能换 token**。源样式 hover 用的是 $xxx-secondary-dark（另一个颜色），
          一旦把常态玻璃化，hover 换成另一个实色 token 就会"玻璃 → 实心"跳变。
          改用**提高混合比例**（brandAHover）来模拟"压深"，层次感一致且不跳变。

       ★ 保留清单（面积小、玻璃化会糊成一团，属功能性控件的内部指示器）：
         · 开关 / 复选框：.checkbox:checked、.gcDirBtnActive
         · 单选圆点：telemetry-modal input[type=radio]:checked::after
         · 滑块：所有 ::-webkit-slider-thumb / ::-moz-range-thumb / ::-moz-range-progress
           （这些是**伪元素**，backdrop-filter 对它们无效，硬改只会变成"半透明但没模糊"的灰块）
         · 徽标：.hostBadge / .youBadge / .currentTag / .count
         · 8px 状态点：.statusIndicator / .active-step-dot / .success-dot / .green-bar
         · tooltip 三角：.tooltip:after / .coming-soon:after / .menu:not(.submenu)::before
         · 进度条填充：.bar-fill / .progressBarFill / .progress span / .busyBar
           （进度是**读数**不是装饰，半透明后会看不出进度）
         · 滚动条、删除按钮的语义红、以及 $xxx-transparent 系列（本来就半透明）

       命名规律同 [D]：<组件名>_<本地类名>_<hash>。逐个文件核对过
       components 下全部 css 文件的 124 条品牌色 background 声明。 */

/* [U-1] 各窗口的"主操作"按钮 —— $looks-secondary 系。这是最主要的一类。
       覆盖：prompt / record-modal / slider-prompt / tw-username-modal 的 .ok-button；
       collaboration-modal .primaryButton / .approveButton；
       mw-git-modal .primaryButton；mw-project-theme-modal .primaryButton；
       tw-restore-point-modal .primary-button / .confirm-ok-button；
       mw-extension-manager-modal .confirm-ok-button；
       custom-procedures .ok-button；tw-custom-extension-modal .load-button；
       tw-settings-modal .button；tw-invalid-project-modal .button；
       tw-unknown-platform-modal .button；tw-fonts-modal .button；
       mw-rotur-login-modal .primary / .feature-icon；
       webgl-modal .button-row button；telemetry-modal .button-row button；
       question .question-submit-button；menu-bar/media-recorder .primary-button；
       menu-bar/settings-menu 的 .reset-button / .add-button / .customThemeDialogButton.primary
                                       / .gcBtnPrimary / .wallpaper-button；
       connection-modal 的 .connection-button / .peripheral-tile button；
       asset-panel 的 .add-button（[T] 组提到的那个）；
       backpack .more；close-button .small；delete-button 的可见态；
       sprite-selector-item .is-selected .sprite-info；stage-selector 选中态 .header；
       gui .palette-footer；sound-editor .round-button；context-menu .menu-item:hover；
       mw-git-modal .chipActive；mw-fractch-workspace 的 .file.selected / .action-button.toggled
                                       / .status-bar；
       tw-cloud-variable-badge .server.selected；
       mw-fractch-workspace 的选中行。
       ⚠ .status-bar 与 .palette-footer 是**整条**通栏元素（不是按钮），一并纳入。 */
        ${inside} [class*="prompt_ok-button"],
        ${inside} [class*="record-modal_ok-button"],
        ${inside} [class*="slider-prompt_ok-button"],
        ${inside} [class*="username-modal_ok-button"],
        ${inside} [class*="collaboration-modal_primaryButton"],
        ${inside} [class*="collaboration-modal_approveButton"],
        ${inside} [class*="git-modal_primaryButton"],
        ${inside} [class*="project-theme-modal_primaryButton"],
        ${inside} [class*="restore-point-modal_primary-button"],
        ${inside} [class*="restore-point-modal_confirm-ok-button"],
        ${inside} [class*="extension-manager-modal_confirm-ok-button"],
        ${inside} [class*="custom-procedures_ok-button"],
        ${inside} [class*="custom-extension-modal_load-button"],
        ${inside} [class*="settings-modal_button"],
        ${inside} [class*="invalid-project-modal_button"],
        ${inside} [class*="unknown-platform-modal_button"],
        ${inside} [class*="fonts-modal_button"],
        ${inside} [class*="rotur-login-modal_primary"],
        ${inside} [class*="rotur-login-modal_feature-icon"],
        ${inside} [class*="webgl-modal_button"],
        ${inside} [class*="telemetry-modal_button"],
        ${inside} [class*="question_question-submit-button"],
        ${inside} [class*="media-recorder_primary-button"],
        ${inside} [class*="settings-menu_reset-button"],
        ${inside} [class*="settings-menu_add-button"],
        ${inside} [class*="settings-menu_customThemeDialogButton"],
        ${inside} [class*="settings-menu_gcBtnPrimary"],
        ${inside} [class*="settings-menu_wallpaper-button"],
        ${inside} [class*="connection-modal_connection-button"],
        ${inside} [class*="connection-modal_peripheral-tile"] button,
        ${inside} [class*="asset-panel_add-button"],
        ${inside} [class*="backpack_more"],
        ${inside} [class*="close-button_small"],
        ${inside} [class*="delete-button_delete-button-visible"],
        ${inside} [class*="sprite-selector-item_sprite-info"],
        ${inside} [class*="sound-editor_round-button"],
        ${inside} [class*="context-menu_menu-item"]:hover,
        ${inside} [class*="git-modal_chipActive"],
        ${inside} [class*="fractch-workspace_file"][class*="fractch-workspace_selected"],
        ${inside} [class*="fractch-workspace_action-button"][class*="fractch-workspace_toggled"],
        ${inside} [class*="fractch-workspace_status-bar"],
        ${inside} [class*="cloud-variable-badge_server"],
        ${inside} [class*="cloud-variable-badge_selected"] {
            background-color: ${brandGlass('--looks-secondary', '#4c97ff', brandA)} !important;
            background: ${brandGlass('--looks-secondary', '#4c97ff', brandA)} !important;
            backdrop-filter: ${glassBlur} !important;
            -webkit-backdrop-filter: ${glassBlur} !important;
        }
        /* ⚠ 上面两处**必须**用双属性选择器，单属性会过度命中：
             · fractch-workspace：.file 是**每一行**文件（不只选中行），
               .action-button 是每个工具按钮（不只 toggled 态）。
               靠 [class*="...selected"] / [class*="...toggled"] 收窄到目标态。
             · stage-selector：.header 是**每个**角色/舞台卡片都有，
               而 $looks-secondary 只铺在 .is-selected 的那个上 —— 单写
               [class*="stage-selector_header"] 会把所有卡片标题都染蓝。
               改为双属性 [class*="stage-selector"][class*="is-selected"] 后
               再限定在 .header 上（见 [U-1b]）。 */

/* [U-1b] 舞台区 / 编辑器本体里的"选中态整条" —— 它们不在 modal 内，不能带 ${inside} 前缀，
       否则永远匹配不到。这些元素铺的正是 $looks-secondary 整条色带，
       在玻璃主题下会是最显眼的实色矩形之一。 */
        [class*="stage-selector"][class*="is-selected"][class*="stage-selector_header"],
        [class*="gui_palette-footer"] {
            background-color: ${brandGlass('--looks-secondary', '#4c97ff', brandA)} !important;
            background: ${brandGlass('--looks-secondary', '#4c97ff', brandA)} !important;
            backdrop-filter: ${glassBlur} !important;
            -webkit-backdrop-filter: ${glassBlur} !important;
        }
        /* [U-1h] 同一批按钮的 hover —— 提高混合比例，不换 token */
        ${inside} [class*="prompt_ok-button"]:hover,
        ${inside} [class*="record-modal_ok-button"]:hover,
        ${inside} [class*="slider-prompt_ok-button"]:hover,
        ${inside} [class*="username-modal_ok-button"]:hover,
        ${inside} [class*="collaboration-modal_primaryButton"]:hover,
        ${inside} [class*="collaboration-modal_approveButton"]:hover,
        ${inside} [class*="git-modal_primaryButton"]:hover,
        ${inside} [class*="project-theme-modal_primaryButton"]:hover,
        ${inside} [class*="restore-point-modal_primary-button"]:hover,
        ${inside} [class*="restore-point-modal_confirm-ok-button"]:hover,
        ${inside} [class*="extension-manager-modal_confirm-ok-button"]:hover,
        ${inside} [class*="custom-procedures_ok-button"]:hover,
        ${inside} [class*="custom-extension-modal_load-button"]:hover,
        ${inside} [class*="settings-modal_button"]:hover,
        ${inside} [class*="invalid-project-modal_button"]:hover,
        ${inside} [class*="unknown-platform-modal_button"]:hover,
        ${inside} [class*="fonts-modal_button"]:hover,
        ${inside} [class*="rotur-login-modal_primary"]:hover,
        ${inside} [class*="connection-modal_connection-button"]:hover,
        ${inside} [class*="asset-panel_add-button"]:hover,
        ${inside} [class*="settings-menu_reset-button"]:hover,
        ${inside} [class*="settings-menu_add-button"]:hover,
        ${inside} [class*="settings-menu_customThemeDialogButton"]:hover,
        ${inside} [class*="settings-menu_gcBtnPrimary"]:hover {
            background-color: ${brandGlass('--looks-secondary', '#4c97ff', brandAHover)} !important;
            background: ${brandGlass('--looks-secondary', '#4c97ff', brandAHover)} !important;
        }

/* [U-2] 另一族品牌色：$motion-primary / $pen-primary / $data-primary / $control-primary
        —— 这些不是"主操作按钮"，而是**大面积色块或独立语义按钮**，
        按用户口径"窗口类的主题色"一并玻璃化，各自保留自己的色相。 */

/* [U-2a] $motion-primary 系 */
        ${inside} [class*="assets-modal_folder-button"],
        ${inside} [class*="project-metadata-modal_bar-fill"],
        ${inside} [class*="collaboration-modal_hostBadge"] {
            background-color: ${brandGlass('--motion-primary', '#4c97ff', brandA)} !important;
            background: ${brandGlass('--motion-primary', '#4c97ff', brandA)} !important;
            backdrop-filter: ${glassBlur} !important;
            -webkit-backdrop-filter: ${glassBlur} !important;
        }

/* [U-2b] $data-primary 系（"即将推出"徽标、分享按钮、标签激活态） */
        ${inside} [class*="coming-soon_coming-soon"],
        ${inside} [class*="share-button_share-button"],
        ${inside} [class*="tag-button_active"],
        ${inside} [class*="library-item_coming-soon-text"],
        ${inside} [class*="action-menu_coming-soon-tooltip"] {
            background-color: ${brandGlass('--data-primary', '#ff8c1a', brandA)} !important;
            background: ${brandGlass('--data-primary', '#ff8c1a', brandA)} !important;
            backdrop-filter: ${glassBlur} !important;
            -webkit-backdrop-filter: ${glassBlur} !important;
        }

/* [U-2c] $pen-primary 系（绿色：混音、扩展库图标底、菜单栏 remix） */
        ${inside} [class*="remix-button"],
        ${inside} [class*="extension-library_card-inset-icon"],
        ${inside} [class*="library-item_library-item-inset-image-container"] {
            background-color: ${brandGlass('--pen-primary', '#0fbd8c', brandA)} !important;
            background: ${brandGlass('--pen-primary', '#0fbd8c', brandA)} !important;
            backdrop-filter: ${glassBlur} !important;
            -webkit-backdrop-filter: ${glassBlur} !important;
        }

/* [U-2d] $extensions-primary 系（绿色：卡片导航钮、提示气泡） */
        ${inside} [class*="card_left-button"],
        ${inside} [class*="card_right-button"],
        ${inside} [class*="card_header-buttons"],
        ${inside} [class*="action-menu_tooltip"],
        ${inside} [class*="project-input_tooltip"] {
            background-color: ${brandGlass('--extensions-primary', '#0fbd8c', brandA)} !important;
            background: ${brandGlass('--extensions-primary', '#0fbd8c', brandA)} !important;
            backdrop-filter: ${glassBlur} !important;
            -webkit-backdrop-filter: ${glassBlur} !important;
        }

/* [U-2e] 独立装饰色块（browser-modal 空状态插画区已在 [E] 组处理，这里是同族的
       telemetry-modal / webgl-modal 的 .illustration，以及 rotur 登录页的 feature-icon
       —— 后者已在 [U-1] 覆盖，此处只补 illustration）。
       这两块与 [E] 的 browser-modal_illustration 同类：大面积品牌色底板，上面压插画。
       用同色系淡玻璃（cardGlass 的品牌色版本）替代纯色，保持承载感。 */
        ${inside} [class*="telemetry-modal_illustration"],
        ${inside} [class*="webgl-modal_illustration"],
        ${inside} [class*="browser-modal_desktop-settings-inner"] {
            background-color: ${brandGlass('--looks-secondary', '#4c97ff', Math.round(alpha * 40))} !important;
            background: ${brandGlass('--looks-secondary', '#4c97ff', Math.round(alpha * 40))} !important;
            backdrop-filter: ${glassBlur} !important;
            -webkit-backdrop-filter: ${glassBlur} !important;
        }

/* [U-3] 插件窗口里的品牌色（与 [J] 组同源，覆盖面扩到品牌色）
       计算器的运算符 / 等号已在 [J-1] 就近处理，此处补其余插件。
       tag-button / library-item / backpack 等通用组件的品牌色已由 [U-2] 覆盖。 */

/* ==================================================================
   [V] 中性实色 = 最后一整类逃逸（2026-09-24 补）
   ------------------------------------------------------------------
   用户的判定：窗口里除"保留清单"外不允许出现 alpha=1 的纯色，
   也不允许出现与主题无关的固定色。

   上面 [A]~[U] 都是**按名字**扫的（body/header/card/panel/section/button…）。
   按名字扫必然漏 —— 因为源 CSS 里同一个语义有十几套命名。
   本轮用户截图（作品视频录制器）暴露的就是这个：
     · .input-with-unit   → 输入框外壳，铺 $ui-modal-background（深色 #1e1e1e）
     · .secondary-button  → 取消按钮，铺 $ui-primary（深色 #111111）
   两个类名里都没有任何关键字，所以前面所有组都碰不到它们。

   把 components + addons 下全部 css 的**中性不透明填充**（$ui-primary /
   $ui-modal-background / $ui-white / $ui-secondary / $ui-tertiary 及其
   --ui-* 变量形式）逐条与已有分组比对，得 184 个"名字不含关键字"的类。
   其中大部分已被 [H]（输入框）/ [U]（品牌）/ [J]（插件）/ [S]（浮层）覆盖，
   剩下真正没人管的，归纳成下面三类**结构模式**。按模式修，而不是按类名修，
   这样以后新增同模式的元素自动被覆盖。

   模式 A —— "包着表单控件的外壳"：父元素铺实色、子 input/select 已被 [H]
             处理成玻璃 → 结果是"玻璃框里套一个黑框"。父元素应透明，
             让 [H] 铺的那层玻璃成为唯一底板。
   模式 B —— "中性次要/取消按钮"：铺 $ui-primary / $ui-secondary / $ui-white，
             不带品牌色所以 [U] 跳过，类名不含关键字所以其它组也跳过。
   模式 C —— "中性浅底小单元"：chip / row / box / tab / 预览缩略图等，
             铺 $ui-white / $ui-primary / $ui-tertiary 的零散小块。
   ================================================================== */

/* [V-A] 模式 A：包着表单控件的外壳 → 透明，交给 [H] 的玻璃底
       代表性源码（逐个核对过）：
         media-recorder.css:102  .input-with-unit      { background: $ui-modal-background }
         resize-selected-item   .sa-resize-settings-input { background: var(--ui-modal-background) }
       这些壳子的类名不含任何关键字，且子 input 已被 [H] 铺成玻璃，
       于是形成"玻璃框里套一个黑框"。壳子改透明，只留 [H] 那一层底板。
       ⚠ 同样把三挂载点分别写全，不依赖 ${inside} 的列表展开写法。 */
        [class*="modal-content"] [class*="input-with-unit"],
        .modal-window-content [class*="input-with-unit"],
        .addon-window-content [class*="input-with-unit"],
        [class*="modal-content"] [class*="resize-settings-input"],
        .modal-window-content [class*="resize-settings-input"],
        .addon-window-content [class*="resize-settings-input"],
        [class*="modal-content"] [class*="input-wrapper"],
        .modal-window-content [class*="input-wrapper"],
        .addon-window-content [class*="input-wrapper"],
        [class*="modal-content"] [class*="fontInputContainer"],
        .modal-window-content [class*="fontInputContainer"],
        .addon-window-content [class*="fontInputContainer"],
        [class*="modal-content"] [class*="fontInputOuter"],
        .modal-window-content [class*="fontInputOuter"],
        .addon-window-content [class*="fontInputOuter"] {
            background-color: transparent !important;
            background: transparent !important;
        }
        /* [V-A'] :has() 泛化 —— 任何"直接后代含 input/select/textarea"且
           自己铺了底的窗口内元素（已知类名之外的新增元素靠这条兜住）。
           本模块的 ${inside} 前缀是"逗号列表"，拼在后代选择器上时只会作用于
           最后一个分支（历史写法，全模块一致）。所以这里把 :has() 单独写成
           三段，保证三个挂载点都真正被限定为"后代"，不依赖该写法。
           ⚠ 只匹配"直接子级"是 input/select/textarea，不递归；也**不含**
             type=color / checkbox / radio / range —— 那几类在保留清单里，
             混进来会把取色器和滑块的容器一起洗掉。
           影响面：已知的 32 处"外壳+直接表单控件"结构里，只有
             inputWithUnit / inputWrapper / searchContainer / fontInputContainer /
             fontInputOuter / field / creditEditRow / composerBody 等中性底壳被命中；
             含 color/range 的 paletteColorWrapper / gcAccentRow / gcDirectionRow /
             slider-monitor row 全部不受影响（类型不在列表内）。 */
        [class*="modal-content"] :has(> input[type="number"]),
        .modal-window-content :has(> input[type="number"]),
        .addon-window-content :has(> input[type="number"]),
        [class*="modal-content"] :has(> input[type="text"]),
        .modal-window-content :has(> input[type="text"]),
        .addon-window-content :has(> input[type="text"]),
        [class*="modal-content"] :has(> input[type="search"]),
        .modal-window-content :has(> input[type="search"]),
        .addon-window-content :has(> input[type="search"]),
        [class*="modal-content"] :has(> select),
        .modal-window-content :has(> select),
        .addon-window-content :has(> select),
        [class*="modal-content"] :has(> textarea),
        .modal-window-content :has(> textarea),
        .addon-window-content :has(> textarea) {
            background-color: transparent !important;
            background: transparent !important;
        }

/* [V-B] 模式 B：中性次要 / 取消按钮 —— 统一压成淡玻璃
       命名族（扫出来的全部）：secondary-button / secondaryButton /
       cancel-button / cancelButton / confirm-cancel-button。
       覆盖窗口：
         media-recorder .secondary-button（用户截图里的「取消」）
         restore-point-modal .secondary-button / .confirm-cancel-button
         project-theme-modal .secondaryButton
         custom-gallery-modal .cancel-button
         simple-dialog .cancelButton
       ⚠ 这些源样式 hover 换的是更深的 **中性** token（$ui-secondary /
         $ui-secondary-hover），不是品牌色。按 [U-1h] 的既有教训，
         hover 不能换 token 否则会"玻璃 → 实心"跳变；这里统一
         普通态 cardGlass、hover 提一档用 glass。 */
        ${insideDescendant}[class*="secondary-button"],
        ${insideDescendant}[class*="secondaryButton"],
        ${insideDescendant}[class*="cancel-button"],
        ${insideDescendant}[class*="cancelButton"],
        ${insideDescendant}[class*="confirm-cancel-button"] {
            background-color: ${cardGlass} !important;
            background: ${cardGlass} !important;
        }
        ${insideDescendant}[class*="secondary-button"]:hover,
        ${insideDescendant}[class*="secondaryButton"]:hover,
        ${insideDescendant}[class*="cancel-button"]:hover,
        ${insideDescendant}[class*="cancelButton"]:hover,
        ${insideDescendant}[class*="confirm-cancel-button"]:hover {
            background-color: ${glass} !important;
            background: ${glass} !important;
        }

/* [V-C] 模式 C：中性浅底小单元 —— chip / row / box / tab 类
       这些是窗口里成片出现、每条都独立铺底的"小方块"，单看面积不大，
       但一屏十几条叠起来就是"玻璃窗里一片实色格子"。
       逐个核对过源文件，只收**中性底**的；品牌底色归 [U] 管。
         git-modal .remoteItem / .remoteRow / .chip / .commitBox / .readmeBox
                   / .commitTypeSelect / .input / .inputSmall / .select
         shortcut-manager .keycap / .hintKey / .toolbar
         restore-point-modal .interval-selector
         block-count .sa-complexity-score
         sprite-folders .sa-toolbar-button / .sa-file-icon
       注意 keycap 是"按键帽"—— 它是**视觉隐喻**（表示键盘按键），
       透明化后仍靠 border 保持可辨，比实色更贴合玻璃主题。 */
        ${insideDescendant}[class*="git-modal_remoteItem"],
        ${insideDescendant}[class*="git-modal_remoteRow"],
        ${insideDescendant}[class*="git-modal_chip"],
        ${insideDescendant}[class*="git-modal_commitBox"],
        ${insideDescendant}[class*="git-modal_readmeBox"],
        ${insideDescendant}[class*="git-modal_commitTypeSelect"],
        ${insideDescendant}[class*="git-modal_conflictRow"],
        ${insideDescendant}[class*="shortcut-manager_keycap"],
        ${insideDescendant}[class*="shortcut-manager_hintKey"],
        ${insideDescendant}[class*="shortcut-manager_toolbar"],
        ${insideDescendant}[class*="restore-point-modal_interval-selector"],
        ${insideDescendant}[class*="block-count_sa-complexity-score"],
        ${insideDescendant}[class*="sprite-folders_sa-toolbar-button"],
        ${insideDescendant}[class*="sprite-folders_sa-file-icon"] {
            background-color: ${cardGlass} !important;
            background: ${cardGlass} !important;
        }
        /* [V-C] 的 hover / 选中态：同样不换 token，只提一档 */
        ${insideDescendant}[class*="git-modal_remoteItem"]:hover,
        ${insideDescendant}[class*="git-modal_remoteRow"]:hover,
        ${insideDescendant}[class*="git-modal_chip"]:hover,
        ${insideDescendant}[class*="sprite-folders_sa-toolbar-button"]:hover {
            background-color: ${glass} !important;
            background: ${glass} !important;
        }
        /* git-modal 的 .chip 选中态源样式铺 $looks-secondary（已由 [U-1] 的
           git-modal_chipActive 覆盖），这里只需保证非选中态是玻璃，不重复。
           .select / .input / .inputSmall 是原生表单控件，已被 [H] 的
           input/select 规则覆盖（它们是 <select>/<input> 本身）。 */

/* [X] 调试器窗口（src/components/tw-debugger）—— 此前**唯一一个零覆盖**的插件窗口。
       ⚠ 它和别的窗口不一样：CSS 是用 style-loader + css-loader 加载的（见 debugger.jsx
       的 import，前缀两个感叹号禁用其它 loader），**没有开 modules**，JSX 里也写的是
       裸字符串 className，所以运行时类名就是字面的
       mw-debugger-* / sa-debugger-*，没有"组件名_"前缀。因此这里只能用**字面类名**精确匹配。
       千万不要图省事改写成 [class*="mw-debugger-tab"] —— 那会同时命中
       mw-debugger-tab / mw-debugger-tabs / mw-debugger-tab-active / mw-debugger-tab-icon
       四个类，正是"状态类过度命中基类"那类隐蔽故障（之前已经踩过两次）。
       排查方式：逐行对过 debugger.css 全部 620 行 + tabs 下四个 JS 的 createElement。
         · 已被既有组覆盖、无需重复：.mw-debugger-body / .sa-debugger-logs-content /
           .sa-performance-tab-content / .sa-memory-tab-content（命中 [body] / [content]
           关键字 → 已透明）；.sa-debugger-chart-card / .sa-memory-info-card（命中 [card]）；
           .sa-debugger-search（input type=text，已被 [H] 铺 cardGlass）。
         · 刻意保留：.sa-debugger-log-icon（14px 语义色圆点：warn 黄 / error 红 / log 灰 /
           thread 蓝）、.mw-debugger-paused-dot（8px 状态点）、
           .sa-debugger-block-preview（积木颜色预览，必须还原真实积木色）、
           .sa-debugger-severity（只改 border-color 的分段按钮）、
           .sa-debugger-log[data-type=warn|error]（本身带 alpha 的语义底）、
           以及 meter.css 的 .mask（opacity .75 的仪表遮罩，动它会破坏读数）。
       ---- [X-1] 区域根：整面重铺窗口底色（截图里那三条纯黑）→ 透明，露出窗口玻璃 ---- */
        .sa-debugger-window .mw-debugger-tabs,
        .sa-debugger-window .mw-debugger-toolbar,
        .sa-debugger-window .sa-debugger-log-outer {
            background-color: transparent !important;
            background: transparent !important;
        }
        /* [X-2a] 选中的 tab —— 用满档玻璃，保证"当前在哪一页"看得出来 */
        .sa-debugger-window .mw-debugger-tab-active {
            background-color: ${glass} !important;
            background: ${glass} !important;
        }
        /* [X-2b] 中性 chrome / 内容单元：它们是控件或行，不是区域板，
           给一层淡玻璃保留单元可辨性（档位同 [V-B] / [V-C]） */
        .sa-debugger-window .mw-debugger-toolbar-btn,
        .sa-debugger-window .sa-debugger-sprite-select,
        .sa-debugger-window .sa-debugger-log-link,
        .sa-debugger-window .sa-debugger-thread-id,
        .sa-debugger-window .sa-memory-variable-row,
        .sa-debugger-window .sa-memory-variables-empty {
            background-color: ${cardGlass} !important;
            background: ${cardGlass} !important;
        }
        /* [X-3] hover：照旧**不换 token**，只提一档。
           两点收窄：
             · 选中的 tab 排除在外（否则 hover 会把"选中"提得更淡，反而看不出选中）
             · warn / error 行排除在外 —— 源 CSS 里 [data-type] 的语义底写在 :hover 之后、
               特异性相同，本来就把 hover 盖掉了；不排除的话我们这条会把黄/红底冲掉。 */
        .sa-debugger-window .mw-debugger-tab:not(.mw-debugger-tab-active):hover,
        .sa-debugger-window .sa-debugger-log:not([data-type="warn"]):not([data-type="error"]):hover {
            background-color: ${cardGlass} !important;
            background: ${cardGlass} !important;
        }
        /* [X-4] 品牌色：① "恢复运行"按钮（暂停时才出现，源色 $pen-primary）
                        ② 日志行的跳转链接 hover（源色 $looks-secondary + 白字）
           ① 必须写成双类 .mw-debugger-toolbar-btn.mw-debugger-resume：
           它同时带 mw-debugger-toolbar-btn，与 [X-2b] 同特异性，靠双类抬高才能稳赢。 */
        .sa-debugger-window .mw-debugger-toolbar-btn.mw-debugger-resume {
            background-color: ${brandGlass('--pen-primary', '#0fbd8c', brandA)} !important;
            background: ${brandGlass('--pen-primary', '#0fbd8c', brandA)} !important;
            border-color: transparent !important;
            color: white !important;
        }
        .sa-debugger-window .mw-debugger-toolbar-btn.mw-debugger-resume:hover {
            background-color: ${brandGlass('--pen-primary', '#0fbd8c', brandAHover)} !important;
            background: ${brandGlass('--pen-primary', '#0fbd8c', brandAHover)} !important;
        }
        .sa-debugger-window .sa-debugger-log-link:hover {
            background-color: ${brandGlass('--looks-secondary', '#4c97ff', brandAHover)} !important;
            background: ${brandGlass('--looks-secondary', '#4c97ff', brandAHover)} !important;
            color: white !important;
        }
        /* ---- [X-5] 同型逃逸：另外两个"中性实色、类名不含任何关键字"的窗口成员 ----
           与调试器是同一类问题（窗口里整块铺 --ui-primary / --ui-tertiary，类名里既没有
           body/content 也没有 card/panel），顺带一并处理。这两个是 CSS Module，
           类名带"组件名_"前缀，所以用 [class*=] 匹配。
           ⚠ 必须用 insideDescendant 而不是 inside：inside 是逗号列表，直接拼只会把选择器
           接到最后一个分支（.addon-window-content）上，而这两个都挂在 React modal
           （.modal-content）之下 —— 用 inside 会得到永假/错配的规则、静默失效。
             record-modal（录音窗口） .meter-container / .waveform-container → 仪表底板
             mw-git-diff-viewer（Git 窗口里的差异查看器）
                                      .viewer（列表根）/ .fileHeader（文件行头） */
        ${insideDescendant}[class*="record-modal_meter-container"],
        ${insideDescendant}[class*="record-modal_waveform-container"],
        ${insideDescendant}[class*="diff-viewer_fileHeader"] {
            background-color: ${cardGlass} !important;
            background: ${cardGlass} !important;
        }
        ${insideDescendant}[class*="diff-viewer_viewer"] {
            background-color: transparent !important;
            background: transparent !important;
        }`;
        }
    },
    // 弹窗通知 — CSS Module 类名: alert_alert_xxxxx
    // 注意: alert.css 中 .alert.warn 使用 background 简写(#FFF0DF)，需用 background 简写+!important 强制覆盖
    {
        id: 'alert',
        labelId: 'bl.frostedGlass.target.alert',
        defaultMessage: 'Alert',
        css: (blur, alpha, r, g, b) => `
[class*="alert_alert_"] {
    background: rgba(${r}, ${g}, ${b}, ${alpha}) !important;
    background-color: rgba(${r}, ${g}, ${b}, ${alpha}) !important;
    backdrop-filter: blur(${blur}px) saturate(150%) !important;
    -webkit-backdrop-filter: blur(${blur}px) saturate(150%) !important;
    box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.15) !important;
}`
    },
    // 右下角通知弹窗 — notification-system.jsx 使用 className="mw-glass-notification" + inline style
    // inline style 的 background: var(--ui-modal-background, #ffffff) 需用 !important 覆盖
    {
        id: 'notification',
        labelId: 'bl.frostedGlass.target.notification',
        defaultMessage: 'Notification',
        css: (blur, alpha, r, g, b) => `
.mw-glass-notification {
    background: rgba(${r}, ${g}, ${b}, ${alpha}) !important;
    background-color: rgba(${r}, ${g}, ${b}, ${alpha}) !important;
    backdrop-filter: blur(${blur}px) saturate(150%) !important;
    -webkit-backdrop-filter: blur(${blur}px) saturate(150%) !important;
    box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.15) !important;
}`
    },
    // Toast 通知 — CSS Module 类名: toast_notification_toast_xxxxx
    // toast-notification.css 中 .toast.success/.error/.info/.warning 使用 background-color 设置颜色，
    // 需用 background-color + !important 强制覆盖
    {
        id: 'toast',
        labelId: 'bl.frostedGlass.target.toast',
        defaultMessage: 'Toast',
        css: (blur, alpha, r, g, b) => `
[class*="toast-notification_toast"] {
    background-color: rgba(${r}, ${g}, ${b}, ${alpha}) !important;
    backdrop-filter: blur(${blur}px) saturate(150%) !important;
    -webkit-backdrop-filter: blur(${blur}px) saturate(150%) !important;
    box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.15) !important;
}`
    },
    // 顶部菜单栏下拉菜单 — CSS Module 类名: menu-bar_menu-bar-menu_xxxxx
    // 内部 .menu 来自 menu.css，CSS Module 类名: menu_menu_xxxxx
    // 毛玻璃背景直接加在 <ul> 上，同时增强菜单项 hover 背景的可见性
    // 因为毛玻璃背景降低了 <ul> 的不透明度，原始的 .menu-item:hover
    // background-color: rgba(255,255,255,0.15) 对比度太低几乎看不见
    {
        id: 'menu-bar-menu',
        labelId: 'bl.frostedGlass.target.menuBarMenu',
        defaultMessage: 'Menu Bar Dropdown',
        css: (blur, alpha, r, g, b) => {
            // 暗色模式(r=0,0,0)下 hover 用白色，亮色模式(r=255,255,255)下 hover 用黑色
            const isDark = r === 0 && g === 0 && b === 0;
            const hoverR = isDark ? 255 : 0;
            const hoverG = isDark ? 255 : 0;
            const hoverB = isDark ? 255 : 0;
            // 使用更高的不透明度(0.25)确保 hover 效果在毛玻璃背景下可见
            const hoverA = 0.25;
            return `
[class*="menu-bar-menu"] [class*="menu_menu"] {
    background: rgba(${r}, ${g}, ${b}, ${alpha});
    background-color: rgba(${r}, ${g}, ${b}, ${alpha});
}
[class*="menu-bar-menu"] [class*="menu_menu"] [class*="menu-item"]:hover,
[class*="menu-bar-menu"] [class*="menu_menu"] [class*="menu-item"].active,
[class*="menu-bar-menu"] [class*="menu_menu"] [class*="menu-item"].expanded {
    background-color: rgba(${hoverR}, ${hoverG}, ${hoverB}, ${hoverA});
}`;
        }
    },
    // 画板浮层面板 — 三类同源浮层：
    //   1. scratch-paint 的 react-popover：颜色选择器、字体 / 模式下拉、角色方向选择器
    //      （portal 到 <body> 下，类名是全局的 .Popover / .Popover-body / .Popover-tipShape）
    //   2. Onion Skin 洋葱皮设置面板（插件 onion-skinning）→ .sa-onion-settings
    //   3. Resize 大小 / 位置面板（插件 resize-selected-item）→ .sa-resize-settings
    // 后两类都是"浮在画布上方、底部带一个小箭头"的面板，视觉语言与 popover 一致，
    // 所以合并到同一个 target 里，箭头跟着面板一起玻璃化
    // （只做面板不做箭头会出现"玻璃面板 + 实心箭头"的断层）。
    {
        id: 'popover',
        labelId: 'bl.frostedGlass.target.popover',
        defaultMessage: 'Popover / Panels',
        css: (blur, alpha, r, g, b) => {
            const glass = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            const glassBlur = `blur(${blur}px) saturate(150%)`;
            return `
/* react-popover 浮层主体。主题层 lib/themes/global-styles.css 用
   [.Popover-body { background: var(--popover-background) !important }]
   铺了不透明底色（特异性 (0,1,0)），却同时写着"some of these are duplicated over
   there too; !important makes sure these win"，所以这里必须用 body 前缀把特异性提到
   (0,1,1) 才能稳胜，光靠 !important 拼不过同特异性的后置声明。
   body 前缀同时也天然限定了作用域：react-popover 是 portal 到 <body> 下的。
   不覆盖 box-shadow，保留浮层原有的投影 —— 它贴在画布 / 检查器上时靠投影分层次。 */
body .Popover-body {
    background-color: ${glass} !important;
    backdrop-filter: ${glassBlur} !important;
    -webkit-backdrop-filter: ${glassBlur} !important;
}
/* 浮层箭头（主题层同样以 (0,1,0) + !important 设成实心底色） */
body .Popover-tipShape {
    fill: ${glass} !important;
}

/* 画板插件的设置面板 —— 两者都是 .sa-xxx-settings + .sa-xxx-settings-polygon 结构，
   实色底来自各自 style.css 的 background: var(--ui-modal-background)（无 !important，
   但仍按上面的规矩统一用 !important 覆盖，避免以后被主题层加权重后失效）。
   面板内部的行 / 输入框保持原样：resize 面板的输入框自带一层实底（表单可读性），
   onion 面板的加减按钮本来就只有描边没有底色，玻璃底能直接透出来。 */
.sa-onion-settings,
.sa-resize-settings {
    background-color: ${glass} !important;
    backdrop-filter: ${glassBlur} !important;
    -webkit-backdrop-filter: ${glassBlur} !important;
}
/* 面板下方指向按钮的小箭头 */
.sa-onion-settings-polygon,
.sa-resize-settings-polygon {
    fill: ${glass} !important;
}`;
        }
    }
];

const safeGetItem = key => {
    try {
        return getStorageItem(key);
    } catch (err) {
        return null;
    }
};

const getFrostedGlassSettings = () => {
    try {
        const stored = safeGetItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (err) {
        // ignore
    }
    return null;
};

const setFrostedGlassSettings = settings => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
        // ignore
    }
};

const targetStyleId = targetId => `${STYLE_ID_PREFIX}${targetId}`;

const applyFrostedGlassForTarget = (targetId, blurRadius, opacity, r, g, b) => {
    const target = TARGETS.find(t => t.id === targetId);
    if (!target) return;
    const css = target.css(blurRadius, opacity, r, g, b);
    const existing = document.getElementById(targetStyleId(targetId));
    if (existing) {
        // 避免无意义的更新：只有当 CSS 内容真正变化时才更新
        if (existing.textContent !== css) {
            existing.textContent = css;
        }
    } else {
        const style = document.createElement('style');
        style.id = targetStyleId(targetId);
        style.textContent = css;
        document.head.appendChild(style);
    }
};

const removeFrostedGlassForTarget = targetId => {
    const existing = document.getElementById(targetStyleId(targetId));
    if (existing) {
        existing.remove();
    }
};

/**
 * 检测当前主题是否为深色模式。
 * 读取 document 根元素上的 --color-scheme CSS 变量（由主题系统设置）。
 * @returns {boolean} 深色主题返回 true
 */
const isDarkMode = () => {
    const scheme = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-scheme')
        .trim()
        .toLowerCase();
    return scheme === 'dark';
};

/**
 * 获取当前主题下毛玻璃背景的 RGB 值。
 * 深色模式使用黑色底色，亮色模式使用白色底色。
 * 结果缓存，避免频繁调用 getComputedStyle()。
 * @returns {{r: number, g: number, b: number}} 主题底色 RGB
 */
const getThemeRGB = () => {
    if (_cachedRGB) return _cachedRGB;
    if (isDarkMode()) {
        _cachedRGB = {r: 0, g: 0, b: 0};
    } else {
        _cachedRGB = {r: 255, g: 255, b: 255};
    }
    return _cachedRGB;
};

/**
 * 清除主题 RGB 缓存，下次调用 getThemeRGB() 时会重新计算。
 * 在主题切换时调用。
 * @returns {void}
 */
const clearThemeRGBCache = () => {
    _cachedRGB = null;
};

/**
 * 检查参数是否与上次应用的一致，避免重复更新 style 标签。
 * @param {number} blurRadius 模糊半径
 * @param {number} opacity 生效后的不透明度
 * @param {number} r 主题底色红通道
 * @param {number} g 主题底色绿通道
 * @param {number} b 主题底色蓝通道
 * @returns {boolean} 与上次完全一致返回 true
 */
const isSameAsLastApplied = (blurRadius, opacity, r, g, b) => {
    if (!_lastApplied) return false;
    return _lastApplied.blurRadius === blurRadius &&
        _lastApplied.opacity === opacity &&
        _lastApplied.r === r &&
        _lastApplied.g === g &&
        _lastApplied.b === b;
};

const applyFrostedGlass = settings => {
    if (!settings) {
        settings = DEFAULT_SETTINGS;
    }

    if (!settings.enabled) {
        // Remove all frosted glass styles
        for (const target of TARGETS) {
            removeFrostedGlassForTarget(target.id);
        }
        _lastApplied = null;
        return;
    }

    const blurRadius = settings.blurRadius || DEFAULT_SETTINGS.blurRadius;
    const opacity = settings.opacity || DEFAULT_SETTINGS.opacity;
    // "深浅比值"：深色下额外加的透明度，浅色不加。由设置页滑块调整（0.10–0.55）
    const themeBoost = settings.themeBoost || DEFAULT_SETTINGS.themeBoost;
    const {r, g, b} = getThemeRGB();

    // 深色模式暗度增强：深色下白字需要更不透明的深色玻璃底才清晰。
    // getThemeRGB() 只可能返回纯黑(0,0,0)或纯白(255,255,255)，
    // 在用户透明度基础上加 themeBoost（上限 0.72），浅色模式维持用户设定不变。
    // themeBoost 即"深浅比值"：越小，深色与浅色的玻璃浓淡越接近。
    const isDark = r === 0 && g === 0 && b === 0;
    const effectiveOpacity = isDark ? Math.min(0.72, opacity + themeBoost) : opacity;

    // 如果参数没变，跳过更新以避免不必要的 style 重计算
    if (isSameAsLastApplied(blurRadius, effectiveOpacity, r, g, b)) {
        return;
    }

    // Apply to all targets
    for (const target of TARGETS) {
        applyFrostedGlassForTarget(target.id, blurRadius, effectiveOpacity, r, g, b);
    }

    _lastApplied = {blurRadius, opacity: effectiveOpacity, r, g, b};
};

// 防抖 MutationObserver：DOM 变化频繁时（如 xterm 终端渲染），
// 只在变化停止后的一次性执行，避免性能问题
let _observerTimer = null;

const initFrostedGlass = () => {
    const settings = getFrostedGlassSettings();
    applyFrostedGlass(settings);

    // 监听主题切换以清除 RGB 缓存
    // themePersistance.js 的 applyTheme 会触发 DOM 属性变化，
    // 我们可以监听 document.documentElement 的 attribute 变化
    const themeObserver = new MutationObserver(() => {
        clearThemeRGBCache();
        // 重新应用毛玻璃以使用新的主题颜色
        const currentSettings = getFrostedGlassSettings();
        if (currentSettings && currentSettings.enabled) {
            applyFrostedGlass(currentSettings);
        }
    });
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['style']
    });

    // 防抖的 MutationObserver：检测动态 DOM 变化（如弹窗打开/关闭）
    // 使用防抖避免在频繁 DOM 变化（如 xterm 终端渲染）时反复更新 style
    const domObserver = new MutationObserver(() => {
        if (_observerTimer) {
            clearTimeout(_observerTimer);
        }
        _observerTimer = setTimeout(() => {
            _observerTimer = null;
            const currentSettings = getFrostedGlassSettings();
            if (currentSettings && currentSettings.enabled) {
                applyFrostedGlass(currentSettings);
            }
        }, OBSERVER_DEBOUNCE_MS);
    });

    domObserver.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: false
    });
};

export {
    TARGETS,
    DEFAULT_SETTINGS,
    getFrostedGlassSettings,
    setFrostedGlassSettings,
    applyFrostedGlass,
    initFrostedGlass
};
