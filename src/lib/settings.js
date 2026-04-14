
export class AESettings {
        constructor() {
                this.storageKey = "AESettings";
                this.initset = {
                        enableREADMEAutoDisplay: true,
                        enableHTMLSupportInREADME: false,
                        skipExtWarn: false,
                        EnableExtensionPreview: false,
                        EnableVSCodeLayout: true,
                        EnableMobileLayout: false,
                        EnableMobileTouchDrag: false
                };
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
                        // If parsing fails, return default settings
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
}