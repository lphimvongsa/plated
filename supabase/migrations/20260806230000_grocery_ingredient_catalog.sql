-- Grocery reference catalog. Classification rule: shelf-stable sauces, oils,
-- condiments, canned goods and pastes are Dry Goods; seafood is Meat.
-- This migration intentionally replaces every legacy/runtime price.

delete from public.ingredient_prices;
drop table public.ingredient_prices cascade;

create table public.grocery_ingredients (
  canonical_key text primary key,
  display_name text not null,
  category text not null check (category in ('Produce','Dairy','Meat','Dry Goods','Spices','Other')),
  subcategory text,
  preferred_shopping_unit text not null,
  keep_count boolean not null default false,
  density_g_per_ml numeric,
  edible_yield numeric not null default 1 check (edible_yield > 0 and edible_yield <= 1),
  cuisine_tags text[] not null default '{}',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ingredient_aliases (
  alias_key text primary key,
  canonical_key text not null references public.grocery_ingredients(canonical_key) on delete cascade
);

create table public.ingredient_unit_weights (
  canonical_key text not null references public.grocery_ingredients(canonical_key) on delete cascade,
  unit text not null,
  grams_per_unit numeric not null check (grams_per_unit > 0),
  source text not null default 'seed' check (source in ('seed','manual','ai')),
  updated_at timestamptz not null default now(),
  primary key (canonical_key, unit)
);

create table public.ingredient_prices (
  canonical_key text not null references public.grocery_ingredients(canonical_key) on delete cascade,
  unit text not null,
  price_per_unit numeric(12,4) not null check (price_per_unit > 0),
  currency text not null default 'USD',
  market text not null default 'US',
  source text not null default 'seed' check (source in ('seed','manual','ai','retail')),
  observed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (canonical_key, unit, currency, market)
);

create trigger grocery_ingredients_updated_at before update on public.grocery_ingredients
  for each row execute function public.set_updated_at();
create trigger ingredient_unit_weights_updated_at before update on public.ingredient_unit_weights
  for each row execute function public.set_updated_at();
create trigger ingredient_prices_updated_at before update on public.ingredient_prices
  for each row execute function public.set_updated_at();

-- Compact, reviewable seed helper. Prices are intentionally rounded US retail
-- ballparks, not false-precision observations.
create or replace function pg_temp.seed_grocery_group(
  names text[], p_category text, p_subcategory text, p_unit text,
  p_price numeric, p_density numeric default null, p_tags text[] default '{}'
) returns void language plpgsql as $$
declare n text;
begin
  foreach n in array names loop
    insert into public.grocery_ingredients
      (canonical_key, display_name, category, subcategory, preferred_shopping_unit, density_g_per_ml, cuisine_tags)
    values (n, initcap(n), p_category, p_subcategory, p_unit, p_density, p_tags);
    insert into public.ingredient_prices(canonical_key, unit, price_per_unit, source)
    values (n, p_unit, p_price, 'seed');
  end loop;
end $$;

-- PRODUCE: vegetables, fruit, herbs, chilies, fungi, roots and regional staples.
select pg_temp.seed_grocery_group(array[
  'artichoke','arugula','asparagus','avocado','baby bok choy','bamboo shoots','beet greens','beet','belgian endive','bell pepper','bitter melon','bok choy','broccoli','broccoli rabe','broccolini','brussels sprouts','burdock root','butter lettuce','cabbage','carrot','cassava','cauliflower','celeriac','celery','chard','chayote','chicory','chinese broccoli','chinese cabbage','collard greens','corn','cucumber','daikon','dandelion greens','edamame','eggplant','endive','english cucumber','fennel bulb','fiddlehead fern','frisee','green bean','green cabbage','hearts of palm','jicama','kale','kohlrabi','leek','lettuce','lotus root','mache','mustard greens','napa cabbage','nopales','okra','onion','parsnip','pea shoots','peas','plantain','poblano pepper','potato','pumpkin','purslane','radicchio','radish','red cabbage','romaine lettuce','rutabaga','salsify','savoy cabbage','snow peas','sorrel','spaghetti squash','spinach','sugar snap peas','sweet potato','swiss chard','taro root','tomatillo','tomato','turnip','turnip greens','water chestnuts','water spinach','watercress','wax beans','yam','yellow squash','yu choy','yuca','zucchini',
  'acorn squash','butternut squash','delicata squash','hubbard squash','kabocha squash','pattypan squash','red kuri squash','thai eggplant','japanese eggplant','chinese eggplant','roma tomato','cherry tomato','grape tomato','beefsteak tomato','heirloom tomato','russet potato','yukon gold potato','red potato','fingerling potato','new potato','purple potato','jerusalem artichoke','malanga','boniato','opo squash','calabaza','tindora','drumstick vegetable','banana blossom','green papaya','jackfruit green'
], 'Produce','vegetable','oz',0.12,null,array['Global']);

select pg_temp.seed_grocery_group(array[
  'apple','apricot','asian pear','banana','blackberry','blackcurrant','blood orange','blueberry','boysenberry','breadfruit','cantaloupe','cherimoya','cherry','clementine','coconut','cranberry','currant','date','dragon fruit','durian','elderberry','feijoa','fig','gooseberry','grape','grapefruit','guava','honeydew','huckleberry','jackfruit','kiwi','kumquat','longan','loquat','lychee','mandarin','mango','mangosteen','melon','mulberry','nectarine','orange','papaya','passion fruit','peach','pear','persimmon','pineapple','plum','pomegranate','pomelo','prickly pear','quince','rambutan','raspberry','red currant','rhubarb','soursop','star fruit','strawberry','tamarind fruit','tangerine','watermelon','young coconut','meyer lemon','key lime','concord grape','red grape','green grape','plantain ripe'
], 'Produce','fruit','oz',0.18,null,array['Global']);

select pg_temp.seed_grocery_group(array[
  'basil','thai basil','holy basil','bay leaf fresh','chervil','chives','cilantro','culantro','curry leaves','dill','epazote','fenugreek leaves','flat leaf parsley','hoja santa','kaffir lime leaves','lavender','lemon balm','lemongrass','marjoram','mint','oregano','parsley','peppermint','perilla leaves','rosemary','sage','savory','scallion','shiso','sorrel leaves','spearmint','tarragon','thyme','water celery','wild garlic','ramps'
], 'Produce','fresh-herb','bunch',2.00,null,array['Global']);

select pg_temp.seed_grocery_group(array[
  'anaheim chili','banana pepper','bird pepper','cayenne chili','cherry pepper','chiltepin','fresno chili','guajillo chili fresh','habanero chili','hatch chili','jalapeño','manzano chili','pasilla chili fresh','pepperoncini fresh','red chili','scotch bonnet chili','serrano chili','shishito pepper','spur chili','thai chili','urfa chili fresh','green chili','finger chili','aji amarillo fresh','rocoto pepper','cubanelle pepper','padron pepper','ghost pepper'
], 'Produce','chili','each',0.20,null,array['Latin','Thai','Chinese','Indian']);

update public.grocery_ingredients set keep_count=true where subcategory='chili';

select pg_temp.seed_grocery_group(array[
  'button mushroom','cremini mushroom','portobello mushroom','shiitake mushroom','oyster mushroom','king oyster mushroom','enoki mushroom','maitake mushroom','morel mushroom','chanterelle mushroom','porcini mushroom','wood ear mushroom','straw mushroom','shimeji mushroom','lion mane mushroom','lobster mushroom','black trumpet mushroom'
], 'Produce','mushroom','oz',0.45,null,array['Global']);

select pg_temp.seed_grocery_group(array[
  'garlic','ginger','galangal','shallot','green onion','red onion','yellow onion','white onion','sweet onion','pearl onion','cipollini onion','horseradish root','turmeric root'
], 'Produce','aromatic','oz',0.25,null,array['Global']);

select pg_temp.seed_grocery_group(array['lemon','lime','yuzu','calamansi','bergamot','buddha hand'], 'Produce','citrus','each',0.65,null,array['Global']);

-- MEAT / SEAFOOD / PROTEINS. Distinct retail cuts remain distinct keys.
select pg_temp.seed_grocery_group(array[
  'beef chuck roast','beef brisket','beef short ribs','beef back ribs','beef ribeye steak','beef strip steak','beef sirloin steak','beef tenderloin','beef filet mignon','beef flank steak','beef skirt steak','beef hanger steak','beef flat iron steak','beef tri tip','beef round roast','beef eye of round','beef shank','beef oxtail','beef stew meat','ground beef','lean ground beef','beef liver','beef tongue','beef cheek','beef tripe','corned beef','veal chop','veal cutlet','veal shank','ground veal','veal sweetbreads',
  'pork belly','pork shoulder','pork butt','pork loin','pork tenderloin','pork chop','pork ribs','baby back ribs','spare ribs','country style pork ribs','ground pork','pork hock','ham hock','fresh ham','spiral ham','prosciutto','pancetta','guanciale','bacon','canadian bacon','salt pork','pork liver','pork cheek','pork sausage','italian sausage','breakfast sausage','chorizo fresh','chorizo cured','andouille sausage','kielbasa','bratwurst','hot dog','blood sausage',
  'lamb shoulder','lamb leg','lamb loin chop','lamb rib chop','lamb shank','lamb breast','ground lamb','lamb neck','lamb liver','goat shoulder','goat leg','goat stew meat','ground goat','mutton',
  'venison steak','ground venison','venison roast','rabbit','wild boar','bison steak','ground bison','elk steak','quail','pheasant'
], 'Meat','red-meat-cut','oz',0.55,null,array['Global']);

select pg_temp.seed_grocery_group(array[
  'whole chicken','chicken breast','bone in chicken breast','chicken tenderloin','chicken thigh','bone in chicken thigh','chicken drumstick','chicken leg quarter','chicken wing','ground chicken','chicken liver','chicken gizzard','chicken feet','chicken back','whole turkey','turkey breast','turkey thigh','turkey drumstick','ground turkey','turkey wing','whole duck','duck breast','duck leg','duck confit','duck liver','goose','cornish hen'
], 'Meat','poultry-cut','oz',0.32,null,array['Global']);

select pg_temp.seed_grocery_group(array[
  'salmon fillet','smoked salmon','canned salmon','tuna steak','canned tuna','cod fillet','haddock','halibut','tilapia','catfish','trout','rainbow trout','arctic char','sea bass','branzino','red snapper','grouper','mahi mahi','swordfish','mackerel','sardines','anchovies','herring','pollock','sole','flounder','monkfish','eel','whitefish','carp','barramundi','bluefish','black cod','milkfish','pomfret','salt cod','shrimp','prawns','langoustine','lobster','crab','crab meat','crawfish','scallops','mussels','clams','oysters','cockles','squid','calamari','octopus','cuttlefish','conch','sea urchin','fish roe','salmon roe','tobiko'
], 'Meat','seafood','oz',0.65,null,array['Global']);

select pg_temp.seed_grocery_group(array[
  'firm tofu','extra firm tofu','soft tofu','silken tofu','tofu puffs','smoked tofu','tempeh','seitan','textured vegetable protein','natto','soy curls','paneer','halloumi'
], 'Meat','plant-protein','oz',0.28,null,array['Asian','Indian','Mediterranean']);

-- DAIRY AND EGGS.
select pg_temp.seed_grocery_group(array[
  'whole milk','two percent milk','skim milk','buttermilk','goat milk','evaporated milk','sweetened condensed milk','heavy cream','light cream','half and half','sour cream','creme fraiche','plain yogurt','greek yogurt','skyr','kefir','labneh','butter','unsalted butter','salted butter','ghee','cultured butter','cream cheese','mascarpone','ricotta','cottage cheese','quark'
], 'Dairy','milk-and-cream','fl oz',0.16,1.02,array['Global']);

select pg_temp.seed_grocery_group(array[
  'cheddar cheese','sharp cheddar cheese','monterey jack cheese','pepper jack cheese','colby cheese','american cheese','mozzarella cheese','fresh mozzarella','burrata','parmesan cheese','pecorino romano','asiago cheese','provolone cheese','fontina cheese','gorgonzola cheese','blue cheese','brie cheese','camembert cheese','gruyere cheese','emmental cheese','swiss cheese','gouda cheese','smoked gouda','edam cheese','havarti cheese','muenster cheese','feta cheese','goat cheese','queso fresco','cotija cheese','oaxaca cheese','manchego cheese','comte cheese','raclette cheese','taleggio cheese','limburger cheese','paneer cheese'
], 'Dairy','cheese','oz',0.55,null,array['Global']);

select pg_temp.seed_grocery_group(array['egg','duck egg','quail egg'], 'Dairy','egg','each',0.35,null,array['Global']);
update public.grocery_ingredients set keep_count=true where subcategory='egg';
insert into public.ingredient_prices(canonical_key,unit,price_per_unit,source) values ('egg','dozen',4.20,'seed');

-- SPICES: dried herbs, whole/ground spices and global blends. Price per tsp.
select pg_temp.seed_grocery_group(array[
  'kosher salt','table salt','sea salt','flaky salt','smoked salt','pink salt','celery salt','garlic salt','onion salt','black pepper','white pepper','green peppercorn','pink peppercorn','sichuan peppercorn','sansho pepper','long pepper','allspice','anise seed','star anise','asafoetida','ajwain','caraway seed','cardamom','black cardamom','celery seed','cinnamon','cassia','clove','coriander seed','cumin seed','fennel seed','fenugreek seed','juniper berry','mace','mahlab','mustard seed','nigella seed','nutmeg','poppy seed','saffron','sesame seed','sumac','turmeric','vanilla bean','ground ginger','garlic powder','onion powder','paprika','smoked paprika','sweet paprika','hot paprika','cayenne pepper','chili powder','ancho chili powder','chipotle powder','gochugaru','red pepper flakes','aleppo pepper','kashmiri chili powder','degghi mirch','urfa biber','dried oregano','dried basil','dried thyme','dried rosemary','dried sage','dried marjoram','dried dill','dried mint','dried parsley','bay leaf','ground coriander','ground cumin','ground cinnamon','ground cardamom','ground cloves','ground nutmeg','ground allspice','ground fennel','ground fenugreek','ground mustard','ground white pepper',
  'adobo seasoning','baharat','berbere','blackening seasoning','bouquet garni','cajun seasoning','chaat masala','chinese five spice','chili seasoning','curry powder','dukkah','everything bagel seasoning','fines herbes','furikake','garam masala','herbes de provence','italian seasoning','jerk seasoning','lemon pepper','old bay seasoning','panch phoron','poultry seasoning','pumpkin pie spice','ras el hanout','recado rojo','shichimi togarashi','taco seasoning','tandoori masala','zaatar','zhoug spice','advieh','khmeli suneli','quatre epices','shawarma seasoning','suya spice','vadouvan','seasoned salt'
], 'Spices','spice','tsp',0.18,null,array['Global']);

-- DRY GOODS: sauces/condiments/pastes/oils use tbsp; other groups use useful retail units.
select pg_temp.seed_grocery_group(array[
  'soy sauce','light soy sauce','dark soy sauce','tamari','white soy sauce','sweet soy sauce','fish sauce','oyster sauce','hoisin sauce','teriyaki sauce','ponzu sauce','yakitori sauce','unagi sauce','black bean sauce','chili garlic sauce','sweet chili sauce','sambal oelek','chili crisp','sriracha','gochujang','doenjang','ssamjang','red miso','white miso','yellow miso','miso paste','doubanjiang','tianmianjiang','shrimp paste','belacan','thai red curry paste','thai green curry paste','thai yellow curry paste','massaman curry paste','panang curry paste','harissa','zhoug','chermoula','tahini','hummus','mole paste','achiote paste','tamarind paste','ginger garlic paste','tom yum paste','wasabi paste','horseradish sauce','ketchup','mayonnaise','mustard','dijon mustard','whole grain mustard','yellow mustard','english mustard','hot sauce','tabasco sauce','worcestershire sauce','barbecue sauce','steak sauce','buffalo sauce','ranch dressing','caesar dressing','vinaigrette','pesto','salsa','salsa verde','enchilada sauce','taco sauce','chimichurri','romesco sauce','tzatziki','pomegranate molasses','date syrup','maple syrup','corn syrup','golden syrup','molasses','honey','agave nectar','black vinegar','rice vinegar','seasoned rice vinegar','apple cider vinegar','white vinegar','red wine vinegar','white wine vinegar','sherry vinegar','balsamic vinegar','malt vinegar','champagne vinegar','coconut vinegar'
], 'Dry Goods','sauce-condiment','tbsp',0.20,1.05,array['Global']);

select pg_temp.seed_grocery_group(array[
  'olive oil','extra virgin olive oil','canola oil','vegetable oil','corn oil','peanut oil','sesame oil','toasted sesame oil','avocado oil','coconut oil','grapeseed oil','sunflower oil','safflower oil','mustard oil','walnut oil','hazelnut oil','almond oil','chili oil','truffle oil','rice bran oil','palm oil','shortening','lard','duck fat','beef tallow'
], 'Dry Goods','oil-fat','tbsp',0.22,0.92,array['Global']);

select pg_temp.seed_grocery_group(array[
  'all purpose flour','bread flour','cake flour','pastry flour','whole wheat flour','self rising flour','00 flour','semolina flour','durum flour','rye flour','buckwheat flour','barley flour','oat flour','rice flour','glutinous rice flour','chickpea flour','corn flour','cornmeal','masa harina','cornstarch','potato starch','tapioca starch','arrowroot starch','cassava flour','almond flour','coconut flour','sorghum flour','teff flour','spelt flour','vital wheat gluten','panko breadcrumbs','breadcrumbs','cracker crumbs','matzo meal'
], 'Dry Goods','flour-baking','oz',0.12,null,array['Global']);

select pg_temp.seed_grocery_group(array[
  'granulated sugar','brown sugar','dark brown sugar','powdered sugar','demerara sugar','turbinado sugar','muscovado sugar','coconut sugar','palm sugar','jaggery','rock sugar','pearl sugar','sanding sugar','date sugar','baking powder','baking soda','cream of tartar','active dry yeast','instant yeast','fresh yeast','gelatin','agar agar','pectin','cocoa powder','dutch cocoa powder','chocolate chips','dark chocolate','milk chocolate','white chocolate','cacao nibs','vanilla extract','almond extract','rose water','orange blossom water','food coloring','sprinkles'
], 'Dry Goods','baking','oz',0.24,null,array['Global']);

select pg_temp.seed_grocery_group(array[
  'long grain white rice','short grain white rice','medium grain rice','brown rice','basmati rice','jasmine rice','arborio rice','carnaroli rice','sushi rice','sticky rice','black rice','red rice','wild rice','parboiled rice','calrose rice','bomba rice','valencia rice','broken rice','quinoa','red quinoa','barley','pearl barley','farro','bulgur','freekeh','millet','sorghum grain','amaranth','buckwheat groats','oats','rolled oats','steel cut oats','polenta','grits','couscous','pearl couscous','teff grain','wheat berries','rye berries','hominy'
], 'Dry Goods','grain','oz',0.14,null,array['Global']);

select pg_temp.seed_grocery_group(array[
  'spaghetti','linguine','fettuccine','tagliatelle','pappardelle','bucatini','capellini','penne','rigatoni','ziti','fusilli','farfalle','orecchiette','cavatappi','macaroni','orzo','lasagna noodles','gnocchi','egg noodles','rice noodles','rice vermicelli','pad thai noodles','wide rice noodles','glass noodles','cellophane noodles','soba noodles','udon noodles','ramen noodles','somyeon noodles','jjolmyeon noodles','wheat noodles','lo mein noodles','chow mein noodles','hokkien noodles','shirataki noodles','bean thread noodles','sweet potato noodles','fresh pasta','wonton wrappers','dumpling wrappers','spring roll wrappers','rice paper wrappers'
], 'Dry Goods','pasta-noodle','oz',0.20,null,array['Italian','Chinese','Japanese','Korean','Thai','Vietnamese']);

select pg_temp.seed_grocery_group(array[
  'black beans','kidney beans','pinto beans','navy beans','great northern beans','cannellini beans','lima beans','fava beans','adzuki beans','mung beans','urad dal','toor dal','chana dal','moong dal','masoor dal','green lentils','brown lentils','red lentils','black lentils','french lentils','split peas','yellow split peas','chickpeas','black eyed peas','pigeon peas','soybeans','lupini beans','mayocoba beans','cranberry beans','scarlet runner beans'
], 'Dry Goods','legume','oz',0.16,null,array['Global']);

select pg_temp.seed_grocery_group(array[
  'almonds','walnuts','pecans','cashews','pistachios','peanuts','hazelnuts','macadamia nuts','brazil nuts','pine nuts','chestnuts','marcona almonds','sunflower seeds','pumpkin seeds','chia seeds','flax seeds','hemp seeds','white sesame seeds','black sesame seeds','watermelon seeds','lotus seeds','poppy seeds','peanut butter','almond butter','cashew butter','sunflower seed butter'
], 'Dry Goods','nut-seed','oz',0.48,null,array['Global']);

select pg_temp.seed_grocery_group(array[
  'canned diced tomatoes','canned whole tomatoes','crushed tomatoes','tomato puree','tomato paste','canned black beans','canned kidney beans','canned chickpeas','canned corn','canned green chilies','canned artichoke hearts','canned pumpkin','canned coconut milk','coconut cream','cream of mushroom soup','cream of chicken soup','chicken broth','beef broth','vegetable broth','dashi stock','clam juice','bouillon cube','chicken bouillon','beef bouillon','vegetable bouillon','canned pineapple','canned peaches','canned pears','canned lychee','canned bamboo shoots','canned water chestnuts','canned jackfruit','canned dolmas'
], 'Dry Goods','canned-stock','can',2.25,null,array['Global']);

select pg_temp.seed_grocery_group(array[
  'nori','kombu','wakame','dulse','hijiki','bonito flakes','dried shiitake mushroom','dried porcini mushroom','dried wood ear mushroom','dried red chili','dried ancho chili','dried guajillo chili','dried pasilla chili','dried chipotle chili','dried arbol chili','dried kashmiri chili','dried lime','dried apricot','raisins','golden raisins','dried cranberry','dried date','dried fig','dried mango','dried coconut','preserved lemon','capers','green olives','black olives','kalamata olives','cornichons','dill pickles','pickled jalapeño','pickled ginger','kimchi','sauerkraut'
], 'Dry Goods','preserved','oz',0.38,null,array['Global']);

select pg_temp.seed_grocery_group(array[
  'white bread','whole wheat bread','sourdough bread','rye bread','brioche','baguette','ciabatta','focaccia','pita bread','naan','roti','tortilla corn','tortilla flour','lavash','matzo','english muffin','bagel','hamburger bun','hot dog bun','croissant','phyllo dough','puff pastry','pie crust','pizza dough'
], 'Dry Goods','bread','oz',0.24,null,array['Global']);

-- OTHER common cooking inputs that are neither shelf-stable food nor produce.
select pg_temp.seed_grocery_group(array['water','ice','coffee','espresso','black tea','green tea','matcha','cocoa beverage mix','red wine','white wine','dry sherry','marsala wine','rice wine','shaoxing wine','mirin','sake','beer','lager','stout','brandy','cognac','bourbon','rum','vodka','tequila','orange liqueur'], 'Other','beverage-cooking','fl oz',0.35,1,array['Global']);

-- Critical count weights and useful shopping package weights.
insert into public.ingredient_unit_weights(canonical_key,unit,grams_per_unit,source) values
  ('thai chili','each',3,'seed'),('thai chili','piece',3,'seed'),
  ('bird pepper','each',3,'seed'),('spur chili','each',12,'seed'),
  ('jalapeño','each',14,'seed'),('serrano chili','each',8,'seed'),
  ('habanero chili','each',12,'seed'),('scotch bonnet chili','each',12,'seed'),
  ('garlic','clove',3,'seed'),('garlic','each',45,'seed'),
  ('lemon','each',85,'seed'),('lime','each',67,'seed'),('key lime','each',32,'seed'),
  ('bacon','strip',25,'seed'),('celery','stalk',40,'seed'),('celery','rib',40,'seed'),
  ('egg','each',50,'seed'),('duck egg','each',70,'seed'),('quail egg','each',9,'seed'),
  ('bay leaf','leaf',0.2,'seed'),('bay leaf fresh','leaf',0.6,'seed'),
  ('parsley','sprig',1,'seed'),('parsley','bunch',60,'seed'),
  ('cilantro','sprig',1,'seed'),('cilantro','bunch',60,'seed'),
  ('basil','sprig',1,'seed'),('basil','bunch',45,'seed'),
  ('rosemary','sprig',2,'seed'),('rosemary','bunch',30,'seed'),
  ('thyme','sprig',0.5,'seed'),('thyme','bunch',28,'seed'),
  ('scallion','each',15,'seed'),('green onion','each',15,'seed'),
  ('lemongrass','stalk',20,'seed'),('corn','each',90,'seed'),
  ('avocado','each',150,'seed'),('onion','each',150,'seed'),('potato','each',170,'seed'),
  ('bouillon cube','cube',4,'seed'),('chicken bouillon','cube',4,'seed'),
  ('whole chicken','each',1814,'seed');

-- Count-preserved items and prices that match how they are commonly purchased.
update public.grocery_ingredients set keep_count=true, preferred_shopping_unit='each'
where canonical_key in ('garlic','lemon','lime','key lime','egg','duck egg','quail egg','bay leaf','bay leaf fresh');
update public.ingredient_prices set unit='each', price_per_unit=0.12 where canonical_key='garlic';

-- Standardized aliases. Prep descriptors remain handled by standardizeIngredientKey;
-- these rows handle true grocery synonyms and regional naming.
insert into public.ingredient_aliases(alias_key,canonical_key) values
  ('bird''s eye chili','thai chili'),('birds eye chili','thai chili'),('bird eye chili','thai chili'),
  ('thai chilies','thai chili'),('thai chile','thai chili'),('thai chiles','thai chili'),
  ('green onions','green onion'),('scallions','green onion'),('scallion','green onion'),
  ('spring onion','green onion'),('coriander leaf','cilantro'),('coriander leaves','cilantro'),
  ('onions','onion'),('potatoes','potato'),('tomatoes','tomato'),('carrots','carrot'),
  ('avocados','avocado'),('lemons','lemon'),('limes','lime'),('eggs','egg'),
  ('mushrooms','button mushroom'),('bell peppers','bell pepper'),('green beans','green bean'),
  ('brussels sprout','brussels sprouts'),('sweet potatoes','sweet potato'),
  ('shallots','shallot'),('jalapenos','jalapeño'),('jalapeños','jalapeño'),
  ('aubergine','eggplant'),('courgette','zucchini'),('rocket','arugula'),
  ('capsicum','bell pepper'),('lady fingers','okra'),('bhindi','okra'),
  ('garbanzo beans','chickpeas'),('garbanzo bean','chickpeas'),('chickpea','chickpeas'),
  ('cannellini bean','cannellini beans'),('black bean','black beans'),
  ('extra virgin olive oil','olive oil'),('evoo','olive oil'),
  ('light soya sauce','light soy sauce'),('dark soya sauce','dark soy sauce'),
  ('nam pla','fish sauce'),('go chu jang','gochujang'),('fermented soybean paste','doenjang'),
  ('douban jiang','doubanjiang'),('toban djan','doubanjiang'),
  ('chinese black vinegar','black vinegar'),('chinkiang vinegar','black vinegar'),
  ('shaoxing cooking wine','shaoxing wine'),('rice wine vinegar','rice vinegar'),
  ('coconut milk','canned coconut milk'),('passata','tomato puree'),
  ('ground beef mince','ground beef'),('beef mince','ground beef'),
  ('pork mince','ground pork'),('chicken mince','ground chicken'),
  ('prawns','shrimp'),('scampi','langoustine'),('calamari','squid'),
  ('chicken stock','chicken broth'),('beef stock','beef broth'),('vegetable stock','vegetable broth'),
  ('all-purpose flour','all purpose flour'),('ap flour','all purpose flour'),('plain flour','all purpose flour'),
  ('confectioners sugar','powdered sugar'),('icing sugar','powdered sugar'),
  ('caster sugar','granulated sugar'),('active yeast','active dry yeast'),
  ('greek yoghurt','greek yogurt'),('yoghurt','plain yogurt'),
  ('chile de arbol','dried arbol chili'),('ancho chile','dried ancho chili'),
  ('kaffir lime leaf','kaffir lime leaves'),('makrut lime leaves','kaffir lime leaves'),
  ('gram flour','chickpea flour'),('besan','chickpea flour'),
  ('glutinous rice','sticky rice'),('sweet rice','sticky rice'),('sushi nori','nori');

create index ingredient_aliases_canonical_idx on public.ingredient_aliases(canonical_key);
create index ingredient_prices_lookup_idx on public.ingredient_prices(canonical_key,currency,market,unit);
create index grocery_ingredients_category_idx on public.grocery_ingredients(category,subcategory) where active;

alter table public.grocery_ingredients enable row level security;
alter table public.ingredient_aliases enable row level security;
alter table public.ingredient_unit_weights enable row level security;
alter table public.ingredient_prices enable row level security;

create policy "grocery_ingredients_select" on public.grocery_ingredients for select to authenticated using (true);
create policy "ingredient_aliases_select" on public.ingredient_aliases for select to authenticated using (true);
create policy "ingredient_unit_weights_select" on public.ingredient_unit_weights for select to authenticated using (true);
create policy "ingredient_prices_select" on public.ingredient_prices for select to authenticated using (true);
create policy "ingredient_unit_weights_insert" on public.ingredient_unit_weights for insert to authenticated with check (source in ('manual','ai'));
create policy "ingredient_unit_weights_update" on public.ingredient_unit_weights for update to authenticated using (true) with check (source in ('manual','ai'));
create policy "ingredient_prices_insert" on public.ingredient_prices for insert to authenticated with check (source in ('manual','ai','retail'));
create policy "ingredient_prices_update" on public.ingredient_prices for update to authenticated using (true) with check (source in ('manual','ai','retail'));

grant select on public.grocery_ingredients, public.ingredient_aliases, public.ingredient_unit_weights, public.ingredient_prices to authenticated;
grant insert, update on public.ingredient_unit_weights, public.ingredient_prices to authenticated;

-- Guard against an incomplete seed release.
do $$ begin
  if exists (select 1 from public.grocery_ingredients g where not exists (
    select 1 from public.ingredient_prices p where p.canonical_key=g.canonical_key
  )) then raise exception 'Every grocery ingredient must have a price'; end if;
end $$;
