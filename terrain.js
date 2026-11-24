'use strict';
const W=1024, H=576, TILE=24, COLS=Math.ceil(W/TILE), ROWS=H/TILE;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const box=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.floor(x),Math.floor(y),w,h);};
const randomFrom=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
const cell=(x,y)=>clamp(Math.floor(y/TILE),0,ROWS-1)*COLS+clamp(Math.floor(x/TILE),0,COLS-1);
const center=i=>({x:Math.min(W-5,(i%COLS+.5)*TILE),y:(Math.floor(i/COLS)+.5)*TILE});
const terrainNames=['敞地','弹坑','林木','壕沟','铁丝网','浅水','岩石或墙体','桥梁'];
const blocked=t=>t===6;
const cover=[0,.28,.29,.46,.03,0,0,0];
const speedOn=[1,.68,.76,.89,.44,.55,0,1];
const sites={
  woods:[{x:12,y:7,w:4,h:3,type:'farm'},{x:28,y:15,w:4,h:3,type:'farm'}],
  river:[{x:14,y:15,w:4,h:3,type:'farm'},{x:27,y:6,w:4,h:3,type:'farm'}],
  ridge:[{x:16,y:8,w:5,h:3,type:'bunker'},{x:25,y:16,w:5,h:3,type:'bunker'}]
};
const paths=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

function makeTerrain(map){
  const roll=randomFrom(map.seed);
  const tiles=new Uint8Array(COLS*ROWS);
  for(let row=1;row<ROWS-1;row++) for(let col=3;col<COLS-3;col++){
    const i=row*COLS+col, n=roll();
    tiles[i]=n<.09?1:n<.16?2:n<.185?4:n<.205?6:0;
    if(map.type==='river'&&Math.abs(col-(21+Math.round(Math.sin(row*.36)*1.5)))<2){
      tiles[i]=[5,6,12,13,19,20].includes(row)?7:row%3===0?5:6;
    }
    if(map.type==='ridge'&&col>9&&col<33&&Math.sin(col*.52+row*.57)>.82&&n<.55)tiles[i]=6;
    if(map.type==='woods'&&Math.cos(col*.37)+Math.sin(row*.48)>1.10&&n<.62)tiles[i]=2;
  }
  for(let row=1;row<ROWS-1;row++){
    const step=Math.floor(row/3)%2;
    for(const col of [3+step,4+step,COLS-5-step,COLS-4-step])tiles[row*COLS+col]=3;
  }
  for(const site of sites[map.type]){
    for(let dy=0;dy<site.h;dy++)for(let dx=0;dx<site.w;dx++){
      const edge=(dy===0||dx===0||dx===site.w-1)&&!(dy===1&&dx===0);
      tiles[(site.y+dy)*COLS+site.x+dx]=edge?6:3;
    }
  }
  for(const [x,y] of map.points){
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const i=cell(x+dx*TILE,y+dy*TILE);
      if(tiles[i]===6)tiles[i]=1;
    }
  }
  const image=document.createElement('canvas');image.width=W;image.height=H;
  const g=image.getContext('2d');
  const p=map.palette;
  box(g,0,0,W,H,p[0]);
  for(let i=0;i<18500;i++){
    const x=roll()*W,y=roll()*H;
    const c=roll()<.16?p[4]:p[1+Math.floor(roll()*3)];
    box(g,x,y,1+Math.floor(roll()*8),1+Math.floor(roll()*3),c);
  }
  for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++){
    const i=row*COLS+col, t=tiles[i], x=col*TILE, y=row*TILE;
    if(t===1){
      const dx=x+9+roll()*5,dy=y+11+roll()*3;
      box(g,dx-10,dy-4,20,9,p[3]);box(g,dx-8,dy-6,16,12,'#463625');box(g,dx-6,dy-4,12,8,'#352c25');box(g,dx-3,dy+1,9,4,map.type==='river'?'#57685d':'#5b4832');box(g,dx-5,dy+5,12,2,p[2]);
    } else if(t===2){
      for(let j=0;j<2;j++){
        const bx=x+5+j*10+roll()*3,by=y+6+roll()*11;
        box(g,bx-2,by+5,12,3,'#323426');box(g,bx,by-5,3,14,'#695442');
        box(g,bx-4,by-9,9,8,'#344431');box(g,bx-6,by-6,13,5,'#42533a');box(g,bx-2,by-11,6,4,'#697049');box(g,bx+1,by,1,5,'#ac9770');
      }
    } else if(t===3){
      box(g,x,y,24,24,'#543d2b');box(g,x+3,y,18,24,'#27241c');
      for(let dy=0;dy<24;dy+=5){
        box(g,x+5,y+dy,14,2,'#66553a');box(g,x+1,y+dy,4,3,'#a28a60');box(g,x+19,y+dy,4,3,'#80694a');
      }
      if(row%4===1){box(g,x+6,y+6,11,7,'#504536');box(g,x+7,y+7,9,2,'#9a8052');}
    } else if(t===4){
      for(let j=0;j<22;j+=4){box(g,x+j,y+11+(j%8),5,1,'#22281f');box(g,x+j+2,y+9+(j%8),1,5,'#b8ad7d');}
    } else if(t===5||t===7||(t===6&&map.type==='river'&&Math.abs(col-(21+Math.round(Math.sin(row*.36)*1.5)))<2)){
      box(g,x,y,24,24,t===5?'#526f67':'#384e47');
      for(let j=0;j<7;j++)box(g,x+roll()*19,y+roll()*24,4,1,'#748778');
      if(t===7){box(g,x,y+3,24,18,'#493a2b');for(let j=1;j<24;j+=4)box(g,x+j,y+4,3,16,'#927950');box(g,x,y+3,24,2,'#ba9f6b');box(g,x,y+20,24,2,'#5a4630');}
    } else if(t===6){
      box(g,x+1,y+9,23,14,'#403d33');box(g,x+2,y+3,20,13,'#6c6653');box(g,x+5,y+4,7,3,'#ae9f7a');box(g,x+14,y+7,7,5,'#8b815f');box(g,x+4,y+13,15,3,'#504c3e');box(g,x+10,y+16,8,3,'#615240');
    }
  }
  for(const site of sites[map.type]){
    const x=site.x*TILE,y=site.y*TILE,w=site.w*TILE,h=site.h*TILE;
    box(g,x+4,y+8,w+4,h-2,'#2427206e');
    box(g,x+3,y+4,w-6,13,site.type==='farm'?'#9d8160':'#91896c');
    box(g,x+8,y+7,w-16,3,'#c3a785');
    box(g,x+5,y+18,w-10,4,'#40392a');
    for(let i=0;i<14;i++){
      const bx=x+9+roll()*(w-18),by=y+22+roll()*(h-27);
      box(g,bx,by,3+roll()*7,2+roll()*3,i%2?'#8c795a':'#554634');
    }
    if(site.type==='farm'){
      for(let i=0;i<7;i++)box(g,x+w*.38+i*6,y+25+i,5,12,'#8d5741');
      box(g,x+w*.60,y+8,8,24,'#514633');box(g,x+w*.60-1,y+7,10,4,'#9b7250');
    }else{
      box(g,x+11,y+12,w-22,8,'#696754');box(g,x+w*.44,y+12,16,4,'#333428');
    }
  }
  for(const [x,y] of map.points){
    box(g,x-27,y-13,53,27,'#322b223e');
    for(let i=0;i<5;i++){
      box(g,x-23+i*9,y-12,7,4,'#b19a6a');box(g,x-23+i*9,y+10,7,4,'#947a53');
    }
  }
  for(const team of [0,1]){
    const x=team===0?48:W-48,y=H/2;
    box(g,x-19,y-14,38,29,'#433826');box(g,x-16,y-16,32,22,'#746745');
    box(g,x-13,y-13,26,17,'#948259');box(g,x-18,y+4,36,4,'#393328');box(g,x-8,y+1,16,13,'#26261c');
    for(let j=0;j<5;j++)box(g,x-13+j*5,y-10,3,4,'#ad996b');
  }
  return {tiles,image,flows:new Map()};
}

function accessible(tiles,x,y){
  return x>=7&&x<=W-7&&y>=7&&y<=H-7&&!blocked(tiles[cell(x,y)]);
}
function nearCell(tiles,x,y){
  const i=cell(x,y);
  if(!blocked(tiles[i]))return i;
  let best=i,bestDist=Infinity;
  for(let j=0;j<tiles.length;j++){
    if(blocked(tiles[j]))continue;
    const p=center(j),d=(p.x-x)**2+(p.y-y)**2;
    if(d<bestDist){best=j;bestDist=d;}
  }
  return best;
}
function eachNeighbor(tiles,i,callback){
  const col=i%COLS,row=Math.floor(i/COLS);
  for(const [dx,dy] of paths){
    const x=col+dx,y=row+dy;
    if(x<0||x>=COLS||y<0||y>=ROWS)continue;
    const next=y*COLS+x;
    if(blocked(tiles[next])||(dx&&dy&&(blocked(tiles[i+dx])||blocked(tiles[i+dy*COLS]))))continue;
    callback(next);
  }
}
function flowTo(terrain,destination){
  if(terrain.flows.has(destination))return terrain.flows.get(destination);
  const links=new Int16Array(terrain.tiles.length).fill(-1);
  const queue=[destination];links[destination]=destination;
  for(let head=0;head<queue.length;head++){
    const from=queue[head];
    eachNeighbor(terrain.tiles,from,next=>{
      if(links[next]===-1){links[next]=from;queue.push(next);}
    });
  }
  if(terrain.flows.size>100)terrain.flows.delete(terrain.flows.keys().next().value);
  terrain.flows.set(destination,links);
  return links;
}
function clearSight(tiles,from,to){
  const steps=Math.ceil(distance(from,to)/7);
  for(let j=1;j<steps;j++){
    const progress=j/steps;
    if(blocked(tiles[cell(from.x+(to.x-from.x)*progress,from.y+(to.y-from.y)*progress)]))return false;
  }
  return true;
}

function flagPaint(g,id,x=0,y=0,w=30,h=18){
  g.save();g.translate(x,y);g.scale(w/30,h/18);g.beginPath();g.rect(0,0,30,18);g.clip();
  const band=(left,top,width,height,c)=>box(g,left,top,width,height,c);
  if(id==='gb'){
    band(0,0,30,18,'#273c71');
    for(const flip of [1,-1]){
      g.save();g.translate(15,9);g.rotate(flip*.54);
      band(-19,-2,38,4,'#f4eee0');band(-19,0,38,1,'#b74747');g.restore();
    }
    band(0,6,30,6,'#eee7dc');band(12,0,6,18,'#eee7dc');band(0,7,30,4,'#b74747');band(13,0,4,18,'#b74747');
  } else if(id==='fr'||id==='it'){
    band(0,0,10,18,id==='fr'?'#314d84':'#327452');band(10,0,10,18,'#f3ebdb');band(20,0,10,18,'#bb5250');
    if(id==='it'){band(12,5,6,8,'#365898');band(13,6,4,6,'#b84643');band(14,6,2,6,'#fff4e2');band(13,8,4,2,'#fff4e2');}
  } else if(id==='us'){
    for(let row=0;row<13;row++)band(0,row*18/13,30,2,row%2?'#f1e7d4':'#af4b4e');
    band(0,0,13,10,'#34496e');
    for(let row=0;row<6;row++)for(let col=0;col<8;col++)band(1+col*1.5,1+row*1.45,1,1,'#f3ecd9');
  } else if(id==='ah'){
    band(0,0,30,6,'#b34740');band(0,6,30,6,'#f3ecd9');band(0,12,15,6,'#b34740');band(15,12,15,6,'#406f4c');
    for(const [base,color] of [[7,'#bc504a'],[20,'#4c6c48']]){band(base,5,5,8,'#d6a75b');band(base+1,6,3,6,color);band(base+1,8,3,2,'#f3ecd9');}
  } else {
    const colors=id==='de'?['#252625','#f3eadb','#b74844']:['#f3eadb','#415f9b','#b74844'];
    colors.forEach((c,i)=>band(0,6*i,30,6,c));
  }
  g.restore();
}
