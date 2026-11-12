const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

// Deterministic planning artwork only; no browser or business-data access.
const W = 1600, H = 1000;
const C = { ink:'#202d2a', muted:'#687671', line:'#d9e2de', bg:'#f3f6f4', green:'#226650', pale:'#e8f1ec', coral:'#c86655', white:'#ffffff' };
const pets = ['cat','dog','fox','hamster','bunny','deer','bird','fish'];
const species = ['狸花猫','金毛犬','小狐狸','仓鼠','白兔','小鹿','青鸟','金鱼'];
const levels = [8,2,2,13,20,8,13,2];
const esc = v => String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const r = (x,y,w,h,fill=C.white,stroke='none',radius=0,sw=1) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const t = (x,y,v,size=16,color=C.ink,weight=400,anchor='start') => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}">${esc(v)}</text>`;
const rule = (x,y,w) => r(x,y,w,1,C.line);
const pill = (x,y,w,label,active=false) => r(x,y,w,36,active?C.green:C.white,active?C.green:C.line,4)+t(x+w/2,y+24,label,15,active?C.white:C.muted,600,'middle');
const bar = (x,y,w,p=.78) => r(x,y,w,7,C.line,'none',3)+r(x,y,w*p,7,C.green,'none',3);
let imgs;
const pic = (i,x,y,w,h) => `<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" href="${imgs[i%8]}"/>`;
function header(letter,title){
  return r(0,0,W,H,C.bg)+r(0,0,W,52,C.ink)+t(26,34,`${letter} / ${title}`,21,C.white,700)+t(1574,33,'V2 结构规划 · 模拟数据 · 非运行截图',14,'#d9e2de',400,'end')+
    r(0,52,W,83)+t(28,104,'‹',34)+t(72,95,'班级电子宠物',25,C.ink,700)+t(73,120,'三年级二班 / 88 位同学',14,C.muted)+
    pill(530,76,76,'语文',true)+pill(612,76,76,'数学')+pill(694,76,76,'英语')+
    r(1140,76,278,36,C.bg,C.line,4)+t(1155,100,'搜索姓名 / 学号',14,C.muted)+pill(1434,76,64,'学号')+pill(1510,76,64,'⛶')+rule(0,134,W);
}
function footer(left,right){return r(0,947,W,53,C.ink)+t(26,980,left,16,C.white,600)+t(1574,980,right,14,'#d9e2de',400,'end');}
function page(x,y,w,count){return rule(x,y,w)+t(x,y+31,'全班 88 人',14,C.muted)+t(x+w/2,y+31,`‹       1 / ${Math.ceil(88/count)}       ›`,17,C.ink,600,'middle')+t(x+w,y+31,`每页 ${count} 人`,14,C.muted,400,'end');}
function identity(x,y){return t(x,y,'同学 01',30,C.ink,700)+t(x,y+28,'#01 · 狸花猫 · 第 1 小组',15,C.muted);}
function facts(x,y,w){let s='';[['当前等级','Lv.8'],['当前经验','280 / 315'],['距下一级','35 EXP'],['成长阶段','成长期']].forEach(([a,b],i)=>{s+=t(x,y+i*43,a,15,C.muted)+t(x+w,y+i*43,b,17,C.ink,600,'end')+rule(x,y+14+i*43,w);}); return s;}

function schemeA(){
  let s=header('A','宠物展示墙');
  s+=r(0,135,510,812,C.white)+r(510,135,1,812,C.line);
  s+=t(32,177,'当前宠物',15,C.muted,600)+t(478,177,'01 / 88',14,C.muted,400,'end');
  s+=pic(0,48,188,414,342)+identity(38,568)+t(38,638,'Lv.8',26,C.green,700)+t(472,636,'280 / 315 EXP',15,C.muted,400,'end')+bar(38,655,434,.89);
  s+=t(38,690,'距离下一级还需 35 EXP',15,C.muted)+rule(38,719,434)+t(38,756,'学科成长',17,C.ink,700);
  s+=pill(38,777,134,'语文 Lv.8',true)+pill(188,777,134,'数学 未解锁')+pill(338,777,134,'英语 未解锁');
  s+=t(38,870,'第 1 小组',16,C.muted)+t(472,870,'成长期',16,C.green,600,'end');
  s+=t(538,178,'全班宠物',20,C.ink,700)+pill(728,151,170,'全部小组 ▾');
  s+=t(924,175,'排序',14,C.muted)+pill(969,151,100,'按学号 ↑',true)+pill(1077,151,154,'按等级 / 经验 ↓');
  s+=t(1572,178,'01–08 / 88',14,C.muted,400,'end');
  const cw=244,gap=19;
  for(let i=0;i<8;i++){
    const x=538+(i%4)*(cw+gap),y=201+Math.floor(i/4)*337;
    s+=r(x,y,cw,316,C.white,i===0?C.green:C.line,6,i===0?2:1)+t(x+16,y+27,`#${String(i+1).padStart(2,'0')}`,13,C.muted)+t(x+cw-16,y+27,i===0?'✓ 已选':`Lv.${levels[i]}`,14,i===0?C.green:C.muted,600,'end');
    s+=pic(i,x+21,y+42,cw-42,193)+t(x+cw/2,y+265,`同学 ${String(i+1).padStart(2,'0')}`,23,C.ink,700,'middle')+t(x+cw/2,y+292,species[i],14,C.muted,400,'middle');
  }
  s+=page(538,899,1034,8);
  return s+footer('聚焦单人：左侧宠物舞台 + 右侧 4 × 2 展示墙','卡片只保留身份，经验与成长集中在左侧');
}
function schemeB(){
  let s=header('B','分组横向名册');
  s+=r(0,135,380,812,C.white)+r(380,135,1,812,C.line)+t(28,178,'当前档案',16,C.muted,600);
  s+=pic(0,28,204,118,125)+t(164,242,'同学 01',25,C.ink,700)+t(164,271,'#01 · 狸花猫',14,C.muted)+t(164,302,'Lv.8 / 成长期',15,C.green,600)+rule(28,355,324);
  s+=facts(28,394,324)+t(28,599,'学科成长',18,C.ink,700);
  ['语文','数学','英语'].forEach((v,i)=>{s+=t(28,640+i*57,v,16,C.ink)+t(352,640+i*57,i?'未解锁':'Lv.8',14,C.muted,400,'end')+bar(28,655+i*57,324,i?0:.89);});
  s+=rule(28,806,324)+t(28,846,'所属小组',15,C.muted)+t(352,846,'第 1 小组',17,C.ink,600,'end');
  s+=t(408,177,'小组名册',20,C.ink,700)+pill(1070,151,100,'全部',true)+pill(1178,151,120,'成长阶段')+pill(1306,151,128,'全部小组')+pill(1442,151,130,'按学号');
  for(let group=0;group<2;group++){
    const sy=204+group*345;
    s+=r(408,sy,1164,36,C.pale)+t(426,sy+24,`第 ${group+1} 小组`,16,C.green,700)+t(1552,sy+24,'4 位同学',14,C.muted,400,'end');
    for(let k=0;k<4;k++){
      const i=group*4+k,x=408+(k%2)*591,y=sy+49+Math.floor(k/2)*137;
      s+=r(x,y,573,122,C.white,i===0?C.green:C.line,6,i===0?2:1)+pic(i,x+12,y+5,124,110);
      s+=t(x+151,y+33,`同学 ${String(i+1).padStart(2,'0')}`,21,C.ink,700)+t(x+151,y+60,`${species[i]} · Lv.${levels[i]}`,14,C.muted)+t(x+549,y+33,i===0?'✓ 已选':`#${String(i+1).padStart(2,'0')}`,13,i===0?C.green:C.muted,600,'end');
      s+=bar(x+151,y+82,276,i===0?.89:.6)+t(x+549,y+104,i===0?'280 / 315 EXP':'成长进度示意',12,C.muted,400,'end');
    }
  }
  s+=page(408,899,1164,8);
  return s+footer('快速扫描：紧凑档案 + 按组排列的横向卡片','宠物、姓名、等级并排；一屏两组，按组定位');
}
function schemeC(){
  let s=header('C','四宠物近景');
  s+=r(0,135,474,812,C.white)+r(474,135,1,812,C.line)+identity(30,188);
  s+=pic(0,80,239,310,238);
  s+=t(30,523,'档案',18,C.green,700)+t(173,523,'成长',18,C.muted)+t(316,523,'记录',18,C.muted)+rule(30,540,414)+r(30,538,66,3,C.green);
  s+=facts(30,585,414)+t(30,790,'当前学科',15,C.muted)+t(444,790,'语文',17,C.ink,600,'end')+rule(30,807,414)+t(30,850,'所属小组',15,C.muted)+t(444,850,'第 1 小组',17,C.ink,600,'end');
  s+=t(504,178,'第 1 小组',21,C.ink,700)+t(1572,177,'4 / 88 位同学',14,C.muted,400,'end');
  for(let i=0;i<6;i++)s+=pill(504+i*180,201,166,i===5?'更多小组 ›':`第 ${i+1} 小组`,i===0);
  for(let i=0;i<4;i++){
    const x=504+(i%2)*543,y=261+Math.floor(i/2)*306;
    s+=r(x,y,525,284,C.white,i===0?C.green:C.line,6,i===0?2:1)+t(x+20,y+29,`#${String(i+1).padStart(2,'0')}`,13,C.muted)+t(x+505,y+29,i===0?'✓ 已选':'成长期',13,i===0?C.green:C.muted,600,'end');
    s+=pic(i,x+8,y+42,265,219)+t(x+288,y+102,`同学 ${String(i+1).padStart(2,'0')}`,27,C.ink,700)+t(x+288,y+135,species[i],16,C.muted)+t(x+288,y+183,`Lv.${levels[i]}`,24,C.green,700)+bar(x+288,y+205,211,i===0?.89:.6)+t(x+288,y+237,i===0?'280 / 315 EXP':'成长进度示意',13,C.muted);
  }
  s+=rule(504,899,1068)+t(504,930,'全班 22 组页面 · 每屏 4 人',14,C.muted)+t(1572,930,'‹   上一组       1 / 22       下一组   ›',17,C.ink,600,'end');
  return s+footer('近距离展示：标签化详情 + 右侧 2 × 2 超大宠物卡','触屏目标最大；每屏人数最少，需要更频繁切组');
}
async function main(){
  imgs=await Promise.all(pets.map(async(key,i)=>{
    const file=path.join(__dirname,'../electron-app/src/assets/pets',key,`${key}-stage${i===4?5:i%3+1}.png`);
    return `data:image/png;base64,${(await sharp(file).resize(520,520,{fit:'inside'}).png().toBuffer()).toString('base64')}`;
  }));
  const out=path.join(__dirname,'plans-v2'); fs.mkdirSync(out,{recursive:true});
  for(const [key,render] of [['a',schemeA],['b',schemeB],['c',schemeC]].filter(([key])=>!process.argv[2]||key===process.argv[2])){
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><g font-family="Microsoft YaHei,SimHei,sans-serif">${render()}</g></svg>`;
    const file=path.join(out,`scheme-${key}.png`);
    await sharp(Buffer.from(svg)).png().toFile(file);
    const meta=await sharp(file).metadata(), stats=await sharp(file).stats();
    if(meta.width!==W||meta.height!==H||stats.channels.every(v=>v.stdev<1))throw new Error(`Invalid diagram: ${file}`);
    console.log(`${file}: ${meta.width}x${meta.height}, nonblank`);
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
