export default async function ({ addon, console, msg }) {
    // Wait for stage selector to be available
    const stageSelector = await addon.tab.waitForElement("[class*='stage-selector_stage-selector']", {
        markAsSeen: true
    });

    if (!stageSelector) {
        console.warn('Stage selector not found');
        return;
    }

    // Wait for stage wrapper to be available
    const stageWrapper = await addon.tab.waitForElement("[class*='stage-wrapper_stage-wrapper']", {
        markAsSeen: true
    });

    if (!stageWrapper) {
        console.warn('Stage wrapper not found');
        return;
    }

    // State
    let zoom = 100;
    let isWindowMode = false;
    let isVisible = addon.settings.get('showControls');

    // Create camera controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'sa-stage-camera-controls' + (isVisible ? '' : ' hidden');

    // Header
    const header = document.createElement('div');
    header.className = 'sa-stage-camera-header';
    
    const title = document.createElement('span');
    title.className = 'sa-stage-camera-title';
    title.textContent = msg('camera-title') || '相机';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'sa-stage-camera-toggle';
    closeBtn.innerHTML = '✕';
    closeBtn.title = msg('hide') || '隐藏';
    closeBtn.addEventListener('click', () => {
        controlsContainer.classList.add('hidden');
        triggerBtn.style.display = 'flex';
    });
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    controlsContainer.appendChild(header);

    // Buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'sa-stage-camera-buttons';

    // Zoom in button
    const zoomInBtn = document.createElement('button');
    zoomInBtn.className = 'sa-stage-camera-button';
    zoomInBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>';
    zoomInBtn.title = msg('zoom-in') || '放大';
    zoomInBtn.addEventListener('click', () => {
        zoom = Math.min(zoom + 10, 200);
        updateZoom();
    });
    buttonsContainer.appendChild(zoomInBtn);

    // Zoom out button
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.className = 'sa-stage-camera-button';
    zoomOutBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>';
    zoomOutBtn.title = msg('zoom-out') || '缩小';
    zoomOutBtn.addEventListener('click', () => {
        zoom = Math.max(zoom - 10, 50);
        updateZoom();
    });
    buttonsContainer.appendChild(zoomOutBtn);

    // Reset button
    const resetBtn = document.createElement('button');
    resetBtn.className = 'sa-stage-camera-button';
    resetBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>';
    resetBtn.title = msg('reset') || '重置';
    resetBtn.addEventListener('click', () => {
        zoom = 100;
        updateZoom();
    });
    buttonsContainer.appendChild(resetBtn);

    // Window mode button
    const windowModeBtn = document.createElement('button');
    windowModeBtn.className = 'sa-stage-camera-button sa-stage-camera-window-mode';
    windowModeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>';
    windowModeBtn.title = msg('window-mode') || '窗口模式';
    windowModeBtn.addEventListener('click', toggleWindowMode);
    buttonsContainer.appendChild(windowModeBtn);

    controlsContainer.appendChild(buttonsContainer);

    // Zoom display
    const zoomDisplay = document.createElement('div');
    zoomDisplay.className = 'sa-stage-camera-zoom-display';
    zoomDisplay.textContent = zoom + '%';
    controlsContainer.appendChild(zoomDisplay);

    // Add to stage selector
    stageSelector.style.position = 'relative';
    stageSelector.appendChild(controlsContainer);

    // Create trigger button (shown when controls are hidden)
    const triggerBtn = document.createElement('button');
    triggerBtn.className = 'sa-stage-camera-trigger';
    triggerBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>';
    triggerBtn.title = msg('show-camera') || '显示相机控制';
    triggerBtn.style.display = isVisible ? 'none' : 'flex';
    triggerBtn.addEventListener('click', () => {
        controlsContainer.classList.remove('hidden');
        triggerBtn.style.display = 'none';
    });
    stageSelector.appendChild(triggerBtn);

    // Window mode container
    let windowContainer = null;
    let windowHeader = null;
    let isDraggingWindow = false;
    let dragStart = { x: 0, y: 0 };
    let windowPos = { x: 100, y: 100 };

    // Toggle window mode
    function toggleWindowMode() {
        isWindowMode = !isWindowMode;
        
        if (isWindowMode) {
            enterWindowMode();
        } else {
            exitWindowMode();
        }
        
        updateWindowModeButton();
    }

    function updateWindowModeButton() {
        if (isWindowMode) {
            windowModeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3z"></path><path d="M9 3v18"></path></svg>';
            windowModeBtn.title = msg('fixed-mode') || '固定模式';
        } else {
            windowModeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>';
            windowModeBtn.title = msg('window-mode') || '窗口模式';
        }
    }

    function enterWindowMode() {
        // Create window container
        windowContainer = document.createElement('div');
        windowContainer.className = 'sa-stage-camera-window';
        windowContainer.style.left = windowPos.x + 'px';
        windowContainer.style.top = windowPos.y + 'px';

        // Create window header
        windowHeader = document.createElement('div');
        windowHeader.className = 'sa-stage-camera-window-header';
        
        const headerTitle = document.createElement('span');
        headerTitle.className = 'sa-stage-camera-window-title';
        headerTitle.textContent = msg('stage-window') || '舞台窗口';
        
        windowHeader.appendChild(headerTitle);
        windowContainer.appendChild(windowHeader);

        // Create window content
        const windowContent = document.createElement('div');
        windowContent.className = 'sa-stage-camera-window-content';

        // Move stage canvas to window
        const stageCanvas = stageWrapper.querySelector("[class*='stage_stage']");
        if (stageCanvas) {
            windowContent.appendChild(stageCanvas);
        }
        
        windowContainer.appendChild(windowContent);
        document.body.appendChild(windowContainer);

        // Setup drag functionality
        windowHeader.addEventListener('mousedown', startWindowDrag);
    }

    function exitWindowMode() {
        if (!windowContainer) return;

        // Move stage canvas back to stage wrapper
        const stageCanvas = windowContainer.querySelector("[class*='stage_stage']");
        if (stageCanvas) {
            stageWrapper.appendChild(stageCanvas);
        }

        // Remove window container
        windowContainer.remove();
        windowContainer = null;
        windowHeader = null;
    }

    function startWindowDrag(e) {
        if (e.target.closest('.sa-stage-camera-window-close')) return;
        isDraggingWindow = true;
        dragStart = { 
            x: e.clientX - windowPos.x, 
            y: e.clientY - windowPos.y 
        };
        windowHeader.style.cursor = 'grabbing';
    }

    document.addEventListener('mousemove', (e) => {
        if (isDraggingWindow && windowContainer) {
            windowPos.x = e.clientX - dragStart.x;
            windowPos.y = e.clientY - dragStart.y;
            windowContainer.style.left = windowPos.x + 'px';
            windowContainer.style.top = windowPos.y + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDraggingWindow) {
            isDraggingWindow = false;
            if (windowHeader) {
                windowHeader.style.cursor = 'grab';
            }
        }
    });

    // Update zoom function
    function updateZoom() {
        zoomDisplay.textContent = zoom + '%';
        
        // Apply zoom to stage canvas
        const stageCanvas = document.querySelector("[class*='stage_stage']");
        if (stageCanvas) {
            stageCanvas.style.transform = `scale(${zoom / 100})`;
            stageCanvas.style.transformOrigin = 'center center';
        }
    }

    // Settings change listener
    addon.settings.addEventListener('change', () => {
        isVisible = addon.settings.get('showControls');
        if (isVisible) {
            controlsContainer.classList.remove('hidden');
            triggerBtn.style.display = 'none';
        } else {
            controlsContainer.classList.add('hidden');
            triggerBtn.style.display = 'flex';
        }
    });

    // Check for video sensing extension
    const checkVideoSensing = () => {
        const vm = addon.tab.traps.vm;
        if (!vm) return false;
        
        const hasVideoSensing = vm.extensionManager && 
            vm.extensionManager.isExtensionLoaded('videoSensing');
        const hasFaceDetection = vm.extensionManager && 
            vm.extensionManager.isExtensionLoaded('faceDetection');
        
        return hasVideoSensing || hasFaceDetection;
    };

    // Auto-show when video extension is loaded
    const vm = addon.tab.traps.vm;
    if (vm && vm.extensionManager) {
        const originalLoadExtension = vm.extensionManager.loadExtensionIdSync.bind(vm.extensionManager);
        vm.extensionManager.loadExtensionIdSync = function(extensionId) {
            const result = originalLoadExtension(extensionId);
            if (extensionId === 'videoSensing' || extensionId === 'faceDetection') {
                // Auto show controls when video extension is loaded
                controlsContainer.classList.remove('hidden');
                triggerBtn.style.display = 'none';
            }
            return result;
        };
    }

    // Cleanup when addon is disabled
    addon.self.addEventListener('disabled', () => {
        controlsContainer.remove();
        triggerBtn.remove();
        
        // Exit window mode if active
        if (isWindowMode) {
            exitWindowMode();
        }
        
        // Reset stage transform
        const stageCanvas = document.querySelector("[class*='stage_stage']");
        if (stageCanvas) {
            stageCanvas.style.transform = '';
            stageCanvas.style.transformOrigin = '';
        }
    });

    console.log('Stage camera controls addon loaded');
}
