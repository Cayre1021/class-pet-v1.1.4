const students = [
  ['01','陈雨桐',1,'cat',3,128],['02','周子墨',1,'dog',2,94],['03','林可欣',1,'bunny',4,176],['04','许博文',1,'fox',3,142],
  ['05','王一诺',2,'hamster',2,88],['06','李思远',2,'bird',4,183],['07','赵欣怡',2,'deer',3,137],['08','吴浩然',2,'fish',2,91],
  ['09','郑若溪',3,'fox',4,194],['10','孙明轩',3,'cat',3,151],['11','蒋语彤',3,'bunny',2,79],['12','冯宇航',3,'dog',3,145],
  ['13','唐诗涵',4,'deer',4,187],['14','韩嘉乐',4,'bird',2,83],['15','宋梓睿',4,'hamster',3,139],['16','谢安然',4,'fish',3,156]
].map((s,index)=>({no:s[0],name:s[1],group:s[2],species:s[3],level:s[4],score:s[5],selected:index<2,archived:false}));
students.push({no:'17',name:'顾晨曦',group:2,species:'cat',level:2,score:71,selected:false,archived:true});

const positiveRules = [['帮助打扫卫生',5],['帮忙擦黑板',3],['作业优秀',5],['主动回答问题',3],['好人好事',5],['乐于助人',4],['听课认真',3],['思维活跃',4]];
const negativeRules = [['迟到 / 早退',-3],['课上讲话',-5],['逃避值日',-5],['未交作业',-5],['乱扔垃圾',-3]];
const state = {scheme:'a',group:'all',query:'',zoom:1,subject:'语文',lastScore:null};
const workspace = document.querySelector('#workspace');

function petPath(student){return `../electron-app/src/assets/pets/${student.species}/${student.species}-stage${Math.min(5,student.level)}.png`;}
function visibleStudents(){
  const query=state.query.trim().toLowerCase();
  return students.filter(s=>state.group==='archive'?s.archived:!s.archived)
    .filter(s=>state.group==='all'||state.group==='archive'||String(s.group)===state.group)
    .filter(s=>!query||s.name.toLowerCase().includes(query)||s.no.includes(query));
}
function selectedStudents(){return students.filter(s=>s.selected&&!s.archived);}
function studentCard(s,showActions=true){
  const archiveActions=s.archived
    ? `<button data-student-action="restore" data-id="${s.no}">恢复</button><button data-student-action="delete" data-id="${s.no}">永久删除</button>`
    : `<button data-student-action="log" data-id="${s.no}">日志</button><button data-student-action="edit" data-id="${s.no}">编辑</button><button data-student-action="archive" data-id="${s.no}">归档</button>`;
  return `<article class="student-card ${s.selected?'selected':''} ${s.archived?'archive-card':''}" data-id="${s.no}">
    <input type="checkbox" ${s.selected?'checked':''} aria-label="选择${s.name}">
    <img src="${petPath(s)}" alt="${s.name}的宠物">
    <div><div class="student-name">${s.name}</div><div class="student-meta">${s.no}号 · ${s.group}组 · Lv.${s.level}</div></div>
    <div class="student-score">${s.score} XP</div>
    ${showActions?`<div class="student-actions">${archiveActions}</div>`:''}
  </article>`;
}
function listHeader(label='学生名册'){
  return `<div class="panel-head"><div><h2>${label}</h2><span class="scheme-note">${state.scheme==='a'?'选人和赋分同时可见':state.scheme==='b'?'大卡点名优先':'四组并行浏览'}</span></div><div class="list-tools"><span class="count-badge">${visibleStudents().length} 人</span><button data-action="select-group">全选 / 清空</button><button data-action="move-group">调整分组</button></div></div>`;
}
function selectionBar(){return `<div class="select-bar"><span>当前已选 <strong>${selectedStudents().length}</strong> 人</span><button data-action="clear">清空选择</button></div>`;}
function rosterPanel(){
  const list=visibleStudents();
  return `<section class="panel roster-panel">${listHeader()}${selectionBar()}<div class="student-scroll">${list.map(s=>studentCard(s,true)).join('')}</div></section>`;
}
function scoreSection(type,rules){
  const positive=type==='positive';
  return `<section class="score-section ${type}"><div class="score-title"><h2><span>${positive?'正向表现':'纪律关注'}</span></h2><div>${positive?'':`<label class="quiet"><input id="quiet-mode" type="checkbox" checked>静音扣分</label>`}<button data-action="custom-${type}">新增${positive?'加':'扣'}分项</button></div></div><div class="score-grid">${rules.map(([name,value])=>`<button class="score-rule" data-score="${value}" data-rule="${name}"><span>${name}</span><strong>${value>0?'+':''}${value}</strong></button>`).join('')}</div></section>`;
}
function scoreZone(className='score-zone'){return `<div class="${className}">${selectionBar()}${scoreSection('positive',positiveRules)}${scoreSection('negative',negativeRules)}</div>`;}
function renderSchemeA(){workspace.innerHTML=rosterPanel()+scoreZone();}
function renderSchemeB(){workspace.innerHTML=rosterPanel()+scoreZone();}
function renderSchemeC(){
  if(state.group==='archive') { workspace.innerHTML=rosterPanel()+scoreZone('dock'); return; }
  const shown=visibleStudents();
  const groups=(state.group==='all'?[1,2,3,4]:[Number(state.group)]);
  const board=`<section class="group-board">${groups.map(group=>`<div class="group-lane"><h2>${group} 组 · ${shown.filter(s=>s.group===group).length} 人</h2><div class="student-scroll">${shown.filter(s=>s.group===group).map(s=>studentCard(s,true)).join('')}</div></div>`).join('')}</section>`;
  const dock=`<section class="dock"><div class="dock-summary"><div><span>当前已选</span><br><strong>${selectedStudents().length}</strong> 人</div><div><button data-action="clear">清空选择</button> <button data-action="move-group">调整分组</button></div></div>${scoreSection('positive',positiveRules)}${scoreSection('negative',negativeRules)}</section>`;
  workspace.innerHTML=board+dock;
}
function render(){
  document.querySelector('.app').dataset.scheme=state.scheme;
  document.documentElement.style.setProperty('--zoom',state.zoom);
  document.querySelector('#zoom-label').textContent=Math.round(state.zoom*100)+'%';
  if(!visibleStudents().length){workspace.innerHTML='<div class="empty">没有符合条件的学生</div>';return;}
  ({a:renderSchemeA,b:renderSchemeB,c:renderSchemeC}[state.scheme])();
}
function openDialog(title,body){
  document.querySelector('#dialog-title').textContent=title;
  document.querySelector('#dialog-body').innerHTML=body;
  const dialog=document.querySelector('#preview-dialog');
  if(!dialog.open) dialog.showModal();
}
function explain(action){
  const messages={portal:['返回入口页','正式版本将调用原有返回入口逻辑。'],bigscreen:['打开学生大屏','正式版本沿用原有跨屏入口；预览不会打开真实课堂大屏。'],ledger:['赋分台账','保留全班/单个学生记录筛选与单笔撤销入口。'],import:['导入 Excel','保留模板下载、列映射、名单预览和确认替换流程。'],add:['添加学生','保留姓名、学号、分组和孵化状态字段。'],threshold:['经验阈值','保留快节奏、常规、长线预设及自定义等级阈值。'],backup:['备份与还原','保留 JSON 导出、导入和恢复入口。'],theme:['切换风格','正式版本继续提供经典、暖橙、森林、蓝调四种主题。'],'move-group':['调整分组','保留批量移组与按学号自动均分四组。'],'custom-positive':['新增加分项','保留规则名称、分值步进、保存和删除。'],'custom-negative':['新增扣分项','保留规则名称、分值步进、保存和删除。']};
  const info=messages[action]||['功能入口','该入口将在正式实现时连接原有业务逻辑。'];
  openDialog(info[0],`<p>${info[1]}</p><p><strong>当前是模拟设计预览，不写入班级数据。</strong></p>`);
}
function flash(message){
  document.querySelector('.score-flash')?.remove();
  const el=document.createElement('div');el.className='score-flash';el.textContent=message;document.body.append(el);setTimeout(()=>el.remove(),1500);
}
document.querySelector('.scheme-tabs').addEventListener('click',event=>{
  const button=event.target.closest('[data-scheme]');if(!button)return;
  state.scheme=button.dataset.scheme;
  document.querySelectorAll('[data-scheme]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  render();
});
document.querySelector('.subject-switch').addEventListener('click',event=>{
  const button=event.target.closest('[data-subject]');if(!button)return;
  state.subject=button.dataset.subject;
  document.querySelectorAll('[data-subject]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  flash(`已切换为${state.subject}课（模拟）`);
});
document.querySelector('.group-tabs').addEventListener('click',event=>{
  const button=event.target.closest('[data-group]');if(!button)return;
  state.group=button.dataset.group;
  document.querySelectorAll('[data-group]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  render();
});
document.querySelector('#student-search').addEventListener('input',event=>{state.query=event.target.value;render();});
document.querySelector('.zoom-control').addEventListener('click',event=>{
  const button=event.target.closest('[data-zoom]');if(!button)return;
  state.zoom=button.dataset.zoom==='reset'?1:Math.max(.7,Math.min(1.3,state.zoom+(button.dataset.zoom==='in'?0.1:-0.1)));render();
});
document.querySelector('.utility-toggle').addEventListener('click',event=>{
  const panel=document.querySelector('.utility-panel');panel.hidden=!panel.hidden;event.currentTarget.setAttribute('aria-expanded',String(!panel.hidden));
});
document.querySelector('.utility-panel').addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(button)button.dataset.action==='undo'?undoLast():explain(button.dataset.action);});
workspace.addEventListener('click',event=>{
  const action=event.target.closest('[data-action]');
  if(action){
    if(action.dataset.action==='clear'){students.forEach(s=>s.selected=false);render();return;}
    if(action.dataset.action==='select-group'){const list=visibleStudents();const shouldSelect=list.some(s=>!s.selected);list.forEach(s=>s.selected=shouldSelect);render();return;}
    explain(action.dataset.action);return;
  }
  const studentAction=event.target.closest('[data-student-action]');
  if(studentAction){explain(studentAction.dataset.studentAction);return;}
  const rule=event.target.closest('[data-score]');
  if(rule){applyScore(Number(rule.dataset.score),rule.dataset.rule);return;}
  const card=event.target.closest('.student-card');
  if(card){const s=students.find(item=>item.no===card.dataset.id);if(s&&!s.archived){s.selected=!s.selected;render();}}
});
function applyScore(value,rule){
  const selected=selectedStudents();if(!selected.length){flash('请先选择学生');return;}
  selected.forEach(s=>s.score+=value);state.lastScore={value,students:selected.map(s=>s.no),rule};
  flash(`${selected.length} 人 · ${rule} ${value>0?'+':''}${value}（模拟）`);render();
}
function undoLast(){
  if(!state.lastScore){flash('暂无可撤回的模拟赋分');return;}
  state.lastScore.students.forEach(no=>{const s=students.find(item=>item.no===no);if(s)s.score-=state.lastScore.value;});
  flash(`已撤回：${state.lastScore.rule}（模拟）`);state.lastScore=null;render();
}
document.querySelector('.app-head').addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(button)explain(button.dataset.action);});
document.querySelector('#dialog-close').addEventListener('click',()=>document.querySelector('#preview-dialog').close());
document.querySelector('#dialog-ok').addEventListener('click',()=>document.querySelector('#preview-dialog').close());
render();
