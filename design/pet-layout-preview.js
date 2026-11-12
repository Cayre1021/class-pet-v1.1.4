/* Standalone design fixture: no storage, database or scoring calls. */
const imageRoot = '../electron-app/src/assets/pets/';
const species = [['cat','狸花猫'],['dog','金毛犬'],['fox','小狐狸'],['hamster','仓鼠'],['bunny','白兔'],['deer','小鹿'],['bird','青鸟'],['fish','金鱼']];
const names = ['张三','李四','王五','赵六','孙七','周八','吴九','郑十','陈一','林二','黄三','何四','郭五','马六','朱七','罗八','梁九','宋十','谢一','唐二','许三','韩四','冯五','邓六'];
const students = Array.from({length:88},(_,i)=>({id:i+1,name:names[i] || `同学${i+1}`,species:species[i%species.length],level:[8,2,2,13,20,8,13,2][i%8],group:i%4+1}));
const params = new URLSearchParams(location.search);
let scheme = ['a','b','c'].includes(params.get('scheme')) ? params.get('scheme') : 'a';
let page = 0;
let selected = 1;
let subject = '语文';
let sort = 'no';
const $ = id => document.getElementById(id);
function imageFor(student){const stage=student.level>=20?5:student.level>=13?3:student.level>=8?2:1;return `${imageRoot}${student.species[0]}/${student.species[0]}-stage${stage}.png`;}
function experience(student){const thresholds={2:[50,60],8:[280,315],13:[600,665],20:[1200,1200]};return thresholds[student.level];}
function renderDetail(){
  const student=students.find(s=>s.id===selected);
  const [exp,target]=experience(student);
  $('detail-no').textContent=`#${String(student.id).padStart(2,'0')}`;
  $('detail-image').src=imageFor(student);
  $('detail-image').alt=student.species[1];
  $('detail-stage').textContent=student.level===20?'满级':student.level>=13?'成熟期':student.level>=8?'成长期':'幼宠期';
  $('detail-name').textContent=student.name;
  $('detail-species').textContent=`${student.species[1]} · ${subject}宠物`;
  $('detail-level').textContent=`Lv.${student.level}`;
  $('detail-exp').textContent=`${exp} / ${target} EXP`;
  $('detail-progress').value=exp/target*100;
  $('detail-next').textContent=student.level===20?'已达满级':`距离下一级还需 ${target-exp} EXP`;
  $('detail-group').textContent=`第 ${student.group} 小组`;
  $('detail-subject').textContent=subject;
  $('subject-growth').innerHTML=['语文','数学','英语'].map(s=>`<div class="growth-row ${s!==subject?'locked':''}"><span>${s}</span><div class="mini-bar"><span style="width:${s===subject?exp/target*100:0}%"></span></div><small>${s===subject?`Lv.${student.level}`:'未解锁'}</small></div>`).join('');
}
function render(){
  document.body.dataset.scheme=scheme;
  document.querySelectorAll('[role="tab"][data-scheme]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.scheme===scheme)));
  document.querySelectorAll('[data-subject]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.subject===subject)));
  document.querySelector('.current-subject').textContent=subject;
  const ordered=[...students].sort(sort==='level'?(a,b)=>b.level-a.level||a.id-b.id:(a,b)=>a.id-b.id);
  const pageSize=scheme==='c'?6:8;
  const totalPages=Math.ceil(ordered.length/pageSize);
  page=Math.min(page,totalPages-1);
  const shown=scheme==='b'?ordered:ordered.slice(page*pageSize,(page+1)*pageSize);
  $('pet-grid').innerHTML=shown.map(student=>{
    const [exp,target]=experience(student);
    return `<button class="pet-card" data-student="${student.id}" aria-label="查看${student.name}的宠物" aria-pressed="${student.id===selected}"><span class="card-top"><span>#${String(student.id).padStart(2,'0')}</span><span class="card-level">Lv.${student.level}</span></span><img class="card-image" src="${imageFor(student)}" alt="${student.species[1]}" ${scheme==='b'?'loading="lazy"':''}><span class="card-bottom"><span class="card-name-row"><span class="student-name">${student.name}</span><span class="species-name">${student.species[1]}</span></span><span class="exp-row"><span>${subject} · ${student.level===20?'满级':'成长中'}</span><span>${exp}/${target} EXP</span></span><progress max="${target}" value="${exp}" aria-label="${student.name}经验"></progress></span></button>`;
  }).join('');
  $('range').textContent=scheme==='b'?'88 位同学':`${page*pageSize+1}–${Math.min((page+1)*pageSize,88)} / 88 位同学`;
  $('page-label').textContent=`${page+1} / ${totalPages}`;
  $('page-size').textContent=scheme==='b'?'连续滚动':`每页 ${pageSize} 人`;
  $('prev').disabled=page===0;
  $('next').disabled=page===totalPages-1;
  renderDetail();
}
document.querySelectorAll('[role="tab"][data-scheme]').forEach(button=>button.addEventListener('click',()=>{scheme=button.dataset.scheme;page=0;history.replaceState(null,'',`?scheme=${scheme}`);render();$('grid-scroll').scrollTop=0;}));
document.querySelectorAll('[data-subject]').forEach(button=>button.addEventListener('click',()=>{subject=button.dataset.subject;render();}));
$('pet-grid').addEventListener('click',event=>{const card=event.target.closest('[data-student]');if(!card)return;selected=Number(card.dataset.student);document.querySelectorAll('[data-student]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.student)===selected)));renderDetail();});
$('sort').addEventListener('change',event=>{sort=event.target.value;page=0;render();$('grid-scroll').scrollTop=0;});
$('prev').addEventListener('click',()=>{page--;render();$('grid-scroll').scrollTop=0;});
$('next').addEventListener('click',()=>{page++;render();$('grid-scroll').scrollTop=0;});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{ $('fullscreen').title='当前预览环境不支持全屏'; }});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').title=document.fullscreenElement?'退出全屏':'全屏';$('fullscreen').setAttribute('aria-label',$('fullscreen').title);});
render();
