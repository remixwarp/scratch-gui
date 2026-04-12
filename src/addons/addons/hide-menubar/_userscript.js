export default async function ({ addon, msg, Window }) {
	console.log('Hide Menubar plugin loaded');
	const cleanupKey = '__aeHideMenubarCleanup';
	if (typeof window[cleanupKey] === 'function') {
		window[cleanupKey]();
	}

	console.log('Waiting for topBar element');
	const topBar = await addon.tab.waitForElement("[class^='gui_menu-bar-position']", {
		markAsSeen: true,
		reduxEvents: [
			"scratch-gui/mode/SET_PLAYER",
			"fontsLoaded/SET_FONTS_LOADED",
			"scratch-gui/locales/SELECT_LOCALE",
		],
		reduxCondition: (state) => !state.scratchGui.mode.isPlayerOnly,
	});
	console.log('topBar element found:', topBar);
	console.log('Waiting for gui element');
	const gui = await addon.tab.waitForElement("[class^='gui_page-wrapper']", {
		markAsSeen: true,
		reduxEvents: [
			"scratch-gui/mode/SET_PLAYER",
			"fontsLoaded/SET_FONTS_LOADED",
			"scratch-gui/locales/SELECT_LOCALE",
		],
		reduxCondition: (state) => !state.scratchGui.mode.isPlayerOnly,
	});
	console.log('gui element found:', gui);

	function getAESettings() {
		let aeSettings = {};
		try {
			aeSettings = JSON.parse(localStorage.getItem('AESettings') || '{}');
		} catch (e) {
			aeSettings = {};
		}
		return aeSettings;
	}

	let aeSettings = getAESettings();
	let isVSCodeLayout = Boolean(aeSettings.EnableVSCodeLayout);

	const hind = document.getElementsByClassName('HindToolBar')[0];
	if (hind) {
		if (!isVSCodeLayout) hind.style.width = '40px';
		else hind.style.height = '30px';
	}

	// 监听设置变化
	window.addEventListener('ae-settings-changed', () => {
		aeSettings = getAESettings();
		isVSCodeLayout = Boolean(aeSettings.EnableVSCodeLayout);
		applyVisualState();
		if (hind) {
			if (!isVSCodeLayout) hind.style.width = '40px';
			else hind.style.height = '30px';
		}
	});

	const isTouchDevice =
		(typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
		(typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches);

	const SHOW_EDGE = isTouchDevice ? 24 : 5;
	const HIDE_EDGE = isTouchDevice ? 100 : 50;
	const IDLE_HIDE_DELAY = isTouchDevice ? 1400 : 1000;

	const button = document.createElement('button');
	const text = document.createElement('img');

	let isVisible = false;
	let isLock = false;
	let topBarHeight = Math.max(topBar.offsetHeight, 1);
	let pointerY = Number.POSITIVE_INFINITY;
	let autoHideTimer = null;
	let lastWorkspaceLayoutSignature = '';
	let postTransitionResizeTimer = null;
	let lateResizeTimer = null;
	let blocklyPromise = null;

	const existingSwitch = gui.querySelector('.hide-switch');
	if (existingSwitch) existingSwitch.remove();

	button.className = 'hide-switch';
	button.type = 'button';
	text.className = 'hide-text';

	topBar.style.position = 'absolute';
	topBar.style.width = '100%';
	topBar.style.top = `-${topBarHeight}px`;
	topBar.style.transition = 'top 0.25s ease';
	button.style.setProperty('--traslate', '-10px');
	button.style.opacity = '50%';
	text.style.setProperty('--rotate', '0');

	console.log('Button created:', button);

	function forceWorkspaceResize() {
		window.dispatchEvent(new Event('resize'));

		if (!blocklyPromise && addon.tab.traps && typeof addon.tab.traps.getBlockly === 'function') {
			blocklyPromise = addon.tab.traps.getBlockly().catch(() => null);
		}
		if (!blocklyPromise) return;

		blocklyPromise.then(Blockly => {
			if (!Blockly) {
				blocklyPromise = null;
				return;
			}
			const mainWorkspace = (typeof Blockly.getMainWorkspace === 'function' && Blockly.getMainWorkspace()) ||
				Blockly.mainWorkspace;
			if (!mainWorkspace) return;

			if (typeof Blockly.svgResize === 'function') Blockly.svgResize(mainWorkspace);
			if (typeof mainWorkspace.resizeContents === 'function') mainWorkspace.resizeContents();
			if (mainWorkspace.toolbox_ && typeof mainWorkspace.toolbox_.position === 'function') {
				mainWorkspace.toolbox_.position();
			}
		}).catch(() => {
			blocklyPromise = null;
		});
	}

	function scheduleWorkspaceResizeAfterTransition() {
		if (postTransitionResizeTimer) clearTimeout(postTransitionResizeTimer);
		if (lateResizeTimer) clearTimeout(lateResizeTimer);
		postTransitionResizeTimer = setTimeout(() => {
			forceWorkspaceResize();
		}, 280);
		lateResizeTimer = setTimeout(() => {
			forceWorkspaceResize();
		}, 520);
	}

	function getWorkspaceLayoutSignature() {
		if (isLock) {
			return `lock:${topBarHeight}`;
		}
		return `float:${isVisible ? 1 : 0}`;
	}

	function updateWorkspace() {
		const nextLayoutSignature = getWorkspaceLayoutSignature();
		if (lastWorkspaceLayoutSignature !== nextLayoutSignature) {
			forceWorkspaceResize();
			scheduleWorkspaceResizeAfterTransition();
			lastWorkspaceLayoutSignature = nextLayoutSignature;
		}
	}

	function refreshTopBarHeight() {
		const nextHeight = Math.max(Math.round(topBar.getBoundingClientRect().height), 1);
		topBarHeight = nextHeight;
	}

	function hasExpandedMenu() {
		return Boolean(document.querySelector(
			"[class*='menu-item_expanded'], [class*='action-menu_expanded'], [class*='menu-bar_menu-bar-item'][class*='menu-bar_active'], [class*='menu-bar-menu_menu-bar-menu'] > [class*='menu_menu']"
		));
	}

	function applyVisualState() {
		refreshTopBarHeight();
		if (isLock) {
			topBar.style.position = 'relative';
			topBar.style.top = '0';
			text.style.setProperty('--rotate', '180deg');
			// 调整VSCode布局下的按钮位置
			if (isVSCodeLayout) {
				button.style.right = '100px';
				button.style.top = '50%';
				button.style.transform = 'translateY(-50%)';
				button.style.left = 'auto';
			} else {
				button.style.left = '40px';
				button.style.top = `${topBarHeight - 10}px`;
				button.style.right = 'auto';
				button.style.transform = '';
			}
			button.style.opacity = '100%';
			isVisible = true;
			updateWorkspace();
			return;
		}
		topBar.style.position = 'absolute';
		topBar.style.top = isVisible ? '0' : `-${topBarHeight}px`;
		text.style.setProperty('--rotate', '0');
		// 调整VSCode布局下的按钮位置
		if (isVSCodeLayout) {
			button.style.right = '100px';
			button.style.top = '50%';
			button.style.transform = 'translateY(-50%)';
			button.style.left = 'auto';
		} else {
			button.style.left = '40px';
			button.style.top = isVisible ? `${topBarHeight - 10}px` : '-10px';
			button.style.right = 'auto';
			button.style.transform = '';
		}
		button.style.opacity = isVisible ? '100%' : '50%';
		updateWorkspace();
	}

	function clearAutoHideTimer() {
		if (autoHideTimer) {
			clearTimeout(autoHideTimer);
			autoHideTimer = null;
		}
	}

	function scheduleAutoHide() {
		clearAutoHideTimer();
		if (isLock || !isVisible) return;
		autoHideTimer = setTimeout(() => {
			if (isLock || hasExpandedMenu()) {
				scheduleAutoHide();
				return;
			}
			if (!isTouchDevice && pointerY <= HIDE_EDGE) {
				scheduleAutoHide();
				return;
			}
			isVisible = false;
			applyVisualState();
		}, IDLE_HIDE_DELAY);
	}

	function showBarAndMaybeHideLater() {
		if (!isVisible) {
			isVisible = true;
			applyVisualState();
		}
		scheduleAutoHide();
	}

	function handlePointerPosition(y) {
		pointerY = y;
		if (isLock) {
			applyVisualState();
			return;
		}

		if (y <= SHOW_EDGE) {
			showBarAndMaybeHideLater();
			return;
		}

		if (isVisible && y > HIDE_EDGE && !hasExpandedMenu()) {
			isVisible = false;
			applyVisualState();
			clearAutoHideTimer();
			return;
		}

		if (isVisible) scheduleAutoHide();
	}

	const onPointerMove = e => {
		if (e.pointerType === 'touch') return;
		handlePointerPosition(e.clientY);
	};
	const onMouseMove = e => handlePointerPosition(e.clientY);
	const onTouchStart = e => {
		if (!e.touches || e.touches.length === 0) return;
		handlePointerPosition(e.touches[0].clientY);
	};
	const onTouchMove = e => {
		if (!e.touches || e.touches.length === 0) return;
		handlePointerPosition(e.touches[0].clientY);
	};
	const onTopBarTransitionEnd = e => {
		if (e.target !== topBar || e.propertyName !== 'top') return;
		forceWorkspaceResize();
	};
	const onWindowMouseLeave = e => {
		if (e.relatedTarget !== null) return;
		pointerY = Number.POSITIVE_INFINITY;
		if (isVisible && !isLock && !hasExpandedMenu()) {
			isVisible = false;
			applyVisualState();
			clearAutoHideTimer();
		} else if (isVisible) {
			scheduleAutoHide();
		}
	};
	const onButtonClick = () => {
		isLock = !isLock;
		if (!isLock && pointerY > HIDE_EDGE) isVisible = false;
		else isVisible = true;
		applyVisualState();
		if (!isLock) scheduleAutoHide();
		else clearAutoHideTimer();
	};

	const buttonImg = require('./button.svg');
	text.src = buttonImg;
	button.appendChild(text);
	console.log('Adding button to GUI');
	gui.appendChild(button);
	console.log('Button added to GUI');
	applyVisualState();
	console.log('Visual state applied');
	lastWorkspaceLayoutSignature = getWorkspaceLayoutSignature();

	if (window.PointerEvent) {
		document.addEventListener('pointermove', onPointerMove, {passive: true});
	} else {
		document.addEventListener('mousemove', onMouseMove, {passive: true});
	}
	document.addEventListener('touchstart', onTouchStart, {passive: true});
	document.addEventListener('touchmove', onTouchMove, {passive: true});
	topBar.addEventListener('transitionend', onTopBarTransitionEnd);
	window.addEventListener('mouseleave', onWindowMouseLeave);
	button.addEventListener('click', onButtonClick);
	forceWorkspaceResize()
	window[cleanupKey] = () => {
		clearAutoHideTimer();
		if (window.PointerEvent) {
			document.removeEventListener('pointermove', onPointerMove);
		} else {
			document.removeEventListener('mousemove', onMouseMove);
		}
		document.removeEventListener('touchstart', onTouchStart);
		document.removeEventListener('touchmove', onTouchMove);
		topBar.removeEventListener('transitionend', onTopBarTransitionEnd);
		window.removeEventListener('mouseleave', onWindowMouseLeave);
		button.removeEventListener('click', onButtonClick);
		if (postTransitionResizeTimer) clearTimeout(postTransitionResizeTimer);
		if (lateResizeTimer) clearTimeout(lateResizeTimer);
		if (button.parentElement) button.remove();
		topBar.style.position = '';
		topBar.style.width = '';
		topBar.style.top = '';
		topBar.style.transition = '';
		forceWorkspaceResize();
	};

	if (addon.self && typeof addon.self.addEventListener === 'function') {
		addon.self.addEventListener('disabled', window[cleanupKey]);
	}
}