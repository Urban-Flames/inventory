// src/config/productionConfigs.ts
export const PRODUCTION_CONFIGS: Record<string, { label: string; key: string }[]> = {
  'Chicken Minced': [
    { label: 'Chicken Patty (Large)', key: 'chicken_patty_large' },
    { label: 'Chicken Patty (Medium)', key: 'chicken_patty_medium' },
    { label: 'Chicken Patty (Small)', key: 'chicken_patty_small' },
  ],
  'Meat Minced': [
    { label: 'Meat Patty (Large)', key: 'meat_patty_large' },
    { label: 'Meat Patty (Medium)', key: 'meat_patty_medium' },
    { label: 'Meat Patty (Small)', key: 'meat_patty_small' },
  ],
  'Chicken Breast': [
    { label: 'Chicken Assorted', key: 'chicken_assorted' },
    { label: 'Chicken Bites', key: 'chicken_bites' },
    { label: 'Portion Chicken Breast', key: 'portion_chicken_breast' },
  ],
  'Chicken Thigh': [
    { label: 'Chicken Shawarma', key: 'chicken_shawarma' },
  ],
  // NEW: Back Fillet
  'Back Fillet': [
    { label: 'Beef Shawarma', key: 'beef_shawarma' },
    { label: 'Beef Assorted', key: 'beef_assorted' },
    { label: 'Beef Khebab', key: 'beef_khebab' },
  ],
  'Mozzarella Cheese': [
    { label: 'Mozzarella Portions', key: 'mozzarella_portions' },
  ],
  'Chicken Wings': [
    { label: 'Chicken Wings Portions', key: 'chicken_wings_portions' },
  ],
  'Lamb Chops': [
    { label: 'Lamb Chops Portions', key: 'lamb_chops_portions' },
  ],
  'Pork Chops': [
    { label: 'Pork Chops Portions', key: 'pork_chops_portions' },
  ],
};

export const getProductionConfig = (itemName: string) => {
  // Check exact matches first
  if (PRODUCTION_CONFIGS[itemName]) {
    return PRODUCTION_CONFIGS[itemName];
  }

  // Check partial matches
  const lowerName = itemName.toLowerCase();
  for (const [key, config] of Object.entries(PRODUCTION_CONFIGS)) {
    if (lowerName.includes(key.toLowerCase())) {
      return config;
    }
  }

  return [];
};

// Portion conversion helpers
export const PORTION_CONVERSIONS: Record<string, number> = {
  'Chicken Wings': 40,
  'Full Chicken': 8,
  'Chicken Thigh': 12,
  'Chicken Breast': 10,
  'Lamb Chops': 0,
  'Pork Chops': 0,
  'Meat Minced': 0,
  'Chicken Minced': 0,
  'Mozzarella Cheese': 0,
  // NEW: Back Fillet
  'Back Fillet': 0, // Weight-based, portions calculated per kg
};

export const getPortionsPerUnit = (itemName: string): number => {
  return PORTION_CONVERSIONS[itemName] || 0;
};

export const isWeightBasedPortioning = (itemName: string): boolean => {
  const weightBasedItems = [
    'Lamb Chops',
    'Pork Chops',
    'Meat Minced',
    'Chicken Minced',
    'Mozzarella Cheese',
    'Back Fillet', // NEW
  ];
  return weightBasedItems.includes(itemName);
};

export const getPortionLabel = (itemName: string): string => {
  const labels: Record<string, string> = {
    'Lamb Chops': 'Lamb Chops Portions (per kg)',
    'Pork Chops': 'Pork Chops Portions (per kg)',
    'Meat Minced': 'Meat Patty Portions (per kg)',
    'Chicken Minced': 'Chicken Patty Portions (per kg)',
    'Mozzarella Cheese': 'Mozzarella Portions (per block)',
    'Back Fillet': 'Back Fillet Portions (per ctns)', // NEW
  };
  return labels[itemName] || 'Portions';
};