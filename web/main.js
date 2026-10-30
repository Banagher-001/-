import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {buildScene} from './scene.js';
import {LIGHTS,createState,lighting,targetLevel,toggleLight,setMode,setBrightness,setTime,advance,formatTime,restoreAutomatic} from './state.mjs';

const $=id=>document.getElementById(id), state=createState();
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let scene,renderer,camera,controls,world,ready=false,hovered=null,frameTime=0,hidden=false,readyAt=0;
const frames=[],errors=[],started=performance.now();let toastTimer,lastUI=0,lastHints=0,lastPick=0,pointerStart=null,pointerMoved=false;
const activePointers=new Set(),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const renderArea={x:0,y:0,width:1,height:1};
const modeNames={auto:'自动',on:'常亮',off:'关闭'};
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2100);}
function fail(error){errors.push(String(error));$('loading').classList.add('error');$('loading').innerHTML='<div class="load-mark">◈</div><p>暂时无法打开三维场景</p><small>请使用支持 WebGL2 的新版浏览器，并开启硬件加速。<br>当前显示为空间示意，灯光交互尚不可用。</small><svg width="250" height="190" viewBox="0 0 250 190" aria-label="静态空间示意"><rect x="20" y="10" width="210" height="165" rx="14" fill="#485d65"/><rect x="105" y="22" width="85" height="43" fill="#aa755c"/><rect x="45" y="35" width="26" height="30" rx="3" fill="#bb4941"/><rect x="107" y="80" width="44" height="53" rx="8" fill="#d2a05d"/><circle cx="72" cy="145" r="12" fill="#e5a44c"/><circle cx="185" cy="139" r="17" fill="#8fa7b0"/></svg>';console.error(error);}

function updateUI(){
 const p=lighting(state.minutes),time=formatTime(state.minutes);$('timeValue').value=time;$('timeValue').textContent=time;$('timeSlider').value=Math.floor(state.minutes);$('timeSlider').setAttribute('aria-valuetext',time);
 const period=p.hour>=5&&p.hour<8?'黎明':p.hour>=8&&p.hour<17?'白天':p.hour>=17&&p.hour<20?'黄昏':'深夜';
 $('periodLabel').textContent='/ '+period;$('sceneMood').textContent={黎明:'第一缕晨光',白天:'日光停在街角',黄昏:'黄昏时分',深夜:'城市尚未入眠'}[period];
 document.body.dataset.period=p.day>.6?'day':'night';$('play').textContent=state.playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',state.playing?'暂停时间':'播放时间');$('play').setAttribute('aria-pressed',String(state.playing));
 $('speed').value=state.speed;let count=0;
 for(const [id] of LIGHTS){const l=state.lights[id],value=targetLevel(state,id),row=document.querySelector(`[data-light="${id}"]`);if(value>.05)count++;row.classList.toggle('lit',value>.05);row.classList.toggle('selected',state.selected===id);row.setAttribute('aria-pressed',String(state.selected===id));row.querySelector('.row-mode').textContent=modeNames[l.mode];row.setAttribute('aria-label',`${LIGHTS.find(x=>x[0]===id)[1]}，${modeNames[l.mode]}，亮度 ${Math.round(value*100)}%，选择控制`);}
 $('litCount').textContent=`${count} / 7`;$('selection').hidden=!state.selected;
 if(state.selected){const id=state.selected,l=state.lights[id];$('selectedName').textContent=LIGHTS.find(x=>x[0]===id)[1];$('selectedStatus').textContent=modeNames[l.mode];$('brightness').value=Math.round(targetLevel(state,id)*100);$('brightnessValue').textContent=Math.round(targetLevel(state,id)*100)+'%';document.querySelectorAll('input[name=mode]').forEach(x=>x.checked=x.value===l.mode);$('modeHelp').textContent=l.mode==='auto'?'随昼夜自动点亮，拖动亮度可改为手动。':'已手动设置，切换时间不会覆盖。';}
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
 document.querySelectorAll('[data-time]').forEach(b=>b.classList.toggle('active',Math.abs(Number(b.dataset.time)-state.minutes)<31));
 $('effectsButton').setAttribute('aria-pressed',String(state.effects));$('hintButton').setAttribute('aria-pressed',String(state.showHints));
}
function openPanel(open=true){$('lightPanel').hidden=!open;$('panelButton').setAttribute('aria-expanded',String(open));}
function select(id){state.selected=id;openPanel();updateUI();}
function activate(id){toggleLight(state,id);openPanel();updateUI();toast(`${LIGHTS.find(x=>x[0]===id)[1]} · ${modeNames[state.lights[id].mode]}`);}
for(const [id,name] of LIGHTS){const b=document.createElement('button');b.className='light-row';b.dataset.light=id;b.innerHTML=`<span class="state-dot"></span><span class="row-name">${name}</span><span class="row-mode">自动</span><span class="row-toggle" aria-hidden="true"></span>`;b.addEventListener('click',()=>select(id));$('lightList').appendChild(b);}
$('panelButton').onclick=()=>openPanel($('lightPanel').hidden);$('closePanel').onclick=()=>openPanel(false);
document.querySelectorAll('input[name=mode]').forEach(b=>b.onchange=()=>{if(state.selected)setMode(state,state.selected,b.value);updateUI();});
$('brightness').oninput=e=>{setBrightness(state,state.selected,Number(e.target.value));updateUI();};
$('autoAll').onclick=()=>{restoreAutomatic(state);updateUI();toast('所有灯光已恢复自动');};
$('timeSlider').oninput=e=>{setTime(state,Number(e.target.value));updateUI();};
document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{setTime(state,Number(b.dataset.time));updateUI();});
$('play').onclick=()=>{state.playing=!state.playing;updateUI();};$('speed').onchange=e=>state.speed=Number(e.target.value);
$('hintButton').onclick=()=>{state.showHints=!state.showHints;updateUI();};
$('effectsButton').onclick=()=>{state.effects=!state.effects;updateUI();toast(state.effects?'能量特效已开启':'能量特效已隐藏');};
for(const id of ['help','credits']){$(id+'Button').onclick=()=>$(id+'Dialog').showModal();$(id+'Dialog').querySelectorAll('.dialog-close').forEach(b=>b.onclick=()=>$(id+'Dialog').close());}
window.addEventListener('keydown',e=>{if(e.key==='Escape'){state.selected=null;openPanel(false);updateUI();}});
document.addEventListener('visibilitychange',()=>{hidden=document.hidden;frameTime=performance.now();});

function setView(name){
 if(!camera)return;state.view=name;const target=new THREE.Vector3(0,11.5,-17);
 const positions={showcase:[53,47,58],front:[0,13,110],top:[0,125,-17],right:[125,13,-17],back:[0,13,-140]};
 const pos=positions[name]??positions.showcase;camera.up.set(0,1,0);if(name==='top'){camera.up.set(0,0,-1);target.set(0,0,-17);}
 else if(name!=='showcase')target.set(0,13,-17);
 camera.position.set(...pos);camera.zoom=1;controls.target.copy(target);camera.lookAt(target);camera.updateProjectionMatrix();if(name!=='top')controls.update();updateUI();
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));$('resetView').onclick=()=>setView('showcase');
$('resetAll').onclick=()=>{Object.assign(state,createState());setView('showcase');openPanel(false);updateUI();toast('已恢复初始场景');};

function interactionId(object){let obj=object;while(obj){if(obj.userData.passThrough)return null;if(obj.userData.interactionId)return obj.userData.interactionId;obj=obj.parent;}return null;}
function passThrough(object){let o=object;while(o){if(o.userData.passThrough)return true;o=o.parent;}return false;}
function pick(x,y){if(!world)return null;const r=renderArea;if(x<r.x||x>r.x+r.width||y<r.y||y>r.y+r.height)return null;pointer.set((x-r.x)/r.width*2-1,-(y-r.y)/r.height*2+1);raycaster.setFromCamera(pointer,camera);for(const hit of raycaster.intersectObjects([world.staticRoot,world.dynamicRoot],true)){if(passThrough(hit.object))continue;return interactionId(hit.object);}return null;}
function project(v){const p=v.clone().project(camera),r=renderArea;return {x:r.x+(p.x*.5+.5)*r.width,y:r.y+(-.5*p.y+.5)*r.height,visible:p.z>=-1&&p.z<=1&&Math.abs(p.x)<1&&Math.abs(p.y)<1};}
function updateHints(){
 if(!world)return;
 for(const [id] of LIGHTS){const b=$('hint-'+id),e=world.lights[id],point=project(e.anchor);const visible=state.showHints&&point.visible&&pick(point.x,point.y)===id;b.hidden=!visible;if(visible){b.style.left=point.x+'px';b.style.top=point.y+'px';}}
}

function boot(){
 scene=new THREE.Scene();renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 const gl=renderer.getContext(),debugInfo=gl.getExtension('WEBGL_debug_renderer_info'),gpuName=debugInfo?gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL):'unreported';
 const softwareGPU=/swiftshader|llvmpipe|softpipe|software/i.test(gpuName);renderer.setPixelRatio(softwareGPU?.75:Math.min(devicePixelRatio,innerWidth<600?1.5:2));
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 $('viewport').appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','三维场景：拖动旋转，滚轮缩放，点击路灯或窗户开关灯光');
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fail('WebGL 上下文丢失，请重新打开文件。');});
 camera=new THREE.OrthographicCamera(-40,40,26,-26,.1,600);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minZoom=.65;controls.maxZoom=2.8;controls.minPolarAngle=.025;controls.maxPolarAngle=Math.PI/2;controls.screenSpacePanning=true;
 controls.addEventListener('start',()=>{$('tooltip').hidden=true;});controls.addEventListener('change',()=>{const t=controls.target;t.x=THREE.MathUtils.clamp(t.x,-12,12);t.y=THREE.MathUtils.clamp(t.y,3,24);t.z=THREE.MathUtils.clamp(t.z,-29,-5);});
 const hemi=new THREE.HemisphereLight('#c9deee','#907650',1.5);scene.add(hemi);
 const fill=new THREE.DirectionalLight('#9dcadd',.55);fill.position.set(-30,25,-25);scene.add(fill);
 const sun=new THREE.DirectionalLight('#ffdfb4',3.2);sun.position.set(-30,50,15);sun.castShadow=true;sun.shadow.mapSize.setScalar(softwareGPU?512:1024);Object.assign(sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:170});sun.shadow.normalBias=.07;sun.shadow.bias=-.00015;scene.add(sun);sun.target.position.set(0,0,-17);scene.add(sun.target);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(2000,2000),new THREE.MeshStandardMaterial({color:'#cdd1c7',roughness:.95}));floor.rotation.x=-Math.PI/2;floor.position.y=-3.05;floor.receiveShadow=true;scene.add(floor);
 const studio=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(studio,.04).texture;studio.dispose();pmrem.dispose();scene.environmentIntensity=.6;
 world=buildScene(scene,{lowDetail:softwareGPU});setView('showcase');
 const bg=new THREE.Color(),nightColor=new THREE.Color('#182e3c'),dayColor=new THREE.Color('#e3e2d6');scene.background=bg;
 const haloCanvas=document.createElement('canvas');haloCanvas.width=haloCanvas.height=64;const ctx=haloCanvas.getContext('2d');const grad=ctx.createRadialGradient(32,32,0,32,32,32);grad.addColorStop(0,'rgba(255,214,146,.6)');grad.addColorStop(.2,'rgba(255,189,105,.16)');grad.addColorStop(1,'rgba(255,179,90,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);const haloTexture=new THREE.CanvasTexture(haloCanvas);
 for(const [id,name] of LIGHTS){const e=world.lights[id];e.halo=new THREE.Sprite(new THREE.SpriteMaterial({map:haloTexture,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));e.halo.position.copy(e.anchor);e.halo.scale.setScalar(id.startsWith('ROOM')?4:6);e.halo.userData.passThrough=true;scene.add(e.halo);const b=document.createElement('button');b.id='hint-'+id;b.className='hint';b.textContent='+';b.setAttribute('aria-label',name+'：切换灯光');b.hidden=true;b.onclick=()=>activate(id);$('hints').appendChild(b);}
 function resize(){renderer.setSize(innerWidth,innerHeight);const mobile=innerWidth<600,top=mobile?156:96,bottom=mobile?248:224;Object.assign(renderArea,{x:0,y:top,width:innerWidth,height:Math.max(180,innerHeight-top-bottom)});renderer.setViewport(0,innerHeight-top-renderArea.height,innerWidth,renderArea.height);const aspect=renderArea.width/renderArea.height,h=Math.max(46,55/aspect);camera.left=-h*aspect/2;camera.right=h*aspect/2;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();}
 window.addEventListener('resize',resize);resize();
 const canvas=renderer.domElement;
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('wheel',()=>{state.view='custom';camera.up.set(0,1,0);},{capture:true,passive:true});
 canvas.addEventListener('pointerdown',e=>{activePointers.add(e.pointerId);if(e.button!==0||activePointers.size>1){pointerMoved=true;return;}pointerStart={x:e.clientX,y:e.clientY,id:e.pointerId};pointerMoved=false;});
 canvas.addEventListener('pointermove',e=>{
  if(pointerStart&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>6){pointerMoved=true;state.view='custom';camera.up.set(0,1,0);}
  if(activePointers.size||e.pointerType==='touch')return;if(performance.now()-lastPick<70)return;lastPick=performance.now();hovered=pick(e.clientX,e.clientY);canvas.style.cursor=hovered?'pointer':'grab';$('tooltip').hidden=!hovered;
  if(hovered){const l=state.lights[hovered];$('tooltip').textContent=`${LIGHTS.find(x=>x[0]===hovered)[1]} · 点击${targetLevel(state,hovered)>l.level*.5?'熄灭':'点亮'}`;$('tooltip').style.left=Math.min(innerWidth-185,e.clientX+16)+'px';$('tooltip').style.top=Math.max(10,e.clientY-42)+'px';}
 });
 canvas.addEventListener('pointerup',e=>{activePointers.delete(e.pointerId);if(e.button===0&&pointerStart?.id===e.pointerId&&!pointerMoved){const id=pick(e.clientX,e.clientY);if(id)activate(id);else{state.selected=null;updateUI();}}pointerStart=null;});
 canvas.addEventListener('pointercancel',e=>{activePointers.delete(e.pointerId);pointerStart=null;pointerMoved=true;});canvas.addEventListener('pointerleave',()=>{$('tooltip').hidden=true;});
 let smoothedFrame=.016,qualityDropped=false;frameTime=performance.now();
 function frame(now){requestAnimationFrame(frame);if(hidden){frameTime=now;return;}const rawDT=(now-frameTime)/1000,dt=Math.min(.1,rawDT);frameTime=now;if(ready){frames.push(rawDT);if(frames.length>600)frames.shift();}advance(state,rawDT);if(state.view!=='top')controls.update();
  const p=lighting(state.minutes);bg.copy(nightColor).lerp(dayColor,p.day);floor.material.color.copy(bg);hemi.intensity=.7+1.7*p.day;fill.intensity=.7-.25*p.day;
  sun.position.fromArray(p.sunPosition);sun.intensity=3.2*p.day;sun.color.set(p.golden>.25?'#ffd29b':'#fff1d7');sun.castShadow=p.day>.025;
  const blend=1-Math.exp(-dt/.055);
  scene.environmentIntensity=.5+.2*p.day;
  for(const [id] of LIGHTS){const e=world.lights[id];e.level+=(targetLevel(state,id)-e.level)*blend;e.light.intensity=e.level*e.power;e.materials.forEach(m=>{m.emissiveIntensity=e.level*(id.startsWith('ROOM')?1.5:2.0);m.color.set(id.startsWith('ROOM')?(e.level>.1?'#bc925d':'#34404a'):(e.level>.1?'#d1ae70':'#655b4b'));});e.halo.material.opacity=e.level*.65;}
  world.fxRoot.visible=state.effects;world.energy.forEach((m,i)=>m.emissiveIntensity=(1.15+p.night*.55)*(reduced||!state.effects?1:1+Math.sin(now*.0015+i)*.045));
  renderer.render(scene,camera);
  if(now-lastUI>150){updateUI();lastUI=now;}if(now-lastHints>350){updateHints();lastHints=now;}
  if(!ready){ready=true;readyAt=performance.now();$('loading').classList.add('done');setTimeout(()=>$('loading').hidden=true,450);}
  if(ready)smoothedFrame=smoothedFrame*.95+Math.min(rawDT,.25)*.05;
  if(!qualityDropped&&now-started>8000&&smoothedFrame>.045){qualityDropped=true;renderer.setPixelRatio(softwareGPU?.65:1);sun.shadow.mapSize.setScalar(softwareGPU?256:512);sun.shadow.map?.dispose();sun.shadow.map=null;resize();}
 }
 requestAnimationFrame(frame);
 // Read-only snapshots plus the same actions as UI, used for reproducible acceptance tests.
 window.__DIORAMA__={get ready(){return ready;},getState:()=>structuredClone(state),getMetrics:()=>({triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,averageFPS:frames.length?frames.length/frames.reduce((a,b)=>a+b,0):0,frameSamples:frames.length,lowQuality:qualityDropped,renderer:gpuName,softwareGPU,loadMs:readyAt-started,textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,programs:renderer.info.programs?.length,errors:[...errors]}),setView,setTime:(m)=>{setTime(state,m);updateUI();},toggle:(id)=>{activate(id);},project:(id)=>project(world.lights[id].anchor),getLight:(id)=>({target:targetLevel(state,id),actual:world.lights[id].level,emissive:world.lights[id].materials.map(m=>m.emissiveIntensity)}),lighting};
}
updateUI();try{boot();}catch(e){fail(e);}
