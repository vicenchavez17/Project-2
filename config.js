const APPAREL_WHITE_LIST = [
  // Tops
  'shirt', 'tshirt', 't-shirt', 'blouse', 'top',
  'sweater', 'hoodie', 'cardigan', 'sweatshirt',
  'jacket', 'coat', 'blazer', 'vest',
  'polo', 'tank', 'camisole',
  
  // Bottoms
  'pants', 'jeans', 'trousers', 'shorts',
  'denim', 'chinos', 'slacks', 'leggings',
  
  // Dresses & Skirts
  'dress', 'skirt', 'gown',
  
  // Footwear
  'shoes', 'sneakers', 'boots', 'sandals',
  'footwear', 'heel', 'loafer', 'slipper',
  
  // Accessories
  'hat', 'cap', 'beanie',
  'sock', 'socks',
  'tie', 'scarf', 'belt',
  'glove', 'gloves',
  
  // General
  'suit', 'clothing', 'apparel', 'garment', 'wear',
  'underwear', 'bra',
  'swimsuit', 'bikini', 'swimwear'
];

const CATEGORIES = {
  top: ['top', 'shirt', 't-shirt', 'tshirt', 'blouse', 'tank', 'sweater', 'hoodie', 'jacket', 'coat', 'cardigan', 'vest', 'blazer', 'sweatshirt', 'polo'],
  bottom: ['bottom', 'pants', 'jeans', 'trousers', 'shorts', 'skirt', 'leggings', 'denim', 'chinos', 'slacks', 'sweatpants', 'sportswear', 'active pants', 'joggers'],
  dress: ['dress', 'gown'],
  footwear: ['shoes', 'sneakers', 'boots', 'sandals', 'heels', 'footwear', 'shoe'],
  accessory: ['hat', 'cap', 'beanie', 'tie', 'scarf', 'belt', 'glove']
};
  
const CONFIG_PORT = 3000;

export { APPAREL_WHITE_LIST, CATEGORIES, CONFIG_PORT};
