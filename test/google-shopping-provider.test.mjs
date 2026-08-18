import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const googleSource = await readFile(new URL('../src/lib/shopping/google-shopping.server.ts', import.meta.url), 'utf8');
const missionSource = await readFile(new URL('../src/lib/mission/mission.server.ts', import.meta.url), 'utf8');

test('Google Shopping provider maps live result fields into Explorer cards', () => {
  assert.match(googleSource, /engine\", \"google_shopping/);
  assert.match(googleSource, /SERPAPI_API_KEY/);
  assert.match(googleSource, /extracted_price/);
  assert.match(googleSource, /thumbnail/);
  assert.match(googleSource, /product_link/);
  assert.match(googleSource, /source: \"Google Shopping live result\"/);
  assert.match(googleSource, /verified_product_page: true/);
});

test('shopping research prefers Google and retains browser fallback', () => {
  assert.match(missionSource, /googleShoppingConfigured\(\)/);
  assert.match(missionSource, /searchGoogleShopping/);
  assert.match(missionSource, /provider: \"google-shopping\"/);
  assert.match(missionSource, /falling back to browser/);
  assert.match(missionSource, /createBrowserTool/);
});
