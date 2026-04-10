const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const { join, extname, basename, dirname } = require('path');

class SuperRefactorFiles {
    constructor(projectPath) {
        this.projectPath = projectPath;
        this.files = new Map();
        this.init();
    }

    init() {
        this.scanProjectFiles();
    }

    scanProjectFiles() {
        const scanDir = (dir) => {
            const entries = readdirSync(dir);
            for (const entry of entries) {
                const fullPath = join(dir, entry);
                const stat = statSync(fullPath);
                if (stat.isDirectory()) {
                    scanDir(fullPath);
                } else {
                    const relativePath = fullPath.replace(this.projectPath, '').substring(1);
                    this.files.set(relativePath, {
                        path: relativePath,
                        fullPath: fullPath,
                        content: readFileSync(fullPath, 'utf8'),
                        modified: false
                    });
                }
            }
        };

        scanDir(this.projectPath);
    }

    getFile(path) {
        return this.files.get(path);
    }

    updateFile(path, content) {
        const file = this.files.get(path);
        if (file) {
            file.content = content;
            file.modified = true;
        }
    }

    saveFile(path) {
        const file = this.files.get(path);
        if (file && file.modified) {
            const dir = dirname(file.fullPath);
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
            writeFileSync(file.fullPath, file.content, 'utf8');
            file.modified = false;
        }
    }

    saveAll() {
        for (const file of this.files.values()) {
            if (file.modified) {
                this.saveFile(file.path);
            }
        }
    }

    getFilesByExtension(extension) {
        const result = [];
        for (const file of this.files.values()) {
            if (extname(file.path) === extension) {
                result.push(file);
            }
        }
        return result;
    }

    searchFiles(query) {
        const result = [];
        const lowerQuery = query.toLowerCase();
        for (const file of this.files.values()) {
            if (file.path.toLowerCase().includes(lowerQuery) || file.content.toLowerCase().includes(lowerQuery)) {
                result.push(file);
            }
        }
        return result;
    }

    getFiles() {
        return Array.from(this.files.values());
    }
}

module.exports = SuperRefactorFiles;