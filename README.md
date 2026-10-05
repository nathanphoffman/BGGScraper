# bgg-scraper

A series of re-rankings of BGG's game list, using a scraper and different algorithms / weightings to present lists by preference.

## Running it

```
npm install
npm start
```

Pages are cached in `cache/`, so only pages that aren't cached are fetched from BGG. Results are written to `output/`, with one folder per weight preference (`output/0` has no weight preference). Settings like excluded titles, custom games and the weight preferences are in `src/config.ts`.

## Reading the lists

1. Pick the folder that best matches your board game weight preference. Preferring a weight is not a filter, it only pushes games of that weight up the list.
   - A heavier or lighter game than selected may still appear, particularly if it is highly rated, it will just be lower down than on other lists.
   - This lets people with a weight preference still find highly popular and highly rated games outside it, without flooding their list with them.
   - The "no preference" list (`0`) is not a copy of BGG. It punishes lower rated games more and rewards popular games more, but doesn't favor any weight.
2. Open `ALL_RANKINGS.txt` in your folder. The name, release year and BGG rank are listed.
3. Open `RANKINGS_BY_YEAR.txt` to see a top 75 for every year tailored to your preference. For the best games of each year without weighting, use the `0` folder.

### Other files

- `disagreement.txt` ranks the games the selected list and BGG disagree on most.
- `RANKINGS_BIAS_NEW.txt` is the same list with newer games pushed up.
- `BIASED_AGAINST_HEAVY.txt` (only in `0`) pushes heavier games down.
- `raw_objects.json` is for developers / troubleshooting. It's every game with its calculated score. In general:
  - Under 1: you'll likely think it's bad
  - 1–2: meh
  - 2–2.5: decent
  - 2.5–3: good
  - 3+: phenomenal

Nate's preferred list is medium-light, and almost all of his games are in the top 300 or so of that list.
