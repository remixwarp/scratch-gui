// Donation QR Code Anti-Modification System
// This script repeatedly injects the QR code to prevent frontend deletion

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        qrImageSrc: '码.png',
        qrAltText: 'WeChat Pay QR Code',
        injectionInterval: 100, // Inject every 100ms
        checkInterval: 50,      // Check every 50ms
        containerSelector: '.qr-container'
    };

    // Store original QR code data
    const originalQRData = {
        src: CONFIG.qrImageSrc,
        alt: CONFIG.qrAltText,
        width: '300px',
        height: 'auto'
    };

    // Create a QR code element
    function createQRElement(id) {
        const img = document.createElement('img');
        img.id = id;
        img.className = 'qr-code';
        img.src = originalQRData.src;
        img.alt = originalQRData.alt;
        img.style.maxWidth = originalQRData.width;
        img.style.height = originalQRData.height;
        img.style.border = '2px solid #ddd';
        img.style.borderRadius = '10px';
        img.style.position = 'relative';
        img.style.zIndex = '9999';
        return img;
    }

    // Get or create QR container
    function getQRContainer() {
        let container = document.querySelector(CONFIG.containerSelector);
        if (!container) {
            // Create container if it doesn't exist
            container = document.createElement('div');
            container.className = 'qr-container';
            container.style.textAlign = 'center';
            container.style.margin = '30px 0';
            container.style.position = 'relative';

            // Insert after the warning message
            const warning = document.querySelector('.warning');
            if (warning && warning.nextElementSibling) {
                warning.nextElementSibling.insertBefore(container, warning.nextElementSibling.firstChild);
            } else {
                // Fallback: append to main
                const main = document.querySelector('main');
                if (main) {
                    main.appendChild(container);
                }
            }
        }
        return container;
    }

    // Inject QR code into container
    function injectQRCode() {
        const container = getQRContainer();
        if (!container) return;

        // Check if QR code exists
        let qrCode = document.getElementById('qr-code');
        let qrCodeBackup = document.getElementById('qr-code-backup');

        // If main QR code is missing or modified, recreate it
        if (!qrCode || qrCode.src !== originalQRData.src) {
            if (qrCode) {
                qrCode.remove();
            }
            qrCode = createQRElement('qr-code');
            container.appendChild(qrCode);
        }

        // If backup QR code is missing, recreate it
        if (!qrCodeBackup) {
            qrCodeBackup = createQRElement('qr-code-backup');
            qrCodeBackup.style.display = 'none';
            container.appendChild(qrCodeBackup);
        }

        // Ensure container has the correct content
        if (container.children.length < 2) {
            // Clear and re-inject both images
            container.innerHTML = '';
            container.appendChild(createQRElement('qr-code'));
            const backup = createQRElement('qr-code-backup');
            backup.style.display = 'none';
            container.appendChild(backup);
        }
    }

    // High frequency flash protection
    function startFlashProtection() {
        let useMainImage = true;
        const qrCodeElement = document.getElementById('qr-code');
        const qrCodeBackupElement = document.getElementById('qr-code-backup');

        if (!qrCodeElement || !qrCodeBackupElement) return;

        setInterval(() => {
            if (useMainImage) {
                qrCodeElement.src = originalQRData.src;
                qrCodeBackupElement.style.display = 'none';
                qrCodeElement.style.display = 'inline';
            } else {
                qrCodeBackupElement.src = originalQRData.src;
                qrCodeElement.style.display = 'none';
                qrCodeBackupElement.style.display = 'inline';
            }
            useMainImage = !useMainImage;
        }, 50); // Switch every 50ms
    }

    // Mutation observer to detect and prevent deletion
    function setupMutationObserver() {
        const container = getQRContainer();
        if (!container) return;

        const observer = new MutationObserver((mutations) => {
            let needsReinject = false;

            mutations.forEach((mutation) => {
                // Check if QR code was removed
                if (mutation.type === 'childList') {
                    mutation.removedNodes.forEach((node) => {
                        if (node.id === 'qr-code' || node.id === 'qr-code-backup') {
                            needsReinject = true;
                        }
                    });
                }

                // Check if QR code attributes were modified
                if (mutation.type === 'attributes') {
                    const target = mutation.target;
                    if (target.id === 'qr-code' || target.id === 'qr-code-backup') {
                        if (target.src !== originalQRData.src) {
                            target.src = originalQRData.src;
                        }
                    }
                }
            });

            if (needsReinject) {
                injectQRCode();
            }
        });

        observer.observe(container, {
            childList: true,
            attributes: true,
            subtree: true,
            attributeFilter: ['src', 'style', 'display']
        });

        // Also observe the entire document for container removal
        const documentObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            if (node.classList && node.classList.contains('qr-container')) {
                                // Container was removed, recreate it
                                setTimeout(injectQRCode, 0);
                            }
                            // Check if container is inside removed node
                            const container = node.querySelector ? node.querySelector('.qr-container') : null;
                            if (container) {
                                setTimeout(injectQRCode, 0);
                            }
                        }
                    });
                }
            });
        });

        documentObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Continuous injection loop
    function startContinuousInjection() {
        // Initial injection
        injectQRCode();

        // Repeated injection
        setInterval(injectQRCode, CONFIG.injectionInterval);

        // Check and fix on interval
        setInterval(() => {
            const qrCode = document.getElementById('qr-code');
            const container = document.querySelector(CONFIG.containerSelector);

            if (!container || !qrCode) {
                injectQRCode();
            }
        }, CONFIG.checkInterval);
    }

    // Prevent deletion via keyboard shortcuts and context menu
    function setupDeletionProtection() {
        // Prevent right-click on QR code
        document.addEventListener('contextmenu', (e) => {
            if (e.target.id === 'qr-code' || e.target.id === 'qr-code-backup') {
                e.preventDefault();
                return false;
            }
        });

        // Prevent keyboard deletion
        document.addEventListener('keydown', (e) => {
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.id === 'qr-code' || activeElement.id === 'qr-code-backup')) {
                if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    return false;
                }
            }
        });

        // Prevent cut operation
        document.addEventListener('cut', (e) => {
            if (e.target.id === 'qr-code' || e.target.id === 'qr-code-backup') {
                e.preventDefault();
                return false;
            }
        });
    }

    // Initialize when DOM is ready
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                startContinuousInjection();
                startFlashProtection();
                setupMutationObserver();
                setupDeletionProtection();
            });
        } else {
            startContinuousInjection();
            startFlashProtection();
            setupMutationObserver();
            setupDeletionProtection();
        }
    }

    // Start the protection system
    init();

    // Also re-init on window load to ensure everything is ready
    window.addEventListener('load', () => {
        injectQRCode();
    });

    // Expose a function to force re-injection (for debugging)
    window.forceReinjectQR = injectQRCode;

})();