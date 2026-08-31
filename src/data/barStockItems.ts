// src/data/barStockItems.ts
import { BarDailyItem } from '@/types/inventory';

export const initialBarStockData: BarDailyItem[] = [
  // Soft Drinks & Water
  { id: 'b1', name: 'Coca Cola (Bottle)', category: 'soft_drinks', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b2', name: 'Coca Cola (PET)', category: 'soft_drinks', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b3', name: 'Fanta (Bottle)', category: 'soft_drinks', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b4', name: 'Fanta (PET)', category: 'soft_drinks', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b5', name: 'Sprite (Bottle)', category: 'soft_drinks', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b6', name: 'Sprite (PET)', category: 'soft_drinks', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b7', name: 'Malta Guinness', category: 'soft_drinks', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b8', name: 'Tonic Water', category: 'soft_drinks', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b9', name: 'Soda Water', category: 'soft_drinks', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b10', name: 'Voltic Water (Large)', category: 'soft_drinks', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b11', name: 'Voltic Water (Small)', category: 'soft_drinks', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },

  // Beers & Ciders
  { id: 'b12', name: 'Club Large', category: 'beers', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b13', name: 'Club Mini', category: 'beers', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b14', name: 'Star Large', category: 'beers', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b15', name: 'Star Small', category: 'beers', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b16', name: 'Gulder', category: 'beers', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b17', name: 'Savanna Dry', category: 'beers', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b18', name: 'Smirnoff Ice', category: 'beers', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b19', name: 'Hunters Gold', category: 'beers', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b20', name: 'Guinness', category: 'beers', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b21', name: 'Orijin Mini', category: 'beers', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b22', name: 'Brutal Fruit', category: 'beers', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b23', name: 'Corona Extra', category: 'beers', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b24', name: 'Heineken', category: 'beers', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b25', name: 'Club Shandy', category: 'beers', unit: 'btls', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },

  // Spirits & Liquors
  { id: 'b26', name: 'Johnnie Walker Red', category: 'spirits', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b27', name: 'JW Double Black', category: 'spirits', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b28', name: 'Chivas Regal', category: 'spirits', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b29', name: 'Jameson Irish', category: 'spirits', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b30', name: 'Skyy Vodka', category: 'spirits', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b31', name: 'Absolut Vodka', category: 'spirits', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b32', name: 'Smirnoff Red', category: 'spirits', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b33', name: 'Ciroc', category: 'spirits', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b34', name: 'Gordons Dry Gin', category: 'spirits', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b35', name: 'Beefeater Gin', category: 'spirits', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b36', name: 'Bombay Sapphire', category: 'spirits', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b37', name: 'Hennessy VS', category: 'spirits', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b38', name: 'Martell VS', category: 'spirits', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b39', name: 'Sierra Tequila', category: 'spirits', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b40', name: 'Jose Cuervo Gold', category: 'spirits', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b41', name: 'Baileys Irish Cream', category: 'spirits', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b42', name: 'Jagermeister', category: 'spirits', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b43', name: 'Campari', category: 'spirits', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },

  // Wines & Syrups
  { id: 'b44', name: 'Condor White Wine', category: 'wines_syrups', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b45', name: 'Condor Red Wine', category: 'wines_syrups', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b46', name: 'Cabernet Sauvignon', category: 'wines_syrups', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b47', name: 'Merlot', category: 'wines_syrups', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b48', name: 'Vanilla Syrup', category: 'wines_syrups', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b49', name: 'Grenadine Syrup', category: 'wines_syrups', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b50', name: 'Blue Curaçao', category: 'wines_syrups', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b51', name: 'Strawberry Syrup', category: 'wines_syrups', unit: 'shots', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },

  // Ice Cream & Mixers
  { id: 'b52', name: 'Ice Cube Pack', category: 'ice_mixers', unit: 'pks', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b53', name: 'Crushed Ice Pack', category: 'ice_mixers', unit: 'pks', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b54', name: 'Apple Juice', category: 'ice_mixers', unit: 'pks', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b55', name: 'Cranberry Juice', category: 'ice_mixers', unit: 'pks', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
  { id: 'b56', name: 'Frosty Bite Ice Cream', category: 'ice_mixers', unit: 'bucket', downOpen: 0, downAdd: 0, downClose: 0, fridgeOpen: 0, fridgeAdd: 0, fridgeClose: 0, waste: 0, totalStock: 0, totalSales: 0 },
];