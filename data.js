// server/data.js

// Реальные PNG-подарки Telegram (api.changes.tg)
const TG = (id, size = 256) => `https://api.changes.tg/original/${id}.png?size=${size}`;
// Красивые SVG-иконки для тех подарков, у которых нет ID
const TW = (code) => `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${code}.svg`;

const GIFTS = {
  // === РЕАЛЬНЫЕ ПОДАРКИ TELEGRAM ===
  heart:     { image: TG('5170145012310081615'), name: 'Heart',     rarity: 'common'    },
  rose:      { image: TG('5168103777563050263'), name: 'Rose',      rarity: 'common'    },
  cake:      { image: TG('5170144170496491616'), name: 'Cake',      rarity: 'common'    },
  bear:      { image: TG('5170233102089322756'), name: 'Bear',      rarity: 'uncommon'  },
  gift:      { image: TG('5170250947678437525'), name: 'Gift Box',  rarity: 'uncommon'  },
  bouquet:   { image: TG('5170314324215857265'), name: 'Bouquet',   rarity: 'uncommon'  },
  champagne: { image: TG('6028601630662853006'), name: 'Champagne', rarity: 'rare'      },
  rocket:    { image: TG('5170564780938756245'), name: 'Rocket',    rarity: 'epic'      },
  trophy:    { image: TG('5168043875654172773'), name: 'Trophy',    rarity: 'legendary' },

  // === ИКОНКИ (можно заменить на реальные ID, когда найдёте) ===
  teddy:     { image: TW('1f9f8'), name: 'Teddy',     rarity: 'uncommon'  },
  clover:    { image: TW('1f340'), name: 'Clover',    rarity: 'common'    },
  hat:       { image: TW('1f3a9'), name: 'Top Hat',   rarity: 'rare'      },
  star:      { image: TW('2b50'),  name: 'Star',      rarity: 'epic'      },
  unicorn:   { image: TW('1f984'), name: 'Unicorn',   rarity: 'epic'      },
  ring:      { image: TW('1f48d'), name: 'Ring',      rarity: 'epic'      },
  diamond:   { image: TW('1f48e'), name: 'Diamond',   rarity: 'legendary' },
  crown:     { image: TW('1f451'), name: 'Crown',     rarity: 'legendary' },
  dragon:    { image: TW('1f409'), name: 'Dragon',    rarity: 'legendary' },
};

function item(typeKey, num, value, weight) {
  const t = GIFTS[typeKey];
  return {
    id: `${typeKey}_${num}`,
    name: `${t.name} #${num}`,
    image: t.image,
    rarity: t.rarity,
    value,
    weight,
  };
}

export const cases = [
  {
    id: 'starter', name: 'Стартовый кейс', image: TW('1f4e6'), price: 100,
    items: [
      item('heart',  1241,  60, 500), item('rose',   9821,  75, 400),
      item('cake',   77,   110, 250), item('clover', 412,  130, 180),
      item('bear',   318,  260, 100), item('bouquet',512,  340, 60),
      item('champagne', 89, 550, 25), item('star',   14,   950, 8),
      item('diamond', 7,  2800, 1),
    ],
  },
  {
    id: 'silver', name: 'Серебряный кейс', image: TW('1f948'), price: 500,
    items: [
      item('cake',   332,   140, 400), item('bear',   201,   280, 300),
      item('teddy',  45,    420, 200), item('bouquet',88,    600, 120),
      item('gift',   111,   780, 80),  item('champagne', 72, 1200, 40),
      item('rocket', 18,   1800, 20),  item('star',   9,    3200, 8),
      item('unicorn', 3,   6500, 2),
    ],
  },
  {
    id: 'gold', name: 'Золотой кейс', image: TW('1f947'), price: 2000,
    items: [
      item('bear',   555,   450, 350), item('bouquet',301,   800, 250),
      item('gift',   88,   1300, 180), item('champagne', 40, 2100, 120),
      item('rocket', 12,   3400, 60),  item('hat',    33,   5200, 30),
      item('trophy', 7,    8800, 15),  item('ring',   4,   15000, 6),
      item('crown',  2,   32000, 2),
    ],
  },
  {
    id: 'platinum', name: 'Платиновый кейс', image: TW('1f4a0'), price: 10000,
    items: [
      item('gift',   100,  1500, 300), item('champagne', 44, 3200, 250),
      item('rocket', 21,   5000, 180), item('hat',    17,   8500, 120),
      item('trophy', 6,   15000, 70),  item('ring',   3,   28000, 40),
      item('star',   2,   45000, 20),  item('diamond', 1,  90000, 8),
      item('dragon', 1,  250000, 2),
    ],
  },
  {
    id: 'legendary', name: 'Легендарный кейс', image: TW('1f451'), price: 50000,
    items: [
      item('champagne', 1,  6000, 300), item('rocket', 1,   12000, 250),
      item('trophy', 1,   25000, 180),  item('ring',   1,   50000, 120),
      item('star',   1,   90000, 70),   item('diamond', 1, 180000, 40),
      item('crown',  1,  350000, 20),   item('dragon', 1,  800000, 8),
      item('dragon', 2, 1500000, 2),
    ],
  },
];