# Dugout

A baseball training app for your phone (a PWA — install it from Safari with **Share → Add to Home Screen**).
Everything is stored only on your phone, encrypted with your login, and it works offline.

## What's inside

**Train**
- Weekly gym and home (no equipment) plans — **off-season** build, **pre-season** sharpen and **in-season** maintain programs
- **Light / Moderate / Heavy** switch on the Today screen: pick how hard to go each day. Moderate trims the sets and
  starts weights at about 90% of last time; Light swaps in an easy recovery workout (mobility, arm care, core — every
  exercise has a form video) that you can edit in Plan → Light workout
- Workout mode with set logging, rest timer, form videos and step-by-step how-tos for 113 exercises, plus a searchable exercise library
- Next-weight suggestions, warm-up sets, plate calculator, exercise swaps, effort rating and notes
- Daily readiness check-in (sleep, energy, soreness)

**Eat**
- Food log with a built-in list of 169 common foods, favorites, servings, calories, protein, carbs and fat
- Goal calculator for calories, protein, carbs, fat and water
- Daily meal plan sized to your goals (training, rest and game days) and 45 athlete recipes
- Water tracker and "eating for baseball" tips

**Baseball** (its own tab)
- 66 drills for every position — hitting, pitching, catcher, first base, second base / shortstop, third base,
  outfield, throwing and base running — split into drills you can do **alone** and drills **with a partner**,
  each with steps, coaching points, mistakes to avoid and a demo video. Star drills to build your plan.
- Game log with season AVG / OBP / SLG / OPS and ERA / WHIP / K/9
- Baseball tests: 60-yard dash, exit velocity, throwing velocity, pop time and more
- Arm care: throwing log, live pitch counter and Pitch Smart rest days by age, sprint stopwatch, practice log

**Track**
- Lift charts, personal records, training calendar and badges
- Body weight trend and recovery trends
- Encrypted backups, plus CSV spreadsheets for your coach
- Dark or light theme (light is easier to read outdoors)

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page that loads everything |
| `app.js` | All the screens and features |
| `plan.js` | Starting workout programs, the Light workout and tutorial video links |
| `exercises.js` | How-to details for every exercise |
| `meals.js` | Recipes and eating tips |
| `foods.js` | Built-in food list |
| `drills.js` | Baseball drills for every position and the swing problems they fix |
| `db.js` | Encrypted on-phone storage |
| `sw.js` | Offline support and updates: loads the newest version whenever there's internet |
| `styles.css` | The look of the app |

## Updates

Every time the app opens with internet it loads the newest files straight from GitHub, so it always jumps to the
latest version — it never shows an older one or steps through updates one at a time. Offline, it uses the copy
saved on the phone. If a new version comes out while the app is open, it switches over by itself on the sign-in
screen, or shows a **Reload** button (and switches the next time it locks) if you're in the middle of something.

**Releasing a new version:** set the same version number in all three places —
`APP_VERSION` in `app.js`, `VERSION` in `sw.js`, and every `?v=` in `index.html`.

Nutrition numbers and training guidance are general information for healthy athletes — check with a doctor,
athletic trainer or sports dietitian for anything specific to you.
