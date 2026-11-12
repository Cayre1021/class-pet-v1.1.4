const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../electron-app/src');
let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }

function target() {
    return {
        handlers: {}, style: {},
        addEventListener(type, fn, capture) {
            (this.handlers[type] ||= []).push({ fn, capture });
        },
        dispatch(type, props = {}) {
            const event = { type, pointerId: 1, button: 0, isPrimary: true,
                clientX: 100, clientY: 100, detail: 1, target: ball,
                preventDefault() { this.prevented = true; },
                stopImmediatePropagation() { this.stopped = true; }, ...props };
            for (const { fn } of this.handlers[type] || []) {
                fn(event);
                if (event.stopped) break;
            }
            return event;
        }
    };
}
let ball;
for (const [file, name, receiver, key] of [
    ['display_bigscreen_touch_pro.html', 'initFloatingBallDrag', 'window', 'classpet_floating_ball_pos'],
    ['teacher_panel_touch_pro.html', 'initTeacherFloatingBallDrag', 'document', 'classpet_teacher_floating_ball_pos']
]) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const start = html.indexOf('(function ' + name + '()');
    assert.ok(start >= 0);
    const code = html.slice(start, html.indexOf('})();', start) + 5);
    for (const pointerType of ['mouse', 'touch', 'pen']) {
        ball = target();
        ball.closest = () => null;
        ball.setPointerCapture = id => { ball.captured = id; };
        const container = target();
        container.contains = el => el === ball;
        container.getBoundingClientRect = () => ({ left: parseFloat(container.style.left) || 80, top: parseFloat(container.style.top) || 80 });
        const document = target();
        document.getElementById = id => id === 'classpetFloatingBall' ? ball : container;
        const window = Object.assign(target(), { innerWidth: 1000, innerHeight: 800 });
        const saved = new Map();
        let closes = 0;
        vm.runInNewContext(code, { document, window,
            localStorage: { getItem: k => saved.get(k), setItem: (k, v) => saved.set(k, v) },
            closeRadialMenu: () => { closes++; } });
        const movementTarget = receiver === 'window' ? window : document;
        let opens = 0;
        // Model the existing inline onclick after the capturing click listener.
        const click = detail => { const e = ball.dispatch('click', { detail }); if (!e.stopped) opens++; return e; };
        const down = (props = {}) => ball.dispatch('pointerdown', { pointerType, ...props });
        const move = props => movementTarget.dispatch('pointermove', { pointerType, ...props });
        const up = (props = {}) => movementTarget.dispatch('pointerup', { pointerType, ...props });
        down(); up(); click(1);
        check(opens === 1, file + ': tap opens with ' + pointerType);
        down(); move({ clientX: 103 }); up(); click(1);
        check(opens === 2, 'small hand jitter remains a click');
        down(); move({ clientX: 150, clientY: 140 }); up();
        check(closes > 0 && saved.has(key), 'drag closes menu and saves position');
        const draggedClick = click(1);
        check(draggedClick.prevented && opens === 2, 'release after drag does not reopen menu');
        click(0);
        check(opens === 3, 'keyboard activation still works after drag');
        down(); up(); click(1);
        check(opens === 4, 'next deliberate click opens normally');
        down(); move({ pointerId: 2, clientX: 200 }); up({ pointerId: 2 }); up(); click(1);
        check(opens === 5, 'second pointer cannot move or finish primary gesture');
        down(); movementTarget.dispatch('pointercancel'); click(1);
        check(opens === 5, 'cancelled gesture cannot open menu');
        check(!ball.handlers.mousedown && !ball.handlers.touchstart, 'no duplicate compatibility mouse/touch handlers');
    }
}
const css = fs.readFileSync(path.join(root, 'display_layout_a.css'), 'utf8');
check(/\.detail-actions button:active\s*\{[^}]*translate\(2px, 2px\)/.test(css), 'detail buttons have pressed feedback');
check(css.includes('.detail-actions button:focus-visible'), 'detail buttons have keyboard focus feedback');
check(/\.detail-actions button \{[^}]*box-shadow: 3px 3px #111/.test(css), 'detail buttons use hard shadow style');
for (const file of ['display_layout_a.css', 'teacher_layout_c.css']) {
    check(/\.classpet-floating-ball\s*\{\s*touch-action:\s*none/.test(fs.readFileSync(path.join(root, file), 'utf8')), 'floating drag disables native touch scrolling: ' + file);
}
console.log(`${checks} floating gesture and button style checks passed; native input and visuals remain manual.`);
