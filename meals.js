/* meals.js — meal ideas, recipes and eating tips for the Diet tab (Meals view).
   Like plan.js, you never need to edit this file — it's the built-in recipe book.

   Each recipe:
     meals   which meals it fits: breakfast, lunch, pre (pre-workout), post (post-workout), dinner, snack
     tags    quick (10 min or less) · nocook · prep (make ahead) · veg (vegetarian) · game (game-day friendly)
     min     minutes to make           makes   how many servings the recipe makes
     cal / pro / carb / fat            per ONE serving (grams for pro, carb, fat)
     why     why it's good for a ballplayer
     ing     ingredients for the whole recipe      steps   how to make it

   Numbers are estimates from standard nutrition data — brands vary, so check your labels. */

const MEAL_TAGS = { quick: "Quick", nocook: "No cook", prep: "Make ahead", veg: "Vegetarian", game: "Game day" };

const RECIPES = [
  /* ---------------------------- Breakfast ---------------------------- */
  { id: "overnight-oats", name: "Protein overnight oats", meals: ["breakfast"], tags: ["prep", "nocook", "veg"], min: 5, makes: 1,
    cal: 600, pro: 51, carb: 70, fat: 14,
    why: "Made the night before, so breakfast takes zero minutes. Oats give slow-burning carbs for training and it starts your day with 50 g of protein.",
    ing: ["¾ cup old-fashioned oats", "1 scoop vanilla protein powder", "1 tbsp chia seeds", "¾ cup milk", "½ cup plain Greek yogurt", "½ cup berries (frozen is fine)"],
    steps: ["In a jar or container, stir the oats, protein powder and chia seeds.", "Add the milk and yogurt and stir until there's no dry powder left.", "Top with the berries, put the lid on and refrigerate overnight (at least 4 hours).", "Eat it cold, or microwave 1–2 minutes. Make 3 at once — they keep 3 days."] },

  { id: "egg-scramble", name: "Big egg scramble + toast", meals: ["breakfast"], tags: ["quick"], min: 10, makes: 1,
    cal: 690, pro: 50, carb: 63, fat: 27,
    why: "Eggs are one of the best proteins there is. Toast and a banana add the carbs you need to train hard later.",
    ing: ["3 eggs", "½ cup liquid egg whites", "1 handful spinach", "¼ cup shredded cheddar", "2 slices whole-wheat toast", "1 banana", "Salt, pepper, cooking spray"],
    steps: ["Whisk the eggs and egg whites with a pinch of salt and pepper.", "Spray a nonstick pan and wilt the spinach over medium heat, about 30 seconds.", "Pour in the eggs and stir slowly with a spatula until just set — pull them off the heat while still a little shiny.", "Sprinkle the cheese on top and fold it in.", "Serve with toast and a banana."] },

  { id: "protein-pancakes", name: "Banana protein pancakes", meals: ["breakfast"], tags: ["veg"], min: 15, makes: 1,
    cal: 640, pro: 54, carb: 75, fat: 15,
    why: "Tastes like a weekend breakfast but has more protein than most dinners. Great before a morning practice or on game day with extra syrup.",
    ing: ["1 ripe banana", "2 eggs", "½ cup oats", "1 scoop vanilla protein powder", "½ tsp baking powder + pinch of cinnamon", "½ cup plain Greek yogurt (topping)", "1 tbsp maple syrup"],
    steps: ["Blend the banana, eggs, oats, protein powder, baking powder and cinnamon until smooth (or mash the banana and stir with quick oats).", "Heat a nonstick pan over medium-low and spray it with oil.", "Pour about ¼ cup of batter per pancake. Flip when bubbles form, about 2 minutes, then cook 1 minute more.", "Top with the yogurt and syrup."] },

  { id: "breakfast-burritos", name: "Freezer breakfast burritos", meals: ["breakfast"], tags: ["prep"], min: 30, makes: 6,
    cal: 600, pro: 40, carb: 48, fat: 27,
    why: "Make six on Sunday and breakfast is handled for the week — just microwave and go. Protein, carbs and fat in one hand.",
    ing: ["12 eggs", "1 lb (450 g) lean ground turkey", "1 tsp chili powder + 1 tsp garlic powder + salt", "1 can (15 oz) black beans, rinsed", "1 cup shredded cheddar", "6 large (10-inch) flour tortillas", "Salsa to serve"],
    steps: ["Brown the turkey with the spices in a big pan, about 8 minutes, then move it to a bowl.", "Scramble the eggs in the same pan until just set.", "Fill each tortilla with eggs, turkey, beans and cheese. Fold in the sides and roll tight.", "Wrap each one in foil or plastic wrap and freeze (up to 2 months).", "To eat: unwrap, wrap in a damp paper towel and microwave 2–2½ minutes, flipping halfway. Add salsa."] },

  { id: "yogurt-bowl", name: "Greek yogurt power bowl", meals: ["breakfast", "snack"], tags: ["quick", "nocook", "veg"], min: 3, makes: 1,
    cal: 590, pro: 41, carb: 87, fat: 10,
    why: "Lots of protein with almost no cooking. Granola and fruit bring quick carbs — a half serving makes a great snack.",
    ing: ["1½ cups plain Greek yogurt", "½ cup granola", "1 cup berries", "1 tbsp honey"],
    steps: ["Spoon the yogurt into a bowl.", "Top with the granola and berries.", "Drizzle the honey on top. (Packing it to go? Keep the granola separate so it stays crunchy.)"] },

  { id: "pb-banana-bagel", name: "PB & banana bagel + milk", meals: ["breakfast"], tags: ["quick", "game", "veg"], min: 5, makes: 1,
    cal: 690, pro: 26, carb: 99, fat: 23,
    why: "A classic game-day breakfast: lots of easy carbs to fill your energy tank 3–4 hours before first pitch.",
    ing: ["1 plain bagel", "2 tbsp peanut butter", "1 banana, sliced", "1 cup milk"],
    steps: ["Toast the bagel.", "Spread the peanut butter and top with banana slices.", "Drink a glass of milk with it."] },

  { id: "banana-oatmeal", name: "Quick banana oatmeal", meals: ["breakfast", "pre"], tags: ["quick", "game", "veg"], min: 5, makes: 1,
    cal: 390, pro: 14, carb: 70, fat: 8,
    why: "Warm, easy-to-digest carbs. Eat it 1–2 hours before training or a game. For a bigger breakfast, stir in a scoop of protein powder.",
    ing: ["½ cup oats", "1 cup milk", "½ banana, sliced", "1 tbsp honey", "Cinnamon + pinch of salt"],
    steps: ["Microwave the oats and milk in a big bowl for 2 minutes, stirring halfway.", "Stir in the banana, honey, cinnamon and salt."] },

  /* ---------------------------- Lunch ---------------------------- */
  { id: "chicken-rice-bowls", name: "Chicken, rice & broccoli bowls", meals: ["lunch", "post", "dinner"], tags: ["prep", "game"], min: 30, makes: 4,
    cal: 600, pro: 58, carb: 57, fat: 14,
    why: "The go-to athlete meal prep: lean protein to rebuild muscle, rice to refuel. Four lunches in one pan.",
    ing: ["2 lb (900 g) boneless chicken breast", "4 cups broccoli florets", "2 tbsp olive oil", "1 tsp garlic powder, salt, pepper", "4 cups cooked rice (about 1⅓ cups dry)", "½ cup teriyaki sauce or salsa"],
    steps: ["Heat the oven to 425°F (220°C).", "Toss the chicken and broccoli with the oil and seasoning on a sheet pan (chicken on one side).", "Bake 20–22 minutes, until the chicken reaches 165°F (74°C) in the thickest part.", "Meanwhile, cook the rice.", "Slice the chicken and split everything into 4 containers with 2 tbsp sauce each. Keeps 4 days in the fridge — microwave 2 minutes."] },

  { id: "turkey-wrap", name: "Turkey & cheese wrap + fruit", meals: ["lunch"], tags: ["quick", "nocook", "game"], min: 5, makes: 1,
    cal: 720, pro: 41, carb: 94, fat: 20,
    why: "Packs well for school or the field. Plenty of carbs and protein without anything greasy that sits heavy.",
    ing: ["1 large (10-inch) flour tortilla", "2 tbsp hummus", "5 oz (140 g) sliced deli turkey", "1 slice provolone or Swiss", "Lettuce and tomato", "1 apple", "1 oz pretzels"],
    steps: ["Spread the hummus over the tortilla.", "Layer the turkey, cheese, lettuce and tomato.", "Fold in the sides, roll it up tight and cut it in half.", "Eat with the apple and pretzels."] },

  { id: "tuna-melt", name: "Tuna melt + carrots & grapes", meals: ["lunch"], tags: ["quick"], min: 10, makes: 1,
    cal: 660, pro: 46, carb: 71, fat: 21,
    why: "Canned tuna is cheap, lean protein. The toasted melt makes it feel like a real meal.",
    ing: ["1 can (5 oz) tuna in water, drained", "2 tbsp plain Greek yogurt + 1 tbsp mayo", "1 stalk celery or 1 pickle, chopped", "2 slices whole-wheat bread", "1 slice cheddar", "1 cup baby carrots + 1 cup grapes"],
    steps: ["Mix the tuna, yogurt, mayo, celery and a little pepper.", "Pile it on one slice of bread, add the cheese and top with the other slice.", "Toast in a pan over medium heat, 3 minutes per side, with a lid on to melt the cheese.", "Serve with the carrots and grapes."] },

  { id: "burrito-bowls", name: "Beef burrito bowls", meals: ["lunch", "dinner"], tags: ["prep"], min: 25, makes: 4,
    cal: 650, pro: 40, carb: 79, fat: 19,
    why: "Better than takeout and built for recovery: beef brings protein, iron and zinc; rice and beans bring carbs.",
    ing: ["1 lb (450 g) 93% lean ground beef", "1 packet taco seasoning (or 1 tbsp chili powder + 1 tsp cumin + salt)", "4 cups cooked rice", "1 can (15 oz) black beans, rinsed", "1 cup frozen corn", "½ cup shredded cheddar", "Salsa", "1 avocado"],
    steps: ["Brown the beef in a pan over medium-high for 6–7 minutes, breaking it up.", "Add the seasoning and ⅓ cup water. Simmer 3 minutes.", "Warm the beans and corn in the microwave, about 2 minutes.", "Build 4 bowls: rice, beef, beans, corn, cheese and salsa.", "Add ¼ avocado right before eating (it browns). Keeps 4 days."] },

  { id: "pesto-pasta", name: "Chicken pesto pasta", meals: ["lunch", "dinner"], tags: ["prep"], min: 25, makes: 4,
    cal: 670, pro: 53, carb: 68, fat: 20,
    why: "Pasta is classic fuel the night before a game. Good warm or cold, so leftovers make an easy lunch.",
    ing: ["12 oz (340 g) pasta (rotini or penne)", "1½ lb (680 g) chicken breast", "6 tbsp basil pesto (jar)", "2 cups cherry tomatoes, halved", "2 big handfuls spinach", "¼ cup grated parmesan", "Salt, pepper, cooking spray"],
    steps: ["Season the chicken and cook it in a sprayed pan over medium-high, 6–7 minutes per side, until 165°F (74°C) inside. Rest 5 minutes, then dice.", "Cook the pasta as the box says. Stir the spinach into the hot drained pasta so it wilts.", "Toss the pasta with the pesto, chicken, tomatoes and parmesan.", "Keeps 4 days in the fridge."] },

  { id: "bean-quesadillas", name: "Black bean & cheese quesadillas", meals: ["lunch", "dinner"], tags: ["quick", "veg"], min: 10, makes: 1,
    cal: 620, pro: 37, carb: 77, fat: 20,
    why: "A meatless meal that still brings real protein: beans and cheese inside, Greek yogurt on the side for dipping.",
    ing: ["2 flour tortillas (8-inch)", "½ cup black beans, rinsed", "⅓ cup shredded Mexican cheese", "Pinch of cumin and salt", "½ cup plain Greek yogurt (instead of sour cream)", "¼ cup salsa"],
    steps: ["Mash the beans with a fork, the cumin and the salt.", "Spread the beans over half of each tortilla, add the cheese and fold.", "Cook in a dry pan over medium heat, 2–3 minutes per side, until golden and melted.", "Cut into wedges and dip in the yogurt and salsa."] },

  /* ---------------------------- Pre-workout (1–2 hours before) ---------------------------- */
  { id: "banana-toast", name: "Banana toast with honey", meals: ["pre", "snack"], tags: ["quick", "game", "veg"], min: 3, makes: 1,
    cal: 400, pro: 12, carb: 70, fat: 10,
    why: "Fast carbs for energy with just enough peanut butter to hold you over. Light enough that it won't slosh around during sprints.",
    ing: ["2 slices bread (white or sourdough digests fastest)", "1 tbsp peanut butter", "1 banana, sliced", "1 tsp honey"],
    steps: ["Toast the bread.", "Spread a thin layer of peanut butter.", "Top with banana slices and drizzle the honey.", "Eat 60–90 minutes before training."] },

  { id: "bagel-jam", name: "Bagel with jam", meals: ["pre"], tags: ["quick", "game", "veg"], min: 3, makes: 1,
    cal: 355, pro: 11, carb: 67, fat: 5,
    why: "Almost pure fuel and very low in fat, so it digests quickly. A top pick 1–2 hours before a game.",
    ing: ["1 plain bagel", "1 tbsp light cream cheese", "1 tbsp jam"],
    steps: ["Toast the bagel.", "Spread the cream cheese and jam.", "Eat 1–2 hours before training or a game."] },

  { id: "berry-smoothie", name: "Berry banana smoothie", meals: ["pre", "snack"], tags: ["quick", "nocook", "game", "veg"], min: 5, makes: 1,
    cal: 380, pro: 21, carb: 77, fat: 1,
    why: "Carbs, some protein and fluid in one cup. Easy on the stomach when you don't feel like eating before practice.",
    ing: ["1 cup 100% orange juice (or milk)", "¾ cup plain Greek yogurt", "1 banana", "1 cup frozen berries"],
    steps: ["Put the juice, yogurt, banana and berries in a blender.", "Blend 45–60 seconds until smooth. Add a splash of water if it's too thick.", "Drink it 45–60 minutes before training."] },

  { id: "applesauce-pretzels", name: "Applesauce, pretzels & string cheese", meals: ["pre"], tags: ["quick", "nocook", "game", "veg"], min: 1, makes: 1,
    cal: 295, pro: 12, carb: 49, fat: 8,
    why: "Throw it in your bag — nothing to make. Salty pretzels also help replace the sodium you sweat out.",
    ing: ["1 applesauce pouch or cup (unsweetened)", "1½ oz pretzels", "1 string cheese"],
    steps: ["Pack all three in your bag (the cheese is fine unrefrigerated for a few hours).", "Eat 30–60 minutes before training, or between games of a doubleheader."] },

  { id: "classic-pbj", name: "Classic PB&J", meals: ["pre", "snack"], tags: ["quick", "nocook", "game", "veg"], min: 3, makes: 1,
    cal: 325, pro: 11, carb: 51, fat: 10,
    why: "A big-league clubhouse staple for a reason: cheap, portable carbs with a little protein. Make two and freeze one.",
    ing: ["2 slices bread", "1 tbsp peanut butter", "1 tbsp jam or jelly"],
    steps: ["Spread peanut butter on one slice and jam on the other.", "Press together and cut in half.", "Made a spare? Freeze it — it thaws in your bag by the afternoon."] },

  /* ---------------------------- Post-workout (within 1 hour after) ---------------------------- */
  { id: "choc-milk-banana", name: "Chocolate milk + banana", meals: ["post"], tags: ["quick", "nocook", "veg"], min: 1, makes: 1,
    cal: 420, pro: 17, carb: 79, fat: 5,
    why: "Carbs to refill your muscles, protein to repair them and fluid to rehydrate — cheap and sold everywhere. Ultra-filtered chocolate milk has about twice the protein.",
    ing: ["2 cups (16 oz) low-fat chocolate milk", "1 banana"],
    steps: ["Drink the milk and eat the banana within an hour after training.", "Keep a bottle in a cooler bag so it's ready the minute you finish."] },

  { id: "recovery-shake", name: "Recovery shake", meals: ["post"], tags: ["quick", "nocook", "veg"], min: 3, makes: 1,
    cal: 590, pro: 42, carb: 72, fat: 18,
    why: "About 40 g of protein plus plenty of carbs — a full recovery meal you can drink on the way home.",
    ing: ["½ cup oats", "1 cup milk", "1 scoop protein powder (chocolate or vanilla)", "1 banana", "1 tbsp peanut butter", "Handful of ice"],
    steps: ["Blend the oats alone for about 10 seconds, until powdery.", "Add the milk, protein powder, banana, peanut butter and ice.", "Blend 45 seconds and drink within an hour after training."] },

  { id: "turkey-bagel", name: "Turkey & cheese bagel", meals: ["post", "lunch"], tags: ["quick", "nocook"], min: 5, makes: 1,
    cal: 475, pro: 36, carb: 59, fat: 10,
    why: "A real sandwich with 35+ g of protein and plenty of carbs. Easy to pack in a cooler bag for right after practice.",
    ing: ["1 plain or whole-wheat bagel", "4 oz (110 g) sliced deli turkey", "1 slice cheese", "Lettuce, tomato, mustard"],
    steps: ["Toast the bagel if you like.", "Stack the turkey, cheese, lettuce, tomato and mustard.", "Eat within an hour after training."] },

  { id: "cottage-cheese-bowl", name: "Cottage cheese & pineapple bowl", meals: ["post", "snack"], tags: ["quick", "nocook", "veg"], min: 2, makes: 1,
    cal: 455, pro: 28, carb: 69, fat: 10,
    why: "Cottage cheese is mostly slow-digesting casein protein — great after training and one of the best snacks before bed.",
    ing: ["1 cup cottage cheese", "1 cup pineapple chunks", "¼ cup granola", "1 tbsp honey"],
    steps: ["Spoon the cottage cheese into a bowl.", "Top with the pineapple, granola and honey.", "Don't like the texture? Blend the cottage cheese first — it tastes like cheesecake."] },

  { id: "tuna-crackers", name: "Tuna, crackers & an apple", meals: ["post", "snack"], tags: ["quick", "nocook"], min: 5, makes: 1,
    cal: 500, pro: 34, carb: 66, fat: 14,
    why: "No fridge needed if you use a tuna pouch — perfect for the gym bag. Lean protein with crackers and fruit for carbs.",
    ing: ["1 can or pouch (5 oz) tuna in water", "1 tbsp light mayo", "Squeeze of lemon + pepper", "12 whole-grain crackers", "1 apple"],
    steps: ["Mix the tuna with the mayo, lemon and pepper.", "Scoop it onto the crackers.", "Eat the apple on the side."] },

  /* ---------------------------- Dinner ---------------------------- */
  { id: "salmon-potatoes", name: "Sheet-pan salmon, potatoes & green beans", meals: ["dinner"], tags: [], min: 35, makes: 2,
    cal: 620, pro: 40, carb: 47, fat: 30,
    why: "Salmon's omega-3 fats help recovery and joint health; potatoes refill your energy. One pan, almost no cleanup.",
    ing: ["2 salmon fillets (6 oz / 170 g each)", "1 lb (450 g) baby potatoes, halved", "2 cups green beans, trimmed", "1 tbsp olive oil", "1 lemon", "1 tsp garlic powder, paprika, salt, pepper"],
    steps: ["Heat the oven to 425°F (220°C). Toss the potatoes with half the oil and some seasoning and roast 15 minutes.", "Push the potatoes to the side. Add the salmon (skin down) and green beans, drizzle the rest of the oil, season and add lemon slices.", "Roast 12–15 minutes more, until the salmon flakes easily (145°F / 63°C).", "Squeeze lemon juice over everything."] },

  { id: "turkey-meatballs", name: "Turkey meatball spaghetti", meals: ["dinner"], tags: ["prep"], min: 35, makes: 4,
    cal: 665, pro: 42, carb: 90, fat: 16,
    why: "A big plate of carbs with lean protein — ideal the night before a game or a hard leg day. Leftovers reheat well.",
    ing: ["1 lb (450 g) 93% lean ground turkey", "1 egg", "½ cup breadcrumbs", "¼ cup grated parmesan", "1 tsp garlic powder + 1 tsp Italian seasoning + ½ tsp salt", "12 oz (340 g) spaghetti", "2 cups marinara sauce", "4 cups broccoli"],
    steps: ["Heat the oven to 400°F (200°C). Mix the turkey, egg, breadcrumbs, parmesan and seasoning. Roll into 16 balls.", "Bake on a lined sheet pan 16–18 minutes (165°F / 74°C inside).", "Cook the spaghetti. Microwave the broccoli with a splash of water, covered, about 3 minutes.", "Warm the marinara, add the meatballs and serve over the spaghetti with broccoli on the side. Keeps 4 days."] },

  { id: "beef-broccoli", name: "Beef & broccoli stir-fry", meals: ["dinner"], tags: [], min: 25, makes: 2,
    cal: 700, pro: 49, carb: 87, fat: 17,
    why: "Steak brings iron, zinc and B12 for energy and recovery. Faster than delivery and a lot better for you.",
    ing: ["12 oz (340 g) sirloin steak, sliced thin against the grain", "3 cups broccoli florets", "3 cups cooked rice", "3 tbsp low-sodium soy sauce", "2 tsp honey", "2 tsp cornstarch", "2 cloves garlic, minced + 1 tsp grated ginger", "1 tbsp vegetable oil"],
    steps: ["Whisk the soy sauce, honey, cornstarch, garlic, ginger and ¼ cup water.", "Heat half the oil in a big pan over high heat. Sear the steak in one layer, 1–2 minutes per side, then take it out.", "Add the rest of the oil, the broccoli and 2 tbsp water. Cover and cook 3 minutes.", "Return the beef, pour in the sauce and stir 1 minute until glossy.", "Serve over the rice."] },

  { id: "turkey-chili", name: "Big-batch turkey chili", meals: ["dinner", "lunch"], tags: ["prep"], min: 45, makes: 6,
    cal: 680, pro: 46, carb: 80, fat: 20,
    why: "One pot feeds you for days. Beans add fiber and extra protein, and it freezes perfectly.",
    ing: ["2 lb (900 g) 93% lean ground turkey", "1 onion + 1 bell pepper, diced", "1 tbsp oil", "2 tbsp chili powder + 2 tsp cumin + 1 tsp garlic powder + 1 tsp salt", "1 can (28 oz) crushed tomatoes", "1 can kidney beans + 1 can black beans, rinsed", "6 cups cooked rice", "¾ cup shredded cheddar"],
    steps: ["Heat the oil in a big pot over medium-high. Cook the onion and pepper 4 minutes.", "Add the turkey and spices. Cook, breaking it up, until no pink is left, about 8 minutes.", "Stir in the tomatoes and beans. Simmer 20–30 minutes, stirring now and then.", "Serve over rice with 2 tbsp cheese. Freeze extra portions in containers."] },

  { id: "chicken-fajitas", name: "Sheet-pan chicken fajitas", meals: ["dinner"], tags: [], min: 30, makes: 4,
    cal: 620, pro: 50, carb: 63, fat: 19,
    why: "Lean chicken plus lots of colorful peppers (vitamin C for recovery). Everyone builds their own.",
    ing: ["1½ lb (680 g) chicken breast, cut in strips", "4 bell peppers, sliced", "1 onion, sliced", "2 tbsp olive oil", "2 tbsp fajita or taco seasoning", "8 flour tortillas (8-inch)", "½ cup plain Greek yogurt (instead of sour cream)", "Salsa"],
    steps: ["Heat the oven to 425°F (220°C).", "Toss the chicken, peppers and onion with the oil and seasoning on a big sheet pan (use two if it's crowded).", "Roast 20 minutes, stirring once, until the chicken reaches 165°F (74°C).", "Warm the tortillas and fill with chicken and veggies. Top with yogurt and salsa. 2 fajitas = 1 serving."] },

  { id: "egg-fried-rice", name: "Egg & edamame fried rice", meals: ["dinner", "lunch"], tags: ["veg"], min: 15, makes: 2,
    cal: 730, pro: 38, carb: 85, fat: 26,
    why: "Turns leftover rice into a high-protein dinner in 15 minutes. Add leftover chicken for even more protein.",
    ing: ["3 cups cooked rice (cold, day-old works best)", "6 eggs, beaten", "1 cup shelled edamame (frozen)", "1 cup frozen peas and carrots", "2 tbsp low-sodium soy sauce", "1 tbsp oil", "2 green onions, sliced + 1 tsp garlic powder"],
    steps: ["Heat the oil in a big nonstick pan or wok over medium-high.", "Add the frozen veggies and edamame and cook 3–4 minutes.", "Push them to the side, pour in the eggs and scramble until just set.", "Add the rice, soy sauce and garlic powder. Stir-fry 3–4 minutes until hot and a little crispy.", "Top with the green onions."] },

  { id: "lean-burgers", name: "Lean burgers + sweet potato fries", meals: ["dinner"], tags: [], min: 35, makes: 4,
    cal: 635, pro: 42, carb: 59, fat: 25,
    why: "Burger night, athlete style: lean beef for protein and iron, oven fries instead of the deep fryer.",
    ing: ["1¼ lb (570 g) 93% lean ground beef", "4 whole-wheat buns", "4 slices cheese", "Lettuce, tomato, pickles, ketchup, mustard", "2 large sweet potatoes (about 1¼ lb / 600 g), cut in thin wedges", "2 tbsp olive oil", "Salt, pepper, paprika"],
    steps: ["Heat the oven to 425°F (220°C). Toss the sweet potato wedges with the oil, salt and paprika. Spread them out on a sheet pan and bake 25–30 minutes, flipping once.", "Shape the beef into 4 patties a little wider than the buns and press a dent in the middle. Season both sides.", "Cook in a hot skillet or on a grill 4–5 minutes per side (160°F / 71°C inside). Add the cheese for the last minute.", "Build the burgers on toasted buns and serve with the fries."] },

  /* ---------------------------- Snacks ---------------------------- */
  { id: "energy-bites", name: "No-bake PB oat energy bites", meals: ["snack", "pre"], tags: ["prep", "nocook", "veg"], min: 15, makes: 8,
    cal: 240, pro: 10, carb: 27, fat: 12,
    why: "Grab-and-go carbs and protein for between classes or before practice. One serving = 2 bites.",
    ing: ["1 cup oats", "½ cup peanut butter", "⅓ cup honey", "½ cup vanilla protein powder", "¼ cup mini chocolate chips", "2 tbsp chia seeds"],
    steps: ["Stir everything together until evenly mixed. Add a splash of milk if it's too dry to hold together.", "Chill 15 minutes so it's easier to roll.", "Roll into 16 balls, about 1 tbsp each.", "Keep in the fridge up to a week, or freeze."] },

  { id: "trail-mix", name: "Homemade trail mix", meals: ["snack"], tags: ["prep", "nocook", "veg"], min: 5, makes: 9,
    cal: 290, pro: 9, carb: 26, fat: 19,
    why: "Packs a lot of calories into a small bag — an easy way to reach a big calorie goal. One serving = ½ cup.",
    ing: ["1 cup peanuts", "1 cup almonds", "1 cup raisins", "1 cup whole-grain O's cereal", "½ cup dark chocolate chips"],
    steps: ["Mix everything in a big bowl.", "Portion into 9 snack bags (½ cup each).", "Keeps 2 weeks in a sealed container."] },

  { id: "apple-pb", name: "Apple, peanut butter & string cheese", meals: ["snack"], tags: ["quick", "nocook", "veg"], min: 2, makes: 1,
    cal: 365, pro: 15, carb: 33, fat: 22,
    why: "Fruit, healthy fat and protein. Keeps you full between lunch and practice or late at night.",
    ing: ["1 apple", "2 tbsp peanut butter", "1 string cheese"],
    steps: ["Slice the apple.", "Dip the slices in peanut butter.", "Eat with the string cheese for extra protein."] },

  { id: "edamame", name: "Salted edamame", meals: ["snack"], tags: ["quick", "veg"], min: 5, makes: 1,
    cal: 190, pro: 18, carb: 14, fat: 8,
    why: "One of the few plant foods with complete protein — 18 g in a cup. Fun to eat while you watch the game.",
    ing: ["1½ cups frozen edamame in pods (about 1 cup of beans)", "Coarse salt"],
    steps: ["Microwave the edamame in a covered bowl with 2 tbsp water, 4–5 minutes (or boil 5 minutes).", "Drain and sprinkle with salt.", "Squeeze the beans out of the pods with your teeth."] },

  { id: "turkey-rollups", name: "Turkey & cheese roll-ups + pretzels", meals: ["snack"], tags: ["quick", "nocook"], min: 3, makes: 1,
    cal: 360, pro: 32, carb: 28, fat: 15,
    why: "More than 30 g of protein with zero cooking — as much as a meal.",
    ing: ["3 oz (85 g) sliced deli turkey", "2 string cheese sticks", "1 oz pretzels", "Mustard for dipping"],
    steps: ["Wrap 1–2 slices of turkey around each cheese stick.", "Eat with pretzels, dipping in mustard."] }
];

const RECIPE_BY_ID = Object.fromEntries(RECIPES.map(r => [r.id, r]));

/* Eating tips shown under the recipes. General advice for healthy athletes — anyone with
   allergies, a medical condition or a weight goal should check with a doctor or sports dietitian. */
const DIET_GUIDE = [
  { title: "The basics", points: [
    "Eat every 3–4 hours: 3 meals plus 2–3 snacks. Skipping meals makes a big calorie goal almost impossible.",
    "Get protein at every meal and snack — about 30–50 g at meals. Spread out, your body uses it better than one giant serving.",
    "Carbs are your fuel for sprints, swings and throws: rice, pasta, potatoes, oats, bread and fruit.",
    "Make half your plate fruits and vegetables at most meals — vitamins and minerals for recovery and staying healthy.",
    "Before bed, a slow protein like cottage cheese or Greek yogurt helps your muscles repair overnight."
  ] },
  { title: "Training days", points: [
    "1–2 hours before: a carb-focused snack that's low in fat and fiber (banana toast, bagel with jam, oatmeal, a smoothie).",
    "Within 1 hour after: protein plus carbs (chocolate milk, a shake, a turkey bagel), then a full meal within 2 hours.",
    "Sip water during every workout — a few gulps every 15–20 minutes."
  ] },
  { title: "Rest days", points: [
    "Keep protein the same — your muscles do their rebuilding today.",
    "Skip the pre- and post-workout snacks and eat normal meals plus a snack or two.",
    "Sleep 8+ hours. Sleep is when growth hormone peaks, so it's part of your diet plan too."
  ] },
  { title: "Game day", points: [
    "3–4 hours before: a full meal with rice, pasta or a bagel, a lean protein and fruit. Go easy on greasy, fried and very high-fiber foods.",
    "30–60 minutes before: a small carb snack (banana, applesauce, pretzels, PB&J).",
    "During long games and doubleheaders: water every half-inning, a sports drink when it's hot, and easy carbs between games.",
    "After: a recovery snack within an hour, then a real meal. Stick to foods you've already tried — game day is not the day to test new ones."
  ] },
  { title: "Hydration", points: [
    "Check your pee: pale yellow means you're good, dark means drink more.",
    "Drink about 16 oz of water 2 hours before training, and sip during it.",
    "Weigh yourself before and after a hot practice: drink 16–24 oz for every pound you lost.",
    "Hot days and doubleheaders: add a sports drink or a salty snack to replace the salt you sweat out."
  ] },
  { title: "Grocery list staples", points: [
    "Protein: chicken breast, 93% lean ground beef or turkey, eggs, Greek yogurt, cottage cheese, milk, tuna, deli turkey, protein powder.",
    "Carbs: rice, oats, pasta, bagels, whole-wheat bread, tortillas, potatoes, sweet potatoes, pretzels.",
    "Fruits and veggies: bananas, apples, berries (frozen is fine), broccoli, peppers, spinach, frozen mixed vegetables.",
    "Extras: peanut butter, nuts, honey, cheese, salsa, marinara, olive oil."
  ] }
];
