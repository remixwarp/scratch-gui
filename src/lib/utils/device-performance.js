/**
 * Detects the current device's performance capabilities and returns a
 * classification that can be used to adapt rendering quality, animation
 * frequency, and other resource-intensive behaviours.
 *
 * The classification is based on:
 *  - navigator.deviceMemory (RAM in GB)
 *  - navigator.hardwareConcurrency (logical CPU cores)
 *  - navigator.connection.effectiveType (4g / 3g / 2g / slow-2g)
 *  - screen pixel ratio
 *
 * Returns one of: 'low', 'medium', 'high'
 */

let cachedResult = null;

const detectDevicePerformance = () => {
    if (cachedResult !== null) return cachedResult;

    let score = 0;

    // Memory (0–2 points)
    if (typeof navigator !== 'undefined' && navigator.deviceMemory) {
        const mem = navigator.deviceMemory;
        if (mem >= 8) score += 2;
        else if (mem >= 4) score += 1;
    }

    // CPU cores (0–2 points)
    if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
        const cores = navigator.hardwareConcurrency;
        if (cores >= 8) score += 2;
        else if (cores >= 4) score += 1;
    }

    // Connection type (0–2 points)
    if (typeof navigator !== 'undefined' && navigator.connection) {
        const type = navigator.connection.effectiveType;
        if (type === '4g') score += 2;
        else if (type === '3g') score += 1;
        // 2g / slow-2g → 0 points
    } else {
        // Assume desktop with good connection
        score += 2;
    }

    // Device pixel ratio (0–1 point) — high DPR screens are usually on
    // powerful devices, but drawing at native resolution is heavier.
    if (typeof window !== 'undefined' && window.devicePixelRatio) {
        if (window.devicePixelRatio >= 2) score += 1;
    }

    if (score >= 6) cachedResult = 'high';
    else if (score >= 3) cachedResult = 'medium';
    else cachedResult = 'low';

    return cachedResult;
};

/**
 * Returns recommended renderer settings for the detected device tier.
 * These can be passed to the scratch-render canvas or tweaked in the VM.
 */
export const getRecommendedRendererSettings = () => {
    const tier = detectDevicePerformance();
    switch (tier) {
    case 'low':
        return {
            // Disable high-quality pen rendering on low-end devices
            highQualityPen: false,
            // Use a lower stage resolution to reduce GPU fill cost
            stageResolution: 1, // 1 = native, 0.5 → half resolution
            // Limit the maximum number of drawable clones
            maxClones: 100
        };
    case 'medium':
        return {
            highQualityPen: true,
            stageResolution: 1,
            maxClones: 300
        };
    case 'high':
    default:
        return {
            highQualityPen: true,
            stageResolution: 1,
            maxClones: 300
        };
    }
};

export const isLowEndDevice = () => detectDevicePerformance() === 'low';

export const getDeviceTier = () => detectDevicePerformance();

export default detectDevicePerformance;