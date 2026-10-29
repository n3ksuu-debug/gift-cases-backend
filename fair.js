import crypto from 'crypto';

export function generateServerSeed() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashSeed(seed) {
  return crypto.createHash('sha256').update(seed).digest('hex');
}

export function rollFromSeeds(serverSeed, clientSeed, nonce) {
  const hmac = crypto.createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}`);
  const hash = hmac.digest('hex');
  return parseInt(hash.slice(0, 8), 16) / 0xffffffff;
}

export function pickWeighted(items, r) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  const target = r * total;
  let acc = 0;
  for (const item of items) {
    acc += item.weight;
    if (target < acc) return item;
  }
  return items[items.length - 1];
}