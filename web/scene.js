import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Original stylized geometry. No extracted game meshes or textures are embedded.
export function buildScene(scene,{lowDetail=false}={}){
 const staticRoot=new T.Group(), dynamicRoot=new T.Group();scene.add(staticRoot,dynamicRoot);
 const lights={},markers=[],energy=[],pickers=[];let seed=734;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const materials={},geometries={};
 const mat=(name,color,roughness=.7,metalness=0)=>materials[name]??=(new T.MeshStandardMaterial({color,roughness,metalness}));
 const stone=mat('stone','#c8b899'),edge=mat('edge','#e4d4b6'),brick=mat('brick','#a9553c'),mortar=mat('mortar','#574238'),iron=mat('iron','#273943',.43,.55),gold=mat('gold','#c3a16b',.38,.65),dark=mat('dark','#17242b'),wood=mat('wood','#483329'),glass=mat('glass','#253b47',.23,.2),white=mat('white','#ece6d6'),blue=mat('blue','#376c86',.4,.35);
 const geoBox=(w,h,d,r=0)=>geometries[`b${w},${h},${d},${r}`]??=(r&&!lowDetail?new RoundedBoxGeometry(w,h,d,1,Math.min(r,w/3,h/3,d/3)):new T.BoxGeometry(w,h,d));
 function mesh(parent,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const B=(p,w,h,d,x,y,z,m=stone,r=.07)=>mesh(p,geoBox(w,h,d,r),m,x,y,z);
 function sphere(p,rx,ry,rz,x,y,z,m,detail=16){const s=mesh(p,new T.SphereGeometry(1,lowDetail?Math.min(detail,10):detail,lowDetail?8:12),m,x,y,z);s.scale.set(rx,ry,rz);return s;}
 function cylinder(p,r1,r2,h,x,y,z,m,n=12){return mesh(p,new T.CylinderGeometry(r1,r2,h,n),m,x,y,z);}
 function beam(p,a,b,r,m){const va=new T.Vector3(...a),vb=new T.Vector3(...b);const q=cylinder(p,r,r,va.distanceTo(vb),...(va.clone().add(vb).multiplyScalar(.5).toArray()),m);q.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),vb.sub(va).normalize());return q;}
 function tube(p,points,r,m){const c=new T.CatmullRomCurve3(points.map(a=>new T.Vector3(...a)));return mesh(p,new T.TubeGeometry(c,Math.max(8,points.length*5),r,6,false),m);}
 const group=(p,x,y,z)=>{const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;};
 const glow=(color,intensity=1)=>new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:intensity,roughness:.4});
 function register(id,name,anchor,basePower){const e={id,name,anchor:new T.Vector3(...anchor),materials:[],bulbs:[],level:0,power:basePower};e.light=new T.PointLight('#ffce83',0,20,2);e.light.position.copy(e.anchor);dynamicRoot.add(e.light);lights[id]=e;markers.push(e);return e;}
 function tag(root,id){root.traverse(m=>{if(m.isMesh)m.userData.interactionId=id;});pickers.push(root);}
 function attachGlow(e,m){e.materials.push(m);return m;}
 // Chamfered collectible plinth.
 const outline=new T.Shape();const pts=[[-19,17],[19,17],[20,16],[20,-16],[19,-17],[-19,-17],[-20,-16],[-20,16]];pts.forEach(([x,y],i)=>i?outline.lineTo(x,y):outline.moveTo(x,y));outline.closePath();
 const plinth=mesh(staticRoot,new T.ExtrudeGeometry(outline,{depth:2.55,bevelEnabled:true,bevelSize:.28,bevelThickness:.2,bevelSegments:2,steps:1}),mat('plinth','#253543',.45,.15),0,-2.8,-17);plinth.rotation.x=-Math.PI/2;
 B(staticRoot,39,.35,33,0,-.15,-17,mat('asphalt','#5e6668'),.15);
 // Individual cobblestones, one instanced draw call, slight deterministic color variations.
 const tiles=[];for(let j=0;j<31;j++)for(let i=0;i<33;i++){
  const x=-18.8+i*1.16+(j%2)*.57,z=-.8-j*1.05;if(x>18.9)continue;
  if(Math.abs(x)>18.2&&(z>-1.8||z<-32.2))continue;tiles.push([x,z]);
 }
 const paving=new T.InstancedMesh(geoBox(1.08,.19,.94,.08),mat('paving','#77807e',.92),tiles.length);paving.receiveShadow=true;const dummy=new T.Object3D();
 tiles.forEach(([x,z],i)=>{dummy.position.set(x,-.005+(random()-.5)*.03,z);dummy.rotation.y=(random()-.5)*.055;dummy.updateMatrix();paving.setMatrixAt(i,dummy.matrix);paving.setColorAt(i,new T.Color().setHSL(.10+random()*.025,.07+random()*.035,.31+random()*.14));});staticRoot.add(paving);
 // Sidewalks and carefully spaced curb blocks.
 B(staticRoot,39,.52,3,0,.2,-32,stone,.12);B(staticRoot,6.5,.52,18,-15.6,.2,-23,stone,.12);B(staticRoot,3.3,.52,12,17,.2,-27,stone,.1);
 for(let i=0;i<32;i++){B(staticRoot,1.1,.45,.55,-18+i*1.16,.26,-.55,stone,.06);B(staticRoot,1.1,.45,.55,-18+i*1.16,.26,-31,stone,.06);}
 for(let j=0;j<27;j++){B(staticRoot,.55,.45,1.05,-19,.26,-1.6-j*1.1,stone,.06);B(staticRoot,.55,.45,1.05,19,.26,-1.6-j*1.1,stone,.06);}
 const yellow=mat('yellow','#d2aa51');B(staticRoot,35,.035,.11,0,.12,-1.3,yellow,0);B(staticRoot,.11,.035,29,-18.3,.12,-16.5,yellow,0);B(staticRoot,.11,.035,29,18.3,.12,-16.5,yellow,0);
 for(const [x,z] of [[-8,-29],[14,-5],[-15,-12],[1,-2]]){B(staticRoot,1.25,.05,1.6,x,.13,z,iron,0);for(let k=0;k<6;k++)B(staticRoot,.08,.04,1.35,x-.48+k*.19,.17,z,dark,0);}
 // Building facade with actual window apertures.
 function arch(w,h){const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h-w/2);s.absarc(0,h-w/2,w/2,0,Math.PI,false);s.lineTo(-w/2,0);return s;}
 const panes=[];
 const rooms=[['ROOM_GF_L','一层左房间',0,3],['ROOM_GF_R','一层右房间',8,3],['ROOM_F1_L','二层左房间',0,16],['ROOM_F1_R','二层右房间',8,16]];
 rooms.forEach(([id,name,x,y])=>register(id,name,[x,y+2.7,-24.7],65));
 function windowAt(id,x,bottom,z,rotation=0){
  const e=lights[id],g=group(dynamicRoot,x,bottom,z);g.rotation.y=rotation;
  const outside=arch(5.05,7.05),inside=arch(4.0,6.0);const hp=new T.Path(inside.getPoints(20).map(v=>new T.Vector2(v.x,v.y+.45)));outside.holes.push(hp);
  mesh(g,new T.ExtrudeGeometry(outside,{depth:.32,bevelEnabled:true,bevelThickness:.055,bevelSize:.06,bevelSegments:1,steps:1}),edge);
  const paneMat=e.paneMaterial??=(attachGlow(e,new T.MeshStandardMaterial({color:'#252f36',emissive:'#ffb657',emissiveIntensity:0,roughness:.26,metalness:.12})));
  const pane=mesh(g,new T.ShapeGeometry(arch(4,6),20),paneMat,0,.45,.10);pane.userData.interactionId=id;panes.push(pane);
  // Visible depth, mullions and lintel: no single painted rectangle.
  B(g,4.2,.14,.24,0,2.9,.38,wood,.025);B(g,.13,5.8,.24,0,3.3,.38,wood,.02);
  B(g,5.55,.3,1.0,0,.05,.15,stone,.06);
  B(g,.40,5.3,.12,-1.6,3.1,.25,mat('curtain','#a98570'),.02);B(g,.40,5.3,.12,1.6,3.1,.25,materials.curtain,.02);
  B(g,4.0,.17,1.2,0,.5,-.4,wood,.02);B(g,4.0,6,.1,0,3.2,-1.0,dark,0);
  // Only frame/pane surfaces carry the click target. Outer building remains an occluder.
  tag(g,id);
 }
 rooms.forEach(([id,name,x,y])=>windowAt(id,x,y,-23.73));
 windowAt('ROOM_F1_L',0,16,-33.25,Math.PI);windowAt('ROOM_F1_R',8,16,-33.25,Math.PI);
 windowAt('ROOM_GF_R',12.25,3,-28.5,Math.PI/2);windowAt('ROOM_F1_R',12.25,16,-28.5,Math.PI/2);
 const bricks=[];const insideWindow=(x,y,windows)=>windows.some(([cx,base])=>{const dx=Math.abs(x-cx),dy=y-base;return dx<2.8&&dy>-.3&&dy<7.5&&(dy<4.9||dx*dx+(dy-4.9)**2<3.15**2);});
 function brickWall(cx,cz,length,height,axis,windows=[]){
  for(let row=0;row<Math.floor(height/.62);row++)for(let col=0;col<Math.ceil(length/1.08);col++){
   const t=-length/2+.55+col*1.08+(row%2)*.53;if(t>length/2-.12)continue;const y=.36+row*.62;
   if(insideWindow(axis==='x'?cx+t:t,y,windows))continue;
   bricks.push({x:axis==='x'?cx+t:cx,y,z:axis==='x'?cz:cz+t,w:axis==='x'?1.01:.45,d:axis==='x'?.45:1.01});
  }
 }
 brickWall(4,-24,16,26,'x',[[0,3],[8,3],[0,16],[8,16]]);brickWall(4,-33,16,26,'x',[[0,16],[8,16]]);
 // Side-wall apertures are specified in local longitudinal coordinates.
 for(const side of [-4,12])for(let row=0;row<42;row++)for(let col=0;col<8;col++){
  const z=-32.5+col*1.1,y=.35+row*.61;if(side===12&&insideWindow(z,y,[[-28.5,3],[-28.5,16]]))continue;
  bricks.push({x:side,y,z,w:.43,d:1.03});
 }
 brickWall(18,-27.5,11,16,'z');
 const brickMesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),brick,bricks.length);brickMesh.castShadow=brickMesh.receiveShadow=true;
 const mortarMesh=new T.InstancedMesh(new T.BoxGeometry(1,1,1),mortar,bricks.length);mortarMesh.castShadow=mortarMesh.receiveShadow=true;
 bricks.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.rotation.set(0,0,0);dummy.scale.set(b.w,.55,b.d);dummy.updateMatrix();brickMesh.setMatrixAt(i,dummy.matrix);brickMesh.setColorAt(i,new T.Color().setHSL(.033+random()*.018,.32+random()*.15,.31+random()*.13));dummy.scale.set(b.w>.6?b.w+.1:b.w-.06,.625,b.d>.6?b.d+.1:b.d-.06);dummy.updateMatrix();mortarMesh.setMatrixAt(i,dummy.matrix);});staticRoot.add(mortarMesh,brickMesh);
 // Corners, stone courses, closed slate roof, internal room partitions.
 for(const x of [-4,12])for(const z of [-24,-33])for(let y=.7;y<26;y+=1.25)B(staticRoot,.95,1.1,.95,x,y,z,stone,.07);
 for(const y of [1.0,12.7,25.3]){B(staticRoot,17.4,.45,10.3,4,y,-28.5,stone,.06);}
 // Horizontal courses cannot cap all windows; floor slabs stay behind apertures.
 B(staticRoot,15.5,.25,8.3,4,13,-28.5,wood,.02);B(staticRoot,.18,25,8.1,4,12.5,-28.5,wood,0);
 const slate=mat('slate','#3f5061',.8,.1);B(staticRoot,16.9,.5,9.9,4,25.8,-28.5,slate,.08);
 for(let ix=0;ix<10;ix++)for(let iz=0;iz<7;iz++)B(staticRoot,1.52,.10,1.24,-3.05+ix*1.57,26.10,-32.4+iz*1.28,slate,.02);
 for(const x of [-4.25,12.25])B(staticRoot,.55,.8,10.1,x,26.3,-28.5,edge,.08);
 for(const z of [-23.7,-33.3])B(staticRoot,17.4,.8,.55,4,26.3,z,edge,.08);
 for(const z of [-22,-33])B(staticRoot,1.2,.5,1.2,18,16.2,z,stone,.07);B(staticRoot,1.05,.3,11,18,16.1,-27.5,edge,.06);
 // Downpipes across the rear and the side are intentionally modeled.
 tube(staticRoot,[[12.6,25.8,-30.2],[12.9,24.5,-30.2],[12.9,13.4,-30.2],[12.9,12,-31.5],[12.9,.6,-31.5]],.14,iron);
 tube(staticRoot,[[-1,25.4,-33.5],[-1.5,24,-33.6],[-1.5,1,-33.6],[-.5,.6,-33.6]],.15,iron);
 for(const y of [3,8,15,22])B(staticRoot,.45,.14,.25,-1.5,y,-33.65,gold,.01);
 // Window boxes with individual leaves and tiny flowers.
 for(const x of [0,8]){
  B(staticRoot,4.5,.65,1.35,x,2.7,-23.0,mat('planter','#6e5441'),.08);
  for(let k=0;k<22;k++){const xx=x+(random()-.5)*4,zz=-23+(random()-.5)*.7,yy=3.2+random()*.7;sphere(staticRoot,.24,.35,.22,xx,yy,zz,mat('leaf','#58704c'),8);if(k%3===0)sphere(staticRoot,.16,.12,.17,xx,yy+.22,zz,mat('petal',k%2?'#edcf80':'#f4e7cc'),8);}
 }
 // Roadside bollards and railings.
 function bollard(x,z){cylinder(staticRoot,.25,.32,.25,x,.5,z,iron);cylinder(staticRoot,.14,.18,1.8,x,1.45,z,iron);sphere(staticRoot,.23,.2,.23,x,2.4,z,iron,10);cylinder(staticRoot,.2,.2,.1,x,2.03,z,gold);}
 for(const [x,z] of [[-18,-2],[-15.5,-2],[-18,-6],[-18,-12],[18,-3],[18,-9],[18,-20],[-18,-31]])bollard(x,z);
 for(const [x,z,l,axis] of [[-18,-26,10,'z'],[-11,-31.7,7,'x'],[18,-25,8,'z']]){
  for(let t=-l/2;t<=l/2;t+=.75){const xx=x+(axis==='x'?t:0),zz=z+(axis==='z'?t:0);cylinder(staticRoot,.055,.065,2.7,xx,2,zz,iron,6);const tip=mesh(staticRoot,new T.ConeGeometry(.13,.35,6),iron,xx,3.5,zz);}
  for(const y of [1.2,2.8])if(axis==='x')B(staticRoot,l,.10,.10,x,y,z,iron,.01);else B(staticRoot,.10,.10,l,x,y,z,iron,.01);
 }
 // Phone booth, independently illuminated.
 const booth=group(dynamicRoot,-14,.48,-25),red=mat('red','#b93732',.43,.12),redEdge=mat('rededge','#8d2927');
 const pe=register('P01_LIGHT','电话亭',[-14,5.2,-24.3],65);const pm=attachGlow(pe,new T.MeshStandardMaterial({color:'#24373a',emissive:'#ffbe6d',emissiveIntensity:0,roughness:.28}));
 B(booth,5,.35,5,0,.2,0,stone,.15);B(booth,4.5,.6,4.5,0,1,0,red,.12);
 for(const x of [-2,2])for(const z of [-2,2])B(booth,.35,8,.35,x,4.9,z,red,.05);
 for(const side of [-1,1]){
  B(booth,.08,6.4,3.8,side*2,5.1,0,pm,0);
  for(let y=2;y<8.6;y+=1.15)B(booth,.18,.1,4,side*2.07,y,0,red,.015);
  for(const z of [-.7,.7])B(booth,.18,6.4,.1,side*2.07,5.1,z,red,.015);
 }
 B(booth,3.8,6.4,.08,0,5.1,2,pm,0);B(booth,4,7.5,.20,0,4.9,-2,redEdge,.04);
 for(let y=2;y<8.7;y+=1.15)B(booth,4,.1,.16,0,y,2.08,red,.01);
 for(const x of [-.7,.7])B(booth,.1,6.4,.16,x,5.1,2.08,red,.01);
 B(booth,4.6,.7,4.6,0,8.7,0,red,.18);sphere(booth,2.45,.65,2.45,0,9.15,0,red);B(booth,3.2,.42,.15,0,8.65,2.34,edge,.03);
 // Little nameplate lines are geometry, not dependent on a font asset.
 for(let i=0;i<8;i++)B(booth,.15,.07,.03,-1.08+i*.3,8.65,2.44,redEdge,0);
 B(booth,.12,.55,.15,1.5,4,2.2,gold,.03);tag(booth,'P01_LIGHT');
 // Streetlamp and alley lantern.
 function lantern(p,e,x,y,z,scale=1){
  const lm=attachGlow(e,new T.MeshStandardMaterial({color:'#6f5640',emissive:'#ffd291',emissiveIntensity:0,roughness:.2}));
  const bulb=B(p,.85*scale,1.45*scale,.85*scale,x,y,z,lm,.08);bulb.userData.interactionId=e.id;
  for(const dx of [-.49,.49])for(const dz of [-.49,.49])beam(p,[x+dx*scale,y-.8*scale,z+dz*scale],[x+dx*.7*scale,y+.8*scale,z+dz*.7*scale],.055*scale,iron);
  const roof=mesh(p,new T.ConeGeometry(.92*scale,.7*scale,4),iron,x,y+1.13*scale,z);roof.rotation.y=Math.PI/4;
  cylinder(p,.7*scale,.7*scale,.13*scale,x,y-.85*scale,z,iron);sphere(p,.14*scale,.28*scale,.14*scale,x,y+1.62*scale,z,gold,8);
 }
 const lamp=group(dynamicRoot,-15,.5,-17),le=register('L01','主路灯',[-14.1,15.0,-16.7],320);
 cylinder(lamp,.64,.8,.6,0,.35,0,iron);cylinder(lamp,.35,.58,2.0,0,1.5,0,iron);cylinder(lamp,.16,.31,12,0,8.3,0,iron);
 for(const y of [2.5,3.0,13.8,14.3])cylinder(lamp,.34,.34,.12,0,y,0,gold);
 tube(lamp,[[0,14,0],[0,16.2,0],[.8,17.2,0],[2,17.2,0],[2.3,16.2,0]],.15,iron);lantern(lamp,le,2.3,14.9,0,1.1);tag(lamp,'L01');le.anchor.set(-12.7,15.4,-17);le.light.position.copy(le.anchor);
 const wallLamp=group(dynamicRoot,13.1,10.3,-25.5),we=register('L02','小巷壁灯',[14,10,-25.5],110);
 B(wallLamp,.2,1.5,.65,0,0,0,iron,.06);tube(wallLamp,[[0,.2,0],[.8,.5,0],[1.3,.2,0]],.1,iron);lantern(wallLamp,we,1.3,-.65,0,.65);tag(wallLamp,'L02');
 // Alley props, small crate and metal bins.
 const bin=mat('bin','#465254',.6,.4);
 for(const [x,z] of [[15,-23],[16,-29]]){B(staticRoot,1.9,2.2,1.7,x,1.5,z,bin,.12);B(staticRoot,2.05,.22,1.85,x,2.7,z,iron,.05);B(staticRoot,.65,.12,.15,x,2.86,z,gold,.03);for(const xx of [-.8,.8])B(staticRoot,.07,1.9,1.72,x+xx,1.5,z,iron,.015);}
 B(staticRoot,2.4,.5,.35,-13,1.05,-2.6,white,.03);for(let i=0;i<3;i++){const stripe=B(staticRoot,.4,.52,.37,-13.7+i*.7,1.05,-2.6,red,.015);stripe.rotation.z=-.3;}
 for(const x of [-14.3,-11.7]){B(staticRoot,.15,1.1,.15,x,.6,-2.6,iron,.02);B(staticRoot,.6,.1,.65,x,.15,-2.6,iron,.02);}

 // Payload: original chunky toy interpretation, not a redistributed game mesh.
 const car=group(staticRoot,0,1.0,-16),armor=mat('armor','#738590',.4,.55),armorDark=mat('armordark','#3a4d5e',.4,.5),orange=mat('orange','#f0aa43',.36,.4);
 const coreMat=glow('#ff9b36',1.7),cyanMat=glow('#68d8eb',1.25);energy.push(coreMat,cyanMat);
 B(car,7,1.2,8,0,.7,0,armorDark,.35);B(car,6.6,3.4,6.6,0,2.8,-.4,armor,.5);B(car,5.9,1.2,5.7,0,4.5,-.8,armorDark,.2);
 for(const x of [-3.3,3.3]){B(car,1.25,2.9,7.3,x,2.2,-.2,armorDark,.3);for(const z of [-2.4,2.2]){B(car,1.45,.5,1.8,x,.10,z,cyanMat,.15);B(car,1.65,.5,2,x,.45,z,armor,.12);}B(car,.18,.35,5.5,x*1.2,2.9,0,orange,.03);}
 const face=group(car,0,2.8,3.5);
 const ring=mesh(face,new T.TorusGeometry(2.15,.4,8,24),armorDark);const ring2=mesh(face,new T.TorusGeometry(1.72,.17,6,24),gold,0,0,.16);
 const core=cylinder(face,1.57,1.57,.45,0,0,.12,coreMat,24);core.rotation.x=Math.PI/2;
 for(let a=0;a<Math.PI*2;a+=Math.PI/4){const g=group(face,Math.sin(a)*2.3,Math.cos(a)*2.3,.06);g.rotation.z=-a;B(g,.65,.65,.7,0,0,0,armor,.09);}
 B(car,6.8,.7,1.2,0,.8,4,armorDark,.18);for(const x of [-2.7,2.7])B(car,.65,.9,.2,x,1.3,4.52,orange,.06);
 for(let i=0;i<3;i++)B(car,2,.38,1.25,0,5.25,-2.1+i*1.6,armor,.1);for(const x of [-2.2,2.2])B(car,.15,3,2.5,x,3.4,-.6,orange,.02);
 // Stylized heroes are sculpted from rounded forms, with authored poses.
 const skin=mat('skin','#dba77b',.8),brown=mat('leather','#7b4c36'),hair=mat('hair','#3a2825'),tracerOrange=mat('tracerorange','#ed952d',.52),black=mat('black','#1e2631');
 function pistol(p,x,y,z,m=white){const g=group(p,x,y,z);B(g,.4,.4,1.35,0,0,.35,m,.1);B(g,.22,.55,.25,0,-.4,-.05,black,.05);B(g,.34,.22,.2,0,0,1.08,cyanMat,.03);B(g,.5,.12,.6,0,.24,.3,black,.03);return g;}
 function limb(p,points,r,m){points.slice(1).forEach((b,i)=>{beam(p,points[i],b,r,m);sphere(p,r*1.05,r*1.05,r*1.05,...b,m,10);});}
 const tracer=group(staticRoot,-10,.25,-6);tracer.rotation.y=-.12;
 limb(tracer,[[-.5,3.4,0],[-1.25,2,-.1],[-1.3,.3,1]],.35,tracerOrange);limb(tracer,[[.5,3.3,0],[1.3,2.6,-1.0],[2,1.9,-1.5]],.36,tracerOrange);
 B(tracer,.8,.45,1.4,-1.3,.3,1.3,white,.15);B(tracer,.8,.45,1.3,2,1.7,-1.2,white,.15);
 sphere(tracer,.9,1.2,.62,0,4.2,0,brown);B(tracer,1.45,1.35,.15,0,4.2,.57,white,.15);
 const chronal=cylinder(tracer,.55,.55,.2,0,4.3,.8,cyanMat,20);chronal.rotation.x=Math.PI/2;const chRing=mesh(tracer,new T.TorusGeometry(.55,.13,6,20),white,0,4.3,.94);
 limb(tracer,[[-.7,4.8,0],[-1.9,4.5,.45],[-2.4,4.6,1.3]],.25,brown);limb(tracer,[[.7,4.8,0],[1.4,4.2,.8],[1.8,4.6,1.7]],.25,brown);
 sphere(tracer,.38,.33,.4,-2.4,4.6,1.3,white);sphere(tracer,.38,.33,.4,1.8,4.6,1.7,white);pistol(tracer,-2.4,4.7,1.6);pistol(tracer,1.8,4.7,2.0);
 sphere(tracer,.84,1.0,.75,0,6.0,.05,skin);sphere(tracer,.88,.53,.8,0,6.7,-.1,hair);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const spike=mesh(tracer,new T.ConeGeometry(.31,.95,5),hair,Math.cos(a)*.6,6.95+random()*.2,Math.sin(a)*.45-.2);spike.rotation.z=-Math.cos(a)*.6;spike.rotation.x=Math.sin(a)*.5;}
 B(tracer,1.65,.57,.18,0,6.1,.74,tracerOrange,.12);B(tracer,.62,.30,.08,-.4,6.1,.87,mat('goggle','#5d3829',.2),.08);B(tracer,.62,.30,.08,.4,6.1,.87,materials.goggle,.08);
 for(const x of [-.36,.36]){B(tracer,.2,.08,.04,x,6.1,.93,white,.02);}
 sphere(tracer,.12,.16,.15,0,5.88,.8,skin,10);B(tracer,.35,.065,.04,0,5.57,.75,white,.02);B(tracer,1.15,.2,.9,0,5.15,0,white,.05);
 // Reinhardt, broad shoulders, layered plates and rocket hammer.
 const rein=group(staticRoot,10,.22,-10);rein.rotation.y=.10;const silver=mat('silver','#a8b4bd',.36,.67),silverDark=mat('silverdark','#586874',.42,.6),visor=glow('#ffbe58',.9);
 for(const x of [-1.1,1.1]){limb(rein,[[x,4,0],[x*1.1,2.3,.1],[x*1.35,.7,.6]],.6,silverDark);B(rein,1.4,1.65,1.65,x*1.1,2.35,.3,silver,.3);B(rein,1.8,.7,2.4,x*1.35,.6,.9,silver,.25);B(rein,1.5,.2,.15,x*1.35,2.5,1.15,gold,.03);}
 sphere(rein,2,2,1.3,0,5.5,0,silverDark);B(rein,3.3,2.6,1.3,0,5.7,.8,silver,.4);B(rein,1.0,1.6,.35,0,5.7,1.55,armorDark,.1);
 const chest=mesh(rein,new T.TorusGeometry(.54,.17,6,16),gold,0,6.1,1.72);sphere(rein,.3,.4,.12,0,6.1,1.74,visor);
 for(const x of [-2.1,2.1]){sphere(rein,1.2,1.1,1.3,x,6.65,0,silver);B(rein,1.7,.7,1.6,x,7.2,.2,silverDark,.18);limb(rein,[[x,6.3,.1],[x*1.25,4.9,.6],[x*.85,4.2,1.7]],.55,silverDark);B(rein,1.2,1.35,1.35,x*1.25,5.0,.8,silver,.2);sphere(rein,.7,.6,.7,x*.85,4.2,1.7,silver);}
 sphere(rein,.95,1.1,.95,0,8.2,.1,silver);B(rein,1.5,.35,.15,0,8.25,1.0,black,.08);B(rein,1.12,.13,.08,0,8.24,1.12,visor,.025);B(rein,.35,.85,.35,0,7.8,1.0,silverDark,.08);
 for(const x of [-.76,.76]){const horn=mesh(rein,new T.ConeGeometry(.22,.95,6),silver,x,9.15,.05);horn.rotation.z=-x*.5;}
 beam(rein,[-2.4,4.4,1.8],[3.5,2.4,2.3],.17,iron);B(rein,1.75,2.4,1.7,3.55,2.5,2.3,silverDark,.25);B(rein,2.2,.55,2.1,3.55,1.5,2.3,silver,.15);B(rein,1.95,.5,1.95,3.55,3.65,2.3,silver,.12);B(rein,.2,1.25,.3,4.46,2.6,3.1,orange,.03);
 // Reaper with hood, sculpted mask, cloak, and paired shotguns.
 const reaper=group(staticRoot,15,.45,-27);const cloak=mat('cloak','#292733',.88),mask=mat('mask','#dedbd0',.5),belt=mat('belt','#5c4e4d',.6,.4);
 const robe=mesh(reaper,new T.ConeGeometry(1.5,4.3,12,1,true),cloak,0,2.45,0);robe.rotation.z=Math.PI;
 B(reaper,1.65,2.1,1.1,0,4.0,0,cloak,.3);sphere(reaper,1.07,1.27,.95,0,5.85,0,cloak);sphere(reaper,.7,.85,.3,0,5.8,.75,black);sphere(reaper,.55,.72,.18,0,5.8,.97,mask);
 for(const x of [-.26,.26]){const eye=B(reaper,.32,.13,.08,x,5.98,1.15,black,.025);eye.rotation.z=x>0?-.35:.35;}
 const beak=mesh(reaper,new T.ConeGeometry(.22,.6,4),mask,0,5.43,1.12);beak.rotation.x=Math.PI/2;
 limb(reaper,[[-.8,4.8,0],[-1.3,4.2,.5],[-1.1,4.7,1.5]],.25,cloak);limb(reaper,[[.8,4.8,0],[1.3,4.4,.5],[1.2,4.8,1.6]],.25,cloak);
 for(const x of [-1.1,1.2]){const gun=pistol(reaper,x,4.7,1.7,silverDark);gun.scale.set(1.1,1.0,1.6);}
 for(let i=0;i<7;i++)B(reaper,.18,.4,.15,-.7+i*.22,3.7,.65,belt,.02);for(const x of [-.6,.6])B(reaper,.5,.4,1.1,x,.35,.2,black,.06);

 // Thin curved translucent shield and a physically sculpted blink trail.
 const fxRoot=new T.Group();dynamicRoot.add(fxRoot);fxRoot.userData.passThrough=true;
 const shieldMat=new T.MeshPhysicalMaterial({color:'#66cbe4',emissive:'#2694ba',emissiveIntensity:.45,transparent:true,opacity:.24,roughness:.22,metalness:.2,side:T.DoubleSide,depthWrite:false});
 const shieldGeo=new T.CylinderGeometry(6.2,6.2,10.0,28,1,true,-.75,1.5);const shield=mesh(fxRoot,shieldGeo,shieldMat,9.3,5.3,-11.3);shield.rotation.y=Math.PI/2;shield.castShadow=false;
 const lineMat=new T.MeshBasicMaterial({color:'#83e9ff',transparent:true,opacity:.8});
 for(const yy of [.3,10.3]){const p=[];for(let i=0;i<=30;i++){const a=-.75+i/30*1.5;p.push([9.3+6.2*Math.cos(a),yy,-11.3+6.2*Math.sin(a)]);}tube(fxRoot,p,.055,lineMat);}
 for(const a of [-.75,.75]){const x=9.3+6.2*Math.cos(a),z=-11.3+6.2*Math.sin(a);beam(fxRoot,[x,.3,z],[x,10.3,z],.06,lineMat);}
 // Geometric energy grid remains subtle rather than obscuring the character.
 const gridMat=new T.MeshBasicMaterial({color:'#81def0',transparent:true,opacity:.22});
 for(let row=0;row<5;row++)for(let col=0;col<8;col++){
  const a=-.68+(col+(row%2)*.5)/8*1.35;const points=[];
  for(let i=0;i<=6;i++){const theta=i/6*Math.PI*2;const aa=a+Math.cos(theta)*.075;points.push([9.3+6.23*Math.cos(aa),1.3+row*1.8+Math.sin(theta)*.9,-11.3+6.23*Math.sin(aa)]);}tube(fxRoot,points,.012,gridMat);
 }
 const trailMat=new T.MeshBasicMaterial({color:'#70d9ef',transparent:true,opacity:.46,side:T.DoubleSide,depthWrite:false});
 const curve=new T.CatmullRomCurve3([new T.Vector3(-8,.5,-13),new T.Vector3(-12,1,-10),new T.Vector3(-13,2,-7),new T.Vector3(-10,.5,-4)]);
 const pointsA=[],indices=[];for(let i=0;i<=50;i++){const p=curve.getPoint(i/50);pointsA.push(p.x,p.y,p.z,p.x,p.y+.8,p.z);if(i<50){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}}
 const trailGeo=new T.BufferGeometry();trailGeo.setAttribute('position',new T.Float32BufferAttribute(pointsA,3));trailGeo.setIndex(indices);trailGeo.computeVertexNormals();mesh(fxRoot,trailGeo,trailMat);
 tube(fxRoot,curve.getPoints(45).map(v=>v.toArray()),.045,lineMat);
 fxRoot.traverse(o=>{o.userData.passThrough=true;o.castShadow=false;});
 // Batch static meshes by material, preserving instanced bricks and pavement.
 staticRoot.updateMatrixWorld(true);const buckets=new Map(),remove=[];
 staticRoot.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material))return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);for(const k of Object.keys(g.attributes))if(!['position','normal','uv'].includes(k))g.deleteAttribute(k);const a=buckets.get(o.material)??[];a.push(g);buckets.set(o.material,a);remove.push(o);});
 for(const o of remove)o.removeFromParent();
 for(const [material,list] of buckets){const g=mergeGeometries(list,false);list.forEach(a=>a.dispose());if(g){const m=mesh(staticRoot,g,material);m.userData.occluder=true;}}
 function batchInteractive(root,skipFX=false){
  root.updateMatrixWorld(true);const sets=new Map(),old=[];
  root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||(skipFX&&o.userData.passThrough))return;
   const id=o.userData.interactionId??'',key=o.material.uuid+id;const entry=sets.get(key)??{material:o.material,id,geometries:[]};
   const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);entry.geometries.push(g);sets.set(key,entry);old.push(o);});
  old.forEach(o=>o.removeFromParent());
  for(const v of sets.values()){const g=mergeGeometries(v.geometries,false);v.geometries.forEach(a=>a.dispose());if(!g)continue;const m=mesh(root,g,v.material);if(v.id)m.userData.interactionId=v.id;if(root===fxRoot){m.castShadow=false;m.userData.passThrough=true;}}
 }
 // Both roots have identity transforms. Merged geometries retain world coordinates.
 batchInteractive(dynamicRoot,true);batchInteractive(fxRoot);
 return {lights,markers,energy,fxRoot,pickers,staticRoot,dynamicRoot,materials,panes};
}
