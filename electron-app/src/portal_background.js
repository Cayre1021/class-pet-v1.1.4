(() => {
    const container = document.querySelector('.app-container');
    if (!container) return;
    const background = document.createElement('div');
    background.className = 'paw-background';
    background.setAttribute('aria-hidden', 'true');
    const prints = [
        ['cat','#b9d9ce',210,-22], ['dog','#eec6b9',108,24],
        ['dog','#c4d8eb',128,-18], ['cat','#ddcae7',138,21],
        ['cat','#efdb9f',64,29], ['dog','#bedfdc',72,-25],
        ['dog','#cddcb3',60,16], ['cat','#e8c6d4',76,-14],
        ['cat','#c8c9e8',62,32], ['dog','#edcda8',56,-31]
    ];
    prints.forEach(([kind, color, size, angle]) => {
        const print = document.createElement('span');
        print.className = `paw-print ${kind}`;
        print.style.setProperty('--paw-color', color);
        print.style.setProperty('--paw-size', `${size}px`);
        print.style.setProperty('--paw-angle', `${angle}deg`);
        background.appendChild(print);
    });
    container.prepend(background);
})();
