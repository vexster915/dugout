/* exercises.js — how-to details for every exercise in the starting plans. They show under the form
   video (tap ▶ on any exercise). Like plan.js, you never need to edit this file.

   Each exercise:
     muscles    what it works             why       why it matters for baseball
     steps      how to do it              mistakes  what to watch out for
     easier / harder                      swap      exercises to do instead if the equipment is taken */

const EXERCISE_INFO = {
  /* ---------- Warm-ups ---------- */
  "Dynamic warm-up": {
    muscles: "Whole body", why: "Raises body temperature and loosens hips and hamstrings so sprints and jumps are safer and faster.",
    steps: ["Jog or bike easy for 3 minutes.", "Leg swings front-to-back and side-to-side, 10 each leg.", "Walking lunges with a twist, 10 steps.", "A-skips, high knees and lateral shuffles, 20 yards each."],
    mistakes: ["Rushing it — stay loose, it should feel easy", "Static stretching before sprinting (save long holds for after)"],
    easier: "Walk the drills instead of skipping", harder: "Add 2–3 build-up sprints at 70–80% speed", swap: ["Warm-up + arm circles"]
  },
  "Warm-up + band arm care": {
    muscles: "Rotator cuff, upper back", why: "Wakes up the small shoulder muscles that protect your throwing arm before you load it.",
    steps: ["Arm circles forward and back, 10 each.", "Band pull-aparts, 15 reps.", "Band external rotations, elbow at your side, 12 each arm.", "Scap push-ups, 10 reps — squeeze and spread the shoulder blades."],
    mistakes: ["Using a band that's too heavy — this is activation, not strength", "Shrugging your shoulders up to your ears"],
    easier: "Do the moves with no band", harder: "Add band Y-raises and 90/90 external rotations", swap: ["Warm-up + arm circles"]
  },
  "Warm-up + arm circles": {
    muscles: "Shoulders, upper back", why: "Gets blood into the shoulders and upper back before pushing and pulling.",
    steps: ["Jumping jacks, 30 seconds.", "Arm circles small to big, 10 each way.", "Wall slides, 10 reps.", "Scap push-ups, 10 reps."],
    mistakes: ["Going through the motions — move with control and full range"],
    easier: "Skip the jumping jacks", harder: "Add prone Y-T-W raises", swap: ["Warm-up + band arm care"]
  },
  "Cool-down walk + stretch": {
    muscles: "Hips, hamstrings, calves", why: "Brings your heart rate down and starts recovery after hard running.",
    steps: ["Walk easy for 2–3 minutes.", "Hamstring stretch, 30 seconds each leg.", "Hip flexor stretch, 30 seconds each side.", "Calf stretch against a wall, 30 seconds each."],
    mistakes: ["Skipping it when you're tired — that's when it helps most"],
    easier: "Just walk", harder: "Add 5 minutes of foam rolling", swap: ["Light stretching (optional)"]
  },

  /* ---------- Legs & power ---------- */
  "Box jumps": {
    muscles: "Quads, glutes, calves", why: "Builds the explosive hip and knee drive behind your first step, your swing and your push off the mound.",
    steps: ["Stand about a foot from a sturdy box, feet hip-width.", "Dip into a quarter squat and swing your arms back.", "Swing your arms up and jump, landing softly with both feet flat on the box.", "Stand tall, then step down one foot at a time."],
    mistakes: ["A box so high you land in a deep squat", "Jumping back down — step down to save your knees"],
    easier: "Squat jumps onto a low step", harder: "Seated box jumps or a higher box", swap: ["Broad jumps", "Tuck jumps"]
  },
  "Leg press": {
    muscles: "Quads, glutes, adductors", why: "Heavy leg strength without loading your spine — the base for sprint speed and a strong lower half in your swing.",
    steps: ["Sit with your back and hips flat on the pad, feet shoulder-width in the middle of the platform.", "Unlock the sled and lower it until your knees reach about 90°.", "Keep your lower back on the pad at the bottom.", "Drive through your whole foot to push the weight up without slamming your knees straight."],
    mistakes: ["Lowering so deep your hips curl off the pad", "Knees caving inward", "Locking out hard at the top"],
    easier: "Lighter weight, slower lowering", harder: "Pause 2 seconds at the bottom", swap: ["Trap bar deadlift", "Dumbbell step-ups", "Walking lunges (dumbbells)"]
  },
  "Trap bar deadlift": {
    muscles: "Glutes, hamstrings, quads, back", why: "The best total-body strength builder for athletes — trains the same hip drive you use to sprint and rotate.",
    steps: ["Stand in the middle of the trap bar, feet hip-width.", "Push your hips back and bend your knees to grab the handles; chest up, back flat.", "Squeeze your lats (pull the bar in) and take the slack out of the bar.", "Push the floor away and stand tall, squeezing your glutes. Lower with control."],
    mistakes: ["Rounding your lower back", "Jerking the bar off the floor", "Leaning back at the top"],
    easier: "Use the high handles", harder: "Pause 1 inch off the floor", swap: ["Romanian deadlift", "Kettlebell swings", "Leg press"]
  },
  "Walking lunges (dumbbells)": {
    muscles: "Quads, glutes, hamstrings", why: "Single-leg strength and balance that carries over to running, fielding and your stride.",
    steps: ["Hold dumbbells at your sides and stand tall.", "Take a long step forward and lower until your back knee lightly touches the floor.", "Drive through your front heel to stand and step straight into the next lunge.", "Keep your torso tall the whole time."],
    mistakes: ["Short steps that push the front knee way past the toes", "Front knee collapsing inward", "Leaning forward"],
    easier: "Bodyweight lunges in place", harder: "Heavier dumbbells or a front-foot-elevated lunge", swap: ["Reverse lunges", "Dumbbell step-ups"]
  },
  "Lateral lunges": {
    muscles: "Adductors, glutes, quads", why: "Baseball is played side to side — this builds range and strength for fielding and base-running cuts.",
    steps: ["Stand with feet wide, toes forward, holding a weight at your chest.", "Sit your hips back and bend one knee while the other leg stays straight.", "Go as low as you can with your heel flat and chest up.", "Push through the bent leg to return to center."],
    mistakes: ["Letting the bent knee cave in", "Lifting the heel of the working foot", "Rounding forward"],
    easier: "Bodyweight, shorter range", harder: "Hold a heavier dumbbell or kettlebell", swap: ["Lateral skater bounds", "Copenhagen plank"]
  },
  "Seated leg curl": {
    muscles: "Hamstrings", why: "Strong hamstrings are your brakes when sprinting — they help prevent the pulls that bench ballplayers every year.",
    steps: ["Adjust the pad so it sits just above your heels and your knees line up with the machine's pivot.", "Pull your heels down and back as far as you can.", "Squeeze for 1 second.", "Take 3 seconds to let the weight back up."],
    mistakes: ["Swinging the weight", "Letting the stack slam between reps", "Lifting your hips off the seat"],
    easier: "Lighter weight, 2-second squeeze", harder: "One leg at a time", swap: ["Nordic hamstring curls", "Romanian deadlift"]
  },
  "Standing calf raises": {
    muscles: "Calves", why: "Springy calves and strong ankles help acceleration and protect against ankle sprains.",
    steps: ["Stand with the balls of your feet on a step or plate, heels hanging off.", "Lower your heels until you feel a full stretch.", "Rise as high as you can onto your toes.", "Pause 1 second at the top, then lower slowly."],
    mistakes: ["Bouncing at the bottom", "Short, fast reps that skip the stretch"],
    easier: "Both feet, no weight", harder: "Single-leg calf raises holding a dumbbell", swap: ["Single-leg calf raises"]
  },
  "Pallof press": {
    muscles: "Obliques, deep core", why: "Teaches your core to resist twisting, so rotational power goes into the bat and ball instead of leaking out.",
    steps: ["Stand sideways to a cable or band set at chest height, feet shoulder-width.", "Hold the handle at your chest with both hands.", "Press straight out until your arms are long and hold 2 seconds.", "Bring it back to your chest without letting your torso turn."],
    mistakes: ["Letting the cable pull you into a twist", "Leaning away from the cable", "Holding your breath"],
    easier: "Lighter band, shorter hold", harder: "Half-kneeling or longer holds", swap: ["Dead bugs", "Plank shoulder taps"]
  },
  "Hanging knee raises": {
    muscles: "Lower abs, hip flexors, grip", why: "Builds the front-side core strength that stabilizes your trunk when you swing and throw.",
    steps: ["Hang from a bar with a firm grip, shoulders pulled down.", "Stop any swinging before you start.", "Curl your hips up and bring your knees toward your ribs.", "Lower slowly with control."],
    mistakes: ["Swinging for momentum", "Only lifting your legs without curling the hips"],
    easier: "Lying reverse crunches", harder: "Straight-leg raises", swap: ["Dead bugs", "Hollow body hold"]
  },

  /* ---------- Upper body & rotation ---------- */
  "Med ball rotational scoop toss": {
    muscles: "Hips, obliques, core", why: "The closest gym move to your swing and throw — trains hips-first rotational power.",
    steps: ["Stand sideways to a wall, about 6–8 feet away, holding a med ball at your back hip.", "Load into your back hip like your stride.", "Drive your hips toward the wall and let your torso and arms follow.", "Throw the ball hard into the wall, catch it and reset."],
    mistakes: ["Throwing with your arms first", "Using a ball so heavy you can't move fast (use 4–8 lb)"],
    easier: "Lighter ball, half speed", harder: "Add a step into the throw", swap: ["Landmine rotations", "Cable woodchop (high to low)"]
  },
  "Dumbbell bench press": {
    muscles: "Chest, shoulders, triceps", why: "Builds pushing strength with more shoulder freedom than a barbell — friendlier for throwers.",
    steps: ["Lie on a bench with a dumbbell in each hand over your chest, feet flat.", "Pinch your shoulder blades together and down.", "Lower the dumbbells to chest level with elbows about 45° from your body.", "Press up and slightly in until your arms are straight."],
    mistakes: ["Elbows flared straight out to the sides", "Bouncing the weights off your chest", "Butt lifting off the bench"],
    easier: "Push-ups", harder: "Pause 1 second at the bottom", swap: ["Push-ups", "Incline dumbbell press"]
  },
  "Pull-ups": {
    muscles: "Lats, upper back, biceps, grip", why: "A strong back balances all the pushing and throwing, keeping your shoulders healthy.",
    steps: ["Hang from the bar with hands just outside your shoulders, arms straight.", "Pull your shoulder blades down first.", "Drive your elbows down to your ribs until your chin clears the bar.", "Lower all the way down with control."],
    mistakes: ["Kipping or swinging", "Half reps that never straighten your arms", "Craning your chin up to reach the bar"],
    easier: "Band-assisted pull-ups or slow negatives", harder: "Add weight with a belt or dumbbell between your feet", swap: ["Chest-supported row", "Table inverted rows"]
  },
  "Chest-supported row": {
    muscles: "Upper back, lats, rear delts", why: "Strengthens the muscles that slow your arm down after you throw — key for arm health.",
    steps: ["Lie chest-down on an incline bench with a dumbbell in each hand.", "Let your arms hang straight down.", "Pull your elbows back toward your back pockets and squeeze your shoulder blades together.", "Lower slowly."],
    mistakes: ["Lifting your chest off the pad", "Shrugging up to your ears", "Yanking the weight"],
    easier: "Lighter dumbbells, pause at the top", harder: "3-second lowering", swap: ["Single-arm dumbbell row", "Backpack bent-over rows"]
  },
  "Incline dumbbell press": {
    muscles: "Upper chest, front shoulders, triceps", why: "Upper-body strength at an angle that carries over to pushing off and protecting yourself on slides and collisions.",
    steps: ["Set a bench to about 30° and lie back with dumbbells at your shoulders.", "Pinch your shoulder blades back.", "Take 2 seconds to lower to the top of your chest.", "Press up without flaring your elbows."],
    mistakes: ["Bench set too steep (becomes a shoulder press)", "Arching your lower back off the bench"],
    easier: "Lighter weight or incline push-ups", harder: "Pause at the bottom", swap: ["Dumbbell bench press", "Decline push-ups"]
  },
  "Single-arm dumbbell row": {
    muscles: "Lats, upper back, biceps", why: "Works each side of your back on its own, fixing imbalances from always throwing with one arm.",
    steps: ["Put one knee and hand on a bench, back flat, dumbbell in the other hand.", "Let the arm hang straight.", "Pull the dumbbell to your hip, keeping your elbow close.", "Lower until your arm is straight again."],
    mistakes: ["Twisting your torso to lift the weight", "Pulling to your chest instead of your hip"],
    easier: "Lighter dumbbell", harder: "Pause 2 seconds at the top", swap: ["Chest-supported row", "Backpack bent-over rows"]
  },
  "Plyo push-ups": {
    muscles: "Chest, shoulders, triceps", why: "Trains your upper body to produce force fast — the same quality that adds bat speed and arm speed.",
    steps: ["Start in a push-up position, body in a straight line.", "Lower under control.", "Push up hard enough that your hands leave the floor.", "Land softly with bent elbows and go right into the next rep."],
    mistakes: ["Sagging hips", "Landing with locked elbows"],
    easier: "Hands on a bench or box", harder: "Clap push-ups", swap: ["Push-ups", "Med ball overhead slams"]
  },
  "Cable woodchop (high to low)": {
    muscles: "Obliques, core, hips", why: "Rotational strength through the whole chain — the same path of force as your swing.",
    steps: ["Set a cable high and stand sideways to it, feet wider than shoulders.", "Grab the handle with both hands, arms long.", "Rotate through your hips and upper back to pull the handle down and across to your opposite hip.", "Pivot your back foot like your swing, then return slowly."],
    mistakes: ["Pulling with just your arms", "Rounding your back"],
    easier: "Use a band and go lighter", harder: "Faster reps with a controlled return", swap: ["Landmine rotations", "Med ball rotational scoop toss"]
  },
  "Face pulls": {
    muscles: "Rear delts, rotator cuff, upper back", why: "One of the best exercises for throwing-shoulder health and posture.",
    steps: ["Set a rope on a cable at forehead height.", "Grab with thumbs pointing back toward you and step back.", "Pull the rope toward your forehead, elbows high, pulling the ends apart.", "Squeeze your shoulder blades, then return slowly."],
    mistakes: ["Going too heavy and leaning back", "Elbows dropping below your shoulders"],
    easier: "Band face pulls", harder: "Pause 2 seconds in the back position", swap: ["Rear delt fly", "Prone Y-T-W raises"]
  },
  "Push-ups": {
    muscles: "Chest, shoulders, triceps, core", why: "Basic pushing strength with a built-in core workout — you can do them anywhere.",
    steps: ["Hands just wider than your shoulders, body straight from head to heels.", "Take 3 seconds to lower until your chest nearly touches the floor.", "Pause 1 second.", "Push up explosively."],
    mistakes: ["Hips sagging or piking up", "Flaring elbows straight out", "Half reps"],
    easier: "Hands on a bench or counter", harder: "Feet elevated or with a backpack on", swap: ["Dumbbell bench press", "Decline push-ups"]
  },
  "Table inverted rows": {
    muscles: "Upper back, lats, biceps", why: "A bodyweight row that balances all the pushing work and builds a stronger back.",
    steps: ["Lie under a sturdy table and grab the edge with both hands.", "Straighten your body from heels to head.", "Pull your chest up to the table edge.", "Lower slowly until your arms are straight."],
    mistakes: ["Using a wobbly table — test it first!", "Hips sagging", "Pulling with your neck"],
    easier: "Bend your knees", harder: "Feet up on a chair", swap: ["Backpack bent-over rows", "Pull-ups"]
  },
  "Backpack bent-over rows": {
    muscles: "Upper back, lats, biceps", why: "Builds the back muscles that decelerate your throwing arm — no gym needed.",
    steps: ["Load a backpack with books and hold it by the top handle or straps.", "Hinge forward at the hips with a flat back and soft knees.", "Row the backpack to your belly, squeezing your shoulder blades.", "Lower with control."],
    mistakes: ["Rounding your back", "Standing up as you row"],
    easier: "Lighter backpack", harder: "One arm at a time with more books", swap: ["Table inverted rows", "Single-arm dumbbell row"]
  },
  "Decline push-ups": {
    muscles: "Upper chest, shoulders, triceps", why: "Makes push-ups harder and hits the upper chest and shoulders.",
    steps: ["Put your feet on a couch or chair and your hands on the floor.", "Keep your body in a straight line.", "Lower your chest toward the floor.", "Push back up."],
    mistakes: ["Hips sagging toward the floor", "Head dropping first"],
    easier: "Regular push-ups", harder: "Higher feet or a backpack on", swap: ["Push-ups", "Pike push-ups"]
  },
  "Prone Y-T-W raises": {
    muscles: "Lower traps, rear delts, rotator cuff", why: "Strengthens the small muscles that keep your shoulder blade in the right place when you throw.",
    steps: ["Lie face down with arms overhead, thumbs up.", "Lift your arms into a Y and hold 2 seconds.", "Lower, then lift into a T (arms out to the sides).", "Lower, then pull elbows down and back into a W."],
    mistakes: ["Lifting your chest instead of your arms", "Shrugging"],
    easier: "Fewer reps, shorter holds", harder: "Hold light weights or water bottles", swap: ["Face pulls", "Rear delt fly"]
  },
  "Chair dips": {
    muscles: "Triceps, chest, shoulders", why: "Builds triceps strength for bat control and arm extension.",
    steps: ["Sit on the edge of a sturdy chair and put your hands next to your hips.", "Slide your hips off the chair, legs out in front.", "Lower until your elbows are about 90°, shoulders down.", "Press back up."],
    mistakes: ["Going too deep (strains the front of the shoulder)", "Shrugging your shoulders up"],
    easier: "Bend your knees more", harder: "Feet up on another chair", swap: ["Diamond push-ups", "Cable triceps pushdown"]
  },

  /* ---------- Speed & agility ---------- */
  "A-skips & B-skips": {
    muscles: "Hip flexors, calves, hamstrings", why: "Grooves good sprinting mechanics — knee drive and striking the ground under your hips.",
    steps: ["A-skip: skip forward, driving one knee up to hip height with the toes pulled up.", "Punch the foot down under your hip and switch legs, arms pumping.", "B-skip: same, but kick the lower leg out and paw it back down under you.", "Stay tall and quick for 20 yards."],
    mistakes: ["Leaning back", "Slow, floaty skips — keep ground contact quick"],
    easier: "Marching A's (walk it)", harder: "Faster skips or A-runs", swap: ["Line hops"]
  },
  "Agility ladder drills": {
    muscles: "Calves, hips, coordination", why: "Quick, light feet for infield work and reacting off the bat.",
    steps: ["Pick a pattern: in-in-out-out, lateral shuffle or Ickey shuffle.", "Stay on the balls of your feet with your eyes up.", "Go as fast as you can while staying clean.", "Rest and switch lead foot each round."],
    mistakes: ["Staring at your feet", "Going so fast you hit the rungs every rep"],
    easier: "Walk through the pattern first", harder: "Finish each rep with a 10-yard sprint", swap: ["Line hops", "Lateral shuffles"]
  },
  "Pro agility shuttle (5-10-5)": {
    muscles: "Legs, hips", why: "Tests and trains change of direction — the same skill as a ground ball in the hole or a steal break.",
    steps: ["Straddle the middle line in a 3-point stance.", "Sprint 5 yards to one side and touch the line.", "Sprint 10 yards back the other way and touch that line.", "Sprint 5 yards through the middle. Time it."],
    mistakes: ["Standing up tall on the turns", "Rounding the cuts instead of planting on the outside leg"],
    easier: "Half speed, focus on the turns", harder: "Start facing the other way (react)", swap: ["5-10-5 shuttle", "Lateral skater bounds"]
  },
  "Sled push": {
    muscles: "Quads, glutes, calves", why: "Builds acceleration strength — the drive phase of every sprint.",
    steps: ["Grip the sled handles with arms straight, body leaning forward at about 45°.", "Drive one knee forward and push through the ball of your foot.", "Take powerful, quick steps.", "Keep your back flat and hips low for the whole distance."],
    mistakes: ["Standing too upright", "Short, choppy steps"],
    easier: "Lighter sled", harder: "Heavier sled or longer distance", swap: ["Broad jumps", "Crossover sprint starts"]
  },
  "Lateral skater bounds": {
    muscles: "Glutes, adductors, ankles", why: "Side-to-side power and landing control for fielding and base running.",
    steps: ["Stand on your right leg.", "Push off sideways and jump to the left, landing on your left leg.", "Stick the landing for 1 second, knee over your toes.", "Push back to the right. That's one rep each side."],
    mistakes: ["Knee caving in on the landing", "Rushing without sticking the landing"],
    easier: "Shorter hops, hand down for balance", harder: "Go farther, or bound continuously", swap: ["Lateral lunges", "Lateral shuffles"]
  },
  "Base-stealing starts (crossover)": {
    muscles: "Hips, legs", why: "Game-speed practice of your first three steps — where steals are won.",
    steps: ["Take your lead-off in an athletic stance.", "Turn your right foot and hips toward second (or the direction you're going).", "Cross your left leg over and drive low and hard.", "Stay low for the first 3 steps, then sprint to 15 yards."],
    mistakes: ["Popping straight up on the first step", "A false step backward"],
    easier: "Walk through the footwork", harder: "React to a partner's cue", swap: ["Crossover sprint starts", "Drop-step sprints"]
  },
  "Drop-step sprints": {
    muscles: "Hips, legs", why: "Trains the drop step and turn outfielders use to go back on fly balls.",
    steps: ["Start in a ready stance facing forward.", "Open your hips by stepping back at an angle with one foot.", "Turn and run hard, looking over your shoulder like you're tracking a ball.", "Sprint 20 yards, then switch sides."],
    mistakes: ["Backpedaling", "Crossing over too early"],
    easier: "Half speed", harder: "Have a partner point which way to go", swap: ["Crossover sprint starts"]
  },
  "Copenhagen plank": {
    muscles: "Adductors (groin), obliques", why: "One of the best-proven exercises for preventing groin strains in field sports.",
    steps: ["Lie on your side with your top leg resting on a bench at knee or ankle height.", "Prop up on your forearm.", "Lift your hips so your body forms a straight line, bottom leg off the floor.", "Hold, then switch sides."],
    mistakes: ["Hips sagging", "Rolling forward"],
    easier: "Top knee on the bench instead of the ankle", harder: "Longer holds or move the bottom leg up and down", swap: ["Side plank hip dips", "Lateral lunges"]
  },
  "Line hops": {
    muscles: "Calves, ankles", why: "Quick, springy feet and ankle stiffness for faster first steps.",
    steps: ["Stand next to a line on the balls of your feet.", "Hop quickly forward and back over the line.", "Then hop side to side.", "Stay small and fast."],
    mistakes: ["Big, slow hops", "Landing on your heels"],
    easier: "Slower pace", harder: "Single-leg line hops", swap: ["Agility ladder drills", "Tuck jumps"]
  },
  "5-10-5 shuttle": {
    muscles: "Legs, hips", why: "Change-of-direction speed for fielding and base running.",
    steps: ["Set 3 markers 5 yards apart.", "Start at the middle and sprint 5 yards to one side, touching the line.", "Sprint 10 yards the other way and touch that line.", "Sprint back through the middle. Time it."],
    mistakes: ["Standing up on the turns", "Not touching the lines"],
    easier: "Half speed", harder: "Start on a partner's clap", swap: ["Pro agility shuttle (5-10-5)", "Lateral shuffles"]
  },
  "Crossover sprint starts": {
    muscles: "Hips, legs", why: "Base-stealing first-step speed without any equipment.",
    steps: ["Take a lead-off stance.", "Turn your hips and front foot the way you're going.", "Cross over with the other leg and drive low.", "Sprint 15 yards."],
    mistakes: ["Standing up tall right away", "Stepping back first"],
    easier: "Walk the footwork", harder: "React to a signal", swap: ["Base-stealing starts (crossover)", "Drop-step sprints"]
  },
  "Tuck jumps": {
    muscles: "Quads, glutes, calves, core", why: "Explosive jumping and fast knee drive.",
    steps: ["Stand with feet hip-width.", "Jump straight up and pull your knees toward your chest.", "Land softly on the balls of your feet.", "Go straight into the next jump."],
    mistakes: ["Landing stiff-legged", "Rounding your back to reach your knees"],
    easier: "Squat jumps", harder: "More reps in a row", swap: ["Box jumps", "Broad jumps"]
  },
  "Lateral shuffles": {
    muscles: "Glutes, adductors, calves", why: "Infield-style lateral movement and staying low.",
    steps: ["Get into an athletic stance, knees bent, chest up.", "Push off the trailing leg to move sideways.", "Keep your feet apart — never let them click or cross.", "Shuffle 10 yards each way."],
    mistakes: ["Standing up tall", "Crossing your feet"],
    easier: "Slower pace", harder: "Wear a resistance band above your knees", swap: ["Agility ladder drills", "Lateral skater bounds"]
  },
  "Copenhagen plank (couch)": {
    muscles: "Adductors (groin), obliques", why: "Groin-strain prevention for lateral moves, using your couch.",
    steps: ["Lie on your side with your top leg on the couch.", "Prop up on your forearm.", "Lift your hips into a straight line.", "Hold, then switch sides."],
    mistakes: ["Hips sagging", "Rolling forward"],
    easier: "Top knee on the couch", harder: "Longer holds", swap: ["Side plank hip dips"]
  },

  /* ---------- Mobility & recovery ---------- */
  "Foam roll": {
    muscles: "Quads, IT band, glutes, lats, upper back", why: "Eases tight spots so you move better in your next workout.",
    steps: ["Roll each area slowly for about 45 seconds.", "When you find a tender spot, pause and breathe for 10–20 seconds.", "Go quads, outer thighs, glutes, lats, then upper back.", "Keep the pressure uncomfortable but never sharp."],
    mistakes: ["Rolling fast back and forth", "Rolling directly on your lower back or joints"],
    easier: "Take some weight off with your hands and feet", harder: "Stack your legs for more pressure", swap: ["Ball rolling (tennis or lacrosse ball)"]
  },
  "Ball rolling (tennis or lacrosse ball)": {
    muscles: "Feet, glutes, chest, upper back", why: "Pinpoints tight spots that a foam roller can't reach.",
    steps: ["Put the ball under your foot and roll slowly for a minute each.", "Sit on the ball to work each glute.", "Lean into a wall with the ball on your chest and upper back.", "Pause and breathe on tender spots."],
    mistakes: ["Pressing on bones or the spine", "Pressing so hard you tense up"],
    easier: "Use a softer ball", harder: "Lacrosse ball for more pressure", swap: ["Foam roll"]
  },
  "90/90 hip switches": {
    muscles: "Hip rotators", why: "Hip rotation mobility — your swing and throw both come from rotating your hips.",
    steps: ["Sit with both knees bent at 90°, one leg in front and one to the side.", "Sit tall with your hands off the floor if you can.", "Rotate both knees to the other side.", "Keep switching slowly."],
    mistakes: ["Slouching", "Using your hands to push"],
    easier: "Hands behind you for support", harder: "Lean over the front leg at each switch", swap: ["Pigeon stretch", "World's greatest stretch"]
  },
  "World's greatest stretch": {
    muscles: "Hips, hamstrings, upper back", why: "Opens hips, hamstrings and upper back in one move.",
    steps: ["Step into a long lunge.", "Put both hands inside your front foot and drop your elbow toward the floor.", "Rotate and reach that hand to the sky, following it with your eyes.", "Straighten your front leg to stretch the hamstring, then switch."],
    mistakes: ["Rushing through it", "Letting the back knee drop and rest on the floor"],
    easier: "Back knee down", harder: "Hold each position for 3 breaths", swap: ["90/90 hip switches", "Thoracic open books"]
  },
  "Couch stretch (hip flexors)": {
    muscles: "Hip flexors, quads", why: "Tight hip flexors limit your stride and hip drive — this opens them up.",
    steps: ["Kneel with your back knee against a wall or bench, shin up the wall.", "Step your other foot forward into a lunge.", "Squeeze the glute of the back leg and stay tall.", "Hold and breathe, then switch."],
    mistakes: ["Arching your lower back", "Letting your hips drift sideways"],
    easier: "Move the back knee away from the wall", harder: "Raise your torso fully upright", swap: ["World's greatest stretch"]
  },
  "Thoracic open books": {
    muscles: "Upper back, chest", why: "Upper-back rotation lets you turn in your swing and throw without cranking your lower back.",
    steps: ["Lie on your side with knees bent and stacked, arms straight out in front.", "Keep your knees together and on the floor.", "Open the top arm across like a book, following it with your eyes.", "Pause, breathe out, and return."],
    mistakes: ["Knees lifting off the floor", "Forcing it — let gravity do the work"],
    easier: "Smaller range", harder: "Hold the open position for 3 breaths", swap: ["World's greatest stretch"]
  },
  "Cross-body shoulder stretch": {
    muscles: "Back of the shoulder", why: "Throwers often get tight in the back of the shoulder — this helps keep motion normal.",
    steps: ["Bring one arm across your chest just below your chin.", "Use the other hand to gently pull it closer.", "Keep your shoulder down, away from your ear.", "Hold, then switch."],
    mistakes: ["Pulling hard — gentle is the rule", "Letting the shoulder hike up"],
    easier: "Lighter pull", harder: "Sleeper stretch (only if a trainer has shown you)", swap: ["Doorway chest stretch"]
  },
  "Lat stretch on rack": {
    muscles: "Lats, upper back", why: "Tight lats limit overhead motion and pull on the shoulder when you throw.",
    steps: ["Hold a post or rack at waist height with one or both hands.", "Walk back and sit your hips back.", "Let your chest drop and feel the stretch along your side.", "Breathe into it."],
    mistakes: ["Rounding your lower back instead of hinging"],
    easier: "Hold higher on the post", harder: "One arm at a time", swap: ["Cat-cow + deep breathing"]
  },
  "Band hamstring stretch": {
    muscles: "Hamstrings, calves", why: "Flexible hamstrings are less likely to get pulled when you sprint.",
    steps: ["Lie on your back with a band around one foot.", "Keep the leg straight and pull it up until you feel a stretch.", "Keep the other leg flat on the floor.", "Hold, then switch."],
    mistakes: ["Bending the knee of the stretched leg", "Yanking on the band"],
    easier: "Bend the other knee", harder: "Pull your toes toward you too", swap: ["Towel hamstring stretch"]
  },
  "Pigeon stretch": {
    muscles: "Glutes, hip rotators", why: "Loosens the deep hip muscles that get tight from running and rotating.",
    steps: ["From a push-up position, bring one knee forward behind your wrist.", "Lay the shin across in front of you and slide the back leg long.", "Keep your hips square.", "Lean forward over the front leg for more stretch."],
    mistakes: ["Twisting your hips", "Forcing the front shin flat if your knee hurts"],
    easier: "Figure-4 stretch lying on your back", harder: "Lean all the way forward", swap: ["90/90 hip switches"]
  },
  "Wrist & forearm stretch": {
    muscles: "Forearms, wrists", why: "Hitters and throwers use their forearms hard — this keeps wrists and elbows happy.",
    steps: ["Hold one arm straight, palm up.", "Gently pull the fingers back with your other hand.", "Flip the palm down and gently pull the hand toward you.", "Hold each, then switch arms."],
    mistakes: ["Pulling too hard"],
    easier: "Bend the elbow slightly", harder: "Add wrist circles between holds", swap: ["Towel wringing"]
  },
  "Cat-cow + deep breathing": {
    muscles: "Spine, core, breathing muscles", why: "Relaxes your body and helps you switch into recovery mode.",
    steps: ["On hands and knees, breathe in and let your belly drop, chest forward (cow).", "Breathe out and round your back up (cat).", "Move slowly for 10 rounds.", "Finish in child's pose with long, slow exhales."],
    mistakes: ["Rushing — match each move to a breath"],
    easier: "Smaller range", harder: "Hold child's pose for 10 full breaths", swap: ["Light stretching (optional)"]
  },
  "Doorway chest stretch": {
    muscles: "Chest, front of the shoulder", why: "Opens up the chest and helps posture after lots of pushing and sitting.",
    steps: ["Put your forearm on the door frame with your elbow at shoulder height.", "Step through gently until you feel a stretch across your chest.", "Keep your shoulder down.", "Hold, then switch."],
    mistakes: ["Leaning so hard it pinches the front of your shoulder"],
    easier: "Elbow lower on the frame", harder: "Step farther through", swap: ["Cross-body shoulder stretch"]
  },
  "Towel hamstring stretch": {
    muscles: "Hamstrings, calves", why: "Sprint-safe hamstrings using just a towel.",
    steps: ["Lie on your back with a towel around one foot.", "Raise the straight leg until you feel a stretch.", "Keep the other leg flat.", "Hold, then switch."],
    mistakes: ["Bending the stretched knee"],
    easier: "Bend the other knee", harder: "Pull your toes back too", swap: ["Band hamstring stretch"]
  },
  "Easy walk (optional)": {
    muscles: "Whole body", why: "Light movement gets blood flowing and helps you recover without adding fatigue.",
    steps: ["Walk at an easy pace — you should be able to talk the whole time.", "20–30 minutes is plenty."],
    mistakes: ["Turning it into a hard workout"],
    easier: "10 minutes", harder: "Add some hills at the same easy effort", swap: ["Light stretching (optional)"]
  },
  "Light stretching (optional)": {
    muscles: "Hips, hamstrings, shoulders", why: "Keeps you loose on your day off.",
    steps: ["Pick 4–5 stretches for your hips, hamstrings and shoulders.", "Hold each for 30–45 seconds and breathe slowly."],
    mistakes: ["Bouncing in and out of stretches"],
    easier: "Fewer stretches", harder: "Follow the Thursday mobility day", swap: ["Easy walk (optional)"]
  },

  /* ---------- Glutes, hamstrings & core ---------- */
  "Kettlebell swings": {
    muscles: "Glutes, hamstrings, core", why: "Explosive hip snap — the same hip extension that powers sprinting and rotation.",
    steps: ["Stand with feet a bit wider than your shoulders, kettlebell a foot in front of you.", "Hinge at the hips, hike the bell back between your legs.", "Snap your hips forward hard so the bell floats to chest height.", "Let it fall back into the hinge and repeat."],
    mistakes: ["Squatting instead of hinging", "Lifting the bell with your arms", "Leaning back at the top"],
    easier: "Lighter bell, fewer reps", harder: "Heavier bell", swap: ["Romanian deadlift", "Broad jumps"]
  },
  "Romanian deadlift": {
    muscles: "Hamstrings, glutes, lower back", why: "Strengthens your hamstrings in a stretched position — your best defense against hamstring pulls.",
    steps: ["Stand holding a bar at your hips, knees slightly bent.", "Push your hips back and slide the bar down your thighs.", "Keep your back flat and lower to mid-shin, feeling the hamstrings stretch.", "Drive your hips forward to stand."],
    mistakes: ["Rounding your back", "Bending your knees into a squat", "Letting the bar drift away from your legs"],
    easier: "Dumbbells, shorter range", harder: "Slow 3-second lowering", swap: ["Single-leg RDL", "Kettlebell swings"]
  },
  "Single-leg leg press": {
    muscles: "Quads, glutes", why: "Evens out strength between your legs so neither side takes extra stress.",
    steps: ["Set up like a normal leg press with one foot in the middle of the platform.", "Lower until your knee reaches about 90°.", "Keep the knee in line with your toes.", "Press up without locking out. Start with your weaker leg."],
    mistakes: ["Knee caving in", "Hips twisting on the seat"],
    easier: "Lighter weight", harder: "Pause at the bottom", swap: ["Dumbbell step-ups", "Reverse lunges"]
  },
  "Hip thrust": {
    muscles: "Glutes, hamstrings", why: "Strong glutes power sprinting, jumping and hip rotation in your swing.",
    steps: ["Sit with your upper back against a bench and a padded bar over your hips.", "Feet flat, about hip-width.", "Tuck your chin and drive through your heels until your hips are in line with your body.", "Squeeze your glutes for 1 second, then lower."],
    mistakes: ["Arching your lower back at the top", "Pushing through your toes"],
    easier: "Glute bridges on the floor", harder: "Single-leg hip thrusts", swap: ["Single-leg glute bridge", "Romanian deadlift"]
  },
  "Dumbbell step-ups": {
    muscles: "Quads, glutes", why: "Single-leg drive like the push-off in your first step.",
    steps: ["Stand facing a knee-height box holding dumbbells.", "Put your whole foot on the box.", "Push through that foot to stand up tall on the box — no bouncing off the back leg.", "Step down with control and repeat."],
    mistakes: ["Pushing off the bottom foot", "Knee caving inward"],
    easier: "Lower box, no weight", harder: "Higher box or heavier dumbbells", swap: ["Walking lunges (dumbbells)", "Single-leg leg press"]
  },
  "Nordic hamstring curls": {
    muscles: "Hamstrings", why: "The most-researched exercise for preventing hamstring strains — worth every rep.",
    steps: ["Kneel on a pad with your ankles anchored under a pad or by a partner.", "Keep your body straight from knees to head.", "Lower yourself forward as slowly as you can.", "Catch yourself with your hands, then push back up to the start."],
    mistakes: ["Bending at the hips", "Dropping fast instead of fighting it"],
    easier: "Hold a band anchored in front of you for help", harder: "Pause halfway down", swap: ["Seated leg curl", "Romanian deadlift"]
  },
  "Leg extensions": {
    muscles: "Quads", why: "Strengthens the quads and the tissues around the knee.",
    steps: ["Sit with the pad on your lower shins and your knees at the machine's pivot.", "Straighten your legs fully.", "Squeeze for a second at the top.", "Take 3 seconds to lower."],
    mistakes: ["Swinging the weight", "Lifting your hips off the seat"],
    easier: "Lighter weight", harder: "One leg at a time", swap: ["Leg press", "Step-ups (chair or bench)"]
  },
  "Landmine rotations": {
    muscles: "Obliques, core, shoulders", why: "Rotational power through your hips and trunk — like your swing, with a controlled path.",
    steps: ["Hold the end of a landmine bar with both hands at arm's length.", "Rotate the bar down toward one hip, pivoting your back foot.", "Drive back through the middle and over to the other side.", "Move from your hips, not just your arms."],
    mistakes: ["Bending your elbows a lot", "Twisting only from your lower back"],
    easier: "Lighter load or just the bar", harder: "Faster reps with control", swap: ["Cable woodchop (high to low)", "Med ball rotational scoop toss"]
  },
  "Ab wheel rollouts": {
    muscles: "Abs, lats, core", why: "Anti-extension strength protects your lower back when you swing and throw hard.",
    steps: ["Kneel holding the wheel under your shoulders.", "Squeeze your glutes and tuck your ribs down.", "Roll out slowly as far as you can without your back arching.", "Pull back to the start."],
    mistakes: ["Letting your lower back sag", "Going farther than you can control"],
    easier: "Shorter range, or roll out toward a wall", harder: "Longer rollouts or from your feet", swap: ["Dead bugs", "Plank shoulder taps"]
  },
  "Broad jumps": {
    muscles: "Glutes, hamstrings, quads", why: "Horizontal power — the direction you move when you sprint and steal.",
    steps: ["Stand with feet hip-width.", "Swing your arms back and dip.", "Swing your arms forward and jump as far as you can.", "Stick the landing for 2 seconds with soft knees."],
    mistakes: ["Landing stiff", "Knees caving in on the landing"],
    easier: "Shorter jumps", harder: "Three jumps in a row", swap: ["Box jumps", "Tuck jumps"]
  },
  "Jumping lunges": {
    muscles: "Quads, glutes", why: "Single-leg power and quick switching.",
    steps: ["Start in a lunge.", "Jump up and switch legs in the air.", "Land softly in a lunge on the other side.", "Stay tall the whole time."],
    mistakes: ["Front knee caving in", "Landing hard"],
    easier: "Reverse lunges without the jump", harder: "More reps or a pause in each lunge", swap: ["Reverse lunges"]
  },
  "Step-ups (chair or bench)": {
    muscles: "Quads, glutes", why: "Single-leg strength for your first step.",
    steps: ["Put your whole foot on a sturdy chair or bench.", "Drive through that heel to stand up tall.", "Don't push off the back leg.", "Step down slowly and repeat."],
    mistakes: ["Using a chair that slides or tips", "Bouncing off the floor foot"],
    easier: "Lower step", harder: "Wear a loaded backpack", swap: ["Reverse lunges"]
  },
  "Step-ups with backpack": {
    muscles: "Quads, glutes", why: "Weighted single-leg strength with no gym.",
    steps: ["Wear or hold a loaded backpack.", "Put your whole foot on a sturdy chair.", "Push through that foot to stand up tall.", "Lower slowly."],
    mistakes: ["Pushing off the back leg", "Knee caving in"],
    easier: "Lighter backpack", harder: "Higher step or more books", swap: ["Reverse lunges"]
  },
  "Reverse lunges": {
    muscles: "Quads, glutes", why: "Knee-friendly single-leg strength.",
    steps: ["Stand tall.", "Step one foot back and lower until the back knee lightly touches the floor.", "Push through your front heel to stand back up.", "Alternate legs or finish one side first."],
    mistakes: ["Leaning forward", "Front knee caving in"],
    easier: "Hold a counter for balance", harder: "Hold a loaded backpack", swap: ["Walking lunges (dumbbells)", "Step-ups (chair or bench)"]
  },
  "Single-leg RDL": {
    muscles: "Hamstrings, glutes, balance", why: "Hamstring strength plus balance on one leg — like fielding and throwing.",
    steps: ["Stand on one leg with a slight knee bend.", "Hinge forward as the other leg goes straight back.", "Keep your hips square to the floor and your back flat.", "Stand back up by squeezing your glute."],
    mistakes: ["Hips opening up to the side", "Rounding your back"],
    easier: "Tap your back toe on the floor", harder: "Hold a backpack or dumbbell", swap: ["Romanian deadlift"]
  },
  "Single-leg RDL (backpack)": {
    muscles: "Hamstrings, glutes, balance", why: "Weighted hamstring strength and balance at home.",
    steps: ["Hold a loaded backpack in the hand opposite your standing leg.", "Hinge forward, back leg straight behind you.", "Keep your hips square.", "Stand back up by squeezing your glute."],
    mistakes: ["Hips twisting open", "Rounded back"],
    easier: "No backpack", harder: "More books", swap: ["Single-leg RDL"]
  },
  "Single-leg glute bridge": {
    muscles: "Glutes, hamstrings", why: "Glute strength one side at a time for sprinting and rotation.",
    steps: ["Lie on your back, one foot flat, the other leg in the air.", "Drive through the heel to lift your hips.", "Squeeze your glute for 1 second at the top, hips level.", "Lower slowly."],
    mistakes: ["Hips tilting to one side", "Pushing through your toes"],
    easier: "Both feet down", harder: "Shoulders on the couch (hip thrust)", swap: ["Single-leg hip thrust (couch)", "Hip thrust"]
  },
  "Single-leg hip thrust (couch)": {
    muscles: "Glutes, hamstrings", why: "A tougher glute exercise with no equipment.",
    steps: ["Sit with your upper back against the couch, one foot flat.", "Lift the other leg.", "Drive through the heel until your hips are in line with your body.", "Squeeze 1 second, then lower."],
    mistakes: ["Arching your lower back", "Hips rotating"],
    easier: "Both feet down", harder: "Hold a backpack on your hips", swap: ["Single-leg glute bridge"]
  },
  "Single-leg hops": {
    muscles: "Calves, quads, glutes", why: "Single-leg power and landing control for cutting and sprinting.",
    steps: ["Stand on one leg.", "Hop forward.", "Stick the landing with your knee over your toes.", "Reset and repeat, then switch legs."],
    mistakes: ["Knee caving in on landing", "Hopping too far to control"],
    easier: "Smaller hops", harder: "Continuous hops", swap: ["Broad jumps"]
  },
  "Nordic curls (feet under couch)": {
    muscles: "Hamstrings", why: "Hamstring-strain prevention at home.",
    steps: ["Kneel on a pillow with your feet hooked under a heavy couch.", "Keep your body straight from knees to head.", "Lower forward as slowly as you can.", "Catch yourself with your hands and push back up."],
    mistakes: ["Bending at the hips", "Using a couch that lifts — make sure it's heavy enough"],
    easier: "Only go partway down", harder: "Slower lowering", swap: ["Single-leg RDL"]
  },

  /* ---------- Core ---------- */
  "Single-leg calf raises": {
    muscles: "Calves", why: "Ankle strength and spring, one leg at a time.",
    steps: ["Stand on one foot on a stair edge, heel hanging off.", "Lower the heel for a full stretch.", "Rise as high as you can.", "Pause at the top, then lower slowly."],
    mistakes: ["Bouncing", "Bending the knee to cheat"],
    easier: "Both feet", harder: "Hold a backpack", swap: ["Standing calf raises"]
  },
  "Plank shoulder taps": {
    muscles: "Core, shoulders", why: "Anti-rotation core strength so your trunk stays solid when you swing and throw.",
    steps: ["Get into a high plank with feet wide.", "Lift one hand and tap the opposite shoulder.", "Put it down and switch.", "Keep your hips from rocking side to side."],
    mistakes: ["Hips swaying", "Feet too close together"],
    easier: "From your knees", harder: "Feet closer together", swap: ["Pallof press", "Dead bugs"]
  },
  "Dead bugs": {
    muscles: "Deep core, abs", why: "Teaches you to keep your core braced while your arms and legs move — like every athletic movement.",
    steps: ["Lie on your back, arms up, knees bent at 90° over your hips.", "Press your lower back into the floor.", "Slowly lower the opposite arm and leg toward the floor.", "Breathe out, return, and switch sides."],
    mistakes: ["Lower back arching off the floor", "Moving too fast"],
    easier: "Move only your legs", harder: "Hold light weights", swap: ["Hollow body hold", "Pallof press"]
  },
  "Russian twists (backpack)": {
    muscles: "Obliques, abs", why: "Rotational core strength for your swing.",
    steps: ["Sit, lean back slightly with your chest up, knees bent.", "Hold a backpack at your chest; lift your feet if you can.", "Rotate the backpack side to side.", "Turn your shoulders, not just your arms."],
    mistakes: ["Rounding your back", "Only moving your arms"],
    easier: "Feet on the floor, no weight", harder: "Heavier backpack", swap: ["Landmine rotations", "Cable woodchop (high to low)"]
  },
  "Superman hold": {
    muscles: "Lower back, glutes, upper back", why: "Balances all the ab work with back strength.",
    steps: ["Lie face down, arms overhead.", "Squeeze your glutes and upper back.", "Lift your arms, chest and legs off the floor.", "Hold, breathing steadily."],
    mistakes: ["Cranking your neck up — keep eyes on the floor"],
    easier: "Lift only arms or only legs", harder: "Longer holds", swap: ["Prone Y-T-W raises"]
  },
  "Side plank hip dips": {
    muscles: "Obliques, glutes", why: "Side-core strength for rotating and staying stable on one leg.",
    steps: ["Get into a side plank on your forearm, feet stacked.", "Lower your hip toward the floor.", "Lift it back up past straight.", "Finish the reps, then switch sides."],
    mistakes: ["Rolling forward", "Elbow not under your shoulder"],
    easier: "Bottom knee down", harder: "Top leg lifted", swap: ["Copenhagen plank (couch)"]
  },
  "Hollow body hold": {
    muscles: "Abs, hip flexors", why: "Total-core tension used in every sprint, throw and swing.",
    steps: ["Lie on your back and press your lower back into the floor.", "Lift your shoulders, arms and legs just off the floor.", "Keep arms and legs long.", "Hold without letting your back arch."],
    mistakes: ["Lower back peeling off the floor"],
    easier: "Bend your knees or keep arms by your sides", harder: "Rock gently in the hollow position", swap: ["Dead bugs"]
  },
  "Med ball overhead slams": {
    muscles: "Abs, lats, shoulders", why: "Total-body power with your core doing the work.",
    steps: ["Stand tall holding a slam ball overhead, up on your toes.", "Slam it into the ground as hard as you can, using your abs.", "Hinge to catch it on the bounce.", "Reset tall and repeat."],
    mistakes: ["Using a ball that bounces back into your face", "Arms-only throws"],
    easier: "Lighter ball", harder: "Rotational slams to each side", swap: ["Plyo push-ups"]
  },

  /* ---------- Shoulders, arms & arm care ---------- */
  "Half-kneeling landmine press": {
    muscles: "Shoulders, upper chest, core", why: "Overhead-style pressing that's easier on throwers' shoulders than a barbell press.",
    steps: ["Kneel on one knee holding the end of a landmine bar at your shoulder (same side as the down knee).", "Squeeze the down-knee glute and brace your core.", "Press the bar up and slightly forward until your arm is straight.", "Lower with control."],
    mistakes: ["Arching your lower back", "Shrugging at the top"],
    easier: "Standing, lighter load", harder: "More weight on the bar", swap: ["Backpack overhead press", "Pike push-ups"]
  },
  "Dumbbell lateral raises": {
    muscles: "Side delts", why: "Builds shoulder muscle for strength and durability.",
    steps: ["Stand holding light dumbbells at your sides.", "Lead with your elbows and raise your arms out to the sides.", "Stop at shoulder height.", "Lower slowly."],
    mistakes: ["Swinging your body", "Going above shoulder height with heavy weight"],
    easier: "Lighter dumbbells", harder: "3-second lowering", swap: ["Rear delt fly"]
  },
  "Rear delt fly": {
    muscles: "Rear delts, upper back", why: "Strengthens the back of the shoulder, which slows your arm down after every throw.",
    steps: ["Hinge forward with a flat back, light dumbbells hanging down.", "Keep a slight bend in your elbows.", "Raise your arms out to the sides, leading with your pinkies.", "Squeeze your shoulder blades, then lower slowly."],
    mistakes: ["Using weights that are too heavy", "Standing up as you lift"],
    easier: "Chest supported on an incline bench", harder: "Pause at the top", swap: ["Face pulls", "Prone Y-T-W raises"]
  },
  "Hammer curls": {
    muscles: "Biceps, forearms", why: "Forearm and grip strength for bat control.",
    steps: ["Stand holding dumbbells at your sides, palms facing in.", "Pin your elbows to your sides.", "Curl the weights up without swinging.", "Lower slowly."],
    mistakes: ["Swinging your body", "Elbows drifting forward"],
    easier: "Lighter weight", harder: "Slow 3-second lowering", swap: ["Backpack curls", "Incline dumbbell curls"]
  },
  "Cable triceps pushdown": {
    muscles: "Triceps", why: "Triceps drive arm extension in your throw and your swing.",
    steps: ["Stand at a high cable with a rope or bar.", "Pin your elbows at your sides.", "Push down until your arms are fully straight and squeeze.", "Let it come up slowly without moving your elbows."],
    mistakes: ["Elbows flaring or moving forward", "Leaning over the weight"],
    easier: "Lighter weight", harder: "Pause at the bottom", swap: ["Chair dips", "Diamond push-ups"]
  },
  "Incline dumbbell curls": {
    muscles: "Biceps", why: "Biceps help protect the elbow when your arm decelerates after a throw.",
    steps: ["Lie back on an incline bench with dumbbells hanging behind you.", "Keep your elbows still.", "Curl the weights up.", "Lower all the way down slowly."],
    mistakes: ["Swinging your elbows forward", "Half reps"],
    easier: "Seated curls", harder: "Slower lowering", swap: ["Hammer curls", "Backpack curls"]
  },
  "Cable external rotation": {
    muscles: "Rotator cuff (back of the shoulder)", why: "The rotator cuff keeps your throwing shoulder healthy — this is arm-care essential.",
    steps: ["Stand sideways to a cable at elbow height, with a rolled towel between your elbow and side.", "Grab the handle with the far hand, elbow bent to 90°.", "Rotate your forearm out, away from your body.", "Return slowly."],
    mistakes: ["Letting the elbow leave your side", "Going too heavy"],
    easier: "Light band", harder: "Slow 3-second return", swap: ["External rotation hold (doorway)", "Face pulls"]
  },
  "Wrist curls + reverse wrist curls": {
    muscles: "Forearms, grip", why: "Stronger forearms help bat control and protect the elbow.",
    steps: ["Sit with forearms on your thighs, wrists past your knees.", "Palms up: curl the dumbbell up with your wrist only.", "Then palms down: lift the back of your hand up.", "Move slowly through the full range."],
    mistakes: ["Moving your forearms", "Going too heavy"],
    easier: "Lighter weight", harder: "More reps", swap: ["Towel wringing", "Farmer's carry"]
  },
  "Farmer's carry": {
    muscles: "Grip, traps, core", why: "Grip strength and a solid core under load.",
    steps: ["Pick up heavy dumbbells or kettlebells.", "Stand tall with your shoulders down.", "Walk with quick, short steps.", "Keep your grip tight the whole way."],
    mistakes: ["Leaning to one side", "Shrugging"],
    easier: "Lighter weights, shorter distance", harder: "One side only (suitcase carry)", swap: ["Towel wringing"]
  },
  "Pike push-ups": {
    muscles: "Shoulders, triceps", why: "Overhead pushing strength with no equipment.",
    steps: ["Get into an upside-down V with your hips high.", "Bend your elbows to lower the top of your head toward the floor.", "Press back up.", "Keep your hips high the whole time."],
    mistakes: ["Letting your hips drop into a push-up", "Flaring your elbows wide"],
    easier: "Hands on a step", harder: "Feet on a chair", swap: ["Backpack overhead press"]
  },
  "Backpack overhead press": {
    muscles: "Shoulders, triceps, core", why: "Builds shoulder strength using a loaded backpack.",
    steps: ["Hold a backpack at chest height.", "Brace your core and squeeze your glutes.", "Press it overhead until your arms are straight.", "Lower with control."],
    mistakes: ["Arching your lower back"],
    easier: "Lighter backpack", harder: "More books", swap: ["Pike push-ups"]
  },
  "Backpack curls": {
    muscles: "Biceps, forearms", why: "Arm strength with no weights.",
    steps: ["Hold the backpack by the top handle or both straps.", "Pin your elbows to your sides.", "Curl it up slowly.", "Lower slowly."],
    mistakes: ["Swinging"],
    easier: "Lighter backpack", harder: "Slower reps", swap: ["Hammer curls"]
  },
  "Diamond push-ups": {
    muscles: "Triceps, chest", why: "Tough triceps work with no equipment.",
    steps: ["Put your hands together under your chest, thumbs and fingers forming a diamond.", "Keep your elbows close to your body.", "Lower your chest to your hands.", "Push back up."],
    mistakes: ["Elbows flaring out", "Hips sagging"],
    easier: "From your knees", harder: "Feet elevated", swap: ["Chair dips"]
  },
  "Wall slides": {
    muscles: "Lower traps, serratus, shoulders", why: "Teaches your shoulder blades to move well overhead — healthy throwing mechanics.",
    steps: ["Stand with your back, head and arms against a wall, arms in a W.", "Slide your arms up the wall as high as you can.", "Keep contact with the wall.", "Slide back down to the W."],
    mistakes: ["Arching your lower back off the wall", "Losing contact with your wrists"],
    easier: "Smaller range", harder: "Add a light band around your wrists", swap: ["Prone Y-T-W raises"]
  },
  "External rotation hold (doorway)": {
    muscles: "Rotator cuff", why: "Rotator-cuff strength for your throwing arm, no equipment needed.",
    steps: ["Stand in a doorway with your elbow bent 90° and tucked at your side.", "Press the back of your hand into the door frame.", "Hold with steady pressure.", "Switch arms."],
    mistakes: ["Letting your elbow drift away from your side", "Pushing so hard it hurts"],
    easier: "Lighter pressure", harder: "Longer holds", swap: ["Cable external rotation"]
  },
  "Towel wringing": {
    muscles: "Forearms, grip", why: "Grip and forearm strength for bat control.",
    steps: ["Roll up a towel and hold it with both hands.", "Wring it hard in one direction.", "Then wring it the other way.", "Keep going for the time."],
    mistakes: ["Going easy — squeeze hard"],
    easier: "Shorter time", harder: "Wet towel for more resistance", swap: ["Wrist curls + reverse wrist curls"]
  },
  /* ---------- Extra library exercises (not in the starting programs; "plan" = default sets when you add one) ---------- */
  "Goblet squat": {
    muscles: "Quads, glutes, core", why: "Teaches a deep, upright squat and builds leg strength with just one dumbbell.",
    steps: ["Hold a dumbbell or kettlebell against your chest with both hands.", "Feet a little wider than your shoulders, toes turned out slightly.", "Sit down between your heels, chest tall, elbows inside your knees.", "Drive up through your whole foot."],
    mistakes: ["Heels lifting", "Chest collapsing forward"], easier: "Squat to a box or bench", harder: "Pause 2 seconds at the bottom", swap: ["Leg press", "Reverse lunges"],
    plan: { sets: 3, reps: "10", rest: 90, track: "weight", cues: "Dumbbell at your chest, sit down between your heels, chest tall." }
  },
  "Bulgarian split squat": {
    muscles: "Quads, glutes, adductors", why: "One of the best single-leg strength builders — evens out your legs and builds a strong drive leg.",
    steps: ["Stand a stride in front of a bench and rest the top of your back foot on it.", "Hold dumbbells at your sides.", "Lower straight down until your back knee nearly touches the floor.", "Drive up through your front foot."],
    mistakes: ["Front foot too close to the bench", "Leaning way forward"], easier: "Bodyweight, hold something for balance", harder: "Heavier dumbbells or a slow 3-second lowering", swap: ["Reverse lunges", "Dumbbell step-ups"],
    plan: { sets: 3, reps: "8/leg", rest: 90, track: "weight", cues: "Back foot on the bench, lower straight down, drive through the front foot." }
  },
  "Band pull-aparts": {
    muscles: "Rear delts, upper back", why: "Quick, easy upper-back work that keeps your throwing shoulder balanced. Great in every warm-up.",
    steps: ["Hold a light band at shoulder height with straight arms, hands shoulder-width.", "Pull the band apart until it touches your chest.", "Squeeze your shoulder blades together.", "Return slowly."],
    mistakes: ["Shrugging", "Bending your elbows a lot"], easier: "Lighter band or wider grip", harder: "Pause 2 seconds with the band at your chest", swap: ["Face pulls", "Prone Y-T-W raises"],
    plan: { sets: 3, reps: "15", rest: 30, track: "reps", cues: "Straight arms, pull the band to your chest, squeeze your shoulder blades." }
  },
  "Scap push-ups": {
    muscles: "Serratus, upper back", why: "Trains the muscle that moves your shoulder blade around your ribcage — key for healthy throwing.",
    steps: ["Get into a high plank with straight arms.", "Without bending your elbows, let your chest sink so your shoulder blades pinch together.", "Push the floor away so your upper back rounds slightly.", "Move slowly for all reps."],
    mistakes: ["Bending the elbows", "Hips sagging"], easier: "From your knees or against a wall", harder: "Pause at the top", swap: ["Wall slides", "Up-downs (plank to push-up)"],
    plan: { sets: 2, reps: "12", rest: 30, track: "reps", cues: "Arms stay straight — only your shoulder blades move." }
  },
  "Med ball chest pass": {
    muscles: "Chest, shoulders, triceps", why: "Explosive upper-body power without heavy weights.",
    steps: ["Stand facing a wall, 6–8 feet away, holding a med ball at your chest.", "Step forward and throw the ball into the wall as hard as you can.", "Catch it on the rebound and reset."],
    mistakes: ["Using a ball that's too heavy to throw fast", "Throwing only with your arms — step into it"], easier: "Lighter ball", harder: "Split stance and full speed", swap: ["Plyo push-ups", "Med ball overhead slams"],
    plan: { sets: 3, reps: "6", rest: 60, track: "reps", cues: "Step and throw the ball into the wall as hard as you can." }
  },
  "Bear crawl": {
    muscles: "Core, shoulders, hips", why: "Whole-body coordination and core control with your knees hovering.",
    steps: ["Start on hands and knees, then lift your knees an inch off the floor.", "Crawl forward moving the opposite hand and foot together.", "Keep your back flat and hips low.", "Go 10–15 yards, then crawl back."],
    mistakes: ["Hips popping up high", "Knees touching down"], easier: "Hold the position without crawling", harder: "Crawl backward or sideways", swap: ["Plank shoulder taps", "Dead bugs"],
    plan: { sets: 3, reps: "15 yd", rest: 45, track: "check", cues: "Knees an inch off the floor, opposite hand and foot move together." }
  },
  "Hip airplanes": {
    muscles: "Glutes, hip rotators, balance", why: "Builds hip control on one leg — the same control you need landing on your stride leg.",
    steps: ["Stand on one leg and hinge forward until your body is roughly parallel to the floor.", "Rotate your hips open toward the ceiling.", "Rotate them back down until level.", "Hold something at first for balance."],
    mistakes: ["Rushing", "Rounding your back"], easier: "Hand on a wall", harder: "Eyes closed or slower reps", swap: ["Single-leg RDL", "90/90 hip switches"],
    plan: { sets: 2, reps: "5/leg", rest: 30, track: "check", cues: "Hinge on one leg, rotate your hips open and closed with control." }
  },
  "Banded lateral walks": {
    muscles: "Glute medius, hips", why: "Wakes up the side glutes that keep your knees stable when you cut and land.",
    steps: ["Put a mini band above your knees or around your ankles.", "Get into a quarter squat.", "Step sideways, keeping tension on the band.", "Go 10 steps each way."],
    mistakes: ["Standing up tall", "Letting your knees cave in"], easier: "Lighter band", harder: "Band around your ankles or a stronger band", swap: ["Lateral shuffles", "Lateral lunges"],
    plan: { sets: 2, reps: "10 steps each way", rest: 30, track: "check", cues: "Stay low, keep tension on the band, knees pushed out." }
  },
  "Suitcase carry": {
    muscles: "Obliques, grip, shoulders", why: "Carrying weight on one side trains your core to stay tall — like holding your posture through a swing.",
    steps: ["Pick up a heavy dumbbell or kettlebell in one hand.", "Stand tall — don't lean toward the weight.", "Walk 30–40 yards with quick steps.", "Switch hands and walk back."],
    mistakes: ["Leaning to the side", "Shrugging the loaded shoulder"], easier: "Lighter weight", harder: "Heavier weight or longer walk", swap: ["Farmer's carry", "Pallof press"],
    plan: { sets: 3, reps: "30 yd/side", rest: 60, track: "weight", cues: "Heavy weight in one hand, stand tall, don't lean." }
  },
  "Band 90/90 external rotation": {
    muscles: "Rotator cuff", why: "Strengthens the rotator cuff in the throwing position — a staple of pitcher arm-care programs.",
    steps: ["Anchor a light band at chest height in front of you.", "Raise your arm to the side, elbow bent 90° at shoulder height, band in hand.", "Rotate your forearm up and back until it points to the ceiling.", "Return slowly."],
    mistakes: ["Letting the elbow drop", "Going too heavy"], easier: "Elbow lower, lighter band", harder: "Pause 2 seconds at the top", swap: ["Cable external rotation", "External rotation hold (doorway)"],
    plan: { sets: 2, reps: "12/arm", rest: 30, track: "reps", cues: "Elbow at shoulder height, rotate up slowly, control it back." }
  },

  "Up-downs (plank to push-up)": {
    muscles: "Shoulders, triceps, core", why: "Shoulder stability and core control.",
    steps: ["Start in a forearm plank.", "Push up onto one hand, then the other, into a high plank.", "Lower back down one forearm at a time.", "Keep your hips steady."],
    mistakes: ["Hips rocking side to side"],
    easier: "From your knees", harder: "Wider feet, faster pace", swap: ["Plank shoulder taps"]
  }
};

// Categories for the exercise library (Plan tab → Exercise library). Every exercise above is listed once.
const EXERCISE_GROUPS = [
  ["Warm-up & cool-down", ["Dynamic warm-up", "Warm-up + band arm care", "Warm-up + arm circles", "Cool-down walk + stretch", "Easy walk (optional)", "Light stretching (optional)"]],
  ["Power & jumps", ["Box jumps", "Broad jumps", "Med ball chest pass", "Tuck jumps", "Jumping lunges", "Single-leg hops", "Plyo push-ups", "Med ball rotational scoop toss", "Med ball overhead slams", "Kettlebell swings"]],
  ["Legs", ["Leg press", "Single-leg leg press", "Goblet squat", "Bulgarian split squat", "Trap bar deadlift", "Romanian deadlift", "Walking lunges (dumbbells)", "Reverse lunges", "Lateral lunges", "Dumbbell step-ups", "Step-ups (chair or bench)", "Step-ups with backpack",
    "Seated leg curl", "Nordic hamstring curls", "Nordic curls (feet under couch)", "Leg extensions", "Hip thrust", "Single-leg glute bridge", "Single-leg hip thrust (couch)", "Single-leg RDL", "Single-leg RDL (backpack)", "Standing calf raises", "Single-leg calf raises"]],
  ["Upper body", ["Dumbbell bench press", "Incline dumbbell press", "Push-ups", "Decline push-ups", "Diamond push-ups", "Pike push-ups", "Pull-ups", "Chest-supported row", "Single-arm dumbbell row",
    "Table inverted rows", "Backpack bent-over rows", "Half-kneeling landmine press", "Backpack overhead press", "Chair dips"]],
  ["Shoulders & arm care", ["Face pulls", "Rear delt fly", "Band pull-aparts", "Scap push-ups", "Band 90/90 external rotation", "Dumbbell lateral raises", "Cable external rotation", "External rotation hold (doorway)", "Prone Y-T-W raises", "Wall slides", "Up-downs (plank to push-up)"]],
  ["Arms & grip", ["Hammer curls", "Incline dumbbell curls", "Backpack curls", "Cable triceps pushdown", "Wrist curls + reverse wrist curls", "Towel wringing", "Farmer's carry"]],
  ["Core & rotation", ["Pallof press", "Hanging knee raises", "Bear crawl", "Suitcase carry", "Cable woodchop (high to low)", "Landmine rotations", "Ab wheel rollouts", "Plank shoulder taps", "Dead bugs", "Russian twists (backpack)",
    "Superman hold", "Side plank hip dips", "Hollow body hold", "Copenhagen plank", "Copenhagen plank (couch)"]],
  ["Speed & agility", ["A-skips & B-skips", "Agility ladder drills", "Pro agility shuttle (5-10-5)", "5-10-5 shuttle", "Sled push", "Lateral skater bounds", "Base-stealing starts (crossover)", "Crossover sprint starts", "Drop-step sprints", "Line hops", "Lateral shuffles"]],
  ["Mobility & recovery", ["Foam roll", "Ball rolling (tennis or lacrosse ball)", "Hip airplanes", "Banded lateral walks", "90/90 hip switches", "World's greatest stretch", "Couch stretch (hip flexors)", "Thoracic open books", "Cross-body shoulder stretch",
    "Lat stretch on rack", "Band hamstring stretch", "Towel hamstring stretch", "Pigeon stretch", "Wrist & forearm stretch", "Cat-cow + deep breathing", "Doorway chest stretch"]]
];
