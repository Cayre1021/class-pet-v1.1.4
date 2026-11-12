/* Isolated design fixtures. No database, storage, preload or scoring API. */
const petKinds = [['cat','狸花猫'],['dog','金毛犬'],['fox','小狐狸'],['hamster','仓鼠'],['bunny','白兔'],['deer','小鹿'],['bird','青鸟'],['fish','金鱼']];
const fixtureLevels = [8,2,2,13,20,8,13,2];
const fixtureExperience = {2:[50,60],8:[280,315],13:[600,665],20:[1200,1200]};
const fixtures = Array.from({length:88},(_,i)=>({id:i+1,name:`同学 ${String(i+1).padStart(2,'0')}`,group:i%4+1,kind:petKinds[i%8],level:fixtureLevels[i%8],exp:fixtureExperience[fixtureLevels[i%8]][0]+(i%3)}));
let selectedStudent = 1;
let isDetailOpen = false;
let groupFilter = 'all';
let currentSort = 'no';
const el = id => document.getElementById(id);
function petImage(student){const stage=student.level>=20?5:student.level>=13?3:student.level>=8?2:1;return `../electron-app/src/assets/pets/${student.kind[0]}/${student.kind[0]}-stage${stage}.png`;}
function progressFor(student){const target=fixtureExperience[student.level][1];return {target,percent:Math.min(100,student.exp/target*100)};}
function showView(view){
  document.querySelectorAll('.view').forEach(section=>{section.hidden=section.id!==`${view}-view`;});
  document.querySelectorAll('.preview-tabs button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
}
function renderDetail(){
  const student=fixtures.find(s=>s.id===selectedStudent);
  const progress=progressFor(student);
  el('detail-no').textContent=`#${String(student.id).padStart(2,'0')}`;
  el('detail-image').src=petImage(student);
  el('detail-image').alt=student.kind[1];
  el('detail-name').textContent=student.name;
  el('detail-group').textContent=`第 ${student.group} 小组`;
  el('detail-species').textContent=`${student.kind[1]} · 语文宠物`;
  el('detail-level').textContent=`Lv.${student.level}`;
  el('detail-exp').textContent=`${student.exp} / ${progress.target} EXP`;
  el('detail-progress').value=progress.percent;
  el('detail-next').textContent=student.level===20?'已达满级':`距离下一级还需 ${Math.max(0,progress.target-student.exp)} EXP`;
  el('subject-rows').innerHTML=['语文','数学','英语'].map((name,i)=>`<div class="subject-row"><span>${name}</span><progress max="100" value="${i===0?progress.percent:0}" aria-label="${name}成长进度"></progress><small>${i===0?`Lv.${student.level}`:'未解锁'}</small></div>`).join('');
}
function renderCollection(){
  const shown=fixtures.filter(s=>groupFilter==='all'||String(s.group)===groupFilter).sort(currentSort==='no'?(a,b)=>a.id-b.id:(a,b)=>b.level-a.level||b.exp-a.exp||a.id-b.id);
  if(!shown.some(s=>s.id===selectedStudent)&&shown.length)selectedStudent=shown[0].id;
  el('student-count').textContent=`${shown.length} 位同学`;
  el('collection-status').textContent=groupFilter==='all'?`全班 ${shown.length} 位同学`:`第 ${groupFilter} 小组 · ${shown.length} 位同学`;
  el('pet-grid').innerHTML=shown.map(student=>{return `<button class="pet-card" data-student="${student.id}" aria-pressed="${student.id===selectedStudent}" aria-label="查看${student.name}的宠物"><span class="card-selected">${student.id===selectedStudent&&isDetailOpen?'✓ 已选':''}</span><span class="card-art"><img src="${petImage(student)}" alt="${student.kind[1]}" loading="lazy"></span><span class="card-name">${student.name}</span></button>`;}).join('');
  document.querySelectorAll('[data-sort]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.sort===currentSort)));
  renderDetail();
}
function selectStudent(id){
  selectedStudent=Number(id);
  isDetailOpen=true;
  const workspace=document.querySelector('.pet-workspace');
  if(workspace)workspace.classList.add('has-detail-open');
  document.querySelectorAll('[data-student]').forEach(button=>{const selected=Number(button.dataset.student)===selectedStudent;button.setAttribute('aria-pressed',String(selected));button.querySelector('.card-selected').textContent=selected?'✓ 已选':'';});
  renderDetail();
}
function closeDetail(){
  isDetailOpen=false;
  const workspace=document.querySelector('.pet-workspace');
  if(workspace)workspace.classList.remove('has-detail-open');
  document.querySelectorAll('[data-student]').forEach(button=>{
    button.setAttribute('aria-pressed','false');
    const sel=button.querySelector('.card-selected');
    if(sel)sel.textContent='';
  });
}
function openPreviewDialog(title,content){el('dialog-title').textContent=title;el('dialog-content').innerHTML=content;el('preview-dialog').showModal();}
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.view)));
document.querySelectorAll('[data-preview]').forEach(button=>button.addEventListener('click',()=>openPreviewDialog(button.dataset.preview,'<p>此入口在正式版中保留。本页为独立设计预览，不执行账号、课堂或数据库操作。</p>')));
document.querySelectorAll('[data-sort]').forEach(button=>button.addEventListener('click',()=>{currentSort=button.dataset.sort;renderCollection();el('grid-scroll').scrollTop=0;}));
el('group-filter').addEventListener('change',event=>{groupFilter=event.target.value;renderCollection();el('grid-scroll').scrollTop=0;});
el('pet-grid').addEventListener('click',event=>{const card=event.target.closest('[data-student]');if(card)selectStudent(card.dataset.student);});
el('back-top').addEventListener('click',()=>{el('grid-scroll').scrollTop=0;window.scrollTo({top:0,behavior:'auto'});});
el('card-scale').addEventListener('input',event=>document.documentElement.style.setProperty('--scale',event.target.value));
el('theme').addEventListener('change',event=>{const palettes={green:['#246b50','#e8f2ec'],orange:['#ad5339','#faeee8'],ocean:['#256b88','#e7f2f6'],classic:['#525c55','#eef0ed']};const palette=palettes[event.target.value];document.documentElement.style.setProperty('--accent',palette[0]);document.documentElement.style.setProperty('--pale',palette[1]);});
el('login-form').addEventListener('submit',event=>{event.preventDefault();showView('hub');});
el('details').addEventListener('click',()=>{const student=fixtures.find(s=>s.id===selectedStudent);openPreviewDialog(`${student.name} · 详情与互动`, `<img class="dialog-pet" src="${petImage(student)}" alt="${student.kind[1]}"><p>语文 · ${student.kind[1]} · Lv.${student.level}</p><div class="dialog-actions">${['孵化 / 认领','进化','切换学科','设为展示宠物','宠物互动','快捷赋分'].map(label=>`<button disabled title="设计预览，不执行业务操作">${label}</button>`).join('')}</div>`);});
el('close-dialog').addEventListener('click',()=>el('preview-dialog').close());
if(el('close-detail'))el('close-detail').addEventListener('click',closeDetail);
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&isDetailOpen)closeDetail();});
el('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{openPreviewDialog('全屏','当前环境不支持网页全屏。');}});
el('sound').addEventListener('click',()=>{const button=el('sound');const enabled=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(enabled));button.title=`音效预览：${enabled?'开启':'关闭'}`;button.setAttribute('aria-label',button.title);if(enabled){const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){const context=new Audio();const oscillator=context.createOscillator();const gain=context.createGain();oscillator.connect(gain);gain.connect(context.destination);oscillator.frequency.value=660;gain.gain.setValueAtTime(.04,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.18);oscillator.start();oscillator.stop(context.currentTime+.2);oscillator.onended=()=>context.close();}}});
el('group-summary').innerHTML=[1,2,3,4].map(group=>`<div><span>第 ${group} 组</span><strong>${fixtures.filter(s=>s.group===group).reduce((sum,s)=>sum+s.exp,0)}</strong><span>EXP</span></div>`).join('');
function addPawBackgrounds(){
  // Stable scattered placement keeps decoration still while switching views.
  const prints = [
    ['cat','#b9d9ce',210,-22],['dog','#eec6b9',108,24],
    ['dog','#c4d8eb',128,-18],['cat','#ddcae7',138,21],
    ['cat','#efdb9f',64,29],['dog','#bedfdc',72,-25],
    ['dog','#cddcb3',60,16],['cat','#e8c6d4',76,-14],
    ['cat','#c8c9e8',62,32],['dog','#edcda8',56,-31]
  ];
  ['login-view','hub-view'].forEach(id=>{
    const background=document.createElement('div');
    background.className='paw-background';
    background.setAttribute('aria-hidden','true');
    prints.forEach(([kind,color,size,angle])=>{
      const print=document.createElement('span');
      print.className=`paw-print ${kind}`;
      print.style.setProperty('--paw-color',color);
      print.style.setProperty('--paw-size',`${size}px`);
      print.style.setProperty('--paw-angle',`${angle}deg`);
      background.appendChild(print);
    });
    el(id).prepend(background);
  });
}
addPawBackgrounds();
renderCollection();
if(window.location && ['#hub','#login'].includes(window.location.hash))showView(window.location.hash.slice(1));
