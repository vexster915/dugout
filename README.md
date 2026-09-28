# Dugout

A baseball training app for your phone (a PWA — install it from Safari with **Share → Add to Home Screen**).
Everything is stored only on your phone, encrypted with your login, and it works offline. Nothing leaves the phone
unless you turn on the optional Claude features with your own Anthropic API key (Settings → Claude AI).

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
- **Pantry — what can I make?** Take photos of your pantry, fridge and freezer (or tap in what you have) and see the
  recipes you can make right now, quick plates (a protein + a carb + a fruit or veggie you have, with calories and
  protein), what you're one ingredient away from, and a shopping list. Photos are read on the phone: OCR
  (Tesseract) reads the food names on packages and an object detector (MediaPipe) spots common fruit and veggies —
  nothing is uploaded, and after the first scan it works offline. You check what it found before it's added.
- **Claude AI (optional)**: add your own Anthropic API key and Claude reads your kitchen photos instead (it recognizes
  nearly any food, even without a label, and about how much is left) and writes meal ideas from exactly what you have,
  sized to your goals and the kind of day. Those requests go straight from the phone to Anthropic's API; the key is
  stored encrypted and never put in backups
- Water tracker and "eating for baseball" tips

**Coach** (its own tab — optional, uses your own Anthropic API key)
- A chat with an AI coach (Claude) that knows your Dugout: profile and goals, today's plan and check-in, what you've
  eaten, recent workouts and best lifts, body weight, throwing and Pitch Smart rest, games, tests, swing analyses and
  what's in your kitchen. Ask what to eat before a game, how hard to go today, why a lift stalled, what weight to use,
  how to fix a swing problem…
- While it answers it can look things up on the phone — full workout history, food log, recovery, baseball data, your
  weekly plan and the app's library (exercise how-tos, recipes, food nutrition, drills) — and offer one-tap buttons:
  log a meal it suggested, add to your shopping list, switch today to Light / Moderate / Heavy, add drills to your
  plan, or open a screen. Nothing changes unless you tap.
- Built to be safe for a young athlete (no crash diets or risky supplements; pain → see a trainer or doctor; Pitch
  Smart limits). Answers stream in; the chat shows about what it has cost (usually a few cents a question). Chats are
  saved encrypted on the phone and erased with everything else.

**Baseball** (its own tab)
- 66 drills for every position — hitting, pitching, catcher, first base, second base / shortstop, third base,
  outfield, throwing and base running — split into drills you can do **alone** and drills **with a partner**,
  each with steps, coaching points, mistakes to avoid and a demo video. Star drills to build your plan.
- **Swing lab**: film a swing from the side, front or back and get a full analysis. Body tracking runs on the phone
  (MediaPipe Pose) — the video is never uploaded or saved. It finds the swing's phases (stance, load, stride, foot
  plant, swing start, contact, finish) and measures ~30 things: stride length and direction, weight at foot plant,
  hip-shoulder separation, early shoulder opening, the hips → shoulders → hands firing order, head movement, spine
  angle, front-leg block, back-side collapse, hands staying inside the ball, swing time, extension and balance. Each
  measurement knows how reliable it is from that camera angle. You get a score, ranked priorities with the numbers
  behind them, pictures of your key positions with your skeleton drawn on, charts, a stick-figure replay,
  comparisons with your last swing and drills picked for your priorities (they become your drill plan).
  Works with 30/60 fps video and slow motion (auto-detected).
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
| `swing.js` | Swing lab: runs the body tracking on your video and measures the swing |
| `pantry.js` | Pantry: the food catalog (names and brands), what each recipe needs, quick plates and the matching |
| `scan.js` | Pantry: reads your kitchen photos — on the phone, or with Claude if you added an API key |
| `ai.js` | The connection to Claude (Anthropic's API) with your own key — shared by the Pantry and the Coach |
| `coach.js` | Coach: what Claude is told, the look-ups and buttons it can use, and the conversation |
| `vendor/mediapipe-1.0.1/` | Google MediaPipe (Apache 2.0): the Swing lab's body-tracking model and the Pantry's fruit and veggie spotter — downloaded the first time you use them |
| `vendor/tesseract-7.0.0/` | Tesseract.js OCR (Apache 2.0) that reads package labels for the Pantry — downloaded on the first scan |
| `vendor/anthropic-sdk-0.128.0/` | Anthropic's TypeScript SDK (MIT), bundled — only loaded if you use the optional Claude features (Coach, Pantry) |
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
