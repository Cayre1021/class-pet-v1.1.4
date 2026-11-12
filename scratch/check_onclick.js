const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../electron-app/src');
fs.readdirSync(dir).filter(f => f.endsWith('.html')).forEach(file => {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        // match onclick="..." or onclick='...'
        const matches = line.matchAll(/onclick\s*=\s*["']([^"']+)["']/g);
        for (const m of matches) {
            const val = m[1];
            // check for ${...} inside parentheses where it's not wrapped in quotes
            const fnMatches = val.matchAll(/\(([^)]+)\)/g);
            for (const fn of fnMatches) {
                const args = fn[1].split(',').map(a => a.trim());
                args.forEach(arg => {
                    if (arg.startsWith('${') && arg.endsWith('}') && !arg.includes("'") && !arg.includes('"')) {
                        // Numeric literals like ${r.points} or ${index} are fine, but string ids like ${s.id} or ${item.id} are fatal!
                        console.log(`${file}:${i + 1} -> ${fn[0]} -> arg: ${arg}`);
                    }
                });
            }
        }
    });
});
