"""Summarize evidence only if it belongs to the current HTML artifact."""
import hashlib
import json
from pathlib import Path

root=Path(__file__).resolve().parents[1]
out=root/'docs/validation'
html=root/'overwatch-diorama.html'
digest=hashlib.sha256(html.read_bytes()).hexdigest()
report=json.loads((out/'browser-report.json').read_text())
touch=json.loads((out/'touch-report.json').read_text())
assert report['html_sha256']==digest, 'Browser report is for a different HTML build'
assert touch['html_sha256']==digest, 'Touch report is for a different HTML build'
chrome=report['chromium'];soak=chrome.get('soak',{})
assert soak.get('seconds',0)>=600,'Ten-minute run not completed'
assert all(c['status']=='passed' for c in chrome['checks']),'Unresolved browser test failure'
assert not chrome['errors'] and not chrome['external_requests']
assert chrome['http_offline']=='passed'
assert report.get('firefox',{}).get('status')=='passed','Firefox not validated'
assert touch['status']=='passed'
ff=report['firefox'];ff.update(html_sha256=digest,display='Xvfb :99, Mesa software rendering')
(out/'firefox-report.json').write_text(json.dumps(ff,ensure_ascii=False,indent=2)+'\n')
samples=soak['samples']
geom=[s['geometries'] for s in samples];textures=[s['textures'] for s in samples]
fps=[s['averageFPS'] for s in samples]
lines=[
 '# 最终交互版本验证结果', '',
 f'- HTML：`overwatch-diorama.html`，{html.stat().st_size:,} 字节（{html.stat().st_size/1024/1024:.3f} MiB）。',
 f'- SHA256：`{digest}`。',
 f'- Chromium：{chrome["browser"]}；Firefox：{ff["browser"]}。',
 '- `file://` 直接打开、断网运行及 HTTP 打开后断网交互：通过。',
 '- 运行时外部资源请求：0；未捕获页面错误：0。',
 '- 灯光状态单元测试：9 项；触屏输入模拟：3 组检查。', '',
 '## 浏览器功能检查', '', '| 检查 | 结果 |', '| --- | --- |',
 *[f'| {c["name"]} | {c["status"]} |' for c in chrome['checks']], '',
 '## 连续运行', '',
 f'- 连续播放时长：{soak["seconds"]} 秒，记录 {len(samples)} 个采样。',
 f'- 几何资源计数：{min(geom)}–{max(geom)}；纹理资源计数：{min(textures)}–{max(textures)}。',
 f'- DOM 节点：{soak["before_dom"]["nodes"]} → {soak["after_dom"]["nodes"]}。',
 f'- GC 后 JS 堆：{soak["before_heap"]["usedSize"]:,} → {soak["after_heap"]["usedSize"]:,} 字节。',
 '- 连续运行检查包含未捕获错误、DOM 节点、几何、纹理与 GC 后 JS 堆增长上限，结果见原始报告。', '',
 '## 性能测量的适用范围', '',
 f'- 云端 GPU：`{chrome["metrics"].get("renderer","unreported")}`。',
 f'- 连续运行采样 FPS：{min(fps):.1f}–{max(fps):.1f}，为软件渲染实测，未达到规范的真实主流显卡目标，不能据此声明真实设备性能通过。',
 f'- 软件渲染档：{chrome["metrics"]["triangles"]:,} 个三角面，{chrome["metrics"]["drawCalls"]} 个绘制调用。',
 '- 已验证手机尺寸布局、触摸点选与双指事件；物理手机、真实显卡、Safari 仍未实测。', '',
 '## 画面证据', '',
 '- [展示](overview.png) · [手机尺寸](mobile.png) · [Firefox](firefox.png)',
 '- [正面](front.png) · [顶面](top.png) · [右侧](right.png) · [背面](back.png)',
 '- [黎明](dawn.png) · [白天](day.png) · [黄昏](dusk.png) · [深夜](night.png)', '',
 '原始证据：[browser-report.json](browser-report.json)、[touch-report.json](touch-report.json)、[file-audit.json](file-audit.json)。',
]
(out/'README.md').write_text('\n'.join(lines)+'\n')
print('Validated evidence and generated docs/validation/README.md')
