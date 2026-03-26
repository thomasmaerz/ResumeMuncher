const { createHash } = require('crypto');

function normalizeBullet(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function bulletHash(text: string): string {
  const normalized = normalizeBullet(text);
  return createHash('sha256').update(normalized).digest('hex');
}

const bullet1 = "• Led a team of 5 engineers";
const bullet2 = "- led a team of 5 engineers";
const bullet3 = "* Led a team of 5 engineers!";

const normalized1 = normalizeBullet(bullet1);
const normalized2 = normalizeBullet(bullet2);
const normalized3 = normalizeBullet(bullet3);

console.log('Testing normalizeBullet...');
console.log('bullet1:', normalized1);
console.log('bullet2:', normalized2);
console.log('bullet3:', normalized3);

if (normalized1 !== normalized2) throw new Error('Punctuation and casing should be normalized');
if (normalized2 !== normalized3) throw new Error('Punctuation and casing should be normalized');

console.log('\nTesting bulletHash...');
const hash1 = bulletHash(bullet1);
const hash2 = bulletHash(bullet2);
const hash3 = bulletHash(bullet3);

console.log('hash1:', hash1);
console.log('hash2:', hash2);
console.log('hash3:', hash3);

if (hash1 !== hash2) throw new Error('Bullets with same content should produce same hash');
if (hash2 !== hash3) throw new Error('Bullets with same content should produce same hash');

console.log('\n✓ All tests passed!');
