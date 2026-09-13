# Demo Output

## CLI: `npx ziwei-chart 1993 5 21 12 male`

```json
{
  "success": true,
  "version": "2.10-horoscope-full",
  "solar": "1993-05-21",
  "lunar": "癸酉 丁巳 壬寅 丙午",
  "gender": "男",
  "ming": { "name": "命宫", "tg": "癸", "dz": "亥" },
  "wuxingJu": "水二局",
  "soul": "巨门",
  "bodyStar": "天同",
  "yearStem": "癸",
  "sihua": {
    "禄": { "star": "破军", "palace": "福德" },
    "权": { "star": "巨门", "palace": "疾厄" },
    "科": { "star": "太阴", "palace": "仆役" },
    "忌": { "star": "贪狼", "palace": "迁移" }
  },
  "laiyinPalace": "命宫",
  "daxianPalaceMap": [ ... 144 entries ... ],
  "liunianPalaceMap": [ ... 1440 entries ... ],
  "fourLayerDieGong": [ ... ],
  "flyingChains": [ ... ]
}
```

## With flow day: `npx ziwei-chart 1993 5 21 12 male --day 2026-08-30`

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
