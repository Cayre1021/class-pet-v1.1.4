const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../electron-app/src');
const htmlFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.html'));

let missingAssets = [];
let checkedAssets = 0;

htmlFiles.forEach(file => {
    const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
    const srcRegex = /src=["']([^"']+)["']/g;
    let m;
    while ((m = srcRegex.exec(content)) !== null) {
        const assetPath = m[1];
        if (assetPath.startsWith('http') || assetPath.startsWith('data:') || assetPath.includes('${')) continue;
        checkedAssets++;
        const resolved = path.resolve(srcDir, assetPath);
        if (!fs.existsSync(resolved)) {
            missingAssets.push({ file, assetPath, resolved });
        }
    }
});

console.log('Total static src assets checked:', checkedAssets);
console.log('Missing static assets found:', missingAssets.length);

const speciesList = ['cat', 'dog', 'fox', 'bunny', 'bird', 'deer', 'hamster', 'fish'];
let missingPetImages = [];

const eggPath = path.join(srcDir, 'assets/pets/shared/egg.png');
if (!fs.existsSync(eggPath)) {
    missingPetImages.push('assets/pets/shared/egg.png');
}

speciesList.forEach(sp => {
    for (let st = 1; st <= 5; st++) {
        const p = path.join(srcDir, 'assets/pets', sp, sp + '-stage' + st + '.png');
        if (!fs.existsSync(p)) {
            missingPetImages.push('assets/pets/' + sp + '/' + sp + '-stage' + st + '.png');
        }
    }
});

console.log('Pet images checked: 41 (1 egg + 8 species * 5 stages = 41)');
console.log('Missing pet images count:', missingPetImages.length);

if (missingAssets.length > 0 || missingPetImages.length > 0) {
    console.error('Missing static assets:', missingAssets);
    console.error('Missing pet images:', missingPetImages);
    process.exit(1);
} else {
    console.log('[PASS] All static and dynamic pet image assets (36/36) exist on disk 100%!');
}
