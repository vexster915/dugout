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

**Track**
- Lift charts, personal records, training calendar and badges
- Body weight trend and recovery trends
- Game log with season AVG / OBP / SLG / OPS and ERA / WHIP / K/9
- Baseball tests: 60-yard dash, exit velocity, throwing velocity, pop time and more
- Arm care: throwing log, live pitch counter and Pitch Smart rest days by age, sprint stopwatch
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
| `db.js` | Encrypted on-phone storage |
| `sw.js` | Offline support (bump `CACHE` when files change) |
| `styles.css` | The look of the app |

Nutrition numbers and training guidance are general information for healthy athletes — check with a doctor,
athletic trainer or sports dietitian for anything specific to you.
