const fs = require('fs');

const big = fs.readFileSync('electron-app/src/display_bigscreen_touch_pro.html', 'utf8');
const core = fs.readFileSync('electron-app/src/classpet_core.js', 'utf8');

console.log('--- SCORE Listeners in Bigscreen ---');
const lines = big.split('\n');
lines.forEach((l, idx) => {
    if (l.includes('SCORE') || l.includes('triggerCelebration') || l.includes('triggerSpotlightCelebration') || l.includes('launchCelebration')) {
        console.log(`${idx + 1}: ${l.trim()}`);
    }
});
