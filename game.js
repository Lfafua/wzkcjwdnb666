'use strict';

const $=id=>document.getElementById(id);
const field=$('field'), ctx=field.getContext('2d');
const cachedTerrain=new Map();
const bases=[{x:48,y:H/2},{x:W-48,y:H/2}];
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const nationButtons=new Map();
let chosen='gb', game=null, previous=0, hudAt=0, command='charge', panMode=false;
let camera={x:W/2,y:H/2,zoom:1}, view={left:0,top:0,scale:1};
let pointer=null, pointerMap=new Map(), pinch=null, ignoreRelease=false;
let suspendedForArchive=false, fullscreenBusy=false;

function node(tag,label,cls){
  const el=document.createElement(tag);
  if(label)el.textContent=label;
  if(cls)el.className=cls;
  return el;
}
function flag(id){
  const el=node('canvas',null,'flag');
  el.width=30;el.height=18;
  flagPaint(el.getContext('2d'),id);
  el.setAttribute('aria-hidden','true');
  return el;
}
function addOptions(el,items){
  el.replaceChildren();
  for(const [value,label] of items){const option=node('option',label);option.value=value;el.append(option);}
}
function pickNation(id){
  const old=$('opponent').value;
  chosen=id;
  const c=countries[id];
  for(const [key,button] of nationButtons)button.setAttribute('aria-pressed',String(key===id));
  const opponents=Object.entries(countries).filter(([,other])=>other.faction!==c.faction);
  addOptions($('opponent'),opponents.map(([key,other])=>[key,other.full]));
  if(opponents.some(([key])=>key===old))$('opponent').value=old;
  const note=$('nation-summary');
  note.replaceChildren(node('h3',c.full), node('b',c.trait+' · '+c.special), node('p',c.note));
}
for(const team of [0,1]){
  const group=node('div',null,'faction'), buttons=node('div',null,'faction-buttons');
  group.append(node('h4',team===0?'协约国及其参战伙伴':'同盟国'));
  for(const [id,nation] of Object.entries(countries)){
    if(nation.faction!==team)continue;
    const button=node('button',null,'nation'), label=node('span',nation.name);
    label.append(node('small',nation.trait));
    button.type='button';button.append(flag(id),label);button.onclick=()=>pickNation(id);
    buttons.append(button);nationButtons.set(id,button);
  }
  group.append(buttons);$('nations').append(group);
}
addOptions($('battlefield'),battlefields.map((m,i)=>[i,m.name+' · '+m.front]));
addOptions($('archive-nation'),Object.entries(countries).map(([id,c])=>[id,c.full]));
pickNation(chosen);

function terrainFor(index){
  if(!cachedTerrain.has(index))cachedTerrain.set(index,makeTerrain(battlefields[index]));
  return cachedTerrain.get(index);
}
function briefPreview(){
  const g=$('preview').getContext('2d'), terrain=terrainFor(Number($('battlefield').value));
  g.imageSmoothingEnabled=false;
  g.drawImage(terrain.image,0,70,W,430,0,0,512,192);
  for(let i=0;i<14;i++)drawUnit(g,{x:211+i*16,y:92+(i*29)%85,team:i<7?0:1,key:i===7?'tank':'rifle',heading:i<7?1:-1,walking:true},i*.11);
  box(g,0,0,512,192,'#3d352723');
}
$('battlefield').onchange=briefPreview;

function archive(){
  const nation=countries[$('archive-nation').value];
  const grid=node('div',null,'weapon-grid');
  const pct=x=>Math.round(x*100)+'%';
  const note=node('p',nation.note+' 游戏修正：补给 '+pct(nation.supply)+'，抗压制 '+pct(nation.resolve)+'，支援 '+pct(nation.support)+'。','history-note');
  const [sourceName,sourceURL]=sources[nation.source];
  const historic=node('a',sourceName);historic.href=sourceURL;historic.target='_blank';historic.rel='noopener';
  note.append(' ',historic);
  for(const [i,[name,group,stats,ref]] of nation.kit.entries()){
    const entry=node('article',null,'weapon'), spec=roles[roleKey(nation,i)];
    entry.append(node('h3',name),node('p','史实 · '+group+' · '+stats));
    const count=spec.count+(nation===countries.ru&&i===0?1:0);
    entry.append(node('p','游戏 · '+spec.cost+' 补给 / '+count+' 个单位 / 单体生命 '+spec.hp+' / 射程 '+spec.range+' 格 / 伤害 '+spec.damage+' / 冷却 '+spec.interval+' 秒'));
    const [title,href]=sources[ref];
    const link=node('a',title);link.href=href;link.target='_blank';link.rel='noopener';
    entry.append(link);grid.append(entry);
  }
  $('archive-content').replaceChildren(note,node('p','各地图为虚构交战地点。装备按 1914–1918 年混合编成，后期装备、历史编制和跨战线交战不受战役日期限制。','history-note'),grid);
}
$('archive-nation').onchange=archive;
$('intelligence').onclick=()=>{
  suspendedForArchive=game?.phase==='running';
  if(suspendedForArchive)pause();
  $('archive-nation').value=chosen;archive();$('archive').showModal();
};
$('archive').addEventListener('close',()=>{
  if(suspendedForArchive&&game?.phase==='paused')pause();
  suspendedForArchive=false;
});

function start(){
  const mapIndex=Number($('battlefield').value), enemy=$('opponent').value;
  const difficulty=Number($('difficulty').value);
  game={
    phase:'running',time:0,units:[],fx:[],scars:[],log:[],stats:[{lost:0},{lost:0}],
    map: battlefields[mapIndex], terrain:terrainFor(mapIndex),
    armies:[chosen,enemy],difficulty,hq:[450,450],supply:[120,100],
    flags:battlefields[mapIndex].points.map(([x,y])=>({x,y,control:0,owner:-1,contested:false})),
    waveAt:[9.8,7.3,5.8][difficulty],wave:0,serial:0,
    rolls:randomFrom(Date.now()^battlefields[mapIndex].seed)
  };
  camera={x:W/2,y:H/2,zoom:1};$('zoom-label').textContent='1×';
  command='charge';panMode=false;pointer=null;pointerMap.clear();pinch=null;ignoreRelease=false;
  $('pan').setAttribute('aria-pressed','false');
  $('setup').hidden=true;$('battle').hidden=false;$('curtain').hidden=true;
  $('pause').disabled=false;$('pause').textContent='暂停';
  $('mapname').textContent=game.map.name;
  side('ours',0);side('theirs',1);
  recruitControls();
  for(const team of [0,1]){
    spawn(team,0,H*.32,true);spawn(team,0,H*.64,true);
    spawn(team,1,H*.49,true);
  }
  say('自由推进开始。控制据点能加快补给，摧毁敌方指挥所即可获胜。');
  setCommand('charge',false);updateHud();fit();
}
$('start').onclick=start;

function side(id,team){
  const section=$(id), cid=game.armies[team], title=node('b',countries[cid].name);
  title.id='side-'+team;
  const life=node('div',null,'life'), fill=node('i');fill.id='hq-'+team;life.append(fill);
  section.replaceChildren(flag(cid),title,life);
}
function recruitControls(){
  const el=$('recruit'), nation=countries[chosen];
  const buttons=nation.kit.map(([weapon],i)=>{
    const spec=roles[roleKey(nation,i)], button=node('button',null,'recruit');
    button.type='button';button.dataset.slot=i;
    button.append(node('b',i===4?nation.special:spec.label),node('span',String(spec.cost),'cost'),node('small',weapon));
    button.onclick=()=>recruit(i);return button;
  });
  el.replaceChildren(...buttons);$('doctrine').textContent=nation.trait;
}
function say(message){
  game.log.unshift(message);
  if(game.log.length>3)game.log.pop();
  if($('dispatch').textContent!==message)$('dispatch').textContent=message;
}
function spawn(team,index,y,free=false){
  const country=countries[game.armies[team]], key=roleKey(country,index), spec=roles[key];
  if(!free&&game.supply[team]<spec.cost)return false;
  const count=spec.count+(game.armies[team]==='ru'&&index===0?1:0);
  if(game.units.filter(unit=>unit.team===team).length+count>76)return false;
  if(!free)game.supply[team]-=spec.cost;
  const direction=team===0?1:-1;
  for(let i=0;i<count;i++){
    const serial=game.serial++;
    game.units.push({
      serial,team,key,index,x:bases[team].x+direction*(14+Math.floor(i/3)*13),
      y:clamp(y+(i%3-1)*13,23,H-23),hp:spec.hp,heading:direction,aim:0,walking:true,
      reload:.2+i*.08,suppression:0,selected:false,order:'charge',goal:null,scan:(serial%5)*.03,
      bias:((serial*193)%97)-48,target:null,siege:0
    });
  }
  return true;
}
function recruit(index){
  if(game?.phase!=='running')return;
  if(index===4&&game.time<24){say('特殊分队将在开战 24 秒后抵达。');return;}
  const marker=game.flags.find(p=>p.owner===0);
  const selected=game.units.filter(u=>u.team===0&&u.selected);
  const y=selected.length?selected.reduce((a,u)=>a+u.y,0)/selected.length:marker?.y??H*.5;
  if(spawn(0,index,y)){
    say(countries[chosen].kit[index][0]+' 分队抵达，正向敌阵推进。');
    updateHud();
  }
}

function explosion(x,y,team,spec,power){
  game.fx.push({type:'blast',x,y,age:0,life:.72,r:spec.blast});
  game.scars.push({x,y,r:spec.blast*.42});
  if(game.scars.length>105)game.scars.shift();
  for(const u of game.units){
    if(u.team===team||u.hp<=0)continue;
    const d=Math.hypot(u.x-x,u.y-y);
    if(d>spec.blast)continue;
    const terrain=cover[game.terrain.tiles[cell(u.x,u.y)]];
    u.hp-=spec.damage*power*(1-.55*d/spec.blast)*(1-.50*terrain);
    u.suppression+=spec.pressure;
  }
}
function shoot(u,target,spec,country){
  u.reload=spec.interval*(1+(game.rolls()-.5)*.26);
  u.heading=target.x>=u.x?1:-1;
  u.aim=.21;
  if(spec.blast){
    game.fx.push({type:'shell',x:u.x,y:u.y,tx:target.x,ty:target.y,age:0,life:.43,team:u.team,spec,power:country.support});
  } else {
    const terrain=cover[game.terrain.tiles[cell(target.x,target.y)]];
    const armor=roles[target.key].armor&&!spec.armor&&!spec.antiArmor?.32:1;
    target.hp-=spec.damage*armor*(1-terrain)*(u.index>=2?country.support:1)*(1-Math.min(.35,u.suppression*.17));
    target.suppression+=spec.pressure;
    game.fx.push({type:'trace',x:u.x,y:u.y-3,tx:target.x,ty:target.y-3,age:0,life:.13});
  }
}
function goalFor(u){
  if(u.goal)return u.goal;
  const base=bases[1-u.team];
  const lineClosing=Math.abs(base.x-u.x)<150;
  return {x:base.x,y:base.y+(lineClosing?u.bias*.33:u.bias)};
}
function moveUnit(unit,pace,dt){
  const t=game.terrain, goal=goalFor(unit), here=cell(unit.x,unit.y);
  const target=nearCell(t.tiles,goal.x,goal.y);
  const realGoal=accessible(t.tiles,goal.x,goal.y)?goal:center(target);
  let step=realGoal;
  if(!clearSight(t.tiles,unit,realGoal)){
    const next=flowTo(t,target)[here];
    if(next<0)return false;
    step=center(next===here?target:next);
  }
  const dx=step.x-unit.x,dy=step.y-unit.y, length=Math.hypot(dx,dy);
  if(length<2)return false;
  const stride=Math.min(length,pace*dt);
  const x=unit.x+dx/length*stride,y=unit.y+dy/length*stride;
  if(!accessible(t.tiles,x,y))return false;
  if(Math.abs(dx)>.3)unit.heading=Math.sign(dx);
  unit.x=x;unit.y=y;
  return true;
}
function updateUnit(u,dt){
  const spec=roles[u.key], nation=countries[game.armies[u.team]], tiles=game.terrain.tiles;
  u.reload-=dt;u.scan-=dt;u.aim-=dt;u.siege-=dt;
  u.suppression=Math.max(0,u.suppression-dt*.40*nation.resolve);
  if(u.scan<=0||u.target?.hp<=0){
    let target=null,range=spec.range;
    for(const other of game.units){
      if(other.team===u.team||other.hp<=0)continue;
      const d=distance(u,other);
      if(d>=range||(!spec.blast&&!clearSight(tiles,u,other)))continue;
      range=d;target=other;
    }
    u.target=target;u.scan=.22;
  }
  const target=u.target;
  const firing=target&&target.hp>0&&distance(u,target)<=spec.range+6;
  if(firing&&u.reload<=0&&(spec.blast||clearSight(tiles,u,target)))shoot(u,target,spec,nation);
  const head=bases[1-u.team];
  const attacking=distance(u,head)<43;
  if(attacking&&u.siege<=0){
    game.hq[1-u.team]=Math.max(0,game.hq[1-u.team]-spec.siege);
    u.siege=1.25;
    game.fx.push({type:'blast',x:head.x,y:head.y,age:0,life:.44,r:12});
  }
  const isHolding=u.order==='hold'&&(!u.goal||distance(u,u.goal)<7);
  const onSite=u.goal&&distance(u,u.goal)<7;
  if(u.order==='move'&&onSite){u.order='hold';u.goal=null;}
  const terrain=tiles[cell(u.x,u.y)], ground=speedOn[terrain];
  const hillBonus=game.armies[u.team]==='it'&&terrain!==0&&!spec.armor?1.21:1;
  const pressure=spec.armor?1:Math.max(.19,1-u.suppression*.48/nation.resolve);
  const slowdown=firing?u.order==='charge'?.55:.37:1;
  u.walking=!isHolding&&!(attacking&&u.order==='charge')&&moveUnit(u,spec.speed*ground*hillBonus*pressure*slowdown,dt);
}
function updateFlags(dt){
  for(const [i,p] of game.flags.entries()){
    let friendly=0,enemy=0;
    for(const u of game.units){
      if(u.hp<=0||distance(u,p)>47)continue;
      if(u.team===0)friendly++;else enemy++;
    }
    p.contested=friendly>0&&enemy>0;
    if(p.contested||(!friendly&&!enemy))continue;
    const team=friendly?0:1, strength=Math.min(4,friendly||enemy);
    p.control=clamp(p.control+(team===0?1:-1)*dt*(.12+.07*strength),-1,1);
    if(p.owner===0&&p.control<=0||p.owner===1&&p.control>=0)p.owner=-1;
    const claimant=p.control===1?0:p.control===-1?1:-1;
    if(claimant>=0&&p.owner!==claimant){
      p.owner=claimant;
      say((claimant===0?'我方':'敌方')+'占领了 '+String.fromCharCode(65+i)+' 据点。');
    }
  }
}
function updateAI(){
  if(game.time<game.waveAt)return;
  const available=game.supply[1], nation=countries[game.armies[1]];
  const waves=game.wave++;
  game.waveAt=game.time+[8.4,6.6,5.4][game.difficulty];
  const pressure=game.units.filter(u=>u.team===0&&u.x>W*.57);
  const y=pressure.length?pressure.reduce((sum,u)=>sum+u.y,0)/pressure.length:[104,278,461][waves%3];
  let index=[0,1,2,5,4,0,3,6][waves%8];
  if(index===4&&game.time<24)index=0;
  const price=roles[roleKey(nation,index)].cost;
  if(price>available)index=0;
  spawn(1,index,clamp(y+game.rolls()*80-40,34,H-34));
}
function advance(dt){
  game.time+=dt;
  for(const team of [0,1]){
    const owned=game.flags.filter(p=>p.owner===team).length;
    const mod=team===1?[.83,1,1.21][game.difficulty]:1;
    const gain=(5.1+owned*1.25)*countries[game.armies[team]].supply*mod;
    game.supply[team]=Math.min(230,game.supply[team]+dt*gain);
  }
  updateAI();
  for(const u of game.units)if(u.hp>0)updateUnit(u,dt);
  for(const fx of game.fx){
    fx.age+=dt;
    if(fx.type==='shell'&&fx.age>=fx.life)explosion(fx.tx,fx.ty,fx.team,fx.spec,fx.power);
  }
  for(const u of game.units){
    if(u.hp>0)continue;
    game.stats[u.team].lost++;
    game.fx.push({type:'dust',x:u.x,y:u.y,age:0,life:.45,r:7});
  }
  game.units=game.units.filter(u=>u.hp>0);
  game.fx=game.fx.filter(fx=>fx.age<fx.life);
  updateFlags(dt);
  if(game.hq.some(v=>v<=0)||game.time>=420)finish();
}
function finish(){
  game.phase='finished';
  const baseDiff=game.hq[0]-game.hq[1];
  const pointDiff=game.flags.reduce((sum,p)=>sum+(p.owner===0?1:p.owner===1?-1:0),0);
  const won=baseDiff||pointDiff;
  $('result-title').textContent=won>0?'战役胜利':won<0?'阵地失守':'双方僵持';
  $('result-copy').textContent='我方损失 '+game.stats[0].lost+' · 敌方损失 '+game.stats[1].lost+' · 控制据点 '+game.flags.filter(p=>p.owner===0).length+'/3';
  $('result-main').textContent='再打一场';$('curtain').hidden=false;$('pause').disabled=true;
  updateHud();
}
function pause(){
  if(!game||game.phase==='finished')return;
  game.phase=game.phase==='running'?'paused':'running';
  const paused=game.phase==='paused';
  $('pause').textContent=paused?'继续':'暂停';
  $('result-title').textContent='战斗暂停';
  $('result-copy').textContent='继续作战后，双方分队恢复推进。';
  $('result-main').textContent='继续作战';
  $('curtain').hidden=!paused;
}
$('pause').onclick=pause;
$('result-main').onclick=()=>game.phase==='paused'?pause():start();
$('return-setup').onclick=()=>{game=null;$('setup').hidden=false;$('battle').hidden=true;$('pause').disabled=true;$('pause').textContent='暂停';};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game?.phase==='running')pause();});

function fit(){
  const rect=field.getBoundingClientRect();
  const width=Math.max(1,Math.round(rect.width)),height=Math.max(1,Math.round(rect.height));
  if(field.width!==width||field.height!==height){field.width=width;field.height=height;}
  const scale=Math.min(width/W,height/H)*camera.zoom;
  const halfX=width/(2*scale),halfY=height/(2*scale);
  camera.x=halfX>=W/2?W/2:clamp(camera.x,halfX,W-halfX);
  camera.y=halfY>=H/2?H/2:clamp(camera.y,halfY,H-halfY);
  view={left:width/2-camera.x*scale,top:height/2-camera.y*scale,scale};
}
function pixelToWorld(x,y){
  return {x:clamp((x-view.left)/view.scale,7,W-7),y:clamp((y-view.top)/view.scale,7,H-7)};
}
function zoom(amount){
  camera.zoom=clamp(camera.zoom*amount,1,3);
  $('zoom-label').textContent=Number(camera.zoom.toFixed(1))+'×';
  fit();
}
$('zoom-in').onclick=()=>zoom(1.3);
$('zoom-out').onclick=()=>zoom(1/1.3);
$('pan').onclick=()=>{panMode=!panMode;$('pan').setAttribute('aria-pressed',String(panMode));};
field.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?1.13:1/1.13);},{passive:false});
function localPoint(e){
  const r=field.getBoundingClientRect();
  return {x:e.clientX-r.left,y:e.clientY-r.top};
}
function collapsePinch(){
  const pair=Array.from(pointerMap.values());
  if(pair.length<2)return null;
  return {x:(pair[0].x+pair[1].x)/2,y:(pair[0].y+pair[1].y)/2,gap:distance(pair[0],pair[1])};
}
field.addEventListener('pointerdown',e=>{
  if(game?.phase!=='running'||![0,1].includes(e.button))return;
  const pos=localPoint(e);
  pointerMap.set(e.pointerId,pos);field.setPointerCapture(e.pointerId);
  if(pointerMap.size>1){pinch=collapsePinch();pointer=null;ignoreRelease=true;return;}
  ignoreRelease=false;pointer={id:e.pointerId,start:pos,end:pos,pan:panMode||e.button===1,add:e.shiftKey};
});
field.addEventListener('pointermove',e=>{
  if(!pointerMap.has(e.pointerId))return;
  const pos=localPoint(e);pointerMap.set(e.pointerId,pos);
  if(pinch){
    const next=collapsePinch();
    if(next?.gap>8&&pinch.gap>8){
      zoom(next.gap/pinch.gap);
      camera.x-=(next.x-pinch.x)/view.scale;camera.y-=(next.y-pinch.y)/view.scale;
      fit();
    }
    pinch=next;return;
  }
  if(!pointer||pointer.id!==e.pointerId)return;
  if(pointer.pan){
    camera.x-=(pos.x-pointer.end.x)/view.scale;camera.y-=(pos.y-pointer.end.y)/view.scale;fit();
  }
  pointer.end=pos;
});
function release(e,apply){
  pointerMap.delete(e.pointerId);
  if(pinch){pinch=collapsePinch();return;}
  const drag=pointer;
  pointer=null;
  if(!apply||ignoreRelease||!drag||drag.id!==e.pointerId||drag.pan||game?.phase!=='running')return;
  if(distance(drag.start,drag.end)>8){
    const a=pixelToWorld(drag.start.x,drag.start.y),b=pixelToWorld(drag.end.x,drag.end.y);
    for(const u of game.units){
      if(u.team!==0)continue;
      const inside=u.x>=Math.min(a.x,b.x)&&u.x<=Math.max(a.x,b.x)&&u.y>=Math.min(a.y,b.y)&&u.y<=Math.max(a.y,b.y);
      u.selected=inside||drag.add&&u.selected;
    }
  }else{
    const p=pixelToWorld(drag.end.x,drag.end.y);
    const radius=clamp(13/view.scale,12,37);
    let found=null,best=radius;
    for(const u of game.units){
      if(u.team!==0||distance(u,p)>=best)continue;
      best=distance(u,p);found=u;
    }
    if(found){
      if(!drag.add)for(const u of game.units)u.selected=false;
      found.selected=!found.selected;
    }else{
      issue(p);
    }
  }
  updateHud();
}
field.addEventListener('pointerup',e=>release(e,true));
field.addEventListener('pointercancel',e=>release(e,false));
field.addEventListener('contextmenu',e=>{
  if(game?.phase!=='running')return;
  e.preventDefault();
  const p=localPoint(e);
  issue(pixelToWorld(p.x,p.y),'move');
});

function issue(p,order=command){
  const selected=game.units.filter(u=>u.team===0&&u.selected);
  if(!selected.length){say('先点选己方士兵、拖框选中，或点「全选」。');return;}
  const cols=Math.ceil(Math.sqrt(selected.length));
  const rows=Math.ceil(selected.length/cols);
  selected.forEach((u,i)=>{
    u.order=order;
    if(order==='charge'){u.goal=null;return;}
    const x=clamp(p.x+(i%cols-(cols-1)/2)*14,8,W-8);
    const y=clamp(p.y+(Math.floor(i/cols)-(rows-1)/2)*15,8,H-8);
    const reachable=nearCell(game.terrain.tiles,x,y);
    u.goal=accessible(game.terrain.tiles,x,y)?{x,y}:center(reachable);
  });
  if(order!=='charge')game.fx.push({type:'marker',x:p.x,y:p.y,age:0,life:1.5,r:19});
  say(selected.length+' 个单位：'+{move:'向标记点移动',hold:'向标记点移动并固守',charge:'恢复向敌方指挥所冲锋'}[order]+'。');
}
function setCommand(value,apply=true){
  command=value;
  for(const button of document.querySelectorAll('[data-order]'))button.setAttribute('aria-pressed',String(button.dataset.order===value));
  $('order-hint').textContent={
    move:'点地图指定目的地，分队到达后停驻。',
    hold:'已选分队立即固守。也可以点地图指定新的固守点。',
    charge:'向敌方指挥所自动推进。可用移动、固守改变路线。'
  }[value];
  if(!apply||game?.phase!=='running')return;
  if(value==='charge'&&game.units.some(u=>u.team===0&&u.selected))issue(null);
  if(value==='hold'){
    let total=0;
    for(const u of game.units)if(u.team===0&&u.selected){u.order='hold';u.goal=null;total++;}
    if(total)say(total+' 个单位就地固守。');
  }
}
for(const button of document.querySelectorAll('[data-order]'))button.onclick=()=>setCommand(button.dataset.order);
$('all').onclick=()=>{
  if(game?.phase!=='running')return;
  const own=game.units.filter(u=>u.team===0), selecting=own.some(u=>!u.selected);
  for(const u of own)u.selected=selecting;
  updateHud();
};

function fullscreenButton(){
  const active=document.fullscreenElement===$('shell')||document.body.classList.contains('expanded');
  $('fullscreen').setAttribute('aria-pressed',String(active));
  $('fullscreen').textContent=active?'退出全屏':'⛶ 全屏';
}
async function fullscreen(){
  if(fullscreenBusy)return;
  fullscreenBusy=true;
  try{
    if(document.fullscreenElement===$('shell'))await document.exitFullscreen();
    else if(document.body.classList.contains('expanded'))document.body.classList.remove('expanded');
    else if(document.fullscreenEnabled&&$('shell').requestFullscreen){
      try{await $('shell').requestFullscreen();}catch{document.body.classList.add('expanded');}
    }else document.body.classList.add('expanded');
  }finally{fullscreenBusy=false;fullscreenButton();}
}
$('fullscreen').onclick=fullscreen;
document.addEventListener('fullscreenchange',fullscreenButton);
document.addEventListener('keydown',e=>{
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||$('archive').open||e.target instanceof HTMLSelectElement)return;
  const key=e.key.toLowerCase();
  if(key==='f'){fullscreen();return;}
  if(key==='escape'&&document.body.classList.contains('expanded')){document.body.classList.remove('expanded');fullscreenButton();}
  if(!game)return;
  if(e.code==='Space'&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();pause();}
  if(/^[1-7]$/.test(key))recruit(Number(key)-1);
  if(key==='q')$('all').click();
  if(key==='e')setCommand('move');
  if(key==='r')setCommand('hold');
  if(key==='t')setCommand('charge');
});

const uniforms={
  gb:['#b19b68','#7f7149','#5e5940','#c4af77'],fr:['#9aaec3','#627b90','#46586d','#bed0cf'],
  ru:['#afab6e','#797d4d','#595b41','#b6b786'],it:['#a2ac87','#647351','#485440','#b6ba97'],
  us:['#adab72','#78774d','#58593d','#beba85'],de:['#a5afa3','#66796c','#4b5c53','#bac3ae'],
  ah:['#a4a8c0','#747c9c','#53566d','#c0c0cf']
};
function drawUnit(g,u,t){
  const scheme=uniforms[game?.armies[u.team]??(u.team===0?'gb':'de')];
  const [light,mid,dark,helmet]=scheme;
  const spec=roles[u.key];
  const stride=u.walking&&!reduceMotion?Math.round(Math.sin(t*(spec.armor?14:23)+u.x*.2)*2):0;
  const x=Math.round(u.x),y=Math.round(u.y), direction=u.heading||1;
  if(u.selected){
    box(g,x-11,y+6,22,2,'#d6eab2');
    box(g,x-11,y+3,2,4,'#d6eab2');box(g,x+9,y+3,2,4,'#d6eab2');
  }
  g.save();g.translate(x,y);g.scale(direction,1);
  if(spec.armor){
    const length=u.key==='heavyTank'?31:u.key==='lightTank'?21:26;
    const left=-Math.floor(length/2);
    box(g,left-4,5,length+9,5,'#222821');
    box(g,left-1,1,length+2,7,'#242823');
    box(g,left,-4,length,7,dark);box(g,left+2,-2,length-4,4,mid);
    box(g,left+5,-7,length-11,4,light);
    box(g,left+7,-9,8,3,helmet);box(g,3,-5,14,2,'#37382c');box(g,13,-6,4,4,'#33332a');
    for(let i=left+1;i<-left-1;i+=4)box(g,i,3,2,3,i%3===stride?'#ab9b6f':'#675e46');
    if(u.key==='car'){box(g,left,4,6,5,'#272820');box(g,-left-5,4,6,5,'#272820');}
  }else{
    box(g,-7,3,15,5,'#23251d88');
    box(g,-3,0,2,5+stride,'#2c2a22');box(g,1,0,2,5-stride,dark);
    box(g,-4,3+stride,3,2,'#282923');box(g,1,3-stride,3,2,'#282923');
    box(g,-4,-5,8,7,dark);box(g,-3,-5,6,6,mid);box(g,-1,-5,4,3,light);
    box(g,-6,-4,3,5,'#564534');box(g,-6,-4,2,2,'#a38858');
    box(g,-2,-8,5,4,'#d0ab80');box(g,1,-7,2,1,'#7d604c');
    box(g,-4,-11,7,4,dark);box(g,-3,-12,5,4,helmet);
    box(g,-5,-8,10,1,dark);
    box(g,2,-2,5,2,'#9a754e');
    const gun=u.key==='heavy'?13:u.key==='light'||u.key==='automatic'?11:8;
    if(spec.blast){
      box(g,6,-4,3,7,'#3b3b30');box(g,8,-7,3,6,'#85846a');box(g,5,3,8,2,'#34362c');
      if(u.key==='mountainGun'){box(g,8,-3,10,2,'#383a31');box(g,5,1,6,6,'#333832');}
    }else{
      box(g,2,-4,gun,2,'#34362d');box(g,3,-3,4,1,'#b79b68');
      if(u.key==='heavy'){box(g,9,-2,1,6,'#35372b');box(g,8,4,4,1,'#35372b');}
    }
  }
  if(u.aim>0&&!spec.blast&&!reduceMotion){
    const tip=spec.armor?18:u.key==='heavy'?15:11;
    box(g,tip,-5,4,3,'#f0bc69');box(g,tip+1,-6,2,5,'#ffecad');
  }
  g.restore();
  if(u.team===0)box(g,x-1,y-15,3,2,'#c6d5a0');
  else box(g,x-1,y-15,3,2,'#df997b');
  if(u.selected||u.hp<spec.hp*.55){
    box(g,x-6,y-18,12,2,'#252822');box(g,x-6,y-18,Math.max(1,Math.round(12*u.hp/spec.hp)),1,u.team===0?'#c3db9c':'#e69276');
  }
}
function drawPoint(p,i){
  const c=p.owner===0?'#bed49a':p.owner===1?'#e3967e':'#e0c183';
  const {x,y}=p;
  ctx.strokeStyle=p.contested?'#eee09d':c;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,46,0,Math.PI*2);ctx.stroke();
  box(ctx,x-8,y-28,16,15,'#272b21');box(ctx,x-7,y-27,14,13,c);
  ctx.fillStyle='#24271d';ctx.font='bold 11px monospace';ctx.fillText(String.fromCharCode(65+i),x-3,y-17);
  box(ctx,x-13,y+13,26,4,'#292820');
  if(p.control)box(ctx,x-12,y+14,24*Math.abs(p.control),2,p.control>0?'#b4d698':'#e39177');
}
function drawFX(f){
  const ratio=clamp(f.age/f.life,0,1);
  if(f.type==='trace'){
    const x=f.x+(f.tx-f.x)*ratio,y=f.y+(f.ty-f.y)*ratio;
    box(ctx,x-2,y,4,1,'#f4cb7d');
  }else if(f.type==='shell'){
    const x=f.x+(f.tx-f.x)*ratio,y=f.y+(f.ty-f.y)*ratio-Math.sin(ratio*Math.PI)*45;
    box(ctx,x-2,y-1,4,2,'#dfb772');box(ctx,x,y,2,2,'#fff1b5');
  }else if(f.type==='marker'){
    ctx.strokeStyle='#f2d298';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(f.x,f.y,12+ratio*14,0,Math.PI*2);ctx.stroke();
    box(ctx,f.x-6,f.y-1,13,2,'#f5d395');box(ctx,f.x-1,f.y-6,2,13,'#f5d395');
  }else{
    const {x,y,r}=f, burst=f.type==='blast';
    const extent=(.25+ratio)*r;
    for(let j=0;j<7;j++){
      const angle=j*2.399+f.x;
      const d=extent*(.33+(j%4)*.17), c=burst&&ratio<.38?['#ffdfa0','#dfaa60','#a66f46'][j%3]:['#66655399','#887e6498','#4b493c9a'][j%3];
      const size=Math.max(2,Math.floor(extent*.48));
      box(ctx,x+Math.cos(angle)*d-size/2,y+Math.sin(angle)*d*.68-size/2,size,size,c);
    }
  }
}
function draw(){
  fit();
  ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;
  box(ctx,0,0,field.width,field.height,'#262d21');
  ctx.translate(Math.floor(view.left),Math.floor(view.top));ctx.scale(view.scale,view.scale);
  ctx.drawImage(game.terrain.image,0,0);
  for(const s of game.scars){
    box(ctx,s.x-s.r,s.y-s.r*.45,s.r*2,s.r*.90,'#332c2280');
    box(ctx,s.x-s.r*.55,s.y-s.r*.40,s.r*1.1,s.r*.9,'#3e3228');
  }
  for(const [i,p] of game.flags.entries())drawPoint(p,i);
  for(const [team,b] of bases.entries()){
    flagPaint(ctx,game.armies[team],b.x-14,b.y-31,28,17);
    box(ctx,b.x-18,b.y+21,36,3,'#24241c');
    box(ctx,b.x-18,b.y+21,36*game.hq[team]/450,2,team===0?'#bed49a':'#e3967e');
  }
  for(const u of [...game.units].sort((a,b)=>a.y-b.y))drawUnit(ctx,u,game.time);
  for(const f of game.fx)drawFX(f);
  if(!reduceMotion){
    const t=game.time, rain=game.map.type==='river';
    for(let i=0;i<54;i++){
      const x=(i*193+t*(rain?46:12))%W,y=(i*127+t*(rain?153:5))%H;
      box(ctx,x,y,1,rain?6:1,rain?'#b3c6b64d':'#f3d28f4d');
    }
  }
  ctx.setTransform(1,0,0,1,0,0);
  if(pointer&&!pointer.pan&&distance(pointer.start,pointer.end)>8){
    const {x,y}=pointer.start,w=pointer.end.x-x,h=pointer.end.y-y;
    ctx.fillStyle='#d0e4af22';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#e1edca';ctx.strokeRect(x,y,w,h);
  }
}
function updateHud(){
  if(!game)return;
  const text=(id,value)=>{const el=$(id),next=String(value);if(el.textContent!==next)el.textContent=next;};
  const selected=game.units.filter(u=>u.team===0&&u.selected).length;
  text('selection-count',selected?selected+' 个单位':'未选中');
  text('supply',Math.floor(game.supply[0]));text('points',game.flags.filter(p=>p.owner===0).length+'/3');
  const time=Math.floor(game.time);text('clock',Math.floor(time/60)+':'+String(time%60).padStart(2,'0'));
  for(const [team,hq] of game.hq.entries()){
    $('hq-'+team).style.width=(hq/450*100)+'%';
    text('side-'+team,countries[game.armies[team]].name+' '+Math.ceil(hq/450*100)+'%');
  }
  for(const button of $('recruit').children){
    const index=Number(button.dataset.slot),spec=roles[roleKey(countries[chosen],index)];
    button.disabled=game.phase!=='running'||game.supply[0]<spec.cost||index===4&&game.time<24;
    button.querySelector('.cost').textContent=index===4&&game.time<24?Math.ceil(24-game.time)+'s':spec.cost;
  }
}
function frame(now){
  const dt=previous?Math.min(.065,(now-previous)/1000):0;
  previous=now;
  if(game){
    if(game.phase==='running')advance(dt);
    if(now-hudAt>140){updateHud();hudAt=now;}
    draw();
  }
  requestAnimationFrame(frame);
}
briefPreview();
requestAnimationFrame(frame);
