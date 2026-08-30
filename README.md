# 紫微斗数排盘引擎 · ziwei-chart

基于 iztro 之上的**文墨天机金标准对齐引擎**：十二宫安星、生年四化、自化（向心/离心）、大限（12限四化+宫位映射）、流年（四化+落宫+流耀+岁前将前）、流月（斗君法+月耀）、流日/流时、小限、童限——全谱系输出。

## 安装

```bash
npm i @zwge/ziwei-chart
```

## 快速开始

```bash
# 命令行
npx ziwei-chart 1990 7 14 12 male

# 流日/流时盘（可选 --day）
npx ziwei-chart 1990 7 14 12 male --day 2026-08-30
```

```js
// Node.js
const { execSync } = require("child_process");
const chart = JSON.parse(execSync(`node ${require.resolve("@zwge/ziwei-chart")} 1990 7 14 12 male`, { encoding: "utf8" }));
console.log(chart.ming, chart.sihua, chart.daxianPalaceMap.length);
```

## 输出字段

`palaces` / `sihua` / `selfTransform` / `daxianSihua` / `daxianPalaceMap`（144条）/ `liunianSihua`（含落宫）/ `liunianPalaceMap`（1440条）/ `liunianStars` / `liunianDecStar` / `fourLayerDieGong`（含流月斗君+月耀）/ `flyingChains` / `xianAgePalace` / `childhood` / `liuri`（--day）

## 免费体验

- 网页排盘（免注册）：<https://zwge.cn/ziwei>
- 免费 API（20 次/天）：`POST https://zwge.cn/api/chart`
- 🎯 **对账众包**：用文墨天机排同生辰的盘，帮我们对 3 个字段，赚积分换不限流额度——差异经复核确认，直接反哺引擎修正

## 精度说明

120 盘与文墨天机**逐宫对账通过**（十二宫干支/主星/辅星/小星/神煞/长生/自化/12限四化全字段），对账方法与边界见 [docs/reconciliation.md](docs/reconciliation.md)。四化流派口径差异（如岁破/大耗命名）以文档标注为准。

## 零遥测承诺（可查证）

本库**纯算法、零网络调用**：无 postinstall 脚本、源码无任何 fetch/http 请求。自证命令：

```bash
grep -rnE "fetch\(|https?://|child_process" ziwei_chart.js && echo "发现网络调用！" || echo "✅ 零网络调用"
npm view @zwge/ziwei-chart dist.tarball  # 包内容仅 files 白名单
```

## iztro 生态

本库定位为 iztro 的**校验增强层**（非竞品）：兼容 iztro 输出结构，提供文墨金标准口径修正（辛年天魁钺、流月斗君法、岁前神煞等）。交叉对比方法见 docs/。

## License

MIT · 算法源自 iztro（MIT）衍生，修正层为原创。
