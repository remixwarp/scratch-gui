const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const extensionsDir = path.join(__dirname, 'static', 'extensions');

const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        const file = fs.createWriteStream(dest);
        
        protocol.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                file.close();
                fs.unlinkSync(dest);
                return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
            }
            
            if (response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(dest);
                return reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                console.log(`Downloaded: ${url} -> ${dest}`);
                resolve();
            });
        }).on('error', (err) => {
            file.close();
            fs.unlinkSync(dest, () => {});
            reject(err);
        });
    });
};

const downloadExtensions = async () => {
    console.log('Starting extension downloads...');
    
    const extensions = [
        // TurboWarp extensions
        {
            url: 'https://extensions.turbowarp.org/generated-metadata/extensions-v0.json',
            dest: path.join(extensionsDir, 'turbowarp', 'generated-metadata', 'extensions-v0.json')
        },
        {
            url: 'https://extensions.turbowarp.org/lab/text.js',
            dest: path.join(extensionsDir, 'turbowarp', 'lab', 'text.js')
        },
        {
            url: 'https://extensions.turbowarp.org/turboloader/audiostream.js',
            dest: path.join(extensionsDir, 'turbowarp', 'turboloader', 'audiostream.js')
        },
        
        // Mistium extensions
        {
            url: 'https://extensions.mistium.com/generated-metadata/extensions-v0.json',
            dest: path.join(extensionsDir, 'mistium', 'generated-metadata', 'extensions-v0.json')
        },
        
        // SharkPools extensions
        {
            url: 'https://sharkpools-extensions.vercel.app/Gallery%20Files/Extension-Keys.json',
            dest: path.join(extensionsDir, 'sharkpools', 'Extension-Keys.json')
        }
    ];
    
    for (const ext of extensions) {
        try {
            const dir = path.dirname(ext.dest);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            await downloadFile(ext.url, ext.dest);
        } catch (error) {
            console.error(`Error downloading ${ext.url}:`, error.message);
        }
    }
    
    console.log('Extension downloads completed!');
};

downloadExtensions().catch(console.error);
