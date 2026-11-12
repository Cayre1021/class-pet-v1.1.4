const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

// Static planning diagrams, not browser screenshots or production UI captures.
const out = path.join(__dirname, 'plans');
fs.mkdirSync(out, { recursive: true });
const pets = [['cat','狸花猫'],['dog','金毛犬'],['fox','小狐狸'],['hamster','仓鼠'],['bunny','白兔'],['deer','小鹿'],['bird','青鸟'],['fish','金鱼']];
const names = ['张三','李四','王五','赵六','孙七','周八','吴九','郑十'];
const xml = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const rect = (x,y,w,h,fill,stroke='none',sw=1,r=0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" rx="${r}"/>`;
const text = (x,y,value,size=16,color='#172c45',weight=400,anchor='start') => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}">${xml(value)}</text>`;
const line = (x,y,w) => rect(x,y,w,1,'#d8e1e8');
async function main(){
  const images = await Promise.all(pets.map(async ([key],i)=>{
    const file=path.join(__dirname,'../electron-app/src/assets/pets',key,`${key}-stage${i===4?5:i%3+1}.png`);
    return `data:image/png;base64,${(await sharp(file).resize(420,420,{fit:'inside'}).png().toBuffer()).toString('base64')}`;
  }));
  for(const scheme of ['a','b','c']){
    const c=scheme==='b'?'#2b7b60':scheme==='c'?'#b64b5b':'#1974cf';
    const wash=scheme==='b'?'#edf5ef':scheme==='c'?'#fbf0f2':'#edf5fd';
    const sidebar=scheme==='c'?340:scheme==='b'?320:300;
    const title=scheme==='a'?'方案 A · 四列分页':scheme==='b'?'方案 B · 四列连续滚动':'方案 C · 三列大图';
    const note=scheme==='a'?'左侧固定档案 / 右侧 4 × 2 / 每页 8 人 / 88 人共 11 页':scheme==='b'?'左侧固定档案 / 右侧四列滚动 / 每张卡片高度固定':'左侧大幅档案 / 右侧 3 × 2 / 每页 6 人 / 88 人共 15 页';
    let s=rect(0,0,1600,960,'#f3f6f9');
    s+=rect(0,0,1600,60,'#fff')+text(26,39,title,24,'#172c45',700)+text(1574,37,'布局规划 · 模拟数据',14,'#627080',400,'end');
    s+=rect(0,61,1600,86,'#fff')+text(28,112,'←',27)+text(78,102,'班级电子宠物',25,'#172c45',700)+text(79,128,'三年级二班 · 刘老师 · 88 人',14,'#627080');
    ['语文','数学','英语'].forEach((v,i)=>{s+=rect(458+i*79,83,72,39,i===0?c:'#eff3f6','none',1,4)+text(494+i*79,109,v,16,i===0?'#fff':'#627080',600,'middle');});
    s+=rect(1368,84,122,39,'#fff','#cfdae4',1,4)+text(1429,109,'按学号  ▾',15,'#172c45',400,'middle')+rect(1506,84,60,39,'#fff','#cfdae4',1,4)+text(1536,110,'⛶',22,'#172c45',400,'middle');
    s+=rect(0,147,1600,2,'#172c45')+rect(0,149,sidebar,751,'#fff')+rect(sidebar,149,1,751,'#cfdae4');
    s+=text(24,184,'宠物档案',14,'#627080',600)+text(sidebar-24,184,'#01',14,'#627080',400,'end');
    const pw=sidebar-48;
    s+=rect(24,202,pw,226,wash,'none',1,6)+`<image x="42" y="212" width="${pw-36}" height="205" href="${images[0]}"/>`;
    s+=rect(sidebar-93,399,57,22,'#e0f3e9','none',1,3)+text(sidebar-64,415,'成长期',12,'#237b57',400,'middle');
    s+=text(24,469,'张三',30,'#172c45',700)+text(24,495,'狸花猫 · 语文宠物',14,'#627080')+text(24,532,'Lv.8',20,'#172c45',700)+text(sidebar-24,532,'280 / 315 EXP',13,'#627080',400,'end');
    s+=rect(24,546,pw,8,'#e3eaf0','none',1,3)+rect(24,546,pw*.89,8,c,'none',1,3)+text(24,579,'距离下一级还需 35 EXP',13,'#627080')+line(24,600,pw);
    [['所属小组','第 1 小组'],['当前学科','语文'],['出勤','在校']].forEach((pair,i)=>{s+=text(24,630+i*29,pair[0],13,'#627080')+text(sidebar-24,630+i*29,pair[1],14,'#172c45',600,'end');});
    s+=line(24,707,pw)+text(24,740,'学科成长',14,'#172c45',700);
    ['语文','数学','英语'].forEach((v,i)=>{s+=text(24,770+i*29,v,13,i?'#8995a1':'#172c45')+rect(69,763+i*29,pw-121,5,'#e3eaf0','none',1,2)+(i===0?rect(69,763,pw-140,5,c,'none',1,2):'')+text(sidebar-24,770+i*29,i?'未解锁':'Lv.8',12,'#627080',400,'end');});
    const x0=sidebar+26, right=1600-26, width=right-x0, cols=scheme==='c'?3:4, gap=18, w=(width-gap*(cols-1))/cols;
    s+=text(x0,186,'我们的宠物',19,'#172c45',700)+text(x0+150,185,scheme==='b'?'88 位同学':scheme==='c'?'1–6 / 88 位同学':'1–8 / 88 位同学',13,'#627080')+rect(right-63,164,63,30,wash,'none',1,4)+text(right-31,185,'语文',14,c,600,'middle');
    s+='<g clip-path="url(#grid-clip)">';
    const h=scheme==='b'?330:300, count=scheme==='c'?6:scheme==='b'?12:8;
    for(let i=0;i<count;i++){
      const x=x0+(i%cols)*(w+gap), y=207+Math.floor(i/cols)*(h+gap), p=i%8;
      s+=rect(x,y,w,h,'#fff',i===0?c:'#bfcdd9',i===0?2:1,6)+text(x+15,y+26,`#${String(i+1).padStart(2,'0')}`,12,'#627080')+text(x+w-15,y+26,i===0?'Lv.8 · 已选':`Lv.${[8,2,2,13,20,8,13,2][p]}`,12,c,600,'end');
      s+=`<image x="${x+22}" y="${y+35}" width="${w-44}" height="${h-123}" href="${images[p]}"/>`;
      s+=text(x+15,y+h-66,names[p],23,'#172c45',700)+text(x+w-15,y+h-66,pets[p][1],12,'#627080',400,'end');
      s+=text(x+15,y+h-36,'语文 · 成长中',12,'#627080')+text(x+w-15,y+h-36,p===0?'280/315 EXP':'50/60 EXP',12,'#627080',400,'end')+rect(x+15,y+h-21,w-30,6,'#e3eaf0','none',1,3)+rect(x+15,y+h-21,(w-30)*.8,6,c,'none',1,3);
    }
    s+='</g>';
    s+=rect(x0,836,width,64,'#f3f6f9')+text(x0,875,'全班 88 人',13,'#627080');
    if(scheme!=='b')s+=rect((x0+right)/2-83,851,34,32,'#fff','#cfdae4',1,4)+text((x0+right)/2-66,873,'←',19,'#8995a1',400,'middle')+text((x0+right)/2,873,scheme==='c'?'1 / 15':'1 / 11',14,'#172c45',500,'middle')+rect((x0+right)/2+49,851,34,32,'#fff','#cfdae4',1,4)+text((x0+right)/2+66,873,'→',19,'#172c45',400,'middle');
    s+=text(right,875,scheme==='b'?'↓ 右侧连续滚动':`每页 ${scheme==='c'?6:8} 人`,13,'#627080',400,'end');
    s+=rect(0,901,1600,59,'#172c45')+text(26,938,note,18,'#fff',500)+text(1574,938,'点击卡片 → 左侧显示对应详情',15,'#fff',400,'end');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="960" viewBox="0 0 1600 960"><defs><clipPath id="grid-clip"><rect x="${x0-2}" y="205" width="${width+4}" height="628"/></clipPath></defs><g font-family="Microsoft YaHei,SimHei,sans-serif">${s}</g></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(path.join(out,`scheme-${scheme}.png`));
    console.log(`Rendered ${path.join(out,`scheme-${scheme}.png`)}`);
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
