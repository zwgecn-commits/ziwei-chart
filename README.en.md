# ziwei-chart — Ziwei Doushu (Purple Star Astrology) Chart Engine

A **Wenmo Tianji (文墨天机) golden-standard aligned** engine built on top of [iztro](https://github.com/SylarLong/iztro): the most complete **Chinese Purple Star Astrology (紫微斗数)** chart generator — twelve palaces, natal Four Transformations (四化), self-transformations (向心/离心), 10-year cycles (大限), yearly/monthly/daily/hourly charts, minor limits, childhood limits — the full spectrum in one output.

## Why this engine

Unlike off-the-shelf iztro, this engine hard-corrects against the industry gold standard (Wenmo Tianji app) where iztro deviates:

| Area | Correction |
|---|---|
| Heavenly Excellency/Assistant stars (天魁/天钺) | `WMT` alignment (e.g. Xin year) |
| Yearly/monthly palace switches | Explicit 1440-entry mapping tables |
| Flow-month Doujun method (流月斗君法) | Zheng-month by yearly branch reversed + birth month/positive hour (verified against iztro source & Wenmo) |
| Yearly Decans (岁前/将前十二神) | Replicated from iztro yearly module & cross-checked |
| Solar time correction | True solar time (longitude + equation of time, Spencer 1971) |
| Auspicious/inauspicious minor stars | Merged into `adjStars` with WMT name mapping |

**120 charts have been palace-by-palace reconciled against Wenmo Tianji** — 12 palace Ganzhi, major stars, minor stars, Decans, Longevity (长生), self-transformations, 10-year cycle Four Transformations — all field-identical. Reconciliation methodology and known naming differences (e.g. 岁破/大耗) are documented in [docs/reconciliation.md](docs/reconciliation.md).

## Install

```bash
npm i @zwge/ziwei-chart
```

## Quick start

```bash
# CLI
npx ziwei-chart 1990 7 14 12 male

# Flow day / hour chart (optional --day)
npx ziwei-chart 1990 7 14 12 male --day 2026-08-30
```

```js
// Node.js
const { execSync } = require("child_process");
const chart = JSON.parse(execSync(`node ${require.resolve("@zwge/ziwei-chart")} 1990 7 14 12 male`, { encoding: "utf8" }));
console.log(chart.ming, chart.sihua, chart.daxianPalaceMap.length);
```

## Output fields

`palaces` / `sihua` / `selfTransform` / `daxianSihua` / `daxianPalaceMap` (144 entries) / `liunianSihua` (with palaces) / `liunianPalaceMap` (1440 entries) / `liunianStars` / `liunianDecStar` / `fourLayerDieGong` (with flow-month Doujun + monthly stars) / `flyingChains` / `xianAgePalace` / `childhood` / `liuri` (with `--day`)

## Try it free

- Web calculator (no registration): <https://zwge.cn/ziwei>
- Free API (20 calls/day): `POST https://zwge.cn/api/chart`
- 🎯 **Crowdsourced reconciliation**: chart the same birth time in Wenmo Tianji, check 3 fields against us, earn credits for unlimited access — verified differences feed directly back into engine fixes

## Zero-telemetry promise (verifiable)

Pure algorithm, **zero network calls**: no postinstall scripts, no fetch/http in source. Self-verify:

```bash
grep -rnE "fetch\(|https?://|child_process" ziwei_chart.js && echo "network calls found!" || echo "✅ zero network"
npm view @zwge/ziwei-chart dist.tarball  # package ships only the files whitelist
```

## iztro ecosystem

This library is a **validation & enhancement layer** for iztro (not a competitor): it stays compatible with iztro output structure while providing Wenmo-golden-standard corrections (Xin-year Tiankui/Yue, flow-month Doujun method, yearly Decans, etc.). Cross-comparison methodology in docs/.

## License

MIT · algorithms derived from iztro (MIT) + original correction layer.
