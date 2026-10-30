"""End-to-end acceptance checks for the built single HTML.

Requires Playwright Python and installed Chromium/Firefox. Browser screenshots
and reports are written to docs/validation. --soak 600 performs the 10min check.
"""
import argparse
import hashlib
import json
import platform
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/validation'


def run_chromium(p, soak):
    browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    context = browser.new_context(viewport={'width': 1600, 'height': 1000}, device_scale_factor=1)
    context.set_offline(True)
    page = context.new_page()
    errors, requests, checks = [], [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: requests.append(request.url))
    def check(name, fn):
        try:
            fn()
            checks.append({'name': name, 'status': 'passed'})
            print('PASS', name, flush=True)
        except Exception as error:
            checks.append({'name': name, 'status': 'failed', 'error': str(error)[:1000]})
            print('FAIL', name, str(error)[:500], flush=True)
    def state(): return page.evaluate('window.__DIORAMA__.getState()')
    def action(code): return page.evaluate(code)
    def slider(id, value):
        page.locator('#'+id).evaluate('(el,v)=>{el.value=v;el.dispatchEvent(new Event("input",{bubbles:true}));}', value)
    def require(ok, message):
        if not ok: raise AssertionError(message)
    page.goto((ROOT/'overwatch-diorama.html').as_uri(), timeout=120000)
    page.wait_for_function('window.__DIORAMA__?.ready', timeout=120000)
    page.wait_for_timeout(800)
    check('T01 file:// offline initialization', lambda: require(state()['minutes'] == 1110 and not state()['playing'], 'Default state incorrect'))
    check('T15 no external resource requests', lambda: require(not [u for u in requests if u.startswith(('http:', 'https:'))], 'External request'))
    page.screenshot(path=str(OUT/'overview.png'))
    def views():
        for view in ['front', 'top', 'right', 'back']:
            page.locator(f'[data-view="{view}"]').click()
            page.wait_for_timeout(450)
            require(state()['view'] == view, view+' preset not set')
            page.screenshot(path=str(OUT/(view+'.png')))
    check('T02 four camera presets', views)
    def toggle_lamp():
        page.locator('[data-view="front"]').click()
        point=action('window.__DIORAMA__.project("L01")')
        for i in range(10):
            page.mouse.click(point['x'],point['y'])
            require(state()['lights']['L01']['mode'] == ('off' if i%2==0 else 'on'), 'Ray-picked lamp toggle failed at '+str(i))
        page.wait_for_timeout(400)
        require(action('window.__DIORAMA__.getLight("L01").actual')>.7, 'Lamp did not illuminate')
    check('T03 actual canvas lamp ray-picking x10', toggle_lamp)
    def rooms():
        for id in ['ROOM_GF_L','ROOM_GF_R','ROOM_F1_L','ROOM_F1_R']:
            page.locator(f'[data-light="{id}"]').click()
            page.locator('#modes label').nth(2).click()
            require(state()['lights'][id]['mode']=='off', id+' off failed')
        slider('timeSlider', 1380)
        require(all(state()['lights'][id]['mode']=='off' for id in ['ROOM_GF_L','ROOM_GF_R','ROOM_F1_L','ROOM_F1_R']), 'Time overrode manual rooms')
        page.locator('[data-light="ROOM_F1_R"]').click()
        page.locator('#modes label').nth(1).click()
        require(state()['lights']['ROOM_F1_R']['mode']=='on' and state()['lights']['ROOM_F1_L']['mode']=='off','Room independence failed')
    check('T04/T05 independent rooms and manual priority', rooms)
    def automatic():
        page.locator('#autoAll').click();slider('timeSlider',720)
        require(action('window.__DIORAMA__.getLight("ROOM_F1_R").target')==0,'Day auto failed')
        slider('timeSlider',1380)
        require(action('window.__DIORAMA__.getLight("ROOM_F1_R").target')>.7,'Night auto failed')
    check('T06 restoring automatic day/night', automatic)
    def brightness():
        page.locator('[data-light="L02"]').click()
        for value in [25,75,0]:
            slider('brightness',value)
            require(abs(action('window.__DIORAMA__.getLight("L02").target')-value/100)<.001,'Brightness mismatch')
        action('window.__DIORAMA__.toggle("L02")')
        require(action('window.__DIORAMA__.getLight("L02").target')==.75,'Nonzero brightness not restored')
        page.wait_for_timeout(400)
    check('T07 brightness and remembered nonzero level', brightness)
    def gestures():
        page.locator('#closePanel').click();page.locator('[data-view="front"]').click()
        before=state()['lights'];point=action('window.__DIORAMA__.project("L01")')
        page.mouse.move(point['x'],point['y']);page.mouse.down();page.mouse.move(point['x']+70,point['y']+25,steps=8);page.mouse.up()
        require(state()['lights']==before,'Camera drag changed lights')
        before_time=state()['minutes'];page.locator('#resetView').click()
        require(state()['lights']==before and state()['minutes']==before_time,'Camera reset changed other state')
    check('T08 drag threshold and independent camera reset', gestures)
    def occlusion():
        page.locator('[data-view="back"]').click()
        action('document.getElementById("viewport").click()')
        # Clear selection through the real canvas, then aim at the hidden front lower room.
        page.mouse.click(500,180)
        point=action('window.__DIORAMA__.project("ROOM_GF_L")')
        page.mouse.click(point['x'],point['y'])
        require(state()['selected'] is None,'Room selected through solid back wall')
        page.locator('#panelButton').click();page.locator('[data-light="ROOM_GF_L"]').click()
        require(state()['selected']=='ROOM_GF_L','Hidden room list selection failed')
    check('T09 occlusion and hidden room list', occlusion)
    def times():
        page.locator('#closePanel').click();page.locator('[data-view="showcase"]').click()
        for time_value,name in [(360,'dawn'),(720,'day'),(1080,'dusk'),(1380,'night')]:
            page.locator(f'[data-time="{time_value}"]').click();page.wait_for_timeout(500)
            require(state()['minutes']==time_value,'Time preset wrong')
            page.screenshot(path=str(OUT/(name+'.png')))
    check('T10 four time presets', times)
    def playback():
        slider('timeSlider',1439);page.locator('#speed').select_option('2');page.locator('#play').click();page.wait_for_function('window.__DIORAMA__.getState().minutes<30',timeout=15000)
        require(state()['minutes']<30,'Midnight did not wrap')
        slider('timeSlider',800);require(not state()['playing'],'Scrub did not pause')
        page.wait_for_timeout(350);require(state()['minutes']==800,'Paused time moved')
        page.locator('[data-view="right"]').click();require(state()['minutes']==800,'Camera changed time')
        page.locator('#play').click()
        action('Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"))')
        before=state()['minutes'];page.wait_for_timeout(500);require(state()['minutes']==before,'Hidden page advanced time')
        action('delete document.hidden;document.dispatchEvent(new Event("visibilitychange"))')
        page.locator('#play').click()
    check('T11/T12 midnight, pause and simulated visibility event', playback)
    def keyboard():
        page.locator('#panelButton').click()
        row=page.locator('[data-light="ROOM_F1_L"]');row.focus();page.keyboard.press('Enter')
        require(state()['selected']=='ROOM_F1_L','Keyboard row selection failed')
        radio=page.locator('input[name="mode"][value="off"]');radio.focus();page.keyboard.press('Space')
        require(state()['lights']['ROOM_F1_L']['mode']=='off','Keyboard mode failed')
        page.locator('#closePanel').click()
    check('T13 keyboard lights', keyboard)
    def reset():
        page.locator('#resetAll').click();s=state()
        require(s['minutes']==1110 and not s['playing'] and s['view']=='showcase','Reset state wrong')
        require(all(l['mode']=='auto' and l['level']==.8 for l in s['lights'].values()),'Reset lights wrong')
    check('T16 full reset', reset)
    def mobile():
        page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(450)
        require(action('document.documentElement.scrollWidth<=innerWidth'),'Mobile horizontal overflow')
        page.screenshot(path=str(OUT/'mobile.png'))
        page.locator('#panelButton').click();page.locator('[data-light="ROOM_GF_L"]').click();page.locator('#modes label').nth(2).click()
        require(state()['lights']['ROOM_GF_L']['mode']=='off','Mobile-size lights failed')
        page.locator('#resetAll').click();page.set_viewport_size({'width':1600,'height':1000});page.wait_for_timeout(200)
    check('T14 responsive 390x844 controls (desktop simulation)', mobile)
    report={'browser':browser.version,'mode':'headless Chromium, SwiftShader software rendering; not a physical-device GPU performance benchmark', 'system':platform.platform(),'viewport':'1600x1000 DPR 1','checks':checks,'metrics':action('window.__DIORAMA__.getMetrics()'),'errors':errors,'external_requests':[u for u in requests if u.startswith(('http:','https:'))]}
    if soak:
        cdp=context.new_cdp_session(page);cdp.send('HeapProfiler.collectGarbage')
        before_nodes=cdp.send('Memory.getDOMCounters');before_metrics=action('window.__DIORAMA__.getMetrics()');before_heap=cdp.send('Runtime.getHeapUsage')
        page.locator('#play').click();samples=[];until=time.monotonic()+soak
        while time.monotonic()<until:
            page.wait_for_timeout(min(10000,max(1,(until-time.monotonic())*1000)))
            samples.append(action('window.__DIORAMA__.getMetrics()'))
            print('SOAK',len(samples),'frames',samples[-1]['frameSamples'],'fps',round(samples[-1]['averageFPS'],1),flush=True)
        page.locator('#play').click();cdp.send('HeapProfiler.collectGarbage');after_nodes=cdp.send('Memory.getDOMCounters')
        after_metrics=action('window.__DIORAMA__.getMetrics()');after_heap=cdp.send('Runtime.getHeapUsage')
        report['soak']={'seconds':soak,'before_dom':before_nodes,'after_dom':after_nodes,'before_heap':before_heap,'after_heap':after_heap,'before_resources':before_metrics,'after_resources':after_metrics,'samples':samples,'errors':errors}
        check('T17 continuous run DOM/resource stability',lambda:require(not errors and after_nodes['nodes']<=before_nodes['nodes']+10 and after_metrics['geometries']==before_metrics['geometries'] and after_metrics['textures']<=before_metrics['textures']+2 and after_heap['usedSize']<=before_heap['usedSize']+max(5_000_000,before_heap['usedSize']*.2),'Errors or increasing DOM/GPU/heap resources'))
    # HTTP mode test uses a separate context, without navigating away from the offline file instance.
    http_context=browser.new_context(viewport={'width':1000,'height':800});http_page=http_context.new_page()
    try:
        http_page.goto('http://127.0.0.1:8765/overwatch-diorama.html',timeout=120000)
        http_page.wait_for_function('window.__DIORAMA__?.ready',timeout=120000)
        http_context.set_offline(True);http_page.locator('[data-time="1380"]').click()
        require(http_page.evaluate('window.__DIORAMA__.getState().minutes')==1380,'HTTP offline interaction failed')
        report['http_offline']='passed'
    except Exception as error:report['http_offline']={'failed':str(error)[:500]}
    http_context.close();browser.close();return report


def run_firefox(p):
    browser=None
    try:
        browser=p.firefox.launch(headless=not bool(os.environ.get('DISPLAY')),firefox_user_prefs={'webgl.force-enabled':True,'webgl.disabled':False,'webgl.allow-software-rendering':True,'webgl.out-of-process':False})
        context=browser.new_context(viewport={'width':1280,'height':900});context.set_offline(True);page=context.new_page();errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto((ROOT/'overwatch-diorama.html').as_uri(),timeout=120000)
        page.wait_for_function('window.__DIORAMA__?.ready',timeout=60000)
        page.locator('#panelButton').click();page.locator('[data-light="ROOM_GF_L"]').click();page.locator('#modes label').nth(2).click();page.locator('[data-time="1380"]').click()
        s=page.evaluate('window.__DIORAMA__.getState()')
        assert s['lights']['ROOM_GF_L']['mode']=='off' and s['minutes']==1380
        page.locator('#closePanel').click();page.screenshot(path=str(OUT/'firefox.png'))
        return {'status':'passed','browser':browser.version,'errors':errors,'metrics':page.evaluate('window.__DIORAMA__.getMetrics()')}
    except Exception as error:return {'status':'failed_or_environment_blocked','error':str(error)[:1500]}
    finally:
        if browser:browser.close()


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--soak',type=int,default=0);parser.add_argument('--skip-firefox',action='store_true');args=parser.parse_args()
    OUT.mkdir(exist_ok=True,parents=True)
    result={'html_sha256':hashlib.sha256((ROOT/'overwatch-diorama.html').read_bytes()).hexdigest(),'html_bytes':(ROOT/'overwatch-diorama.html').stat().st_size}
    with sync_playwright() as p:
        result['chromium']=run_chromium(p,args.soak)
        (OUT/'browser-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
        if not args.skip_firefox:result['firefox']=run_firefox(p)
    (OUT/'browser-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    failures=[x for x in result['chromium']['checks'] if x['status']!='passed']
    print('FINAL',json.dumps({'chromium_failures':failures,'firefox':result.get('firefox'),'metrics':result['chromium']['metrics']},ensure_ascii=False),flush=True)
    return 1 if failures or result['chromium'].get('http_offline')!='passed' or (result.get('firefox') and result['firefox']['status']!='passed') else 0


if __name__=='__main__':raise SystemExit(main())
