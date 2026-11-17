# 《奶龙测试》(`Nailong Test` / `奶蛙骑行测试`)

> **跨越人类 6,000 年、20 种艺术史媒介的 `9:16` 竖屏高清（`1080×1920 @ 30fps`）纯代码生成动画短片**  
> 基于 [`orbitoo/pelican-test`](https://github.com/orbitoo/pelican-test)（MIT）美术馆级程序化卷轴与 Web Audio 引擎深度重制 · `@Nonstop × ERC` 出品

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](./LICENSE)
[![Resolution](https://img.shields.io/badge/Resolution-1080x1920%20%289%3A16%29-38bdf8.svg)](#快速运行与离线渲染)
[![Zero NPM Deps](https://img.shields.io/badge/Dependencies-Zero%20NPM-4ade80.svg)](#工程架构)

![20 个艺术史时代总览拼图](./screenshots/hero_20_eras_grid.png)

> **高清成片下载**：完整的 `1080×1920`（`30fps`、`48kHz` 立体声混音、`91.33s`）成片 MP4 可直接前往仓库右侧 **[Releases (`v1.0.0`)](../../releases/latest)** 在线预览或下载。

---

## 项目亮点

1. **主角全媒介原生重绘（`呆滞大肚版奶龙 / 奶蛙` + 解析双骨逆运动学骑行骨架）**
   - 并非简单贴图替换，而是针对 20 个艺术时代各自采用对应的**物理媒介与笔触算法**重绘奶龙与单车：北宋范宽焦墨铁线折芦描与淡赭藤黄染绢、梵高《星月夜》`source-atop` 厚涂刮刀油彩肌理、蒙克《呐喊》抽象表现派干粉彩起伏条带与竖椭圆 `"O"` 形呐喊嘴、爪哇牛皮镂空皮影关节铆钉、1950s 示波器 P1 荧光绿电子束、红白机 8-bit 像素精灵以及 2020s 36 阶复数傅里叶本轮（`Σ c_k · e^{ikωθ}`）实时绘线。
2. **全片背景持续物理动态 + `9:16` 竖屏长廊重构**
   - 将原版横屏重构为 `1080×1920` 竖屏博物馆长廊视口，并为全部 20 个时代注入连续环境动态（北宋 `3000×3000` `3×` 超采样山谷推镜、清明上河图虹桥车马汴河波光、浮世绘飞沫、星空漩涡流场、VHS 磁带抖动与竖屏短视频实时跟拍弹幕）。
3. **片尾 `3×7` 博物馆展墙 20 幅画作实时骑行 + 第 21 格「捧腹大笑」发布会**
   - 镜头拉远至 `3×7` 竖屏展墙时，`#01–#20` 全部 **20 幅画作逐帧实时渲染蹬车前进**；随后推镜至第 21 格新闻发布会，呈现去绿幕溢色精修的奶蛙「捧腹大笑」动画与原版笑声混音。
4. **22 种跨时代原生风格化 `@Nonstop × ERC` 品牌印记**
   - 从古埃及双股金绳王名圈、东汉刀凿石刻拓印、唐宋铁笔残边朱文鉴藏印、玛雅树皮纸石雕铭文块，到蒸汽波双层霓虹灯牌与 IDE 顶栏发光内联标识，随时代媒介同步演化。

---

## 全片 22 幕高清关键帧画廊（`1080×1920`）

| 片头 · 古籍手稿摹本 | #01 · 撒哈拉岩画（约前 4000） | #02 · 古埃及壁画（约前 1300） | #03 · 东汉画像石拓片（约 100） |
| :---: | :---: | :---: | :---: |
| ![Intro](./screenshots/eras/00_intro_3.5s.png) | ![#01 Sahara](./screenshots/eras/01_sahara_cave_8.0s.png) | ![#02 Egypt](./screenshots/eras/02_egypt_cartouche_13.8s.png) | ![#03 Han](./screenshots/eras/03_han_rubbing_20.0s.png) |

| #04 · 盛唐白描（约 750） | #05 · 北宋巨碑山水（约 1000） | #06 · 清明上河图（约 1120） | #07 · 玛雅抄本（约 1200） |
| :---: | :---: | :---: | :---: |
| ![#04 Tang](./screenshots/eras/04_tang_apsaras_26.2s.png) | ![#05 Song](./screenshots/eras/05_song_macro_zoom_31.8s.png) | ![#06 Qingming](./screenshots/eras/06_qingming_bridge_38.0s.png) | ![#07 Maya](./screenshots/eras/07_maya_codex_44.0s.png) |

| #08 · 莫卧儿细密画（约 1600） | #09 · 八大山人写意（约 1690） | #10 · 爪哇皮影戏（约 1750） | #11 · 浮世绘（约 1830） |
| :---: | :---: | :---: | :---: |
| ![#08 Mughal](./screenshots/eras/08_mughal_miniature_50.0s.png) | ![#09 Bada](./screenshots/eras/09_bada_eyeroll_56.0s.png) | ![#10 Wayang](./screenshots/eras/10_wayang_kulit_61.8s.png) | ![#11 Ukiyoe](./screenshots/eras/11_ukiyoe_wave_68.0s.png) |

| #12 · 梵高《星月夜》（1889） | #13 · 蒙克《呐喊》（1893） | #14 · 《诺斯费拉图》（1922） | #15 · 示波器矢量图（1950s） |
| :---: | :---: | :---: | :---: |
| ![#12 Starry](./screenshots/eras/12_starry_night_74.0s.png) | ![#13 Scream](./screenshots/eras/13_scream_abstract_80.0s.png) | ![#14 Nosferatu](./screenshots/eras/14_nosferatu_shadow_86.0s.png) | ![#15 Oscilloscope](./screenshots/eras/15_oscilloscope_90.6s.png) |

| #16 · 8-bit 像素游戏（1985） | #17 · 早期聊天窗口（2000s） | #18 · 蒸汽波（2010s） | #19 · 竖屏短视频（2020s） |
| :---: | :---: | :---: | :---: |
| ![#16 8bit](./screenshots/eras/16_8bit_famicom_98.0s.png) | ![#17 Win2000](./screenshots/eras/17_win2000_chat_104.0s.png) | ![#18 Vaporwave](./screenshots/eras/18_vaporwave_neon_110.0s.png) | ![#19 ShortVideo](./screenshots/eras/19_shortvideo_fullscreen_116.0s.png) |

| #20 · 代码美学（2020s） | 片尾 · 3×7 全墙 20 格实时骑行 | 片尾 · 奶蛙本人捧腹大笑发布会 | 片尾 · 走廊掠影摇铃收尾 |
| :---: | :---: | :---: | :---: |
| ![#20 Code](./screenshots/eras/20_code_art_121.5s.png) | ![Outro Wall](./screenshots/eras/21a_outro_3x7_wall_127.5s.png) | ![Press Laugh](./screenshots/eras/21b_press_belly_laugh_132.2s.png) | ![Corridor Bell](./screenshots/eras/21c_press_corridor_bell_136.02s.png) |

---

## 1:1 像素级细节与跨媒介工艺特写

| #05 北宋范宽铁线描淡赭藤黄奶蛙（与栈道驮驴同画风） | #12 梵高《星月夜》厚涂油画笔触与柔和橄榄油彩蛙眼 | #13 蒙克《呐喊》抽象表现派干粉彩条带与漩涡肚皮 |
| :---: | :---: | :---: |
| ![Song Detail](./screenshots/details/detail_05_song_calligraphic_naiwa.png) | ![Starry Detail](./screenshots/details/detail_12_starry_impasto.png) | ![Scream Detail](./screenshots/details/detail_13_scream_expressionist.png) |

| #07 玛雅抄本树皮纸线描与石雕铭文块 | #15 示波器黄铜铭牌与金属副板荧光束 | #18 蒸汽波高对比双层霓虹灯牌与 VCR OSD |
| :---: | :---: | :---: |
| ![Maya Detail](./screenshots/details/detail_07_maya_codex.png) | ![Oscilloscope Detail](./screenshots/details/detail_15_oscilloscope_crt.png) | ![Vaporwave Detail](./screenshots/details/detail_18_vaporwave_neon.png) |

| #19 短视频热搜胶囊、零重叠弹幕与蓝底 P 头像 | #19 短视频 `@Nonstop` 账号与旋转黑胶中心标 | #20 代码美学 IDE 原生标题栏内联品牌标识 |
| :---: | :---: | :---: |
| ![ShortVideo Top](./screenshots/details/detail_19_shortvideo_top.png) | ![ShortVideo Bottom](./screenshots/details/detail_19_shortvideo_bottom.png) | ![Code Header](./screenshots/details/detail_20_code_ide_header.png) |

### 跨时代 `@Nonstop × ERC` 原生媒介印记特写

| 古埃及双股金绳王名圈 | 东汉刀凿崩边石刻拓印 | 盛唐古法铁笔朱文残印 | 1985 红白机真整数像素精灵 |
| :---: | :---: | :---: | :---: |
| ![Egypt Watermark](./screenshots/details/detail_watermark_egypt_cartouche.png) | ![Han Watermark](./screenshots/details/detail_watermark_han_rubbing.png) | ![Tang Watermark](./screenshots/details/detail_watermark_tang_seal.png) | ![8bit Watermark](./screenshots/details/detail_watermark_8bit_pixel.png) |

---

## 快速运行与离线渲染

本项目为 **零 NPM 依赖** 纯原生 ES Modules 工程：

### 1. 浏览器实时交互预览（支持进度拖拽、跳幕、全屏与 120BPM 实时合成音轨）

```bash
python3 -m http.server 8080
```

随后在浏览器打开 `http://127.0.0.1:8080` 即可实时播放。

### 2. 无头 WebGL 关键帧自检与完整 `1080×1920 @ 30fps` MP4 离线渲染

需本机安装 Google Chrome 与 `ffmpeg`（Node.js `>= 22` 原生内置 WebSocket CDP 驱动，无需 `npm install`）：

```bash
# 渲染 26 张 1080×1920 关键帧并校验零报错（输出至 out/keyframes/）
node build_video.mjs --verify

# 启动 6 个并行无头 WebGL Worker 渲染完整 2,740 帧并合成 48kHz 立体声 MP4
node build_video.mjs --render
```

---

## 工程架构

```text
.
├── index.html                  # 实时交互预览入口（含音轨控制、时代跳转与全屏舞台）
├── render.html                 # 无头 Chrome 确定性逐帧离线导出入口
├── build_video.mjs             # 零依赖 CDP 多进程并行渲染器 + 48kHz 音轨混音合成脚本
├── assets/panels/              # 时代辅助底纹、精抠大笑序列帧、原版笑声与品牌标识素材
├── public/                     # 本地完整中英文字体（NotoSerifSC / LXGWWenKai / NotoSansSC / JetBrainsMono）与 p5/p5.brush
├── screenshots/                # 26 张 1080×1920 时代关键帧 + 14 张 1:1 局部工艺特写 + 20 时代总览拼图
└── src/
    ├── main.js                 # 9:16 帧调度器 renderFilmFrame(t) 与超采样直出管线
    ├── audio/engine.js         # 120BPM 20 时代程序化 Web Audio 编曲与离线母带导出器
    ├── beat/                   # 137.0s 音乐时钟（1.50× 倍速 = 91.33s 成片）与竖屏摄影机轨迹
    ├── kit/                    # 离屏烘焙缓存、画框物理过渡、全画幅环境生命力与 22 时代水印引擎
    ├── rig/                    # 解析双骨 IK 骑行骨架与 WebGL 多媒介着色器奶蛙渲染器
    └── scenes/                 # Intro + s01..s20 二十个艺术史时代场景 + Outro 3×7 实时展墙与发布会
```

---

## 致谢与开源协议

- 原版引擎与创意致敬：[**`orbitoo/pelican-test`（《鹈鹕测试》by Elbert）**](https://github.com/orbitoo/pelican-test)
- 奶龙 `9:16` 竖屏重制、全媒介风格化与工程精修：**EricChan (`@Nonstop` × `ERC`)**
- 本仓库遵循 **[MIT License](./LICENSE)** 开源。
