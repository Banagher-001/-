import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createState,setTime,toggleLight,targetLevel,setMode,setBrightness,lighting,advance,restoreAutomatic,formatTime} from './state.mjs';
test('manual off survives a change to midnight; other rooms remain independent',()=>{
 const s=createState();setTime(s,1380);toggleLight(s,'ROOM_GF_L');assert.equal(s.lights.ROOM_GF_L.mode,'off');
 setTime(s,0);assert.equal(targetLevel(s,'ROOM_GF_L'),0);assert.equal(targetLevel(s,'ROOM_GF_R'),.8);
 setMode(s,'ROOM_GF_L','auto');assert.equal(targetLevel(s,'ROOM_GF_L'),.8);
});
test('daylight click enables manual light and rapid clicks toggle deterministically',()=>{
 const s=createState();setTime(s,720);toggleLight(s,'L01');assert.equal(targetLevel(s,'L01'),.8);
 toggleLight(s,'L01');assert.equal(targetLevel(s,'L01'),0);toggleLight(s,'L01');assert.equal(targetLevel(s,'L01'),.8);
});
test('zero brightness preserves last nonzero brightness and manual mode',()=>{
 const s=createState();setBrightness(s,'L02',25);assert.equal(targetLevel(s,'L02'),.25);
 setBrightness(s,'L02',0);assert.equal(targetLevel(s,'L02'),0);toggleLight(s,'L02');assert.equal(targetLevel(s,'L02'),.25);
});
test('automatic lights follow day/night; manual on remains on by day',()=>{
 const s=createState();setTime(s,720);assert.equal(targetLevel(s,'L01'),0);setMode(s,'L01','on');assert.equal(targetLevel(s,'L01'),.8);
 setTime(s,1380);restoreAutomatic(s);assert.equal(targetLevel(s,'L01'),.8);
});
test('time scrubbing pauses playback and midnight wraps continuously',()=>{
 const s=createState();s.playing=true;setTime(s,1439);assert.equal(s.playing,false);
 s.playing=true;advance(s,.1);assert.ok(s.minutes<1);assert.equal(formatTime(s.minutes),'00:00');
 assert.ok(Math.abs(lighting(1439.99).day-lighting(0).day)<.001);
});
test('cycle timing and long frame clamp prevent hidden-tab catch-up',()=>{
 const s=createState();s.minutes=0;s.playing=true;for(let i=0;i<1200;i++)advance(s,.1);
 assert.ok(Math.abs(s.minutes)<.001||Math.abs(s.minutes-1440)<.001);
 const before=s.minutes;advance(s,900);assert.ok(Math.abs(((s.minutes-before)+1440)%1440-12)<.001);
});
test('visible low-FPS rendering retains real-time 120-second day length',()=>{
 const s=createState();s.minutes=0;s.playing=true;for(let i=0;i<240;i++)advance(s,.5);
 assert.ok(Math.abs(s.minutes)<.001||Math.abs(s.minutes-1440)<.001);
});
test('twilight transitions continuously, and restoring auto preserves time/selection',()=>{
 assert.ok(lighting(1080-1).night<lighting(1080).night);assert.ok(lighting(1080+1).night>lighting(1080).night);
 const s=createState();s.selected='L01';s.minutes=700;setMode(s,'L01','off');restoreAutomatic(s);
 assert.equal(s.minutes,700);assert.equal(s.selected,'L01');assert.equal(s.lights.L01.mode,'auto');
});
test('sun trajectory is continuous at midnight and does not flip at sunset',()=>{
 const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
 assert.ok(distance(lighting(1439.999).sunPosition,lighting(0).sunPosition)<.001);
 assert.ok(distance(lighting(1079.999).sunPosition,lighting(1080.001).sunPosition)<.001);
});
