/* plan.js — the STARTING weekly plan.
   You can change everything inside the app (Plan tab), so you never need to edit
   this file. It is only used the first time the app opens, or when you tap
   "Reset plan" in Settings.

   Each exercise:  ex(name, sets, reps, rest in seconds, what to log, form cues)
   What to log:    "weight" = weight + reps    "reps" = reps only
                   "time"   = seconds          "check" = just tick it off

   Each exercise comes with a YouTube tutorial video (see VIDEOS below). Exercises
   without one get a YouTube search link instead — tap the play button in the app to
   find a video and paste its link to swap it in. */

function ytSearch(q) {
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
}

/* Tutorial video for each exercise (plays inside the app). Every one was checked to exist
   and to allow playing inside other apps. To change one: in the app, tap the video, then
   paste a different YouTube link and tap "Save link". */
const VIDEOS = {
  "Dynamic warm-up": "https://www.youtube.com/watch?v=MNouzjZQ4wo", // Spear Physical Therapy — Baseball Dynamic Stretches - Advice from a New York City Physical Therapist
  "Box jumps": "https://www.youtube.com/watch?v=MkGRfVGyIMA", // Men's Health — How to Do Box Jumps
  "Leg press": "https://www.youtube.com/watch?v=K5n2vg3oZa4", // Colossus Fitness — How to PROPERLY Leg Press (FIX YOUR FORM NOW)
  "Trap bar deadlift": "https://www.youtube.com/watch?v=TU2xZ7s4jus", // Alan Thrall (Untamed Strength) — The Trap Bar Deadlift
  "Walking lunges (dumbbells)": "https://www.youtube.com/watch?v=_DLIS8SySzs", // Colossus Fitness — How to PROPERLY Walking Dumbbell Lunge (FIX THIS NOW!)
  "Lateral lunges": "https://www.youtube.com/watch?v=vwK7vZNQwUI", // Revival Performance Physical Therapy — Lateral lunge - how to do it right.
  "Seated leg curl": "https://www.youtube.com/watch?v=oFxEDkppbSQ", // Physique Development — How to Seated Hamstring Machine Leg Curl | Proper Technique, Set Up, & Mistakes
  "Standing calf raises": "https://www.youtube.com/watch?v=3UWi44yN-wM", // ScottHermanFitness — How To: Standing Barbell Calf Raise
  "Pallof press": "https://www.youtube.com/watch?v=5_8d8vHgZvU", // Girls Gone Strong | Women's Health & Fitness — Pallof Press - How To Do Pallof Presses + Variations
  "Hanging knee raises": "https://www.youtube.com/watch?v=p9hhX_Sx5v0", // Signum Fitness & Nutrition — The Hanging Knee Raise | A Tutorial
  "Warm-up + band arm care": "https://www.youtube.com/watch?v=slqo583qoAg", // Northern Baseball Training — 9 Baseball J-Band Arm Care Exercises | Throw Harder And Avoid Injury
  "Med ball rotational scoop toss": "https://www.youtube.com/watch?v=b7ix5GglVjE", // Suarez Sport and Orthopedic Physical Therapy — Med Ball Scoop Toss
  "Dumbbell bench press": "https://www.youtube.com/watch?v=QsYre__-aro", // Jeremy Ethier — STOP Doing Dumbbell Press Like This (5 Mistakes Slowing Your Chest Gains)
  "Pull-ups": "https://www.youtube.com/watch?v=eGo4IYlbE5g", // Calisthenicmovement — The Perfect Pull Up  - Do it right!
  "Chest-supported row": "https://www.youtube.com/watch?v=vmX58YYK3-8", // Seriously Strong Training — Perfect Dumbbell Chest Supported Rows (KING of Back Exercises)
  "Incline dumbbell press": "https://www.youtube.com/watch?v=IP4oeKh1Sd4", // Max Euceda — How to do the INCLINE DUMBBELL BENCH PRESS! | 2 Minute Tutorial
  "Single-arm dumbbell row": "https://www.youtube.com/watch?v=dFzUjzfih7k", // Max Euceda — How to do the SINGLE ARM DUMBBELL ROW! | 2 Minute Tutorial
  "Plyo push-ups": "https://www.youtube.com/watch?v=FRo3b_Pfw3M", // Howcast — How to Do a Plyo Push-Up & Clap Push-Up | Boot Camp Workout
  "Cable woodchop (high to low)": "https://www.youtube.com/watch?v=WKFHw415Vdw", // Discovery Learning — Cable Woodchop (High to Low)
  "Face pulls": "https://www.youtube.com/watch?v=wnPX6Fwe-Fg", // JPS Health & Fitness — Face Pull Technique 101 (Delt & Back Hypertrophy)
  "A-skips & B-skips": "https://www.youtube.com/watch?v=A7r6yCpmSrA", // Runify — How to Do A-Skip - B-Skip with Proper Form- Find Your Stride with Coach John Smith
  "Agility ladder drills": "https://www.youtube.com/watch?v=h_8U2vQrGww", // lexi blackmon + coach steph kim — 13 Ladder Drills: Speed and Agility Training at home - Footwork for Softball and Baseball Athletes
  "Pro agility shuttle (5-10-5)": "https://www.youtube.com/watch?v=z-wV9O8y-a0", // SKLZ — Instructions for the Pro Agility Test (5-10-5)
  "5-10-5 shuttle": "https://www.youtube.com/watch?v=z-wV9O8y-a0", // SKLZ — Instructions for the Pro Agility Test (5-10-5)
  "Sled push": "https://www.youtube.com/watch?v=QaTrePoCT4g", // Squat University — The ULTIMATE Sled Push/Pull Tutorial
  "Lateral skater bounds": "https://www.youtube.com/watch?v=gjiZLF5S6aA", // Simple Speed Coach — Lateral Bounds ‘Lateral Jumps’ | Lateral Power & Agility Training
  "Base-stealing starts (crossover)": "https://www.youtube.com/watch?v=sodMW2MfjdQ", // MLB Network — Lofton's keys to stealing bases
  "Crossover sprint starts": "https://www.youtube.com/watch?v=sodMW2MfjdQ", // MLB Network — Lofton's keys to stealing bases
  "Drop-step sprints": "https://www.youtube.com/watch?v=qvwkdxepqTk", // Ripken Baseball — Ripken Baseball Fielding Tip - Outfield Drop Step
  "Copenhagen plank": "https://www.youtube.com/watch?v=yByUFuQsgCg", // Athletes' Potential — Copenhagen Plank with Variations
  "Copenhagen plank (couch)": "https://www.youtube.com/watch?v=yByUFuQsgCg", // Athletes' Potential — Copenhagen Plank with Variations
  "Cool-down walk + stretch": "https://www.youtube.com/watch?v=utADwnhrCQ4", // Run Better with Ash — 5 MIN Post-Run Stretching Routine to Maximise Recovery
  "Foam roll": "https://www.youtube.com/watch?v=Oz4xHEgMaLY", // Tom Peto Training — 10 minute Full Body Foam Roller Routine I FOLLOW ALONG
  "90/90 hip switches": "https://www.youtube.com/watch?v=qq_Z7sAmVrA", // Simone Sports Performance — 90/90 Hip Switch (Improve Hip Health & Mobility)
  "World's greatest stretch": "https://www.youtube.com/watch?v=-CiWQ2IvY34", // Squat University — The World's Greatest Stretch (Mobility Exercise) by Squat University
  "Couch stretch (hip flexors)": "https://www.youtube.com/watch?v=d9pOjXCKGN8", // Tom Morrison — The Couch Stretch Done Correctly
  "Thoracic open books": "https://www.youtube.com/watch?v=rDviWORCWEw", // Revival Performance Physical Therapy — Open Books (Sidelying Thoracic Rotation)
  "Cross-body shoulder stretch": "https://www.youtube.com/watch?v=aIq0fLi8iak", // React Physical Therapy — Shoulder Crossbody Stretch
  "Lat stretch on rack": "https://www.youtube.com/watch?v=izMQh1NeyRU", // TheProactiveAthlete — Lat Stretch
  "Band hamstring stretch": "https://www.youtube.com/watch?v=Il1L75v6gq0", // AskDoctorJo — Hamstring Stretch with a Strap, Supine - Ask Doctor Jo
  "Pigeon stretch": "https://www.youtube.com/watch?v=-kbDw9y0BZ4", // Blessing Health System — Pigeon Stretch
  "Wrist & forearm stretch": "https://www.youtube.com/watch?v=rDqYtzYE-n8", // BeaconOrtho — Wrist Flexion and Extension Stretches for Athletes
  "Cat-cow + deep breathing": "https://www.youtube.com/watch?v=1Y0YjXS9sKI", // Hinge Health — How to Do a Cat Cow Stretch: A Guide from Physical Therapists
  "Kettlebell swings": "https://www.youtube.com/watch?v=LBhaLLc153A", // Squat University — The Kettlebell Swing Technique Everyone Gets WRONG!
  "Romanian deadlift": "https://www.youtube.com/watch?v=7j-2w4-P14I", // Nuffield Health — Romanian Deadlift | Nuffield Health
  "Single-leg leg press": "https://www.youtube.com/watch?v=ZYDTJaAM-gE", // Buff Dudes Workouts — SINGLE LEG PRESS | Legs | How-To Exercise Tutorial
  "Hip thrust": "https://www.youtube.com/watch?v=Zp26q4BY5HE", // Girls Gone Strong | Women's Health & Fitness — How To Do a Barbell Hip Thrust
  "Dumbbell step-ups": "https://www.youtube.com/watch?v=aKj-6hgiViA", // Colossus Fitness — How To PROPERLY Perform Dumbbell Step Ups (GLUTE FOCUSED)
  "Nordic hamstring curls": "https://www.youtube.com/watch?v=6NCN6kOagfY", // The Kneesovertoesguy — How to Do a Nordic Hamstring Curl
  "Nordic curls (feet under couch)": "https://www.youtube.com/watch?v=xJiyXM5EW8c", // Apollo Performance Therapy — Nordic Hamstring Curl at Home
  "Leg extensions": "https://www.youtube.com/watch?v=ljO4jkwv8wQ", // Jeff Nippard — How To Do Leg Extensions With Perfect Technique (Grow Every Quad Head)
  "Landmine rotations": "https://www.youtube.com/watch?v=DiVMWoLCTLo", // Swift Movement Academy — How To Do Landmine Rotations
  "Ab wheel rollouts": "https://www.youtube.com/watch?v=rqiTPdK1c_I", // Mind Pump TV — Ab Wheel- How to PROPERLY Use an Ab Wheel | MIND PUMP
  "Med ball overhead slams": "https://www.youtube.com/watch?v=QxYhFwMd1Ks", // CORE Strong Fitness — How to Perform the Med Ball Slam
  "Half-kneeling landmine press": "https://www.youtube.com/watch?v=PY9HorHANhc", // Colossus Fitness — How To PROPERLY Half Kneeling Landmine Press For Muscle Gain
  "Dumbbell lateral raises": "https://www.youtube.com/watch?v=pgrWjBfaFe8", // Colossus Fitness — How to PROPERLY Dumbbell Lateral Raise For Bigger Shoulders (FIX THIS!)
  "Rear delt fly": "https://www.youtube.com/watch?v=buuYPLVXsJg", // Colossus Fitness — How to PROPERLY Dumbbell Rear Delt Fly | Reverse Dumbbell Fly Tutorial
  "Hammer curls": "https://www.youtube.com/watch?v=BRVDS6HVR9Q", // Buff Dudes Workouts — How To Perform HAMMER CURLS | Biceps Exercise Tutorial
  "Cable triceps pushdown": "https://www.youtube.com/watch?v=2-LAMcpzODU", // ScottHermanFitness — How To: Tricep Pushdown (Life Fitness Cable)
  "Incline dumbbell curls": "https://www.youtube.com/watch?v=HhHHBj3qTJ4", // Max Euceda — How to do the INCLINE DUMBBELL CURL! | 2 Minute Tutorial
  "Cable external rotation": "https://www.youtube.com/watch?v=PVdgjHqAes8", // Muscle & Motion — Shoulder External Rotation (With Cable)
  "Wrist curls + reverse wrist curls": "https://www.youtube.com/watch?v=04u4uGk3Ia8", // Whats Up Dude — How To Perform Do Wrist Curls And Reverse Wrist Curls With Dumbbells
  "Farmer's carry": "https://www.youtube.com/watch?v=NH7Xv-7NQNQ", // Buff Dudes Workouts — How To Perform Farmer Walks Exercise Tutorial
  "Light stretching (optional)": "https://www.youtube.com/watch?v=XrmCR5m_Nwo", // Jessica Valant — 10 Minute Stretch Workout at Home - Full Body Stretching Exercises!
  "Broad jumps": "https://www.youtube.com/watch?v=XqpN9AbLMe4", // VelocityMTP — Broad Jump Technique
  "Jumping lunges": "https://www.youtube.com/watch?v=cIkkHg8YZQU", // FitnessBlender — Lunge, Jumping
  "Step-ups (chair or bench)": "https://www.youtube.com/watch?v=elhu-WC1qk4", // [P]rehab — Proper Step Ups/Downs
  "Step-ups with backpack": "https://www.youtube.com/watch?v=elhu-WC1qk4", // [P]rehab — Proper Step Ups/Downs
  "Reverse lunges": "https://www.youtube.com/watch?v=Ry-wqegeKlE", // Dr. Carl Baird — How To Perform The Reverse Lunge
  "Single-leg RDL": "https://www.youtube.com/watch?v=84hrdsHgDuQ", // Well+Good — How To Do A Single Leg Deadlift | The Right Way | Well+Good
  "Single-leg RDL (backpack)": "https://www.youtube.com/watch?v=84hrdsHgDuQ", // Well+Good — How To Do A Single Leg Deadlift | The Right Way | Well+Good
  "Single-leg glute bridge": "https://www.youtube.com/watch?v=yFNjwkUNIao", // Michael Hermann | Performance Revolution — How To Single Leg  Glute Bridge Properly
  "Single-leg calf raises": "https://www.youtube.com/watch?v=qPd73snQfUs", // Hospital for Special Surgery — Single-Leg Calf Raise (HSS)
  "Plank shoulder taps": "https://www.youtube.com/watch?v=gKA5LBy7WAI", // Wellen — How To Properly Do a Plank with Shoulder Taps - Strength Exercises - Wellen
  "Dead bugs": "https://www.youtube.com/watch?v=GbSC02oU3To", // Hinge Health — How to Do a Dead Bug: A Guide from Physical Therapists
  "Warm-up + arm circles": "https://www.youtube.com/watch?v=140RTNMciH8", // FitnessBlender — Arm Circles (Lv 1)
  "Push-ups": "https://www.youtube.com/watch?v=IODxDxX7oi4", // Calisthenicmovement — The Perfect Push Up | Do it right!
  "Table inverted rows": "https://www.youtube.com/watch?v=FKKZRwBJDxE", // Andrew Heming — Table Rows
  "Backpack bent-over rows": "https://www.youtube.com/watch?v=TbcCeguuv_4", // Deep Well Athletics — Backpack Bent Over Row
  "Decline push-ups": "https://www.youtube.com/watch?v=SKPab2YC8BE", // ScottHermanFitness — How To: Decline Push-Up
  "Prone Y-T-W raises": "https://www.youtube.com/watch?v=QdGTI4Lshg4", // The Active Life — Prone Y T W
  "Russian twists (backpack)": "https://www.youtube.com/watch?v=wkD8rjkodUI", // Howcast — How to Do a Russian Twist | Ab Workout
  "Superman hold": "https://www.youtube.com/watch?v=J9zXkxUAfUA", // Children's Hospital Colorado — Core Exercise: Superman
  "Chair dips": "https://www.youtube.com/watch?v=AWz_7B1cch0", // Coach Nick Fitness — How To Properly Do Tricep Chair Dips - 3 Common Mistakes
  "Line hops": "https://www.youtube.com/watch?v=shxZipefgXI", // Dave Paczkowski — Line Hops
  "Tuck jumps": "https://www.youtube.com/watch?v=Yl7tEmpzknY", // Onnit — Onnit Tutorials | Tuck Jumps
  "Lateral shuffles": "https://www.youtube.com/watch?v=bcZkk8vMzA4", // Parisi Speed School — Side Shuffle Drill
  "Ball rolling (tennis or lacrosse ball)": "https://www.youtube.com/watch?v=rUjoQuJ36OU", // Antranik Kizirian — ⚽ How to use a Lacrosse Ball ⚽ for Self Massage with Antranik
  "Doorway chest stretch": "https://www.youtube.com/watch?v=CEQMx4zFwYs", // MidwestOrtho — Doorway Pec Stretch
  "Towel hamstring stretch": "https://www.youtube.com/watch?v=_HAUA3rrCVw", // CoastalPhysiotherapy — Hamstring Stretch with Towel
  "Single-leg hops": "https://www.youtube.com/watch?v=7WgzHOQGgYw", // Elevate Yourself — Single Leg Hops | Exercise Tutorial
  "Single-leg hip thrust (couch)": "https://www.youtube.com/watch?v=qCObDXTe4KY", // Mind Pump TV — How To Do A Single Leg Hip Thrust (Exercise Demo) - FREE Great Butt Guide
  "Side plank hip dips": "https://www.youtube.com/watch?v=LgaYt4Hi6-g", // Howcast — How to Do a Side Plank with Hip Lifts | Abs Workout
  "Hollow body hold": "https://www.youtube.com/watch?v=hf00_b2sRdc", // Men's Health — How to Perfect Your Hollow Hold | Form Check | Men's Health
  "Pike push-ups": "https://www.youtube.com/watch?v=fXgou2W10ok", // The Bodyweight Process — How to Pike Push Up | Beginner (Progressions)
  "Backpack overhead press": "https://www.youtube.com/watch?v=2tZgG_zNx7w", // Stay Heavy Fitness — Backpack Overhead Press
  "Backpack curls": "https://www.youtube.com/watch?v=dKqtGGScQhQ", // Nick Bolton — Backpack bicep curls
  "Diamond push-ups": "https://www.youtube.com/watch?v=J0DnG1_S92I", // ScottHermanFitness — How To: Diamond Push-Up
  "Wall slides": "https://www.youtube.com/watch?v=tWDGEyMWv10", // Jack Hanrahan Fitness  — Easy fix for rounded shoulders - Scapula Wall Slides #mobility
  "External rotation hold (doorway)": "https://www.youtube.com/watch?v=Srthrc0W1S8", // Medbridge — Standing Isometric Shoulder External Rotation with Doorway | MedBridge
  "Towel wringing": "https://www.youtube.com/watch?v=qvxf9uBHNUw", // Old School Strength — FOREARM TRAINING ( TOWEL WRINGING )
  "Up-downs (plank to push-up)": "https://www.youtube.com/watch?v=L4oFJRDAU4Q" // oxygenmagazine — Up and Down Plank
};

function ex(name, sets, reps, rest, track, cues, search) {
  return { name, sets, reps, rest, track, cues, video: VIDEOS[name] || ytSearch(search || name + " proper form") };
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

/* ============================ OTHER PROGRAMS ============================
   Switch in the app: Plan tab → Programs. Each program has a gym and a home version.
   like(name, sets, reps, rest) copies an exercise (cues, video, what to log) from the plan above. */
function like(name, sets, reps, rest) {
  for (const mode of ["gym", "home"]) for (const day of DEFAULT_PLAN[mode]) {
    const e = day.exercises.find(x => x.name === name);
    if (e) return { ...e, sets, reps, rest: rest ?? e.rest };
  }
  throw new Error("plan.js: no exercise named " + name);
}

// In-season: keep strength and speed with two short lifts, and protect the arm around games.
const IN_SEASON_PLAN = {
  gym: [
    { title: "Total Body Strength A", type: "strength", focus: "Short and heavy — keep your strength without leaving you sore for games. Stop 1–2 reps short of failure.",
      exercises: [WARMUP(8), like("Box jumps", 3, "3", 90), like("Trap bar deadlift", 3, "4", 150), like("Dumbbell bench press", 3, "6", 120),
        like("Chest-supported row", 3, "8", 90), like("Walking lunges (dumbbells)", 2, "6/leg", 90), like("Pallof press", 2, "10/side", 45), like("Cable external rotation", 2, "12/arm", 30)] },
    { title: "Arm Care + Mobility", type: "mobility", focus: "15–20 easy minutes that keep your shoulder and hips moving well between games.",
      exercises: [like("Warm-up + band arm care", 1, "8 min", 0), like("Face pulls", 2, "15", 45), like("Thoracic open books", 2, "10/side", 15),
        like("90/90 hip switches", 2, "10", 30), like("Cross-body shoulder stretch", 2, "30 sec/side", 15), like("Wrist & forearm stretch", 2, "30 sec each", 15)] },
    { title: "Speed Tune-Up", type: "agility", focus: "Low volume, full speed. A few fast reps keep you quick without draining your legs.",
      exercises: [WARMUP(10), like("A-skips & B-skips", 2, "20 yd", 45), like("Base-stealing starts (crossover)", 4, "10 yd", 60),
        like("Pro agility shuttle (5-10-5)", 3, "1", 90), like("Copenhagen plank", 2, "20 sec/side", 45), COOLDOWN] },
    { title: "Total Body Strength B", type: "strength", focus: "Posterior chain, pulling and rotational power. Skip it if you have a game tomorrow and feel beat up.",
      exercises: [like("Warm-up + band arm care", 1, "8 min", 0), like("Med ball rotational scoop toss", 3, "4/side", 60), like("Romanian deadlift", 3, "6", 120),
        like("Half-kneeling landmine press", 3, "6/arm", 90), like("Pull-ups", 3, "5", 120), like("Dumbbell step-ups", 2, "6/leg", 75),
        like("Cable woodchop (high to low)", 2, "8/side", 45), like("Nordic hamstring curls", 2, "4", 90)] },
    { title: "Game Prep: Mobility", type: "mobility", focus: "Loosen up for the weekend. Nothing hard.",
      exercises: [like("Foam roll", 1, "6 min", 0), like("World's greatest stretch", 2, "5/side", 30), like("Couch stretch (hip flexors)", 2, "45 sec/side", 15),
        like("Band hamstring stretch", 2, "45 sec/side", 15), like("Cat-cow + deep breathing", 1, "3 min", 0)] },
    { title: "Game Day: Arm Care", type: "mobility", focus: "Quick arm prep before you warm up with the team. Save your energy for the game.",
      exercises: [like("Warm-up + band arm care", 1, "8 min", 0), like("Light stretching (optional)", 1, "10 min", 0)] },
    REST_DAY
  ],
  home: [
    { title: "Total Body Strength A", type: "strength", focus: "No equipment in-season lift. Stop 1–2 reps short of failure so you're fresh for games.",
      exercises: [WARMUP(8), like("Broad jumps", 3, "3", 60), like("Single-leg RDL (backpack)", 3, "6/leg", 60), like("Push-ups", 3, "10", 60),
        like("Table inverted rows", 3, "8", 75), like("Reverse lunges", 2, "8/leg", 60), like("Dead bugs", 2, "8/side", 45), like("External rotation hold (doorway)", 2, "20 sec/arm", 30)] },
    { title: "Arm Care + Mobility", type: "mobility", focus: "15–20 easy minutes for your shoulder and hips between games.",
      exercises: [like("Warm-up + arm circles", 1, "8 min", 0), like("Prone Y-T-W raises", 2, "8 each", 45), like("Wall slides", 2, "10", 30),
        like("Thoracic open books", 2, "10/side", 15), like("90/90 hip switches", 2, "10", 30), like("Wrist & forearm stretch", 2, "30 sec each", 15)] },
    { title: "Speed Tune-Up", type: "agility", focus: "A few fast reps in the driveway or park. Rest fully between them.",
      exercises: [WARMUP(10), like("A-skips & B-skips", 2, "20 yd", 45), like("Crossover sprint starts", 4, "10 yd", 60),
        like("5-10-5 shuttle", 3, "1", 90), like("Copenhagen plank (couch)", 2, "20 sec/side", 45), COOLDOWN] },
    { title: "Total Body Strength B", type: "strength", focus: "Hamstrings, pulling and core. Skip it if you have a game tomorrow and feel beat up.",
      exercises: [like("Warm-up + arm circles", 1, "8 min", 0), like("Single-leg hops", 2, "4/leg", 60), like("Nordic curls (feet under couch)", 2, "4", 90),
        like("Pike push-ups", 3, "6", 60), like("Backpack bent-over rows", 3, "10", 60), like("Step-ups with backpack", 2, "6/leg", 60), like("Russian twists (backpack)", 2, "16", 45)] },
    { title: "Game Prep: Mobility", type: "mobility", focus: "Loosen up for the weekend. Nothing hard.",
      exercises: [like("Ball rolling (tennis or lacrosse ball)", 1, "6 min", 0), like("World's greatest stretch", 2, "5/side", 30), like("Couch stretch (hip flexors)", 2, "45 sec/side", 15),
        like("Towel hamstring stretch", 2, "45 sec/side", 15), like("Cat-cow + deep breathing", 1, "3 min", 0)] },
    { title: "Game Day: Arm Care", type: "mobility", focus: "Quick arm prep before team warm-ups. Save your energy for the game.",
      exercises: [like("Warm-up + arm circles", 1, "8 min", 0), like("External rotation hold (doorway)", 2, "20 sec/arm", 30), like("Light stretching (optional)", 1, "10 min", 0)] },
    REST_DAY
  ]
};

// Pre-season: the ~6 weeks before opening day. Heavy but lower-rep strength, more power and speed, arm ramp-up.
const PRE_SEASON_PLAN = {
  gym: [
    { title: "Lower Power + Strength", type: "strength", focus: "Fewer reps, more speed. Move every rep as fast as you can with good form.",
      exercises: [WARMUP(8), like("Box jumps", 4, "3", 90), like("Trap bar deadlift", 4, "3", 180), like("Walking lunges (dumbbells)", 3, "6/leg", 90),
        like("Lateral skater bounds", 3, "4/side", 60), like("Nordic hamstring curls", 2, "5", 90), like("Pallof press", 2, "10/side", 45)] },
    { title: "Speed + Base Running", type: "agility", focus: "Game-speed starts and cuts. Full rest between reps — every rep should be your fastest.",
      exercises: [WARMUP(10), like("A-skips & B-skips", 3, "20 yd", 45), like("Base-stealing starts (crossover)", 6, "15 yd", 75), like("Pro agility shuttle (5-10-5)", 5, "1", 90),
        like("Drop-step sprints", 5, "20 yd", 60), like("Copenhagen plank", 2, "25 sec/side", 45), COOLDOWN] },
    { title: "Arm Care + Mobility", type: "mobility", focus: "Your arm is ramping up for the season. Take care of it every week.",
      exercises: [like("Warm-up + band arm care", 1, "10 min", 0), like("Face pulls", 3, "15", 45), like("Cable external rotation", 2, "12/arm", 30),
        like("Thoracic open books", 2, "10/side", 15), like("90/90 hip switches", 2, "10", 30), like("Cross-body shoulder stretch", 2, "30 sec/side", 15)] },
    { title: "Upper Power + Strength", type: "strength", focus: "Rotational power and pulling strength for bat speed and a healthy arm.",
      exercises: [like("Warm-up + band arm care", 1, "8 min", 0), like("Med ball rotational scoop toss", 4, "5/side", 60), like("Plyo push-ups", 3, "5", 60),
        like("Dumbbell bench press", 4, "5", 120), like("Pull-ups", 4, "5", 120), like("Chest-supported row", 3, "8", 90), like("Landmine rotations", 3, "6/side", 60)] },
    { title: "Speed Tune-Up", type: "agility", focus: "Short and sharp. Stay fresh for scrimmages.",
      exercises: [WARMUP(10), like("Agility ladder drills", 4, "1 pattern", 30), like("Crossover sprint starts", 4, "10 yd", 60), like("Lateral shuffles", 3, "10 yd each way", 45), COOLDOWN] },
    { title: "Scrimmage Prep: Mobility", type: "mobility", focus: "Loosen up before the weekend. Nothing hard.",
      exercises: [like("Foam roll", 1, "8 min", 0), like("World's greatest stretch", 2, "5/side", 30), like("Couch stretch (hip flexors)", 2, "45 sec/side", 15),
        like("Pigeon stretch", 2, "45 sec/side", 15), like("Cat-cow + deep breathing", 1, "3 min", 0)] },
    REST_DAY
  ],
  home: [
    { title: "Lower Power + Strength", type: "strength", focus: "Fewer reps, more speed. A loaded backpack makes it harder.",
      exercises: [WARMUP(8), like("Broad jumps", 4, "3", 60), like("Jumping lunges", 3, "4/leg", 60), like("Single-leg RDL (backpack)", 3, "6/leg", 60),
        like("Lateral skater bounds", 3, "4/side", 60), like("Nordic curls (feet under couch)", 2, "5", 90), like("Dead bugs", 2, "8/side", 45)] },
    { title: "Speed + Base Running", type: "agility", focus: "Game-speed starts and cuts in the driveway or park. Rest fully between reps.",
      exercises: [WARMUP(10), like("A-skips & B-skips", 3, "20 yd", 45), like("Crossover sprint starts", 6, "15 yd", 75), like("5-10-5 shuttle", 5, "1", 90),
        like("Drop-step sprints", 5, "20 yd", 60), like("Copenhagen plank (couch)", 2, "25 sec/side", 45), COOLDOWN] },
    { title: "Arm Care + Mobility", type: "mobility", focus: "Your arm is ramping up for the season. Take care of it every week.",
      exercises: [like("Warm-up + arm circles", 1, "10 min", 0), like("Prone Y-T-W raises", 3, "8 each", 45), like("External rotation hold (doorway)", 2, "20 sec/arm", 30),
        like("Wall slides", 2, "10", 30), like("Thoracic open books", 2, "10/side", 15), like("90/90 hip switches", 2, "10", 30)] },
    { title: "Upper Power + Strength", type: "strength", focus: "Explosive pushing plus pulling strength for your swing and throw.",
      exercises: [like("Warm-up + arm circles", 1, "8 min", 0), like("Plyo push-ups", 4, "5", 60), like("Pike push-ups", 3, "6", 60),
        like("Table inverted rows", 4, "8", 75), like("Backpack bent-over rows", 3, "10", 60), like("Russian twists (backpack)", 3, "16", 45)] },
    { title: "Speed Tune-Up", type: "agility", focus: "Short and sharp. Stay fresh for scrimmages.",
      exercises: [WARMUP(10), like("Line hops", 3, "20 sec", 30), like("Crossover sprint starts", 4, "10 yd", 60), like("Lateral shuffles", 3, "10 yd each way", 45), COOLDOWN] },
    { title: "Scrimmage Prep: Mobility", type: "mobility", focus: "Loosen up before the weekend. Nothing hard.",
      exercises: [like("Ball rolling (tennis or lacrosse ball)", 1, "8 min", 0), like("World's greatest stretch", 2, "5/side", 30), like("Couch stretch (hip flexors)", 2, "45 sec/side", 15),
        like("Pigeon stretch", 2, "45 sec/side", 15), like("Cat-cow + deep breathing", 1, "3 min", 0)] },
    REST_DAY
  ]
};

const PROGRAMS = {
  offseason: { name: "Off-season build", tag: "5 training days", plan: DEFAULT_PLAN,
    about: "Late summer to winter, when you're not playing games: build strength, power and speed with 3 lifts, a speed day and a mobility day each week." },
  preseason: { name: "Pre-season sharpen", tag: "Power + speed", plan: PRE_SEASON_PLAN,
    about: "The last ~6 weeks before opening day: heavy but lower-rep lifting, more power and game-speed sprinting, and a steady arm-care ramp-up." },
  inseason: { name: "In-season maintain", tag: "2 lifts + speed", plan: IN_SEASON_PLAN,
    about: "Keep your strength and speed during the season without being sore for games: 2 short lifts, a speed tune-up, arm care and mobility. Move days around your game schedule." }
};
