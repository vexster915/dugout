/* plan.js — the STARTING weekly plan.
   You can change everything inside the app (Plan tab), so you never need to edit
   this file. It is only used the first time the app opens, or when you tap
   "Reset plan" in Settings.

   Each exercise:  ex(name, sets, reps, rest in seconds, what to log, form cues)
   What to log:    "weight" = weight + reps    "reps" = reps only
                   "time"   = seconds          "check" = just tick it off

   Video links start as YouTube SEARCH links (placeholders). In the app, tap the
   play button on an exercise, pick a video, and paste its link to swap it in. */

function ytSearch(q) {
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
}

function ex(name, sets, reps, rest, track, cues, search) {
  return { name, sets, reps, rest, track, cues, video: ytSearch(search || name + " proper form") };
}

// Shared pieces that appear on several days
const WARMUP = (min) => ex("Dynamic warm-up", 1, min + " min", 0, "check",
  "Easy jog or bike 3 min, then leg swings, walking lunges with a twist, A-skips, high knees and lateral shuffles.",
  "baseball dynamic warm up");
const COOLDOWN = ex("Cool-down walk + stretch", 1, "5 min", 0, "check",
  "Easy walk, then stretch hips, hamstrings and calves.", "cool down stretch after sprints");
const REST_DAY = {
  title: "Rest Day",
  type: "rest",
  focus: "Recovery is when muscle is actually built. Sleep 8+ hours, hit your protein goal and drink plenty of water. Light movement below is optional.",
  exercises: [
    ex("Easy walk (optional)", 1, "20-30 min", 0, "check", "Easy pace. Gets blood flowing without adding fatigue.", "active recovery walk"),
    ex("Light stretching (optional)", 1, "10 min", 0, "check", "Hips, hamstrings and shoulders. Nothing intense.", "10 minute full body stretch athletes")
  ]
};

const DEFAULT_PLAN = {
  /* ============================ GYM (Lifetime) ============================ */
  gym: [
    { // Monday
      title: "Legs & Core — Power",
      type: "strength",
      focus: "Explosive lower body and heavy leg press. Jumps first while you're fresh.",
      exercises: [
        WARMUP(8),
        ex("Box jumps", 4, "4", 90, "reps", "Swing your arms, explode up, land soft and quiet in an athletic stance. Step down — don't jump down."),
        ex("Leg press", 5, "5", 180, "weight", "Feet shoulder-width, middle of the platform. Lower until knees reach about 90° without your lower back peeling off the pad. Drive through the whole foot; don't slam into lockout."),
        ex("Trap bar deadlift", 4, "5", 150, "weight", "Hips back, chest tall, lats tight. Push the floor away and finish tall with glutes squeezed."),
        ex("Walking lunges (dumbbells)", 3, "10/leg", 90, "weight", "Long step, back knee lightly touches the floor, torso tall. Drive through the front heel."),
        ex("Lateral lunges", 3, "8/side", 60, "weight", "Hold a dumbbell at your chest. Sit back into one hip with the other leg straight, toes forward. Builds side-to-side range for fielding."),
        ex("Seated leg curl", 3, "10", 60, "weight", "Pull heels down and back, squeeze 1 second, take 3 seconds on the way up."),
        ex("Standing calf raises", 3, "15", 45, "weight", "Full stretch at the bottom, pause 1 second at the top."),
        ex("Pallof press", 3, "10/side", 45, "weight", "Stand sideways to the cable, press straight out and hold 2 seconds. Don't let your torso twist."),
        ex("Hanging knee raises", 3, "12", 45, "reps", "No swinging. Curl your hips up toward your ribs, lower slowly.")
      ]
    },
    { // Tuesday
      title: "Chest & Back — Upper Strength",
      type: "strength",
      focus: "Upper-body strength plus rotational power for bat speed and arm strength.",
      exercises: [
        ex("Warm-up + band arm care", 1, "8 min", 0, "check", "Arm circles, band pull-aparts, band external rotations and scap push-ups. Get the shoulders warm.", "baseball arm care band warm up"),
        ex("Med ball rotational scoop toss", 4, "5/side", 60, "reps", "Load your back hip like your swing, then rotate hard and throw into the wall. Hips lead, arms follow."),
        ex("Dumbbell bench press", 4, "6-8", 120, "weight", "Shoulder blades pinched, elbows about 45° from your body. Lower to chest level, press up and slightly in."),
        ex("Pull-ups", 4, "6-8", 120, "weight", "Dead hang, pull your chest to the bar, elbows drive down to your ribs. Log added weight (leave blank for bodyweight)."),
        ex("Chest-supported row", 4, "8-10", 90, "weight", "Chest on the pad, pull elbows to your back pockets, squeeze shoulder blades together, lower slowly."),
        ex("Incline dumbbell press", 3, "10", 90, "weight", "Bench at about 30°. Take 2 seconds down, press without flaring your elbows."),
        ex("Single-arm dumbbell row", 3, "10/arm", 60, "weight", "Flat back, pull the dumbbell to your hip, no twisting."),
        ex("Plyo push-ups", 3, "6", 60, "reps", "Push hard enough that your hands leave the floor. Land soft with bent elbows."),
        ex("Cable woodchop (high to low)", 3, "10/side", 45, "weight", "Arms long, rotate through your hips and upper back, pivot the back foot like your swing."),
        ex("Face pulls", 3, "15", 45, "weight", "Rope to your forehead, elbows high, pull the rope apart and squeeze. Keeps throwing shoulders healthy.")
      ]
    },
    { // Wednesday
      title: "Agility & Speed",
      type: "agility",
      focus: "Quick feet, first-step speed and change of direction. Rest fully between reps — speed work is about quality, not getting tired. Use the turf area.",
      exercises: [
        WARMUP(10),
        ex("A-skips & B-skips", 3, "20 yd", 45, "check", "Tall posture, drive the knee up, toes up, strike the ground under your hips. Quick arms."),
        ex("Agility ladder drills", 6, "1 pattern", 30, "check", "In-in-out-out, lateral shuffle, Ickey shuffle. Light on the balls of your feet, eyes up."),
        ex("Pro agility shuttle (5-10-5)", 6, "1", 75, "time", "Stay low on each turn, touch the line, push off the outside leg. Log your time in seconds."),
        ex("Sled push", 4, "20 yd", 90, "weight", "Low body angle, arms locked, drive your knees and push through the balls of your feet."),
        ex("Lateral skater bounds", 4, "6/side", 60, "reps", "Push off the outside leg and stick each landing for a second with the knee over the toes."),
        ex("Base-stealing starts (crossover)", 6, "15 yd", 60, "time", "From your lead-off, crossover step and drive low. The first 3 steps are everything. Log a time if someone can clock you."),
        ex("Drop-step sprints", 6, "20 yd", 45, "check", "Open the hips, turn and run like you're chasing a fly ball over your shoulder. Don't backpedal."),
        ex("Copenhagen plank", 3, "20 sec/side", 45, "time", "Top leg on a bench, lift your hips into a straight line and hold. Builds groin strength for lateral moves."),
        COOLDOWN
      ]
    },
    { // Thursday
      title: "Stretching & Mobility",
      type: "mobility",
      focus: "Active recovery. Move slowly and breathe deep. You should feel a stretch — never pain.",
      exercises: [
        ex("Foam roll", 1, "8 min", 0, "check", "Quads, outer thighs, glutes, lats and upper back. About 45 seconds per area; pause on tight spots.", "foam rolling routine athletes"),
        ex("90/90 hip switches", 2, "10", 30, "check", "Sit tall and rotate both knees side to side without using your hands."),
        ex("World's greatest stretch", 2, "5/side", 30, "check", "Lunge, drop your elbow to the inside of the front foot, then rotate and reach to the sky."),
        ex("Couch stretch (hip flexors)", 2, "60 sec/side", 15, "check", "Back knee against a bench or wall, squeeze that glute, stay tall."),
        ex("Thoracic open books", 2, "10/side", 15, "check", "Lie on your side, knees stacked, open the top arm across like a book. Rotation for your swing and throw."),
        ex("Cross-body shoulder stretch", 2, "30 sec/side", 15, "check", "Pull the arm across your chest below the chin. Gentle — feel it in the back of the shoulder."),
        ex("Lat stretch on rack", 2, "30 sec/side", 15, "check", "Hold a post, sit your hips back and let the lat stretch. Breathe into it."),
        ex("Band hamstring stretch", 2, "45 sec/side", 15, "check", "On your back, band around your foot, raise the straight leg until you feel a stretch."),
        ex("Pigeon stretch", 2, "45 sec/side", 15, "check", "Front shin across, back leg long, hips square. Lean forward for more."),
        ex("Wrist & forearm stretch", 2, "30 sec each", 15, "check", "Palm up, then palm down, gently pull the fingers back. Big for hitters and throwers."),
        ex("Cat-cow + deep breathing", 1, "3 min", 0, "check", "Slow spine waves, then child's pose with long exhales.")
      ]
    },
    { // Friday
      title: "Glutes, Hamstrings & Core",
      type: "strength",
      focus: "Posterior-chain strength, single-leg power and rotational core. Adds sprint speed and protects your hamstrings.",
      exercises: [
        WARMUP(8),
        ex("Kettlebell swings", 4, "10", 60, "weight", "Hinge, don't squat: hips back, then snap them forward so the bell floats to chest height. Arms are just ropes."),
        ex("Romanian deadlift", 4, "8", 120, "weight", "Soft knees, push hips back, bar slides down your thighs to mid-shin with a flat back. Drive your hips through to stand."),
        ex("Single-leg leg press", 3, "10/leg", 90, "weight", "Same cues as leg press, one leg at a time. Evens out left/right differences."),
        ex("Hip thrust", 4, "8-10", 90, "weight", "Upper back on the bench, chin tucked, drive through your heels and squeeze glutes 1 second at the top. Ribs down."),
        ex("Dumbbell step-ups", 3, "8/leg", 75, "weight", "Box about knee height. Push through the top foot only — no bouncing off the back leg."),
        ex("Nordic hamstring curls", 3, "5", 90, "reps", "Feet anchored, lower yourself as slowly as you can, catch with your hands, push back up. Top hamstring-injury protector."),
        ex("Leg extensions", 3, "12", 60, "weight", "Pause and squeeze at the top, 3 seconds down."),
        ex("Landmine rotations", 3, "8/side", 60, "weight", "Arms long, rotate from the hips and pivot the back foot like your swing. Control the bar."),
        ex("Ab wheel rollouts", 3, "10", 60, "reps", "Squeeze glutes, ribs down, roll out only as far as you can without your back arching.")
      ]
    },
    { // Saturday
      title: "Shoulders, Arms & Arm Care",
      type: "strength",
      focus: "Strong, durable shoulders and arms. The arm-care work keeps your throwing arm healthy.",
      exercises: [
        ex("Warm-up + band arm care", 1, "8 min", 0, "check", "Arm circles, band pull-aparts, band external rotations and scap push-ups.", "baseball arm care band warm up"),
        ex("Med ball overhead slams", 4, "6", 45, "reps", "Reach tall, then slam the ball down as hard as you can using your abs."),
        ex("Half-kneeling landmine press", 4, "8/arm", 90, "weight", "Squeeze the down-knee glute, brace, press up and slightly forward. Shoulder-friendly for throwers."),
        ex("Dumbbell lateral raises", 3, "12-15", 60, "weight", "Lead with your elbows, stop at shoulder height, lower slowly."),
        ex("Rear delt fly", 3, "15", 60, "weight", "Light weight, slight bend in the elbows, squeeze your shoulder blades. Pinkies lead."),
        ex("Hammer curls", 3, "10", 60, "weight", "Elbows pinned to your sides, no swinging. Builds forearms for bat control."),
        ex("Cable triceps pushdown", 3, "12", 60, "weight", "Elbows locked at your sides, fully straighten and squeeze."),
        ex("Incline dumbbell curls", 3, "10", 60, "weight", "Let your arms hang behind you and curl without moving the elbows."),
        ex("Cable external rotation", 3, "12/arm", 30, "weight", "Towel under the elbow, rotate out slowly and control it back. Rotator cuff = throwing health."),
        ex("Wrist curls + reverse wrist curls", 2, "15 each", 45, "weight", "Forearms on your thighs, move only at the wrist. Grip strength for hitting."),
        ex("Farmer's carry", 3, "40 yd", 60, "weight", "Heavy dumbbells, stand tall, shoulders down, tight grip, quick steps.")
      ]
    },
    REST_DAY // Sunday
  ],

  /* ============================ HOME (no equipment) ============================ */
  home: [
    { // Monday
      title: "Legs & Core — Power",
      type: "strength",
      focus: "No equipment needed. Wear a backpack loaded with books to make it harder.",
      exercises: [
        WARMUP(8),
        ex("Broad jumps", 4, "5", 60, "reps", "Swing your arms, jump forward as far as you can, stick the landing for 2 seconds."),
        ex("Jumping lunges", 3, "6/leg", 60, "reps", "Switch legs in the air, land soft, stay tall."),
        ex("Step-ups (chair or bench)", 4, "10/leg", 60, "weight", "Whole foot on a sturdy chair, drive through that heel. Don't push off the back leg. Log backpack weight if you use one."),
        ex("Reverse lunges", 3, "12/leg", 60, "weight", "Step back, back knee lightly touches, push through the front heel. Backpack for extra load."),
        ex("Single-leg RDL", 3, "10/leg", 45, "weight", "Hinge at the hip, back leg in line with your body, hips square. Reach toward the floor."),
        ex("Single-leg glute bridge", 3, "12/leg", 45, "reps", "Drive through the heel, squeeze glutes 1 second at the top, keep your hips level."),
        ex("Single-leg calf raises", 3, "15/leg", 45, "reps", "On a stair edge for full range. Pause at the top."),
        ex("Plank shoulder taps", 3, "20 taps", 45, "reps", "Feet wide, hips still — don't let them rock side to side."),
        ex("Dead bugs", 3, "10/side", 45, "reps", "Low back glued to the floor. Move slowly and exhale fully.")
      ]
    },
    { // Tuesday
      title: "Chest & Back — Upper Strength",
      type: "strength",
      focus: "Uses a sturdy table, a chair and a backpack loaded with books.",
      exercises: [
        ex("Warm-up + arm circles", 1, "8 min", 0, "check", "Jumping jacks, arm circles, wall slides and scap push-ups.", "baseball arm care warm up no equipment"),
        ex("Plyo push-ups", 4, "6", 60, "reps", "Push hard enough that your hands leave the floor. Land soft with bent elbows."),
        ex("Push-ups", 4, "12-15", 60, "reps", "3 seconds down, 1 second pause, explode up. Body in a straight line."),
        ex("Table inverted rows", 4, "8-12", 75, "reps", "Lie under a sturdy table, grab the edge, pull your chest up with a straight body. Test that the table is solid first!"),
        ex("Backpack bent-over rows", 3, "12", 60, "weight", "Load a backpack with books, hinge forward with a flat back and row it to your belly."),
        ex("Decline push-ups", 3, "10", 60, "reps", "Feet on the couch, hands on the floor. Hits upper chest and shoulders."),
        ex("Prone Y-T-W raises", 3, "8 each", 45, "reps", "Lie face down and lift your arms into a Y, then a T, then a W. Thumbs up, squeeze shoulder blades."),
        ex("Russian twists (backpack)", 3, "20", 45, "weight", "Lean back, feet up if you can, rotate the backpack side to side. Rotational power for your swing."),
        ex("Superman hold", 3, "30 sec", 30, "time", "Lift arms, chest and legs off the floor. Squeeze glutes and upper back."),
        ex("Chair dips", 3, "12", 60, "reps", "Hands on the chair edge, shoulders down, lower until elbows are about 90°.")
      ]
    },
    { // Wednesday
      title: "Agility & Speed",
      type: "agility",
      focus: "Driveway, park or an open room. Use shoes or water bottles as cones. Rest fully between reps.",
      exercises: [
        WARMUP(10),
        ex("A-skips & B-skips", 3, "20 yd", 45, "check", "Tall posture, drive the knee up, toes up, strike the ground under your hips. Quick arms."),
        ex("Line hops", 4, "20 sec", 30, "check", "Quick two-foot hops over a line: forward/back, then side to side. Small and fast."),
        ex("5-10-5 shuttle", 6, "1", 75, "time", "Set 3 markers 5 yards apart. Stay low on the turns and touch each line. Log your time."),
        ex("Lateral skater bounds", 4, "6/side", 60, "reps", "Push off the outside leg and stick each landing for a second with the knee over the toes."),
        ex("Crossover sprint starts", 6, "15 yd", 60, "check", "From a base-stealing lead-off, crossover step and drive low for 15 yards."),
        ex("Drop-step sprints", 6, "20 yd", 45, "check", "Open the hips, turn and run like you're chasing a fly ball. Don't backpedal."),
        ex("Tuck jumps", 3, "6", 60, "reps", "Jump, pull your knees to your chest, land soft and go again."),
        ex("Lateral shuffles", 4, "10 yd each way", 45, "check", "Stay low, feet never cross or click together, push off the trailing leg."),
        ex("Copenhagen plank (couch)", 3, "20 sec/side", 45, "time", "Top leg on the couch, lift your hips into a straight line and hold."),
        COOLDOWN
      ]
    },
    { // Thursday
      title: "Stretching & Mobility",
      type: "mobility",
      focus: "Active recovery on the floor. Move slowly and breathe deep. Stretch — never pain.",
      exercises: [
        ex("Ball rolling (tennis or lacrosse ball)", 1, "8 min", 0, "check", "Roll your feet, glutes, chest and upper back against the floor or a wall. Pause on tight spots.", "lacrosse ball self massage athletes"),
        ex("90/90 hip switches", 2, "10", 30, "check", "Sit tall and rotate both knees side to side without using your hands."),
        ex("World's greatest stretch", 2, "5/side", 30, "check", "Lunge, drop your elbow to the inside of the front foot, then rotate and reach to the sky."),
        ex("Couch stretch (hip flexors)", 2, "60 sec/side", 15, "check", "Back knee against the couch, squeeze that glute, stay tall."),
        ex("Thoracic open books", 2, "10/side", 15, "check", "Lie on your side, knees stacked, open the top arm across like a book."),
        ex("Cross-body shoulder stretch", 2, "30 sec/side", 15, "check", "Pull the arm across your chest below the chin. Gentle — feel it in the back of the shoulder."),
        ex("Doorway chest stretch", 2, "30 sec/side", 15, "check", "Forearm on the door frame at shoulder height, step through gently."),
        ex("Towel hamstring stretch", 2, "45 sec/side", 15, "check", "On your back, towel around your foot, raise the straight leg."),
        ex("Pigeon stretch", 2, "45 sec/side", 15, "check", "Front shin across, back leg long, hips square. Lean forward for more."),
        ex("Wrist & forearm stretch", 2, "30 sec each", 15, "check", "Palm up, then palm down, gently pull the fingers back."),
        ex("Cat-cow + deep breathing", 1, "3 min", 0, "check", "Slow spine waves, then child's pose with long exhales.")
      ]
    },
    { // Friday
      title: "Glutes, Hamstrings & Core",
      type: "strength",
      focus: "A backpack loaded with books adds weight. Nordics need a heavy couch to hook your feet under.",
      exercises: [
        WARMUP(8),
        ex("Single-leg hops", 3, "5/leg", 60, "reps", "Hop forward on one leg and stick each landing. Knee stays over the toes."),
        ex("Single-leg RDL (backpack)", 4, "10/leg", 60, "weight", "Hold the backpack, hinge at the hip, hips square, flat back."),
        ex("Single-leg hip thrust (couch)", 4, "12/leg", 60, "reps", "Shoulders on the couch, drive through the heel, squeeze 1 second at the top."),
        ex("Step-ups with backpack", 3, "10/leg", 60, "weight", "Whole foot on a sturdy chair, drive through that heel, no push from the back leg."),
        ex("Nordic curls (feet under couch)", 3, "5", 90, "reps", "Kneel on a pillow, feet hooked under a heavy couch. Lower slowly, catch yourself, push back up."),
        ex("Lateral lunges", 3, "10/side", 45, "reps", "Sit back into one hip, other leg straight. Hold the backpack to make it harder."),
        ex("Single-leg calf raises", 3, "15/leg", 45, "reps", "On a stair edge for full range. Pause at the top."),
        ex("Side plank hip dips", 3, "12/side", 45, "reps", "Feet stacked, lower your hip toward the floor and lift back up."),
        ex("Hollow body hold", 3, "30 sec", 45, "time", "Low back pressed down, arms and legs long and just off the floor."),
        ex("Russian twists (backpack)", 3, "20", 45, "weight", "Lean back, feet up if you can, rotate the backpack side to side.")
      ]
    },
    { // Saturday
      title: "Shoulders, Arms & Arm Care",
      type: "strength",
      focus: "Bodyweight and backpack work for shoulders and arms, plus arm care for your throwing arm.",
      exercises: [
        ex("Warm-up + arm circles", 1, "8 min", 0, "check", "Jumping jacks, arm circles, wall slides and scap push-ups.", "baseball arm care warm up no equipment"),
        ex("Pike push-ups", 4, "8-10", 60, "reps", "Hips high in an upside-down V. Lower the top of your head toward the floor, press back up."),
        ex("Backpack overhead press", 3, "10", 60, "weight", "Hold the backpack at your chest, brace, press overhead without arching your back."),
        ex("Backpack curls", 3, "12", 60, "weight", "Hold the top handle or straps, elbows pinned, curl slowly."),
        ex("Chair dips", 3, "12-15", 60, "reps", "Hands on the chair edge, shoulders down, lower until elbows are about 90°."),
        ex("Diamond push-ups", 3, "10", 60, "reps", "Hands together under your chest, elbows close to your body."),
        ex("Prone Y-T-W raises", 3, "8 each", 45, "reps", "Lie face down and lift your arms into a Y, T, then W. Thumbs up, squeeze shoulder blades."),
        ex("Wall slides", 3, "10", 30, "reps", "Back and arms against the wall, slide up and down keeping contact."),
        ex("External rotation hold (doorway)", 3, "20 sec/arm", 30, "time", "Elbow bent 90° at your side, press the back of your hand into the door frame. Rotator-cuff health."),
        ex("Towel wringing", 3, "30 sec", 30, "check", "Wring a rolled towel hard one way, then the other. Forearms and grip."),
        ex("Up-downs (plank to push-up)", 3, "10", 45, "reps", "From elbows to hands and back down, hips steady.")
      ]
    },
    REST_DAY // Sunday
  ]
};
