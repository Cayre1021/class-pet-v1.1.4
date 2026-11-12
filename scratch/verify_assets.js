const fs = require('fs');
const path = require('path');

const species = ['cat', 'dog', 'fox', 'bunny', 'bird', 'deer', 'hamster', 'fish'];
const dir = path.join(__dirname, '../electron-app/src/assets/pets');
let missing = [];

species.forEach(sp => {
    for (let st = 1; st <= 5; st++) {
        const p = path.join(dir, sp, `${sp}-stage${st}.png`);
        if (!fs.existsSync(p)) {
            missing.push(p);
        } else {
            const stat = fs.statSync(p);
            if (stat.size === 0) missing.push(p + ' (0 bytes)');
        }
    }
});

const egg = path.join(dir, 'shared', 'egg.png');
if (!fs.existsSync(egg)) missing.push(egg);

console.log('Missing/Corrupt images count:', missing.length);
if (missing.length > 0) {
    console.log(missing);
} else {
    console.log('All 40 stage images + 1 shared egg image are 100% present and non-empty!');
}
