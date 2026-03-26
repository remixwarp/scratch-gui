const https = require('https');
const fs = require('fs');
const path = require('path');

const extensionsDir = 'f:\\RemixWarp\\Scratch-GUI\\static\\extensions\\astraeditor';
const extensionsIndexPath = path.join(extensionsDir, 'extensions-index.json');

const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
};

const downloadFile = (url, dest, retries = 3, options = {}) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        
        const requestOptions = {
            timeout: 60000,
            ...options
        };
        
        https.get(url, requestOptions, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                file.close();
                if (fs.existsSync(dest)) fs.unlinkSync(dest);
                return downloadFile(response.headers.location, dest, retries, options).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                file.close();
                if (fs.existsSync(dest)) fs.unlinkSync(dest);
                return reject(new Error(`HTTP ${response.statusCode}`));
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            file.close();
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
            if (retries > 0) {
                console.log(`Retrying download for ${url} (${retries} attempts left)...`);
                setTimeout(() => downloadFile(url, dest, retries - 1, options).then(resolve).catch(reject), 2000);
            } else {
                reject(err);
            }
        }).on('timeout', () => {
            file.close();
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
            if (retries > 0) {
                console.log(`Timeout for ${url}, retrying (${retries} attempts left)...`);
                setTimeout(() => downloadFile(url, dest, retries - 1, options).then(resolve).catch(reject), 2000);
            } else {
                reject(new Error('Timeout'));
            }
        });
    });
};

const downloadAstraExtensions = async () => {
    console.log('=== Downloading AstraEditor Extensions ===');
    try {
        // Read extensions index
        console.log('Reading AstraEditor extensions index...');
        const indexContent = fs.readFileSync(extensionsIndexPath, 'utf8');
        const indexData = JSON.parse(indexContent);
        const extensions = indexData.extensions || [];
        
        console.log(`Found ${extensions.length} AstraEditor extensions`);
        
        let downloaded = 0;
        const updatedExtensions = [];
        
        for (const ext of extensions) {
            const extName = ext.name;
            const extUrl = ext.extensionURL;
            const filename = path.basename(extUrl);
            
            console.log(`\nProcessing: ${extName}`);
            
            // Download extension file
            const extPath = path.join(extensionsDir, filename);
            
            try {
                await downloadFile(extUrl, extPath, 3, { rejectUnauthorized: false });
                console.log(`  ✓ Downloaded extension: ${filename}`);
                downloaded++;
                
                // Update extensionURL to local path
                const updatedExt = {
                    ...ext,
                    extensionURL: `/extensions/astraeditor/${filename}`
                };
                updatedExtensions.push(updatedExt);
            } catch (err) {
                console.log(`  ✗ Failed to download extension: ${err.message}`);
                updatedExtensions.push(ext);
            }
        }
        
        console.log(`\n=== Download Summary ===`);
        console.log(`✓ Extensions downloaded: ${downloaded}/${extensions.length}`);
        
        // Update extensions index
        const updatedIndex = {
            extensions: updatedExtensions
        };
        fs.writeFileSync(extensionsIndexPath, JSON.stringify(updatedIndex, null, 2));
        console.log(`\n✓ Updated extensions index: ${extensionsIndexPath}`);
        
    } catch (error) {
        console.error('✗ Failed:', error.message);
        console.error(error.stack);
    }
};

const main = async () => {
    console.log('Starting AstraEditor extension download...');
    await downloadAstraExtensions();
    console.log('\n=== Download Complete ===');
};

main().catch(console.error);
