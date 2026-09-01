# Demo Output

## CLI: `npx ziwei-chart 1990 7 14 12 male`

```json
{
  "success": true,
  "version": "2.10-horoscope-full",
  "solar": "1990-07-14",
  "lunar": "庚午 癸未 庚辰 壬午",
  "gender": "男",
  "ming": { "name": "命宫", "tg": "戊", "dz": "子" },
  "wuxingJu": "火六局",
  "soul": "贪狼",
  "bodyStar": "火星",
  "yearStem": "庚",
  "sihua": {
    "禄": { "star": "太阳", "palace": "官禄" },
    "权": { "star": "武曲", "palace": "田宅" },
    "科": { "star": "太阴", "palace": "夫妻" },
    "忌": { "star": "天同", "palace": "福德" }
  },
  "laiyinPalace": "官禄",
  "daxianPalaceMap": [ ... 144 entries ... ],
  "liunianPalaceMap": [ ... 1440 entries ... ],
  "fourLayerDieGong": [ ... ],
  "flyingChains": [ ... ]
}
```

## With flow day: `npx ziwei-chart 1990 7 14 12 male --day 2026-08-30`

Adds `liuri` (flow day chart) + `dailHour` (flow hour) sections — full daily/hourly granularity.

## Field summary

| Field | Description |
|---|---|
| `palaces` | 12 palaces: Ganzhi, major/minor stars, Decans, Longevity, self-transformations |
| `sihua` | Natal Four Transformations with palaces |
| `selfTransform` | Palace-by-palace 向心 (centripetal) / 离心 (centrifugal) self-transformations |
| `daxianSihua` + `daxianPalaceMap` | 10-year cycle transformations + 144-entry palace mappings (explicit) |
| `liunianSihua` + `liunianPalaceMap` | Yearly transformations w/ palaces + 1440-entry mappings |
| `liunianStars` / `liunianDecStar` | Yearly flow stars + Yearly Decans (岁前/将前十二神) |
| `fourLayerDieGong` | 4-layer palace overlapping (natal × cycle × year × month) + flow-month Doujun + monthly stars |
| `flyingChains` | Flying star chains (禄转忌 / 忌转忌) |
| `xianAgePalace` / `childhood` | Minor limit & childhood limit (童限) palaces |
| `liuri` | Flow day/hour charts (with `--day`) |

> Full 120-chart reconciliation against Wenmo Tianji across all fields — see [reconciliation.md](reconciliation.md).
