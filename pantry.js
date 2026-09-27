/* pantry.js — the Pantry (Diet → Pantry): the food you have at home, and the meals you can make with it.
   Like meals.js, you never need to edit this file.

   PANTRY_CATS    the shelves, in the order they're shown
   PANTRY_ITEMS   [id, name, shelf, group, words, food]
                    group  similar things that can stand in for each other in a recipe (any cheese for cheddar,
                           any pasta for penne…). A recipe can ask for a group or for one exact item.
                    words  other names and brands — used to read package labels in your photos and for search
                    food   [food in foods.js, servings] for one plate-sized portion (used for quick-plate numbers)
   BASICS         kitchen basics every recipe assumes you have (salt, pepper, oil, cooking spray, water, ice)
   RECIPE_NEEDS   for each recipe in meals.js: what you need (need) and what's nice to have (nice). An entry that
                  is a list means "any one of these".
   PANTRY_PLATES  simple meals built from whatever you have: a protein + a carb + a fruit or vegetable… */

const PANTRY_CATS = [['protein', 'Meat, fish & eggs'], ['dairy', 'Dairy'], ['grain', 'Bread, grains & pasta'], ['fruit', 'Fruit'],
  ['veg', 'Vegetables'], ['can', 'Cans, jars & sauces'], ['spice', 'Spices & baking'], ['snack', 'Snacks & nuts'], ['other', 'Other']];

const PANTRY_ITEMS = [
  /* ---------- Meat, fish & eggs ---------- */
  ['eggs', 'Eggs', 'protein', '', 'egg|eggs|dozen eggs|large eggs|egg carton|eggland|pete and gerry', ['Egg, large', 3]],
  ['egg-whites', 'Liquid egg whites', 'protein', '', 'egg whites|egg beaters|all whites|liquid egg', ['Egg whites', 1]],
  ['chicken-breast', 'Chicken breast', 'protein', 'chicken', 'chicken breast|chicken breasts|boneless chicken|boneless skinless|tyson|perdue|chicken tenderloins', ['Chicken breast, cooked', 1.5]],
  ['chicken-thighs', 'Chicken thighs', 'protein', 'chicken', 'chicken thigh|chicken thighs|drumsticks|chicken legs', ['Chicken thigh, cooked, skinless', 1.5]],
  ['cooked-chicken', 'Rotisserie / cooked chicken', 'protein', 'chicken', 'rotisserie chicken|rotisserie|grilled chicken strips|cooked chicken|chicken strips', ['Rotisserie chicken breast, no skin', 1.5]],
  ['ground-turkey', 'Ground turkey', 'protein', 'ground-meat', 'ground turkey|jennie-o|jennie o|turkey burgers|lean turkey', ['Ground turkey 93% lean, raw weight', 1.5]],
  ['ground-beef', 'Ground beef', 'protein', 'ground-meat', 'ground beef|hamburger meat|ground chuck|ground round|lean beef|burger patties', ['Ground beef 93% lean, raw weight', 1.5]],
  ['steak', 'Steak', 'protein', '', 'steak|sirloin|ribeye|flank steak|strip steak|stew meat|beef strips', ['Sirloin steak, cooked', 1.5]],
  ['pork', 'Pork chops / tenderloin', 'protein', '', 'pork|pork chops|pork tenderloin|pork loin', ['Pork tenderloin, cooked', 1.5]],
  ['salmon', 'Salmon', 'protein', '', 'salmon|salmon fillet|salmon fillets|atlantic salmon', ['Salmon, cooked', 1.25]],
  ['white-fish', 'White fish', 'protein', '', 'tilapia|cod|white fish|mahi|halibut|pollock|fish fillets', ['Tilapia or white fish, cooked', 1.5]],
  ['shrimp', 'Shrimp', 'protein', '', 'shrimp|prawns', ['Shrimp, cooked', 1.5]],
  ['tuna', 'Canned tuna', 'protein', '', 'tuna|starkist|bumble bee|chunk light|albacore|tuna pouch', ['Tuna, canned in water', 1]],
  ['deli-turkey', 'Deli turkey', 'protein', 'deli-meat', 'deli turkey|sliced turkey|turkey breast|oven roasted turkey|smoked turkey|boar\'s head|hillshire|oscar mayer|deli meat|lunch meat|lunchmeat', ['Deli turkey', 2]],
  ['deli-ham', 'Deli ham', 'protein', 'deli-meat', 'ham|deli ham|honey ham|black forest', ['Deli ham', 2]],
  ['canadian-bacon', 'Canadian bacon', 'protein', 'deli-meat', 'canadian bacon|canadian style bacon', ['Deli ham', 1.5]],
  ['bacon', 'Bacon', 'protein', '', 'bacon|turkey bacon|thick cut bacon', ['Bacon, cooked', 1]],
  ['sausage', 'Sausage', 'protein', '', 'sausage|sausages|jimmy dean|brats|bratwurst|breakfast links|italian sausage|chicken sausage', ['Pork sausage links', 1]],
  ['hot-dogs', 'Hot dogs', 'protein', '', 'hot dog|hot dogs|franks|ball park|nathan\'s|hebrew national', ['Hot dog (beef)', 2]],
  ['tofu', 'Tofu', 'protein', '', 'tofu|extra firm', ['Tofu, firm', 2]],
  ['protein-powder', 'Protein powder', 'protein', '', 'protein powder|whey|whey protein|gold standard|optimum nutrition|isolate|casein|plant protein|premier protein powder|muscle milk powder|dymatize', ['Protein powder (whey)', 1]],
  ['protein-shake', 'Protein shakes', 'protein', '', 'protein shake|protein shakes|premier protein|core power|fairlife core|muscle milk|ready to drink protein', ['Protein shake, ready-to-drink', 1]],
  ['jerky', 'Beef jerky', 'protein', '', 'jerky|beef jerky|jack link\'s|jack links|meat sticks|slim jim', ['Beef jerky', 1]],

  /* ---------- Dairy ---------- */
  ['milk', 'Milk', 'dairy', 'milk', 'milk|whole milk|2% milk|skim milk|fat free milk|reduced fat milk|fairlife|lactaid|horizon|ultra-filtered', ['Milk, 2%', 1]],
  ['choc-milk', 'Chocolate milk', 'dairy', '', 'chocolate milk|nesquik|trumoo|chocolate lowfat milk', ['Chocolate milk, low-fat', 2]],
  ['plant-milk', 'Almond, oat or soy milk', 'dairy', 'milk', 'almond milk|oat milk|soy milk|silk|oatly|califia|coconut milk beverage', ['Soy milk', 1]],
  ['greek-yogurt', 'Greek yogurt', 'dairy', 'yogurt', 'greek yogurt|greek|chobani|fage|oikos|two good|siggi|icelandic yogurt|skyr', ['Greek yogurt, plain nonfat', 1]],
  ['yogurt', 'Yogurt', 'dairy', 'yogurt', 'yogurt|yoplait|dannon|activia|go-gurt|yogurt cups', ['Yogurt, regular flavored', 1]],
  ['cottage-cheese', 'Cottage cheese', 'dairy', '', 'cottage cheese|good culture|daisy cottage|breakstone', ['Cottage cheese, 2%', 2]],
  ['shredded-cheese', 'Shredded cheese', 'dairy', 'cheese', 'shredded cheese|shredded cheddar|mexican blend|mexican style|colby jack|monterey jack|pepper jack|finely shredded|sargento|tillamook|kraft shredded', ['Cheddar cheese', 1]],
  ['block-cheese', 'Cheddar (block)', 'dairy', 'cheese', 'cheddar|sharp cheddar|mild cheddar|block cheese|cabot|cracker barrel', ['Cheddar cheese', 1]],
  ['sliced-cheese', 'Sliced cheese', 'dairy', 'cheese', 'sliced cheese|american cheese|kraft singles|singles|provolone|swiss|cheese slices|deli cheese', ['American cheese', 2]],
  ['string-cheese', 'String cheese', 'dairy', 'cheese', 'string cheese|cheese sticks|mozzarella string|babybel|colby jack sticks', ['String cheese', 2]],
  ['mozzarella', 'Mozzarella', 'dairy', 'cheese', 'mozzarella|fresh mozzarella|part skim mozzarella', ['Mozzarella, part-skim', 1]],
  ['parmesan', 'Parmesan', 'dairy', 'cheese', 'parmesan|parmigiano|grated parmesan|parm|romano|kraft parmesan', ['Mozzarella, part-skim', 0.5]],
  ['cream-cheese', 'Cream cheese', 'dairy', '', 'cream cheese|philadelphia|philly|neufchatel|schmear', ['Cream cheese', 2]],
  ['butter', 'Butter', 'dairy', '', 'butter|land o lakes|kerrygold|salted butter|unsalted butter|country crock', ['Butter', 1]],
  ['sour-cream', 'Sour cream', 'dairy', '', 'sour cream|daisy', ['Sour cream', 1]],

  /* ---------- Bread, grains & pasta ---------- */
  ['rice', 'Rice', 'grain', 'rice', 'rice|white rice|brown rice|jasmine|basmati|long grain|minute rice|uncle ben\'s|ben\'s original|instant rice|ready rice|rice pouch', ['White rice, cooked', 1.5]],
  ['oats', 'Oats / oatmeal', 'grain', '', 'oats|oatmeal|quaker|rolled oats|old fashioned|quick oats|quick 1-minute|instant oatmeal|steel cut', ['Oats, dry (old-fashioned)', 1]],
  ['pasta', 'Pasta', 'grain', 'pasta', 'pasta|penne|rotini|spaghetti|fettuccine|macaroni|elbows|linguine|ziti|rigatoni|farfalle|bow tie|angel hair|egg noodles|noodles|barilla|ronzoni|de cecco', ['Pasta, cooked', 1.5]],
  ['bread', 'Bread', 'grain', 'bread', 'bread|whole wheat|wheat bread|white bread|sourdough|multigrain|wonder|dave\'s killer|nature\'s own|sara lee|arnold|pepperidge farm|loaf|sandwich bread|texas toast', ['Bread, whole wheat', 2]],
  ['bagels', 'Bagels', 'grain', 'bread', 'bagel|bagels|thomas\' bagels|everything bagel|plain bagels', ['Bagel, plain', 1]],
  ['english-muffins', 'English muffins', 'grain', 'bread', 'english muffin|english muffins|thomas\'', ['English muffin', 1]],
  ['buns', 'Buns', 'grain', 'bread', 'buns|hamburger buns|hot dog buns|brioche buns|burger buns|slider buns|hoagie|sub rolls|rolls', ['Hamburger bun', 1]],
  ['pita', 'Pita / naan', 'grain', 'bread', 'pita|pita bread|naan|flatbread|lavash', ['Pita bread, whole wheat', 1]],
  ['flour-tortillas', 'Flour tortillas', 'grain', 'tortilla', 'flour tortillas|tortillas|tortilla|mission|guerrero|wraps|burrito size|soft taco|la banderita', ['Flour tortilla, large (10-inch)', 1]],
  ['corn-tortillas', 'Corn tortillas', 'grain', 'tortilla', 'corn tortillas|white corn tortillas|yellow corn tortillas|street taco|taco shells', ['Corn tortillas (6-inch)', 1.5]],
  ['cereal', 'Cereal', 'grain', '', 'cereal|cheerios|frosted flakes|raisin bran|special k|chex|life cereal|cinnamon toast crunch|froot loops|lucky charms|honey nut|kellogg\'s|general mills|post|rice krispies|corn flakes|frosted mini-wheats|mini wheats|kashi|fruity pebbles|cap\'n crunch|apple jacks|honey bunches of oats|honey bunches', ['Cereal, toasted oat O\'s', 1.5]],
  ['granola', 'Granola', 'grain', '', 'granola|bear naked|kind granola|nature valley granola|love crunch|purely elizabeth', ['Granola', 0.5]],
  ['crackers', 'Crackers', 'grain', '', 'crackers|triscuit|wheat thins|ritz|saltines|club crackers|graham crackers|goldfish|cheez-it|cheez it|town house|nut thins', ['Whole-grain crackers', 2]],
  ['pretzels', 'Pretzels', 'grain', '', 'pretzels|pretzel|rold gold|snyder\'s|dot\'s', ['Pretzels', 1.5]],
  ['rice-cakes', 'Rice cakes', 'grain', '', 'rice cakes|rice cake|lundberg|quaker rice crisps', ['Rice cakes', 1.5]],
  ['breadcrumbs', 'Breadcrumbs', 'grain', '', 'breadcrumbs|bread crumbs|panko|progresso bread crumbs', null],
  ['mac-cheese', 'Boxed mac & cheese', 'grain', '', 'mac and cheese|mac & cheese|macaroni & cheese|macaroni and cheese|kraft dinner|annie\'s|velveeta shells', ['Mac and cheese, boxed', 1.5]],
  ['ramen', 'Instant ramen', 'grain', '', 'ramen|cup noodles|maruchan|top ramen|instant noodles|nissin|shin ramyun', ['Instant ramen', 1]],
  ['pancake-mix', 'Pancake / waffle mix', 'grain', '', 'pancake mix|pancake|bisquick|aunt jemima|pearl milling|kodiak|krusteaz|buttermilk pancake', ['Pancakes (4-inch)', 2]],
  ['waffles', 'Frozen waffles', 'grain', '', 'waffles|eggo|frozen waffles|toaster waffles', ['Waffles, frozen', 1]],
  ['quinoa', 'Quinoa / couscous', 'grain', 'rice', 'quinoa|couscous|farro|bulgur', ['Quinoa, cooked', 1.25]],
  ['potatoes', 'Potatoes', 'veg', 'potato', 'potato|potatoes|russet|yukon gold|baby potatoes|red potatoes|gold potatoes|idaho', ['Baked potato', 1.5]],
  ['sweet-potatoes', 'Sweet potatoes', 'veg', 'potato', 'sweet potato|sweet potatoes|yams', ['Sweet potato, baked', 1.5]],

  /* ---------- Fruit ---------- */
  ['bananas', 'Bananas', 'fruit', '', 'banana|bananas|chiquita|dole bananas', ['Banana', 1]],
  ['apples', 'Apples', 'fruit', '', 'apple|apples|honeycrisp|gala|fuji|granny smith|pink lady|red delicious|envy|cosmic crisp', ['Apple', 1]],
  ['berries', 'Berries', 'fruit', 'berries', 'berries|strawberries|strawberry|blueberries|blueberry|raspberries|blackberries|mixed berries|frozen berries|driscoll\'s', ['Blueberries', 1]],
  ['grapes', 'Grapes', 'fruit', '', 'grapes|grape|red grapes|green grapes|seedless', ['Grapes', 1]],
  ['oranges', 'Oranges', 'fruit', '', 'orange|oranges|clementine|clementines|cuties|halos|mandarin|mandarins|navel', ['Orange', 1]],
  ['pineapple', 'Pineapple', 'fruit', '', 'pineapple|pineapple chunks|dole pineapple|pineapple tidbits', ['Pineapple', 1]],
  ['peaches', 'Peaches / pears', 'fruit', '', 'peach|peaches|pear|pears|nectarines|fruit cup|diced peaches|mandarin oranges cup', ['Peach', 1]],
  ['mango', 'Mango', 'fruit', '', 'mango|mangoes|frozen mango', ['Mango', 1]],
  ['watermelon', 'Melon', 'fruit', '', 'watermelon|cantaloupe|honeydew|melon', ['Watermelon', 1]],
  ['lemons', 'Lemons', 'fruit', '', 'lemon|lemons|lemon juice|realemon', null],
  ['limes', 'Limes', 'fruit', '', 'lime|limes|lime juice', null],
  ['avocados', 'Avocados', 'fruit', '', 'avocado|avocados|hass|guacamole', ['Avocado', 1]],
  ['raisins', 'Raisins / dried fruit', 'fruit', 'dried-fruit', 'raisins|raisin|sun-maid|dried cranberries|craisins|dried fruit|dates|prunes|dried apricots', ['Raisins', 1]],
  ['applesauce', 'Applesauce', 'fruit', '', 'applesauce|apple sauce|gogo squeez|mott\'s|motts|musselman\'s|fruit pouch|pouches', ['Applesauce, unsweetened', 1]],
  ['orange-juice', 'Orange juice', 'fruit', '', 'orange juice|oj|tropicana|simply orange|minute maid|florida\'s natural', ['Orange juice', 1]],
  ['apple-juice', 'Apple juice', 'fruit', '', 'apple juice|juice box|juice boxes|capri sun|mott\'s juice|motts juice', ['Apple juice', 1]],

  /* ---------- Vegetables ---------- */
  ['broccoli', 'Broccoli', 'veg', '', 'broccoli|broccoli florets|steamfresh broccoli|broccoli crowns', ['Broccoli, cooked', 1]],
  ['spinach', 'Spinach', 'veg', 'greens', 'spinach|baby spinach|kale', ['Spinach, raw', 1]],
  ['lettuce', 'Lettuce / salad', 'veg', 'greens', 'lettuce|romaine|iceberg|salad|spring mix|salad kit|salad greens|mixed greens|arugula|butter lettuce', ['Salad greens', 1]],
  ['tomatoes', 'Tomatoes', 'veg', 'tomatoes', 'tomato|tomatoes|roma|vine tomatoes|beefsteak', ['Tomato', 1]],
  ['cherry-tomatoes', 'Cherry tomatoes', 'veg', 'tomatoes', 'cherry tomatoes|grape tomatoes|cherub', ['Tomato', 1]],
  ['bell-peppers', 'Bell peppers', 'veg', '', 'bell pepper|bell peppers|peppers|red pepper|green pepper|yellow pepper|sweet peppers|mini peppers', ['Bell pepper', 1]],
  ['onions', 'Onions', 'veg', '', 'onion|onions|yellow onion|red onion|white onion|sweet onion|shallots', null],
  ['green-onions', 'Green onions', 'veg', '', 'green onions|green onion|scallions|chives', null],
  ['garlic', 'Garlic', 'veg', '', 'garlic|minced garlic|garlic cloves|garlic bulb', null],
  ['ginger', 'Ginger', 'veg', '', 'ginger|ginger root|ginger paste', null],
  ['carrots', 'Carrots', 'veg', '', 'carrot|carrots|baby carrots|bolthouse|grimmway', ['Baby carrots', 1]],
  ['green-beans', 'Green beans', 'veg', '', 'green beans|string beans|haricots verts|french style green beans|cut green beans', ['Green beans, cooked', 1]],
  ['corn', 'Corn', 'veg', '', 'corn|sweet corn|frozen corn|canned corn|whole kernel|corn on the cob|green giant corn|del monte corn', ['Corn, cooked', 1]],
  ['peas-carrots', 'Peas / peas & carrots', 'veg', '', 'peas|green peas|peas and carrots|peas & carrots|sweet peas', ['Peas, cooked', 1]],
  ['mixed-veg', 'Frozen mixed vegetables', 'veg', '', 'mixed vegetables|mixed veggies|stir fry vegetables|stir-fry|california blend|frozen vegetables|steamfresh|birds eye|normandy', ['Mixed vegetables, frozen', 1]],
  ['cucumber', 'Cucumber', 'veg', '', 'cucumber|cucumbers|english cucumber|mini cucumbers', ['Cucumber', 1]],
  ['celery', 'Celery', 'veg', '', 'celery|celery sticks', null],
  ['edamame', 'Edamame', 'veg', '', 'edamame|shelled edamame|soybeans', ['Edamame, shelled', 1]],
  ['coleslaw', 'Coleslaw mix / cabbage', 'veg', '', 'coleslaw|coleslaw mix|cabbage|shredded cabbage|slaw', null],
  ['zucchini', 'Zucchini / squash', 'veg', '', 'zucchini|squash|yellow squash|butternut', null],
  ['mushrooms', 'Mushrooms', 'veg', '', 'mushroom|mushrooms|baby bella|portobello|white mushrooms', null],

  /* ---------- Cans, jars & sauces ---------- */
  ['black-beans', 'Black beans', 'can', 'beans', 'black beans|frijoles negros|bush\'s black|goya black', ['Black beans, canned', 1]],
  ['kidney-beans', 'Kidney beans', 'can', 'beans', 'kidney beans|red kidney|dark red kidney|chili beans', ['Black beans, canned', 1]],
  ['pinto-beans', 'Pinto beans', 'can', 'beans', 'pinto beans|pinto|great northern|cannellini|white beans|navy beans', ['Black beans, canned', 1]],
  ['refried-beans', 'Refried beans', 'can', '', 'refried beans|refried|old el paso refried|rosarita', ['Refried beans', 1]],
  ['chickpeas', 'Chickpeas', 'can', '', 'chickpeas|garbanzo|garbanzo beans|chick peas', ['Chickpeas', 1]],
  ['lentils', 'Lentils', 'can', '', 'lentils|lentil|red lentils', ['Lentils, cooked', 1]],
  ['crushed-tomatoes', 'Canned tomatoes', 'can', '', 'crushed tomatoes|diced tomatoes|tomato sauce|canned tomatoes|whole peeled|hunt\'s|hunts|rotel|ro-tel|tomato paste|fire roasted|san marzano|muir glen|cento', null],
  ['marinara', 'Marinara / pasta sauce', 'can', '', 'marinara|pasta sauce|spaghetti sauce|prego|ragu|rao\'s|raos|classico|bertolli|newman\'s own sauce|tomato basil|traditional sauce', null],
  ['salsa', 'Salsa', 'can', '', 'salsa|pace|tostitos salsa|chunky salsa|salsa verde|pico de gallo|herdez', null],
  ['pesto', 'Pesto', 'can', '', 'pesto|basil pesto|pesto genovese', null],
  ['alfredo', 'Alfredo sauce', 'can', '', 'alfredo|alfredo sauce', null],
  ['coconut-milk', 'Coconut milk (can)', 'can', '', 'coconut milk|light coconut milk|coconut cream|thai kitchen', null],
  ['peanut-butter', 'Peanut butter', 'can', 'nut-butter', 'peanut butter|jif|skippy|peter pan|smucker\'s natural|creamy peanut|crunchy peanut|pb2|reese\'s spread', ['Peanut butter', 1]],
  ['almond-butter', 'Almond butter', 'can', 'nut-butter', 'almond butter|justin\'s|sunflower butter|sunbutter|cashew butter', ['Almond butter', 1]],
  ['jam', 'Jam / jelly', 'can', '', 'jam|jelly|preserves|smucker\'s|smuckers|welch\'s|strawberry jam|strawberry preserves|grape jelly|fruit spread|bonne maman', null],
  ['honey', 'Honey', 'can', '', 'honey|local honey|clover honey|honey bear', null],
  ['maple-syrup', 'Syrup', 'can', '', 'maple syrup|syrup|pancake syrup|mrs. butterworth|log cabin|aunt jemima syrup', null],
  ['nutella', 'Chocolate hazelnut spread', 'can', '', 'nutella|hazelnut spread', null],
  ['hummus', 'Hummus', 'can', '', 'hummus|sabra|cedar\'s|hope hummus', ['Hummus', 2]],
  ['teriyaki', 'Teriyaki sauce', 'can', '', 'teriyaki|teriyaki sauce|soy vay|kikkoman teriyaki', null],
  ['soy-sauce', 'Soy sauce', 'can', '', 'soy sauce|kikkoman|tamari|low sodium soy|la choy|coconut aminos', null],
  ['mayo', 'Mayo', 'can', '', 'mayo|mayonnaise|hellmann\'s|hellmanns|duke\'s|best foods|miracle whip|kewpie', null],
  ['mustard', 'Mustard', 'can', '', 'mustard|french\'s|dijon|grey poupon|yellow mustard|spicy brown', null],
  ['ketchup', 'Ketchup', 'can', '', 'ketchup|tomato ketchup|catsup|heinz', null],
  ['hot-sauce', 'Hot sauce', 'can', '', 'hot sauce|sriracha|frank\'s|franks redhot|cholula|tabasco|valentina|tapatio|buffalo sauce', null],
  ['bbq-sauce', 'BBQ sauce', 'can', '', 'bbq sauce|barbecue sauce|sweet baby ray\'s|sweet baby rays|kc masterpiece|stubb\'s', null],
  ['ranch', 'Ranch / dressing', 'can', '', 'ranch|hidden valley|dressing|italian dressing|caesar|vinaigrette', null],
  ['pickles', 'Pickles', 'can', '', 'pickles|pickle|dill pickles|vlasic|claussen|relish', null],
  ['broth', 'Broth / stock', 'can', '', 'broth|stock|chicken broth|beef broth|vegetable broth|bouillon|better than bouillon|swanson|pacific foods', null],
  ['canned-soup', 'Canned soup', 'can', '', 'soup|campbell\'s|campbells|chicken noodle|progresso|chunky soup|tomato soup|cream of|cream of mushroom|cream of chicken', null],
  ['olives', 'Olives', 'can', '', 'olives|black olives|kalamata', null],

  /* ---------- Spices & baking ---------- */
  ['chili-powder', 'Chili powder', 'spice', '', 'chili powder|chile powder|ancho chili', null],
  ['cumin', 'Cumin', 'spice', '', 'cumin|ground cumin', null],
  ['garlic-powder', 'Garlic powder', 'spice', '', 'garlic powder|garlic salt|granulated garlic', null],
  ['onion-powder', 'Onion powder', 'spice', '', 'onion powder', null],
  ['paprika', 'Paprika', 'spice', '', 'paprika|smoked paprika', null],
  ['italian-seasoning', 'Italian seasoning', 'spice', '', 'italian seasoning|oregano|basil|dried basil|herbes', null],
  ['curry-powder', 'Curry powder', 'spice', '', 'curry|curry powder|garam masala|curry paste', null],
  ['taco-seasoning', 'Taco / fajita seasoning', 'spice', '', 'taco seasoning|fajita seasoning|old el paso|taco mix|mccormick taco', null],
  ['cinnamon', 'Cinnamon', 'spice', '', 'cinnamon|ground cinnamon', null],
  ['everything-seasoning', 'Seasoning blend', 'spice', '', 'seasoning|everything bagel seasoning|lawry\'s|lawrys|season all|cajun|old bay|steak seasoning|montreal|lemon pepper|tony chachere', null],
  ['baking-powder', 'Baking powder / soda', 'spice', '', 'baking powder|baking soda|arm & hammer|clabber girl', null],
  ['cornstarch', 'Cornstarch', 'spice', '', 'cornstarch|corn starch|argo', null],
  ['flour', 'Flour', 'spice', '', 'flour|all-purpose|all purpose|gold medal|king arthur|pillsbury flour', null],
  ['sugar', 'Sugar', 'spice', '', 'sugar|brown sugar|domino|c&h|granulated sugar|powdered sugar', null],
  ['vanilla', 'Vanilla', 'spice', '', 'vanilla|vanilla extract', null],
  ['cocoa', 'Cocoa powder', 'spice', '', 'cocoa|cocoa powder|unsweetened cocoa|hershey\'s cocoa', null],
  ['chocolate-chips', 'Chocolate chips', 'spice', '', 'chocolate chips|chocolate chip|semi-sweet|morsels|toll house|nestle chips|dark chocolate chips|mini chips', null],
  ['chia-seeds', 'Chia or flax seeds', 'spice', '', 'chia|chia seeds|flax|flaxseed|hemp hearts|hemp seeds', null],
  ['sesame-seeds', 'Sesame seeds', 'spice', '', 'sesame|sesame seeds|sesame oil', null],

  /* ---------- Snacks & nuts ---------- */
  ['peanuts', 'Peanuts', 'snack', 'nuts', 'peanuts|planters|dry roasted|honey roasted', ['Peanuts', 1]],
  ['almonds', 'Almonds & other nuts', 'snack', 'nuts', 'almonds|almond|blue diamond|cashews|walnuts|pecans|pistachios|mixed nuts|wonderful', ['Almonds', 1]],
  ['trail-mix', 'Trail mix', 'snack', '', 'trail mix|trailmix|mixed nuts and fruit', ['Trail mix', 1]],
  ['granola-bars', 'Granola bars', 'snack', '', 'granola bar|granola bars|nature valley|clif bar|clif|kind bar|kind bars|chewy bars|quaker chewy|nutri-grain|larabar|rxbar', ['Granola bar, chewy', 1]],
  ['protein-bars', 'Protein bars', 'snack', '', 'protein bar|protein bars|quest|barebells|one bar|pure protein|built bar|think!|power bar', ['Protein bar', 1]],
  ['popcorn', 'Popcorn', 'snack', '', 'popcorn|skinny pop|skinnypop|orville|pop secret|smartfood', ['Popcorn, microwave', 1]],
  ['tortilla-chips', 'Tortilla chips', 'snack', '', 'tortilla chips|tostitos|santitas|mission chips|on the border', ['Tortilla chips', 1]],
  ['chips', 'Chips', 'snack', '', 'chips|lay\'s|lays|doritos|ruffles|pringles|kettle chips|cheetos|sun chips|fritos', ['Potato chips', 1]],
  ['chocolate', 'Chocolate', 'snack', '', 'chocolate|hershey\'s|hersheys|m&m|reese\'s|peanut butter cups|peanut butter cup|kit kat|snickers|ghirardelli|lindt', ['Milk chocolate bar', 0.5]],
  ['cookies', 'Cookies', 'snack', '', 'cookies|oreo|oreos|chips ahoy|nutter butter|famous amos|keebler', ['Chocolate chip cookies', 1]],
  ['fruit-snacks', 'Fruit snacks', 'snack', '', 'fruit snacks|gummies|welch\'s fruit snacks|mott\'s fruit snacks', ['Fruit snacks', 1]],
  ['sports-drink', 'Sports drinks', 'snack', '', 'gatorade|powerade|sports drink|bodyarmor|body armor|electrolyte|liquid iv|prime hydration', ['Sports drink', 1]],

  /* ---------- Kitchen basics (assumed) ---------- */
  ['salt', 'Salt', 'spice', 'basic', 'salt|sea salt|kosher salt|morton|iodized', null],
  ['pepper', 'Black pepper', 'spice', 'basic', 'pepper|black pepper|peppercorns', null],
  ['oil', 'Cooking oil', 'spice', 'basic', 'oil|olive oil|vegetable oil|canola oil|avocado oil|extra virgin|crisco|wesson|coconut oil|pompeian|bertolli olive', null],
  ['cooking-spray', 'Cooking spray', 'spice', 'basic', 'cooking spray|pam|nonstick spray', null]
].map(([id, name, cat, group, words, food]) => ({ id, name, cat, group, words: words ? words.split('|') : [], food }));
const PANTRY_BY_ID = Object.fromEntries(PANTRY_ITEMS.map(it => [it.id, it]));
const BASICS = PANTRY_ITEMS.filter(it => it.group === 'basic').map(it => it.id);

// What each recipe in meals.js needs. Groups (any cheese, any pasta…) and "any one of" lists keep it flexible.
const RECIPE_NEEDS = {
  'overnight-oats': { need: ['oats', 'milk', 'yogurt', 'protein-powder'], nice: ['chia-seeds', 'berries'] },
  'egg-scramble': { need: ['eggs', 'bread'], nice: ['egg-whites', 'spinach', 'cheese', 'bananas'] },
  'protein-pancakes': { need: ['bananas', 'eggs', 'oats', 'protein-powder'], nice: ['baking-powder', 'cinnamon', 'yogurt', 'maple-syrup'] },
  'breakfast-burritos': { need: ['eggs', 'ground-meat', 'tortilla', 'cheese'], nice: ['beans', 'salsa', 'chili-powder', 'garlic-powder'] },
  'yogurt-bowl': { need: ['yogurt', ['granola', 'cereal']], nice: ['berries', 'honey'] },
  'pb-banana-bagel': { need: ['bagels', 'nut-butter', 'bananas'], nice: ['milk'] },
  'banana-oatmeal': { need: ['oats', 'milk', 'bananas'], nice: ['honey', 'cinnamon'] },
  'chicken-rice-bowls': { need: ['chicken', 'rice', ['broccoli', 'green-beans', 'mixed-veg', 'bell-peppers', 'peas-carrots']], nice: ['teriyaki', 'salsa', 'garlic-powder'] },
  'turkey-wrap': { need: ['tortilla', 'deli-meat'], nice: ['hummus', 'cheese', 'greens', 'tomatoes', 'apples', 'pretzels'] },
  'tuna-melt': { need: ['tuna', 'bread', 'cheese'], nice: ['mayo', 'yogurt', 'celery', 'pickles', 'carrots', 'grapes'] },
  'burrito-bowls': { need: ['ground-meat', 'rice', 'beans'], nice: ['taco-seasoning', 'corn', 'cheese', 'salsa', 'avocados'] },
  'pesto-pasta': { need: ['pasta', 'chicken', 'pesto'], nice: ['tomatoes', 'spinach', 'parmesan'] },
  'bean-quesadillas': { need: ['tortilla', ['beans', 'refried-beans'], 'cheese'], nice: ['cumin', 'yogurt', 'salsa'] },
  'banana-toast': { need: ['bread', 'nut-butter', 'bananas'], nice: ['honey'] },
  'bagel-jam': { need: ['bagels', ['cream-cheese', 'jam']], nice: [] },
  'berry-smoothie': { need: ['yogurt', 'bananas', 'berries', ['orange-juice', 'milk']], nice: [] },
  'applesauce-pretzels': { need: ['applesauce', 'pretzels'], nice: ['string-cheese'] },
  'classic-pbj': { need: ['bread', 'nut-butter', 'jam'], nice: [] },
  'choc-milk-banana': { need: ['choc-milk', 'bananas'], nice: [] },
  'recovery-shake': { need: ['oats', 'milk', 'protein-powder', 'bananas'], nice: ['nut-butter'] },
  'turkey-bagel': { need: [['bagels', 'bread'], 'deli-meat'], nice: ['cheese', 'greens', 'tomatoes', 'mustard'] },
  'cottage-cheese-bowl': { need: ['cottage-cheese', ['pineapple', 'berries', 'peaches', 'bananas', 'mango']], nice: ['granola', 'honey'] },
  'tuna-crackers': { need: ['tuna', 'crackers'], nice: ['mayo', 'lemons', 'apples'] },
  'salmon-potatoes': { need: ['salmon', 'potato'], nice: ['green-beans', 'lemons', 'garlic-powder', 'paprika'] },
  'turkey-meatballs': { need: ['ground-meat', 'pasta', 'marinara'], nice: ['eggs', 'breadcrumbs', 'parmesan', 'italian-seasoning', 'broccoli'] },
  'beef-broccoli': { need: ['steak', 'broccoli', 'rice', 'soy-sauce'], nice: ['honey', 'cornstarch', 'garlic', 'ginger'] },
  'turkey-chili': { need: ['ground-meat', 'crushed-tomatoes', 'beans', 'chili-powder'], nice: ['onions', 'bell-peppers', 'cumin', 'rice', 'cheese'] },
  'chicken-fajitas': { need: ['chicken', 'bell-peppers', 'tortilla'], nice: ['onions', 'taco-seasoning', 'yogurt', 'salsa'] },
  'egg-fried-rice': { need: ['rice', 'eggs', 'soy-sauce'], nice: ['edamame', 'peas-carrots', 'mixed-veg', 'green-onions', 'garlic-powder'] },
  'lean-burgers': { need: ['ground-meat', 'buns'], nice: ['cheese', 'greens', 'tomatoes', 'pickles', 'ketchup', 'mustard', 'sweet-potatoes'] },
  'energy-bites': { need: ['oats', 'nut-butter', 'honey'], nice: ['protein-powder', 'chocolate-chips', 'chia-seeds'] },
  'trail-mix': { need: ['nuts', 'dried-fruit'], nice: ['cereal', 'chocolate-chips'] },
  'apple-pb': { need: ['apples', 'nut-butter'], nice: ['string-cheese'] },
  'edamame': { need: ['edamame'], nice: [] },
  'turkey-rollups': { need: ['deli-meat', 'cheese'], nice: ['pretzels', 'mustard'] },
  'egg-muffin-sandwiches': { need: ['english-muffins', 'eggs'], nice: ['deli-meat', 'cheese'] },
  'choc-pb-shake': { need: ['protein-powder', 'milk', 'bananas'], nice: ['nut-butter', 'cocoa'] },
  'teriyaki-salmon-bowl': { need: ['salmon', 'rice'], nice: ['edamame', 'teriyaki', 'cucumber', 'sesame-seeds', 'green-onions'] },
  'honey-garlic-chicken': { need: ['chicken', 'potato', 'honey', 'soy-sauce'], nice: ['green-beans', 'garlic'] },
  'shrimp-tacos': { need: ['shrimp', 'tortilla'], nice: ['taco-seasoning', 'coleslaw', 'avocados', 'yogurt', 'limes', 'hot-sauce', 'beans'] },
  'chickpea-curry': { need: ['chickpeas', 'crushed-tomatoes', 'curry-powder', 'rice'], nice: ['coconut-milk', 'spinach', 'onions', 'garlic-powder', 'yogurt'] },
  'rice-cakes-pb': { need: ['rice-cakes', 'nut-butter'], nice: ['bananas', 'honey'] },
  'chicken-quesadilla': { need: ['tortilla', 'chicken', 'cheese'], nice: ['salsa'] },
  'hummus-plate': { need: [['pita', 'crackers', 'pretzels'], 'hummus'], nice: ['deli-meat', 'carrots'] },
  'chicken-alfredo': { need: ['pasta', 'chicken', ['milk', 'alfredo'], 'parmesan'], nice: ['broccoli', 'butter', 'cream-cheese', 'garlic-powder'] }
};

// Quick plates: [name, meals it fits, slots]. Each slot is a list of choices in order of preference; the first
// thing you have fills it (an optional slot starts with '?'). Numbers come from foods.js (PANTRY_ITEMS food).
const PANTRY_PLATES = [
  ['Protein, carb and veggie plate', ['lunch', 'dinner'], [
    ['chicken-breast', 'chicken-thighs', 'cooked-chicken', 'ground-turkey', 'ground-beef', 'steak', 'salmon', 'white-fish', 'shrimp', 'pork', 'tofu'],
    ['rice', 'pasta', 'potatoes', 'sweet-potatoes', 'quinoa', 'flour-tortillas', 'corn-tortillas'],
    ['broccoli', 'green-beans', 'mixed-veg', 'peas-carrots', 'bell-peppers', 'corn', 'spinach', 'lettuce', 'carrots', 'cucumber', 'edamame']],
    'Season and cook the protein (grill, pan or air fryer), cook the carb, and steam or roast the veggie. A little sauce on top (salsa, teriyaki, BBQ) makes it.'],
  ['Eggs, toast and fruit', ['breakfast'], [
    ['eggs'], ['bread', 'bagels', 'english-muffins', 'flour-tortillas', 'waffles'],
    ['bananas', 'berries', 'apples', 'oranges', 'grapes', 'orange-juice'], ['?shredded-cheese', 'block-cheese', 'sliced-cheese', 'spinach', 'bell-peppers']],
    'Scramble or fry the eggs (add the cheese or veggies), toast the bread and eat the fruit on the side.'],
  ['Protein bowl', ['breakfast', 'snack', 'post'], [
    ['greek-yogurt', 'cottage-cheese', 'yogurt'], ['granola', 'cereal', 'oats'],
    ['berries', 'bananas', 'pineapple', 'peaches', 'mango', 'apples'], ['?honey', 'peanut-butter', 'chia-seeds']],
    'Spoon it into a bowl, top with the crunchy part and the fruit, and drizzle on the extra.'],
  ['Big sandwich or wrap', ['lunch'], [
    ['deli-turkey', 'deli-ham', 'cooked-chicken', 'tuna', 'canadian-bacon'], ['bread', 'flour-tortillas', 'bagels', 'buns', 'pita'],
    ['?sliced-cheese', 'shredded-cheese', 'block-cheese', 'string-cheese'], ['?lettuce', 'spinach', 'tomatoes', 'cucumber'],
    ['apples', 'bananas', 'grapes', 'oranges', 'carrots', 'pretzels']],
    'Stack the meat, cheese and veggies on the bread or tortilla. Fruit or pretzels on the side.'],
  ['Recovery shake', ['post', 'snack', 'breakfast'], [
    ['protein-powder'], ['milk', 'plant-milk', 'choc-milk'], ['bananas', 'berries', 'mango', 'pineapple'], ['?peanut-butter', 'oats']],
    'Blend everything with a handful of ice. Drink it within an hour after training.'],
  ['Pre-game carbs', ['pre'], [
    ['bagels', 'bread', 'rice-cakes', 'english-muffins', 'waffles'], ['honey', 'jam', 'peanut-butter', 'maple-syrup'], ['bananas', 'applesauce', 'oranges', 'grapes', 'raisins']],
    'Easy carbs 1–2 hours before you play: top the bread with the spread, fruit on the side.'],
  ['Power snack', ['snack'], [
    ['apples', 'bananas', 'grapes', 'oranges', 'carrots', 'berries'],
    ['peanut-butter', 'almond-butter', 'string-cheese', 'greek-yogurt', 'cottage-cheese', 'hummus', 'jerky', 'almonds', 'peanuts']],
    'Fruit or veggies plus a protein or healthy fat keeps you full between meals.']
].map(([name, meals, slots, how]) => ({ name, meals, slots, how }));

/* ---------------------------- Matching (used by the Pantry screen) ---------------------------- */
const PANTRY = (() => {
  const GROUP_NAMES = { cheese: 'Cheese', yogurt: 'Yogurt', milk: 'Milk', chicken: 'Chicken', 'ground-meat': 'Ground turkey or beef',
    'deli-meat': 'Deli meat', tortilla: 'Tortillas', bread: 'Bread', rice: 'Rice', pasta: 'Pasta', berries: 'Berries', tomatoes: 'Tomatoes',
    beans: 'Canned beans', potato: 'Potatoes', greens: 'Lettuce or spinach', 'nut-butter': 'Peanut butter', nuts: 'Nuts', 'dried-fruit': 'Raisins or dried fruit' };
  const members = {};
  PANTRY_ITEMS.forEach(it => { if (it.group) (members[it.group] = members[it.group] || []).push(it.id); });
  const nameOf = id => (GROUP_NAMES[id] || (PANTRY_BY_ID[id] || {}).name || id);
  const needName = n => (Array.isArray(n) ? n.slice(0, 3).map(nameOf).join(' or ') : nameOf(n));

  // have: a Set of item ids (basics are always included). An id matches the item or anything in its group.
  const withBasics = ids => new Set([...ids, ...BASICS]);
  const has = (have, id) => have.has(id) || (members[id] || []).some(x => have.has(x));
  const hasNeed = (have, n) => (Array.isArray(n) ? n.some(x => has(have, x)) : has(have, n));

  function match(recipe, have) {
    const spec = RECIPE_NEEDS[recipe.id];
    if (!spec) return null;
    const missing = spec.need.filter(n => !hasNeed(have, n));
    return { r: recipe, missing: missing.map(needName), missingIds: missing, nice: spec.nice.filter(n => hasNeed(have, n)).map(needName), needs: spec.need.length };
  }
  // Recipes you can make now, and the ones you're 1 or 2 items away from. meal: favor recipes for this meal.
  function rank(recipes, ids, { meal } = {}) {
    const have = withBasics(ids), out = { ready: [], one: [], two: [] };
    for (const r of recipes) {
      const m = match(r, have);
      if (!m) continue;
      m.fit = meal && r.meals.includes(meal) ? 1 : 0;
      (m.missing.length === 0 ? out.ready : m.missing.length === 1 ? out.one : m.missing.length === 2 ? out.two : []).push(m);
    }
    const order = (a, b) => b.fit - a.fit || b.nice.length - a.nice.length || b.r.pro - a.r.pro;
    Object.values(out).forEach(list => list.sort(order));
    return out;
  }

  // Quick plates from what you have, with rough numbers from foods.js.
  const foodByName = () => (typeof FOODS !== 'undefined' ? Object.fromEntries(FOODS.map(f => [f.name, f])) : {});
  function plates(ids, { meal } = {}) {
    const have = withBasics(ids), foods = foodByName(), out = [];
    for (const p of PANTRY_PLATES) {
      const pick = (slot, skip) => slot.map(s => s.replace(/^\?/, '')).find(x => has(have, x) && !skip.includes(x));
      const variants = p.name.startsWith('Protein, carb') ? 3 : 1, usedFirst = [];
      for (let v = 0; v < variants; v++) {
        const parts = [];
        let ok = true;
        p.slots.forEach((slot, i) => {
          const x = pick(slot, i === 0 ? usedFirst : []);
          if (x) parts.push(x);
          else if (!slot[0].startsWith('?')) ok = false;
        });
        if (!ok) break;
        usedFirst.push(parts[0]);
        const tot = { cal: 0, pro: 0, carb: 0, fat: 0 };
        parts.forEach(id => { const it = PANTRY_BY_ID[id], f = it && it.food && foods[it.food[0]]; if (f) ['cal', 'pro', 'carb', 'fat'].forEach(k => { tot[k] += f[k] * it.food[1]; }); });
        out.push({ name: p.name, meals: p.meals, how: p.how, items: parts, title: parts.map(id => PANTRY_BY_ID[id].name).join(' + '),
          cal: Math.round(tot.cal), pro: Math.round(tot.pro), carb: Math.round(tot.carb), fat: Math.round(tot.fat), fit: meal && p.meals.includes(meal) ? 1 : 0 });
      }
    }
    return out.sort((a, b) => b.fit - a.fit || b.pro - a.pro);
  }

  // Reads food names out of text (package labels in a photo, a typed list): longest names first, and each match is
  // blanked out so "chocolate milk" doesn't also count as "milk". strict: skip 1–2 letter words and the basics (photo text is noisy).
  const norm = s => ' ' + String(s || '').toLowerCase().replace(/[’']/g, '\'').replace(/[^a-z0-9%&'\- ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  const WORDS = PANTRY_ITEMS.flatMap(it => [it.name.toLowerCase(), ...it.words].map(w => [norm(w).trim(), it.id])).filter(([w]) => w)
    .sort((a, b) => b[0].length - a[0].length);
  function findInText(text, { strict = false } = {}) {
    let s = norm(text);
    const found = new Map();
    for (const [w, id] of WORDS) {
      if (strict && w.replace(/[^a-z]/g, '').length < 3) continue;
      const needle = ' ' + w + ' ';
      let at = s.indexOf(needle);
      while (at >= 0) {
        found.set(id, (found.get(id) || 0) + 1);
        s = s.slice(0, at + 1) + ' '.repeat(w.length) + s.slice(at + 1 + w.length);
        at = s.indexOf(needle);
      }
    }
    return [...found.keys()].filter(id => !BASICS.includes(id) || !strict);
  }
  // For the "add an item" box: names and other names that start with what you typed.
  function search(q, limit = 8) {
    const t = norm(q).trim();
    if (!t) return [];
    const score = it => { const n = it.name.toLowerCase(); if (n.startsWith(t)) return 3; if (n.includes(t)) return 2; return it.words.some(w => w.startsWith(t)) ? 1 : 0; };
    return PANTRY_ITEMS.map(it => [it, score(it)]).filter(([, s2]) => s2 > 0).sort((a, b) => b[1] - a[1] || a[0].name.localeCompare(b[0].name)).slice(0, limit).map(([it]) => it);
  }
  return { rank, plates, match, findInText, search, has: (ids, id) => has(withBasics(ids), id), nameOf, needName, members };
})();
