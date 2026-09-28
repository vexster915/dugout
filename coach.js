/* coach.js — the Coach tab: a chat with Claude that knows your Dugout — your plan, workouts, food, check-ins, baseball
   logs and goals — and can look things up in the app while it answers. It uses your own Anthropic API key
   (Settings → Claude AI; see ai.js). The app side (app.js, "COACH") builds what Claude is told about you and runs the
   tools below on your phone; this file is the conversation itself.

   Each request: the rules and the app guide (the same every time, so Anthropic can cache them — cheaper and faster),
   the chat so far, your new message, and right after it a fresh summary of your data. */

const COACH = (() => {
  const RULES = `You are Coach, the AI coach built into Dugout — a training app for a young baseball player. You're talking with the athlete who uses the app, usually on a phone, often right before or after training. (You're Claude, made by Anthropic, if anyone asks.)

What you know
- The <dugout_app> guide below describes the app: every screen, the training programs, exercise library, recipes, drills, tests and the app's own tips.
- With each message you get a fresh <athlete> summary from the app: their profile, goals, today's plan and check-in, what they've eaten today, recent training, body weight, baseball logs and what's in their kitchen. Treat it as current.
- Tools look up the details: full workout history, food logs, body weight and recovery, baseball data, their weekly plan, and the app's library (exercise how-tos, recipes, food nutrition, drills, swing problems). Use them whenever an answer depends on specifics you don't have yet — look numbers up instead of guessing. Skip them for general questions you can answer directly.

How to coach
- Make it personal: use their real numbers — goals, recent lifts, what they ate today, readiness, schedule, age. When it matters, say what you looked at ("Your last three squat sessions were 185 × 5…").
- Be specific and practical: exact foods and amounts, exact sets × reps and weights in their units, exact times ("eat this around 1:30 for your 3:00 workout").
- Be honest: if the app has no data on something, say so and suggest logging it. Never invent history, stats or app features.
- Go in depth when it helps: explain the why briefly, the way a good coach would, and go deeper when they ask.
- Point to the app: tell them where to do things in Dugout, e.g. "Plan → Light workout" or "Diet → Pantry".

Buttons
- When it saves them taps, offer an action with an offer_* tool: logging a meal or snack you suggested, adding items to their shopping list, switching today's workout to Light, Moderate or Heavy, adding drills to their drill plan, or opening a screen. They see a button and decide; nothing changes unless they tap it. Offer only what's clearly useful (a few at most) and mention it ("tap Log it below").

Safety — they're a young athlete
- Food is fuel for training and growing. No crash diets, fasting, weight cutting, skipped meals or very low-carb plans. If they seem worried about food or their body, be kind, focus on health and performance, and suggest talking with a parent, doctor or sports dietitian.
- Supplements: food first. Protein powder is fine as food. If they're under 18, say doctors generally advise against creatine, pre-workouts, fat burners and energy drinks and to decide with a parent and doctor. Never suggest steroids, SARMs, prohormones or other drugs.
- You don't diagnose. For sharp or lasting pain, swelling, numbness, or elbow or shoulder pain when throwing, tell them to stop that activity and see an athletic trainer, physical therapist or doctor. Normal muscle soreness is fine.
- Arm care: follow the Pitch Smart pitch counts and rest days for their age. Never suggest pitching through arm pain or on a required rest day.
- Emergencies (chest pain, fainting, a head injury, signs of heat illness): tell them to get an adult and call emergency services now.

Style
- Write for a phone: lead with the answer, then short paragraphs or bullet lists. Bold the key numbers. Use a table only when it clearly helps, with 3 columns at most.
- Keep most answers under about 200 words; go longer for a full plan or when they ask for depth.
- Friendly, direct and encouraging, like a good high-school strength coach. No filler, no lectures, no repeating their question back.
- Questions outside training, baseball, food and health: answer briefly and helpfully.`;

  const str = d => ({ type: 'string', description: d });
  const int = d => ({ type: 'integer', description: d });
  const tool = (name, description, properties, required = []) =>
    ({ name, description, eager_input_streaming: true, input_schema: { type: 'object', properties, required } });
  const MEAL_KEYS = ['breakfast', 'lunch', 'dinner', 'snack', 'pre', 'post'];
  const SCREENS = ['today', 'plan', 'light_workout', 'drills', 'swing_lab', 'games_and_arm', 'food_log', 'meal_plan', 'pantry', 'progress_lifts', 'progress_body', 'goal_calculator'];

  // Deterministic order (it's part of what gets cached).
  const TOOLS = [
    tool('get_training_history', 'The athlete\'s finished workouts: date, which workout, gym or home, Light/Moderate/Heavy, how long, every exercise with the weight × reps (or time) of each completed set, effort rating and notes — plus their best set for each exercise in that window. Call this for questions about lifting progress, plateaus, what weight to use next, how much they\'ve trained, or any past workout.',
      { days: int('How many days back (default 28, up to 365).'), exercise: str('Only this exercise — a name or part of one, like "squat". Leave out for everything.') }),
    tool('get_food_log', 'What the athlete logged eating: each day\'s calories, protein, carbs and fat against their goals, every entry with its meal and numbers, and water. Call this for questions about their eating, protein, calories, habits or what to change.',
      { days: int('How many days back, today included (default 7, up to 60).') }),
    tool('get_body_and_recovery', 'Body weight entries and daily check-ins (hours of sleep, energy 1–5, soreness 1–5, readiness 0–100). Call this for questions about weight gain or loss, recovery, sleep, fatigue or soreness.',
      { days: int('How many days back (default 30, up to 365).') }),
    tool('get_baseball_data', 'The athlete\'s baseball logs: games and season stats, test results (60-yard dash, exit velocity, throwing velocity…), throwing and pitching sessions with Pitch Smart rest status, practice reps, their drill plan, and Swing lab analyses (score, problems found, measurements with targets). Call this for questions about hitting, pitching, arm care, speed, stats or their swing.',
      { section: { type: 'string', enum: ['all', 'games', 'tests', 'arm', 'practice', 'swing'], description: 'Which part (default all).' }, days: int('How many days back for games, throwing and practice (default 60, up to 365).') }),
    tool('get_plan', 'The athlete\'s weekly workout plan in Dugout as they have it now (they can edit it): each day\'s workout with every exercise, sets × reps, rest and coaching cues, plus their Light workout. Call this when they ask about their program or a specific day, or want a workout explained or changed.',
      { mode: { type: 'string', enum: ['gym', 'home'], description: 'Which plan (default: the one they\'re using).' } }),
    tool('look_up', 'Search Dugout\'s built-in library. "exercise": how-to steps, muscles, why it matters, mistakes, easier/harder versions and swaps. "recipe": ingredients, steps and nutrition per serving. "food": nutrition per serving from the app\'s food list and their saved favorites. "drill": baseball drill steps, coaching points and what it fixes. "swing_problem": what a Swing lab problem means and how to fix it. Call this before explaining a specific exercise, recipe or drill, or when you need exact nutrition numbers.',
      { type: { type: 'string', enum: ['exercise', 'recipe', 'food', 'drill', 'swing_problem'] }, query: str('What to find, e.g. "romanian deadlift", "overnight oats", "greek yogurt", "tee work", "casting".') }, ['type', 'query']),
    tool('offer_drills', 'Show a button that adds drills to the athlete\'s drill plan (Baseball → Drills). Use drill ids from the drill list in the app guide.',
      { drill_ids: { type: 'array', items: { type: 'string' }, description: 'Drill ids, e.g. ["tee-zones"].' } }, ['drill_ids']),
    tool('offer_food_log', 'Show a "Log it" button that adds a meal or snack you suggested to today\'s food log. Use when you recommend something specific to eat now or next. Give realistic numbers for one serving.',
      { name: str('Short name, e.g. "Greek yogurt + granola + banana".'), meal: { type: 'string', enum: MEAL_KEYS, description: 'Which meal (pre = before training, post = after).' },
        servings: { type: 'number', description: 'Servings (default 1).' }, cal: int('Calories per serving.'), pro: { type: 'number', description: 'Protein grams per serving.' },
        carb: { type: 'number', description: 'Carb grams per serving.' }, fat: { type: 'number', description: 'Fat grams per serving.' } }, ['name', 'meal', 'cal', 'pro', 'carb', 'fat']),
    tool('offer_intensity', 'Show a button that switches today\'s workout to Light, Moderate or Heavy (the daily switch on the Today screen). Use when you recommend changing how hard they go today.',
      { level: { type: 'string', enum: ['light', 'moderate', 'heavy'] } }, ['level']),
    tool('offer_screen', 'Show a button that opens a screen in Dugout. Use when you tell them to go do something in the app.',
      { screen: { type: 'string', enum: SCREENS } }, ['screen']),
    tool('offer_shopping_list', 'Show a button that adds items to the athlete\'s shopping list (Diet → Pantry). Use when you suggest buying things.',
      { items: { type: 'array', items: { type: 'string' }, description: 'Items to buy, e.g. ["Greek yogurt", "Bananas"].' } }, ['items'])
  ];
  const TOOL_NAMES = TOOLS.map(t => t.name);

  // The newest context goes in as a "system" message right after the question, so the cached chat before it stays
  // valid. If the API ever refuses that, it's folded into the question instead (and remembered for this session).
  let inline = false;
  const forApi = msgs => {
    if (!inline) return msgs;
    const out = [];
    for (const m of msgs) {
      if (m.role !== 'system') { out.push(m); continue; }
      const prev = out[out.length - 1];
      if (prev && prev.role === 'user') out[out.length - 1] = { ...prev, content: [...(Array.isArray(prev.content) ? prev.content : [{ type: 'text', text: prev.content }]), { type: 'text', text: m.content }] };
    }
    return out;
  };

  const MAX_ROUNDS = 6;          // look-ups per reply

  /* One reply. history: the API messages of earlier turns. question: what they typed. context: the <athlete> text.
     runTool(name, input) → { content, error } runs a tool on the phone. onText(textSoFar), onTool(name) update the
     screen. Returns { turn (API messages to keep), text, stop, usage }. */
  async function reply({ key, knowledge, history, question, context, runTool, onText = () => {}, onTool = () => {}, signal }) {
    const client = await AI.client(key);
    const turn = [{ role: 'user', content: [{ type: 'text', text: question }] }, { role: 'system', content: context }];
    const usage = { input: 0, output: 0, write: 0, read: 0 };
    let text = '', last = '', parseRetries = 0;
    for (let round = 0; ; round++) {
      let msg;
      const before = text;                                        // (a retried request starts from here again)
      try {
        const stream = client.beta.messages.stream({
          model: AI.MODEL, max_tokens: 16000, thinking: { type: 'adaptive' }, output_config: { effort: 'medium' },
          betas: AI.BETAS, fallbacks: 'default',
          cache_control: { type: 'ephemeral' },                     // caches the chat so far, for the next message
          system: [{ type: 'text', text: RULES }, { type: 'text', text: knowledge, cache_control: { type: 'ephemeral' } }],
          tools: TOOLS,
          ...(round >= MAX_ROUNDS ? { tool_choice: { type: 'none' } } : {}),
          messages: forApi([...history, ...turn])
        }, { signal });
        stream.on('streamEvent', ev => {
          if (ev.type !== 'content_block_start') return;
          const t = ev.content_block.type;
          // A new paragraph for each new text block — except when another model is carrying on mid-sentence.
          if (t === 'text' && text && last !== 'fallback' && !/\n\n$/.test(text)) { text += '\n\n'; onText(text); }
          if (t === 'tool_use') onTool(ev.content_block.name);
          last = t;
        });
        stream.on('text', delta => { text += delta; onText(text); });
        msg = await stream.finalMessage();
      } catch (e) {
        const err = AI.error(e);
        const retry = (err.code === 'ai' && !inline && /role/i.test(err.detail || '') && /system/i.test(err.detail || '') && (inline = true))
          || (AI.isParseError(e) && parseRetries++ < 1);             // a tool call that wasn't valid JSON: ask again
        if (!retry) throw err;
        text = before; onText(text); round--;
        continue;
      }
      const u = msg.usage || {};
      usage.input += u.input_tokens || 0; usage.output += u.output_tokens || 0;
      usage.write += u.cache_creation_input_tokens || 0; usage.read += u.cache_read_input_tokens || 0;
      const content = AI.echo(msg.content), calls = content.filter(b => b.type === 'tool_use');
      if (msg.stop_reason === 'refusal') return { turn: null, text, stop: 'refusal', usage };
      if (msg.stop_reason === 'tool_use' && calls.length) {
        turn.push({ role: 'assistant', content });
        const results = [];
        for (const b of calls) {
          const r = TOOL_NAMES.includes(b.name) ? await runTool(b.name, b.input || {}) : { content: `There is no tool called ${b.name}.`, error: true };
          results.push({ type: 'tool_result', tool_use_id: b.id, content: String(r.content), ...(r.error ? { is_error: true } : {}) });
        }
        turn.push({ role: 'user', content: results });
        continue;
      }
      // Done (or cut off). A cut-off tool call can't be run, so it's left out of what's kept — and a reply with no
      // words at all isn't kept (the chat carries on without it).
      const keep = msg.stop_reason === 'tool_use' || msg.stop_reason === 'max_tokens' ? content.filter(b => b.type !== 'tool_use') : content;
      if (!keep.some(b => b.type === 'text' && b.text.trim())) return { turn: null, text, stop: msg.stop_reason, usage };
      turn.push({ role: 'assistant', content: keep });
      return { turn, text, stop: msg.stop_reason, usage };
    }
  }

  // About what a reply cost, in dollars (Claude Opus 5 prices: $5 per million input tokens, $25 per million output;
  // cache writes 1.25×, cache reads 0.1×).
  const cost = u => (u.input * 5 + u.write * 6.25 + u.read * 0.5 + u.output * 25) / 1e6;

  return { reply, cost, TOOLS, RULES, SCREENS, MEAL_KEYS };
})();
