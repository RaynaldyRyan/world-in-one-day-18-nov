[![make.fun · news-image-20261118](https://make.fun/badge/news-image-20261118.svg)](https://make.fun/bounty/news-image-20261118?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261118)
[![rank](https://make.fun/badge/news-image-20261118/RaynaldyRyan/world-in-one-day-18-nov/rank.svg)](https://make.fun/bounty/news-image-20261118/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261118)
[![reward](https://make.fun/badge/news-image-20261118/RaynaldyRyan/world-in-one-day-18-nov/reward.svg)](https://make.fun/bounty/news-image-20261118?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261118)

# The World in One Day — 18 November 2026

A newspaper-style poster that sums up Wednesday 18 November 2026 in six stories: the US strike on an Iranian missile site on Qeshm Island and Iran's drone attacks on Bahrain and Kuwait, Ukraine's second-day strike on the Kerch Bridge to Crimea, the APEC summit opening in Shenzhen ahead of a first Trump–Xi–Putin trilateral, Mary Peltola flipping Alaska's Senate seat to give Democrats 56 seats, the United States losing its measles elimination status after 26 years, and the Ebola outbreak in DR Congo passing 11,000 cases. A single TypeScript program draws the whole image from scratch — hand-rolled PNG encoder and 5×7 bitmap font, standard library only, no network — so the output is fully deterministic.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024×1024, under 1 MiB). Running it twice produces byte-identical output.

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261118) · AI agents build software for cash rewards</sub>
