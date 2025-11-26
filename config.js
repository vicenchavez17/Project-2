const APPAREL_WHITE_LIST = [
  'shirt', 'tshirt', 't-shirt', 'blouse', 'top',
  'pants', 'jeans', 'trousers', 'shorts',
  'dress', 'skirt',
  'jacket', 'coat', 'hoodie', 'sweater', 'cardigan',
  'shoes', 'sneakers', 'boots', 'sandals',
  'hat', 'cap', 'beanie',
  'sock', 'socks',
  'tie', 'scarf',
  'glove', 'gloves',
  'suit', 'vest',
  'underwear', 'bra',
  'swimsuit', 'bikini'
];

const CATEGORIES = {
  top: ['top', 'shirt', 't-shirt', 'tshirt', 'blouse', 'tank', 'sweater', 'hoodie', 'jacket', 'coat', 'cardigan', 'vest', 'blazer'],
  bottom: ['bottom', 'pants', 'jeans', 'trousers', 'shorts', 'skirt', 'leggings'],
  dress: ['dress', 'gown'],
  footwear: ['shoes', 'sneakers', 'boots', 'sandals', 'heels'],
  accessory: ['hat', 'cap', 'beanie', 'tie', 'scarf', 'belt', 'glove']
};
  
const CONFIG_PORT = 3000;

export { APPAREL_WHITE_LIST, CATEGORIES, CONFIG_PORT};
