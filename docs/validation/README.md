# 最终交互版本验证结果

- HTML：`overwatch-diorama.html`，623,296 字节（0.594 MiB）。
- SHA256：`5abb358d0bb9ea4a006c56497596b6c23192cfd06e32c4dc56353b4eba225a1d`。
- Chromium：156.0.8078.4；Firefox：157.0。
- `file://` 直接打开、断网运行及 HTTP 打开后断网交互：通过。
- 运行时外部资源请求：0；未捕获页面错误：0。
- 灯光状态单元测试：9 项；触屏输入模拟：3 组检查。

## 浏览器功能检查

| 检查 | 结果 |
| --- | --- |
| T01 file:// offline initialization | passed |
| T15 no external resource requests | passed |
| T02 four camera presets | passed |
| T03 actual canvas lamp ray-picking x10 | passed |
| T04/T05 independent rooms and manual priority | passed |
| T06 restoring automatic day/night | passed |
| T07 brightness and remembered nonzero level | passed |
| T08 drag threshold and independent camera reset | passed |
| T09 occlusion and hidden room list | passed |
| T10 four time presets | passed |
| T11/T12 midnight, pause and simulated visibility event | passed |
| T13 keyboard lights | passed |
| T16 full reset | passed |
| T14 responsive 390x844 controls (desktop simulation) | passed |
| T17 continuous run DOM/resource stability | passed |

## 连续运行

- 连续播放时长：600 秒，记录 60 个采样。
- 几何资源计数：78–78；纹理资源计数：3–3。
- DOM 节点：433 → 433。
- GC 后 JS 堆：6,958,992 → 7,214,852 字节。
- 连续运行检查包含未捕获错误、DOM 节点、几何、纹理与 GC 后 JS 堆增长上限，结果见原始报告。

## 性能测量的适用范围

- 云端 GPU：`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`。
- 连续运行采样 FPS：1.9–2.5，为软件渲染实测，未达到规范的真实主流显卡目标，不能据此声明真实设备性能通过。
- 软件渲染档：105,776 个三角面，86 个绘制调用。
- 已验证手机尺寸布局、触摸点选与双指事件；物理手机、真实显卡、Safari 仍未实测。

## 画面证据

- [展示](overview.png) · [手机尺寸](mobile.png) · [Firefox](firefox.png)
- [正面](front.png) · [顶面](top.png) · [右侧](right.png) · [背面](back.png)
- [黎明](dawn.png) · [白天](day.png) · [黄昏](dusk.png) · [深夜](night.png)

原始证据：[browser-report.json](browser-report.json)、[touch-report.json](touch-report.json)、[file-audit.json](file-audit.json)。
