export const LIGHTS = [
  ['L01','主路灯','街道'], ['L02','小巷壁灯','街道'], ['P01_LIGHT','电话亭','街道'],
  ['ROOM_GF_L','一层左房间','房间'], ['ROOM_GF_R','一层右房间','房间'],
  ['ROOM_F1_L','二层左房间','房间'], ['ROOM_F1_R','二层右房间','房间']
];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function lighting(minutes){
  const hour=((minutes%1440)+1440)%1440/60;
  const phase=(hour-6)/24*Math.PI*2;
  const altitude=65*Math.sin(phase);
  return {hour,phase,altitude,night:1-smooth(-6,6,altitude),day:smooth(-10,22,altitude),golden:Math.exp(-Math.pow((altitude-4)/15,2)),sunPosition:[Math.cos(phase)*57,Math.max(2,Math.sin(phase)*65),-17+Math.sin(phase)*30]};
}
export function createState(){return {minutes:1110,playing:false,speed:1,selected:null,showHints:false,effects:true,view:'showcase',lights:Object.fromEntries(LIGHTS.map(([id])=>[id,{mode:'auto',level:.8}]))};}
export function targetLevel(state,id){const l=state.lights[id];return l.mode==='off'?0:l.mode==='on'?l.level:l.level*lighting(state.minutes).night;}
export function toggleLight(state,id){const l=state.lights[id];if(!l)return;l.mode=targetLevel(state,id)>=l.level*.5?'off':'on';state.selected=id;}
export function setMode(state,id,mode){if(state.lights[id]&&['auto','on','off'].includes(mode))state.lights[id].mode=mode;}
export function setBrightness(state,id,percent){const l=state.lights[id];if(!l)return;if(percent<=0)l.mode='off';else{l.mode='on';l.level=clamp(percent/100,.01,1);}}
export function setTime(state,value){state.minutes=clamp(Number(value)||0,0,1439);state.playing=false;}
export function advance(state,seconds){if(state.playing)state.minutes=(state.minutes+clamp(seconds,0,1)*12*state.speed)%1440;}
export function formatTime(minutes){const t=Math.floor(minutes)%1440;return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;}
export function restoreAutomatic(state){Object.values(state.lights).forEach(l=>l.mode='auto');}
