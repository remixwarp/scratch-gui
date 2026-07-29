const STORAGE_KEY = "AESettings";
const DEFAULT_SETTINGS = {
    enableREADMEAutoDisplay: true,
    enableHTMLSupportInREADME: false,
    skipExtWarn: false,
    EnableExtensionPreview: false,
    EnableVSCodeLayout: false,
    EnableMobileLayout: false,
    EnableMobileTouchDrag: false,
    enableAutoUpdateCheck: false
};

export class AESettings {
        constructor() {
                this.storageKey = STORAGE_KEY;
                this.initset = {...DEFAULT_SETTINGS};
                this.init();
        }

        init() {
                if (!localStorage.getItem(this.storageKey)) {
                        const defaultSettings = this.initset
                        this.save(defaultSettings);
                }
        }

        getAll() {
                const stored = localStorage.getItem(this.storageKey);
                if (!stored || stored === 'undefined' || stored === 'null') {
                        return this.initset;
                }
                try {
                        return JSON.parse(stored);
                } catch (e) {
                        console.warn('Failed to parse settings from localStorage:', e);
                        return this.initset;
                }
        }

        get(id) {
                const settings = this.getAll();
                return settings[id] !== undefined ? settings[id] : this.initset[id];
        }

        set(id, value) {
                const settings = this.getAll();
                settings[id] = value;
                this.save(settings);
                return settings;
        }

        save(settings) {
                localStorage.setItem(this.storageKey, JSON.stringify(settings));
        }

        reset() {
                this.save(this.initset);
        }

        // Static methods for direct class usage (e.g. AESettings.get(...))
        static getAll() {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (!stored || stored === 'undefined' || stored === 'null') {
                        return {...DEFAULT_SETTINGS};
                }
                try {
                        return JSON.parse(stored);
                } catch (e) {
                        console.warn('Failed to parse settings from localStorage:', e);
                        return {...DEFAULT_SETTINGS};
                }
        }

        static get(id) {
                const settings = AESettings.getAll();
                return settings[id] !== undefined ? settings[id] : DEFAULT_SETTINGS[id];
        }

        static set(id, value) {
                const settings = AESettings.getAll();
                settings[id] = value;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
                return settings;
        }

        static reset() {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({...DEFAULT_SETTINGS}));
        }
}
