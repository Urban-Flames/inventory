// src/data/packaging-sections.ts
export const packagingSections = {
  'Food Packaging': {
    icon: '📦',
    description: 'Containers, boxes, and wraps for food items',
    items: [
      'Take Away Packaging',
      'Sharwarma Packaging',
      'Burger Packaging',
      'Salad Packaging',
      'Shito Cups',
      'Salad Cups',
      'Portion Rub Packaging'
    ]
  },
  'Disposables': {
    icon: '🧻',
    description: 'Single-use items, tissues, and films',
    items: [
      'Disposable Packaging',
      'Hand Tissue',
      'Tissue Napkin',
      'Paper Bag',
      'Plastic Wrap',
      'Cling Film',
      'Aluminium Foil',
      'Baking Sheet',
      'Straw',
      'Urban Stick'
    ]
  },
  'Cleaning Supplies': {
    icon: '🧹',
    description: 'Cleaning agents, soaps, and PPE',
    items: [
      'Soft Wipes',
      'Bleach',
      'Liquid Soap',
      'Glass Cleaner',
      'Detergent',
      'Bar Soap',
      'Hair Net',
      'Hand Gloves',
      'Gloves (Alt)',
      'Nose Mask'
    ]
  },
  'Kitchen Supplies': {
    icon: '🔧',
    description: 'Essential kitchen tools and supplies',
    items: [
      'Takeaway Item Packaging',
      'Steel Wire',
      'Trash Bag'
    ]
  }
};

export const getSectionInfo = (category: string) => {
  return packagingSections[category as keyof typeof packagingSections] || null;
};