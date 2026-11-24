'use strict';

const SKILL_COOLDOWN=15;
const abilities={
  rifle:{name:'齐射',icon:'≡',detail:'5 秒内提高射速。',duration:5,boost:{interval:.57},ready:true},
  light:{name:'机动射击',icon:'»',detail:'6 秒内加快移动和射击，解除当前压制。',duration:6,boost:{speed:1.34,interval:.78},rally:true},
  heavy:{name:'压制扫射',icon:'▰',detail:'点选射界内位置，削弱小范围敌军并施加压制。',mode:'suppress',range:223,radius:48,damage:17},
  guns:{name:'开炮',icon:'✦',detail:'后方炮兵已接通。点选战场，发射一轮曲射弹幕。',mode:'barrage',rearArea:true,radius:46,damage:46,rounds:3},
  tank:{name:'装甲突进',icon:'▣',detail:'6 秒内加快移动并减少所受伤害。',duration:6,boost:{speed:1.45,guard:.63}},
  lightTank:{name:'高速迂回',icon:'▱',detail:'6 秒内大幅加快移动并缩短攻击间隔。',duration:6,boost:{speed:1.64,interval:.80}},
  heavyTank:{name:'重炮轰击',icon:'◆',detail:'点选可见位置，重坦射出一发高伤害范围炮弹。',mode:'barrage',range:237,radius:40,damage:74,rounds:1,direct:true},
  car:{name:'装甲疾驰',icon:'◈',detail:'6 秒内加快移动，清除压制并减少所受伤害。',duration:6,boost:{speed:1.55,guard:.70},rally:true},
  raider:{name:'突击号令',icon:'▲',detail:'6 秒内加快移动、提高伤害并清除压制。',duration:6,boost:{speed:1.43,damage:1.36},rally:true},
  automatic:{name:'持续火力',icon:'▥',detail:'6 秒内提高射速和伤害。',duration:6,boost:{interval:.65,damage:1.20},ready:true},
  mountainGun:{name:'山炮急射',icon:'✸',detail:'从后方山炮阵地向指定地点发射两发曲射炮弹。',mode:'barrage',rearArea:true,radius:55,damage:57,rounds:2},
  grenadier:{name:'投弹',icon:'●',detail:'点选附近位置，投弹组投出一枚范围弹药。',mode:'barrage',range:100,radius:36,damage:43,rounds:1},
  fieldGun:{name:'直射穿甲',icon:'⟫',detail:'指挥后方炮位攻击靠近己方阵地、射界内的敌军，优先瞄准装甲。',mode:'pierce',range:280,radius:40,damage:112,direct:true},
  tankRifle:{name:'反装甲射击',icon:'⊕',detail:'点选可见敌军。优先攻击目标附近的装甲单位。',mode:'pierce',range:240,radius:36,damage:94,direct:true}
};
const wheelSlotButtons=[];
const wheelDialog=$('skill-wheel');

function skillFor(index){
  return abilities[roleKey(countries[game.armies[0]],index)];
}
function supportOrigin(team,index){
  return {team,index,x:team===0?-16:W+16,y:bases[team].y};
}
function skillUnits(index){
  if(game.support[0].has(index))return [supportOrigin(0,index)];
  return game.units.filter(u=>u.team===0&&u.index===index&&u.hp>0);
}
function skillGuard(unit){
  return unit.skill?.until>game.time?unit.skill.guard??1:1;
}
function skillTime(index){
  return Math.max(0,Math.ceil(game.skillReadyAt[index]-game.time));
}
function setupSkillWheel(){
  $('skill-slots').querySelectorAll('.skill-choice').forEach(button=>button.remove());
  wheelSlotButtons.length=0;
  for(let index=0;index<7;index++){
    const info=skillFor(index),angle=index*2*Math.PI/7-Math.PI/2;
    const button=node('button',null,'skill-choice'),status=node('small');
    button.type='button';
    button.style.setProperty('--x',(50+36*Math.cos(angle))+'%');
    button.style.setProperty('--y',(50+36*Math.sin(angle))+'%');
    button.title=info.detail;
    const describe=()=>$('skill-detail').textContent=info.name+' · '+info.detail;
    button.addEventListener('focus',describe);
    button.addEventListener('pointerenter',describe);
    const icon=node('span',info.icon,'skill-icon');
    icon.setAttribute('aria-hidden','true');
    button.append(icon,node('b',info.name),status);
    button.onclick=()=>chooseSkill(index);
    $('skill-slots').append(button);
    wheelSlotButtons.push({button,status});
  }
  updateSkills();
}

function updateSkills(){
  if(!game)return;
  const alive=new Set(game.units.filter(u=>u.team===0&&u.hp>0).map(u=>u.index));
  for(const index of game.support[0])alive.add(index);
  const running=game.phase==='running';
  if(game.skillTarget!==null&&!alive.has(game.skillTarget))game.skillTarget=null;
  let ready=0;
  for(const [index,{button,status}] of wheelSlotButtons.entries()){
    const cooldown=skillTime(index);
    const state=!alive.has(index)?game.unlockedSkills.has(index)?'lost':'locked':cooldown?'cooldown':'ready';
    if(state==='ready')ready++;
    button.disabled=!running||state!=='ready';
    if(button.dataset.state!==state)button.dataset.state=state;
    const label=state==='locked'?'未部署':state==='lost'?'待补员':cooldown?cooldown+' 秒':'就绪';
    if(status.textContent!==label)status.textContent=label;
  }
  if($('skills-ready').textContent!==String(ready))$('skills-ready').textContent=ready;
  $('skills-open').disabled=!running;
  const quick=$('artillery-shortcut'), cooldown=skillTime(3);
  quick.hidden=!game.support[0].has(3);
  quick.disabled=!running||cooldown>0;
  const caption=cooldown?'开炮 '+cooldown+'秒':'开炮';
  if(quick.textContent!==caption)quick.textContent=caption;
  const banner=$('aim-banner');
  banner.hidden=game.skillTarget===null;
  if(!banner.hidden){
    const info=skillFor(game.skillTarget);
    const hint=info.name+' · '+info.detail;
    if($('aim-text').textContent!==hint)$('aim-text').textContent=hint;
  }
}

function openSkills(){
  if(game?.phase!=='running'||wheelDialog.open)return;
  cancelSkillAim();
  updateSkills();
  $('skill-detail').textContent='选技能后，部分指令需要在战场上指定目标。';
  wheelDialog.showModal();
}
function closeSkills(){
  if(wheelDialog.open)wheelDialog.close();
}
function cancelSkillAim(){
  if(!game||game.skillTarget===null)return;
  game.skillTarget=null;
  updateSkills();
}
function chooseSkill(index){
  if(game?.phase!=='running'||skillTime(index))return;
  const units=skillUnits(index), info=skillFor(index);
  if(!units.length)return;
  closeSkills();
  game.skillTarget=null;
  if(info.mode){
    game.skillTarget=index;
    if(panMode){panMode=false;$('pan').setAttribute('aria-pressed','false');}
    say(info.detail);
    updateSkills();
    return;
  }
  for(const u of units){
    u.skill={...info.boost,until:game.time+info.duration};
    if(info.rally)u.suppression=0;
    if(info.ready)u.reload=0;
  }
  useCooldown(index,info);
}

function useCooldown(index,info){
  game.skillReadyAt[index]=game.time+SKILL_COOLDOWN;
  game.skillTarget=null;
  say(info.name+' 已发动。技能将在 15 秒后就绪。');
  updateSkills();
}
function unitCanAim(u,p,info){
  return info.rearArea||distance(u,p)<=info.range&&(!info.direct&&info.mode!=='suppress'||clearSight(game.terrain.tiles,u,p));
}
function skillShooter(index,p,info){
  let shooter=null,best=Infinity;
  for(const u of skillUnits(index)){
    const gap=distance(u,p);
    if(gap>=best||!unitCanAim(u,p,info))continue;
    shooter=u;best=gap;
  }
  return shooter;
}
function traceSkill(from,to){
  from.heading=to.x>=from.x?1:-1;
  from.aim=.21;
  game.fx.push({type:'trace',x:from.x,y:from.y-3,tx:to.x,ty:to.y-3,age:0,life:.18});
}
function fireBarrage(from,point,info,power){
  const spec={blast:info.radius,damage:info.damage,pressure:.65};
  for(let round=0;round<info.rounds;round++){
    const spread=round===0?0:(round===1?1:-1)*info.radius*.42;
    game.fx.push({
      type:'shell',x:from.x,y:from.y,tx:clamp(point.x+spread,0,W),ty:clamp(point.y+spread*.5,0,H),
      age:-round*.20,life:.51,team:from.team,spec,power
    });
  }
}
function updateEnemySupport(){
  const nation=countries[game.armies[1]], power=[.27,.44,.65][game.difficulty];
  for(const index of game.support[1]){
    if(game.time<game.enemySupportReadyAt[index])continue;
    const info=abilities[roleKey(nation,index)], origin=supportOrigin(1,index);
    const eligible=game.units.filter(u=>u.team===0&&u.hp>0&&u.x>W*.33&&unitCanAim(origin,u,info));
    if(!eligible.length)continue;
    const front=eligible.reduce((a,b)=>b.x>a.x?b:a);
    if(info.mode==='barrage')fireBarrage(origin,front,info,power);
    else{
      traceSkill(origin,front);
      front.hp-=info.damage*power*skillGuard(front)*(roles[front.key].armor?1:.65);
      front.suppression+=.45;
    }
    game.stats[1].salvos++;
    game.enemySupportReadyAt[index]=game.time+SKILL_COOLDOWN;
  }
}
function aimSkill(p){
  if(game?.phase!=='running'||game.skillTarget===null)return false;
  const index=game.skillTarget,info=skillFor(index);
  if(!skillUnits(index).length||skillTime(index)){cancelSkillAim();return false;}
  const support=countries[game.armies[0]].support;
  if(info.mode==='pierce'){
    let hit=null;
    for(const foe of game.units){
      if(foe.team!==1||foe.hp<=0||distance(foe,p)>info.radius)continue;
      const attacker=skillShooter(index,foe,info);
      if(!attacker)continue;
      const priority=distance(foe,p)-(roles[foe.key].armor?info.radius:0);
      if(!hit||priority<hit.priority)hit={foe,attacker,priority};
    }
    if(!hit){say('目标附近没有可命中的敌军，重新选点。');return false;}
    traceSkill(hit.attacker,hit.foe);
    hit.foe.hp-=info.damage*support*(roles[hit.foe.key].armor?1:.65);
    hit.foe.suppression+=.65;
  }else{
    const shooter=skillShooter(index,p,info);
    if(!shooter){say('目标不在可用分队射界内，重新选点。');return false;}
    if(info.mode==='suppress'){
      traceSkill(shooter,p);
      for(const foe of game.units){
        if(foe.team!==1||foe.hp<=0||distance(foe,p)>info.radius||!clearSight(game.terrain.tiles,shooter,foe))continue;
        foe.suppression+=1.15;
        foe.hp-=info.damage;
        traceSkill(shooter,foe);
      }
    }else{
      fireBarrage(shooter,p,info,support);
    }
  }
  game.fx.push({type:'marker',x:p.x,y:p.y,age:0,life:1.15,r:19});
  if(game.support[0].has(index))game.stats[0].salvos++;
  useCooldown(index,info);
  return true;
}

function drawSkillRange(g){
  const index=game.skillTarget;
  if(index===null)return;
  const info=skillFor(index);
  if(info.rearArea)return;
  const units=skillUnits(index);
  const stride=Math.max(1,Math.ceil(units.length/6));
  g.save();
  g.strokeStyle='#f1cb7596';
  g.lineWidth=1.6;
  g.setLineDash([7,7]);
  for(let i=0;i<units.length;i+=stride){
    const u=units[i];
    g.beginPath();
    g.arc(u.x,u.y,info.range,0,Math.PI*2);
    g.stroke();
  }
  g.restore();
}

$('skills-open').onclick=openSkills;
$('artillery-shortcut').onclick=()=>chooseSkill(3);
$('aim-cancel').onclick=cancelSkillAim;
