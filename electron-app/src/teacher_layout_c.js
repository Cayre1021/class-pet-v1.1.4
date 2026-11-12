function syncTeacherGroupTabs(group) {
    ['All', '1', '2', '3', '4', 'Archive'].forEach(key => {
        const button = document.getElementById('tabGroup' + key);
        if (!button) return;
        const active = key === 'All' ? group === 'all' : key === 'Archive' ? group === 'archive' : String(group) === key;
        button.setAttribute('aria-pressed', String(active));
        button.style.removeProperty('background');
        button.style.removeProperty('color');
        const label = button.querySelector('[data-group-label]');
        const count = button.querySelector('[data-group-count]');
        if (count && typeof store !== 'undefined') {
            const students = store.students || [];
            const amount = key === 'All'
                ? students.filter(student => !student.isArchived).length
                : key === 'Archive'
                    ? students.filter(student => student.isArchived).length
                    : students.filter(student => !student.isArchived && String(student.group) === key).length;
            count.textContent = String(amount);
        }
        if (label) button.setAttribute('aria-label', `${label.textContent}，${count ? count.textContent : 0}人`);
    });
    const current = document.getElementById('groupFilterCurrent');
    if (current) current.textContent = group === 'all' ? '全班' : group === 'archive' ? '归档' : `${group}组`;
    const details = document.getElementById('teacherGroupFilter');
    const summary = document.getElementById('teacherGroupFilterSummary');
    if (details && summary) summary.setAttribute('aria-expanded', String(details.open));
}

function arrangeTeacherGroups(container, group) {
    syncTeacherGroupTabs(group);
    const cards = Array.from(container.querySelectorAll('.student-row-card-pro'));
    if (!cards.length) return;
    const scrollPositions = window.teacherGroupScroll || {};
    const keys = group === 'archive' ? ['archive'] : group === 'all' ? [1, 2, 3, 4] : [group];
    const known = new Set(keys.map(String));
    if (group === 'all') cards.forEach(card => {
        const key = card.dataset.studentGroup;
        if (!known.has(key)) { known.add(key); keys.push(key); }
    });
    container.replaceChildren();
    keys.forEach(key => {
        const members = key === 'archive' ? cards : cards.filter(card => card.dataset.studentGroup === String(key));
        const lane = document.createElement('section');
        lane.className = 'teacher-group-lane';
        const heading = document.createElement('h2');
        heading.textContent = `${key === 'archive' ? '归档学生' : key + ' 组'} · ${members.length} 人`;
        const list = document.createElement('div');
        list.className = 'teacher-group-scroll';
        list.dataset.group = key;
        members.forEach(card => list.appendChild(card));
        if (!members.length) {
            const empty = document.createElement('p');
            empty.className = 'teacher-group-empty';
            empty.textContent = '暂无学生';
            list.appendChild(empty);
        }
        lane.append(heading, list);
        container.appendChild(lane);
        list.scrollTop = scrollPositions[key] || 0;
        list.addEventListener('scroll', () => {
            window.teacherGroupScroll = window.teacherGroupScroll || {};
            window.teacherGroupScroll[key] = list.scrollTop;
        }, {passive:true});
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const notice = document.getElementById('subjectGlobalNoticeBar');
    document.querySelector('.top-navbar-pro').appendChild(notice);
    syncTeacherGroupTabs('all');
    const details = document.getElementById('teacherGroupFilter');
    const summary = document.getElementById('teacherGroupFilterSummary');
    if (details && summary) {
        details.addEventListener('toggle', () => summary.setAttribute('aria-expanded', String(details.open)));
        document.addEventListener('click', event => {
            if (!details.contains(event.target)) details.open = false;
        });
    }
});
