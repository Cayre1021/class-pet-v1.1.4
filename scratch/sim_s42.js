const fs = require('fs');
const path = require('path');

// Simulate the exact code in browser
const coreCode = fs.readFileSync('electron-app/src/classpet_core.js', 'utf8');

// Mock browser environment
const window = {
    localStorage: {
        _data: {},
        getItem(k) { return this._data[k] || null; },
        setItem(k, v) { this._data[k] = String(v); },
        removeItem(k) { delete this._data[k]; }
    },
    addEventListener() {},
    BroadcastChannel: class {
        postMessage() {}
        close() {}
    },
    AudioContext: class {
        createOscillator() { return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
        createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    }
};
const localStorage = window.localStorage;
const BroadcastChannel = window.BroadcastChannel;

eval(coreCode);

const store = window.classPetRuntime;

// Let's find student 42 (吕四)
const s42 = store.students.find(s => s.no === '42' || s.name === '吕四' || s.id === 'st_42');
console.log('--- Initial State of Student 42 ---');
console.log('ID:', s42.id, 'Name:', s42.name, 'EXP:', s42.exp, 'Level:', s42.level, 'Stage:', s42.visualStage, 'isHatched:', s42.isHatched, 'stamp:', s42.stamp);
console.log('Pet chinese:', s42.pets.chinese);

// Now simulate Bigscreen subscribe:
let celebrationTriggered = [];
store.subscribe((event, payload) => {
    if (event === 'SCORE' && payload) {
        console.log('SCORE event received:', {
            delta: payload.delta,
            oldLevel: payload.oldLevel,
            newLevel: payload.newLevel,
            isLevelUp: payload.isLevelUp,
            isStageUp: payload.isStageUp,
            oldStage: payload.oldStage,
            newStage: payload.newStage,
            stamp: payload.stamp
        });
        if (payload.isLevelUp) {
            celebrationTriggered.push(payload);
        }
    }
});

console.log('\n--- Simulating 1 Pet Interaction ---');
const interactResult = store.doPetInteraction(s42.id, '打招呼', 1);
console.log('Interact Result:', interactResult);
console.log('Student 42 after interact: EXP =', s42.exp, 'Level =', s42.level, 'Stage =', s42.visualStage, 'stamp =', s42.stamp);

// Now check refreshModal logic for canEvolve and modalEvolveTriggerBox
const pet = s42.pets[s42.activeSubject] || s42.pets.chinese;
const curStage = pet.visualStage || 1;
const expectedStage = store.calcVisualStage ? store.calcVisualStage(pet.level) : 1;
const canEvolve = s42.isHatched && (s42.stamp === 'EVOLVE' || expectedStage > curStage || (pet.level >= 4 && curStage < 2) || (pet.level >= 8 && curStage < 3) || (pet.level >= 13 && curStage < 4) || (pet.level >= 20 && curStage < 5));

console.log('\n--- In Detail Modal (refreshModal) ---');
console.log('curStage:', curStage);
console.log('expectedStage:', expectedStage);
console.log('s42.stamp:', s42.stamp);
console.log('canEvolve:', canEvolve);
console.log('Celebrations triggered:', celebrationTriggered.length);
