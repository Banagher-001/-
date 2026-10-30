"""Chromium touch-input emulation; does not replace a physical phone test."""
from pathlib import Path
import hashlib
import json
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
    context.set_offline(True)
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto((root/'overwatch-diorama.html').as_uri())
    page.wait_for_function('window.__DIORAMA__?.ready',timeout=120000)
    point=page.evaluate('window.__DIORAMA__.project("L01")')
    page.touchscreen.tap(point['x'],point['y'])
    assert page.evaluate('window.__DIORAMA__.getState().lights.L01.mode')=='off'
    page.locator('#closePanel').tap()
    before=page.evaluate('window.__DIORAMA__.getState().lights')
    cdp=context.new_cdp_session(page)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':155,'y':400,'id':1},{'x':235,'y':400,'id':2}]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':135,'y':400,'id':1},{'x':255,'y':400,'id':2}]})
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    assert page.evaluate('window.__DIORAMA__.getState().lights')==before
    page.locator('#panelButton').tap()
    page.locator('[data-light="ROOM_GF_R"]').tap()
    page.locator('#modes label').nth(2).tap()
    page.locator('[data-time="1380"]').tap()
    assert page.evaluate('window.__DIORAMA__.getState().lights.ROOM_GF_R.mode')=='off'
    assert not errors
    report={'status':'passed','html_sha256':hashlib.sha256((root/'overwatch-diorama.html').read_bytes()).hexdigest(),
            'browser':browser.version,'mode':'390x844 touch-input emulation, not physical phone',
            'checks':['actual touch lamp ray-picking','two-finger gesture does not toggle lights','touch room controls and time priority'], 'errors':errors}
    (root/'docs/validation/touch-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False))
    browser.close()
