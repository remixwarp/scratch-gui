const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const extensionsDir = path.join(__dirname, 'static', 'extensions');

const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

const downloadFile = (url, dest, retries = 3, options = {}) => {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(dest);
        
        const requestOptions = {
            timeout: 30000,
            ...options
        };
        
        protocol.get(url, requestOptions, (response) => {
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
                setTimeout(() => downloadFile(url, dest, retries - 1, options).then(resolve).catch(reject), 1000);
            } else {
                reject(err);
            }
        }).on('timeout', () => {
            file.close();
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
            if (retries > 0) {
                setTimeout(() => downloadFile(url, dest, retries - 1, options).then(resolve).catch(reject), 1000);
            } else {
                reject(new Error('Timeout'));
            }
        });
    });
};

const downloadMistiumExtensions = async () => {
    console.log('\n=== Downloading Mistium Extensions ===');
    try {
        // Use a simpler approach - fetch from raw GitHub
        const baseURL = 'https://raw.githubusercontent.com/Mistium/Origin-OS/main';
        const extensionsList = [
            { name: 'MistUtils', id: 'mistutils', file: 'Extensions/Apps/MistUtils.js' },
            { name: 'MistUI', id: 'mistui', file: 'Extensions/Apps/MistUI.js' },
        ];
        
        console.log(`Found ${extensionsList.length} Mistium extensions (using fallback list)`);
        
        let downloaded = 0;
        const metadata = [];
        
        for (const ext of extensionsList) {
            const extPath = path.join(extensionsDir, 'mistium', `${ext.name}.js`);
            ensureDir(path.dirname(extPath));
            
            try {
                await downloadFile(`${baseURL}/${ext.file}`, extPath, 3, { rejectUnauthorized: false });
                downloaded++;
                process.stdout.write(`\r  Downloaded: ${downloaded}/${extensionsList.length}`);
                metadata.push({
                    name: ext.name,
                    description: '',
                    extensionId: ext.id,
                    extensionURL: `/extensions/mistium/${ext.name}.js`,
                    onlineURL: `${baseURL}/${ext.file}`,
                    iconURL: null,
                    tags: ['mistium'],
                    credits: [],
                    incompatibleWithScratch: true,
                    featured: true
                });
            } catch (err) {
                console.log(`\n  ✗ Failed: ${ext.name}`);
                // Still add to metadata with online URL
                metadata.push({
                    name: ext.name,
                    description: '',
                    extensionId: ext.id,
                    extensionURL: `${baseURL}/${ext.file}`,
                    onlineURL: `${baseURL}/${ext.file}`,
                    iconURL: null,
                    tags: ['mistium'],
                    credits: [],
                    incompatibleWithScratch: true,
                    featured: true
                });
            }
        }
        console.log(`\n✓ Mistium: ${downloaded} downloaded`);
        
        fs.writeFileSync(path.join(extensionsDir, 'mistium', 'extensions-index.json'), JSON.stringify({ extensions: metadata }, null, 2));
    } catch (error) {
        console.error('✗ Failed:', error.message);
    }
};

const downloadSharkPoolsExtensions = async () => {
    console.log('\n=== Downloading SharkPools Extensions ===');
    try {
        // Use raw GitHub URLs as fallback
        const baseURL = 'https://raw.githubusercontent.com/sharkpool-sp/SharkPools-Extensions/main';
        const onlineBaseURL = 'https://sharkpools-extensions.vercel.app';
        
        // Try to fetch extension list from GitHub
        let extensions = [];
        try {
            const res = await new Promise((resolve, reject) => {
                https.get(`${baseURL}/Gallery%20Files/Extension-Keys.json`,
                    { rejectUnauthorized: false, timeout: 15000 },
                    (response) => {
                        let responseData = '';
                        response.on('data', chunk => responseData += chunk);
                        response.on('end', () => resolve(responseData));
                    }
                ).on('error', reject);
            });
            const data = JSON.parse(res);
            let extList = data.extensions || [];
            
            if (!Array.isArray(extList) && typeof extList === 'object') {
                extList = Object.entries(extList).map(([key, value]) => ({
                    id: value.id ?? key,
                    name: value.name ?? key,
                    ...value
                }));
            }
            extensions = extList.filter(ext => !ext.isDeprecated);
        } catch (err) {
            console.log('  Could not fetch extension list, using fallback');
            // Fallback list
            extensions = [
                { name: 'Sharktilities', creator: 'SharkPool', banner: 'Sharktilities.svg' },
                { name: 'YouTube-Operations', creator: 'SharkPool', banner: 'YouTube-Operations.svg' },
                { name: 'Tune-Shark-V3', creator: 'SharkPool', banner: 'Tune-Shark-V3.svg' },
            ];
        }
        
        console.log(`Found ${extensions.length} SharkPools extensions`);
        
        let downloaded = 0;
        let imgDownloaded = 0;
        const metadata = [];
        
        for (const ext of extensions) {
            const extName = ext.name || ext.id;
            const extFile = ext.url || `${extName}.js`;
            const extPath = path.join(extensionsDir, 'sharkpools', extFile);
            ensureDir(path.dirname(extPath));
            
            let localExtensionURL = `/extensions/sharkpools/${extFile}`;
            let finalOnlineURL = `${onlineBaseURL}/Gallery%20Files/${extFile}`;
            
            // Try to download extension file
            try {
                await downloadFile(`${baseURL}/Gallery%20Files/${extFile}`, extPath, 2, { rejectUnauthorized: false });
                downloaded++;
                process.stdout.write(`\r  Downloaded: ${downloaded}/${extensions.length} extensions`);
            } catch (err) {
                // Use online URL directly if download fails
                localExtensionURL = finalOnlineURL;
            }
            
            // Try to download icon
            let localIconURL = null;
            if (ext.banner) {
                const imgPath = path.join(extensionsDir, 'sharkpools', ext.banner);
                ensureDir(path.dirname(imgPath));
                try {
                    await downloadFile(`${baseURL}/Gallery%20Files/${ext.banner}`, imgPath, 2, { rejectUnauthorized: false });
                    localIconURL = `/extensions/sharkpools/${ext.banner}`;
                    imgDownloaded++;
                } catch (e) {
                    // Use online icon URL if download fails
                    localIconURL = `${onlineBaseURL}/Gallery%20Files/${ext.banner}`;
                }
            }
            
            metadata.push({
                name: extName,
                description: ext.description || ext.desc || '',
                extensionId: ext.id || extName.toLowerCase().replace(/[^a-z0-9]/g, ''),
                extensionURL: localExtensionURL,
                onlineURL: finalOnlineURL,
                iconURL: localIconURL,
                tags: ['sharkpools'],
                credits: [ext.creator].filter(Boolean),
                incompatibleWithScratch: true,
                featured: true
            });
        }
        console.log(`\n✓ SharkPools: ${downloaded} extensions downloaded, ${imgDownloaded} icons downloaded`);
        
        fs.writeFileSync(path.join(extensionsDir, 'sharkpools', 'extensions-index.json'), JSON.stringify({ extensions: metadata }, null, 2));
    } catch (error) {
        console.error('✗ Failed:', error.message);
    }
};

const createLocalExtensionsIndex = async () => {
    console.log('\n=== Creating Combined Extensions Index ===');
    const allExtensions = [];
    
    // TurboWarp
    const twPath = path.join(extensionsDir, 'turbowarp', 'generated-metadata', 'extensions-v0.json');
    if (fs.existsSync(twPath)) {
        const twData = JSON.parse(fs.readFileSync(twPath, 'utf8'));
        for (const ext of twData.extensions || []) {
            const slug = ext.slug;
            allExtensions.push({
                name: ext.name,
                nameTranslations: ext.nameTranslations || {},
                description: ext.description,
                descriptionTranslations: ext.descriptionTranslations || {},
                extensionId: ext.id,
                extensionURL: `/extensions/turbowarp/${slug}.js`,
                onlineURL: `https://extensions.turbowarp.org/${slug}.js`,
                iconURL: ext.image ? `/extensions/turbowarp/${ext.image}` : null,
                tags: ['tw'],
                credits: [...(ext.by || []), ...(ext.original || [])].map(c => c.name),
                incompatibleWithScratch: true,
                featured: true
            });
        }
    }
    
    // PenguinMod
    const pmPath = path.join(extensionsDir, 'penguinmod', 'extensions-index.json');
    if (fs.existsSync(pmPath)) {
        const pmData = JSON.parse(fs.readFileSync(pmPath, 'utf8'));
        for (const ext of pmData.extensions || []) {
            if (!ext.onlineURL && ext.extensionURL) {
                ext.onlineURL = ext.extensionURL;
            }
            allExtensions.push(ext);
        }
    }
    
    // Mistium
    const mistiumPath = path.join(extensionsDir, 'mistium', 'extensions-index.json');
    if (fs.existsSync(mistiumPath)) {
        const mistiumData = JSON.parse(fs.readFileSync(mistiumPath, 'utf8'));
        allExtensions.push(...(mistiumData.extensions || []));
    }
    
    // SharkPools
    const spPath = path.join(extensionsDir, 'sharkpools', 'extensions-index.json');
    if (fs.existsSync(spPath)) {
        const spData = JSON.parse(fs.readFileSync(spPath, 'utf8'));
        allExtensions.push(...(spData.extensions || []));
    }
    
    fs.writeFileSync(path.join(extensionsDir, 'extensions-index.json'), JSON.stringify({ extensions: allExtensions }, null, 2));
    console.log(`✓ Created index with ${allExtensions.length} extensions`);
};

const main = async () => {
    console.log('Starting Mistium and SharkPools extension download...');
    ensureDir(extensionsDir);
    
    await downloadMistiumExtensions();
    await downloadSharkPoolsExtensions();
    await createLocalExtensionsIndex();
    
    console.log('\n=== Download Complete ===');
};

main().catch(console.error);
