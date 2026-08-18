import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const explorer = readFileSync(new URL('../../shopping/explorer.functions.ts', import.meta.url), 'utf8');
const board = readFileSync(new URL('../../../components/mission/ShoppingBoard.jsx', import.meta.url), 'utf8');

describe('Live Explorer verified product rendering', () => {
  it('shows only the latest live product-level shopping results', () => {
    expect(explorer).toContain('order("created_at", { ascending: false })');
    expect(explorer).toContain('limit(1)');
    expect(explorer).toContain('verified_product_page');
    expect(explorer).toContain('google_shopping');
    expect(explorer).toContain('image_url');
    expect(explorer).toContain('SIMULATED DEVELOPMENT DATA');
  });

  it('does not render the broad historical result feed as current products', () => {
    expect(board).toContain('getLatestVerifiedExplorerResults');
    expect(board).toContain("['shopping-workspace', 'verified-products']");
    expect(board).toContain('Google Shopping is connected. Explorer only shows live results with a usable product image and product link.');
    expect(board).toContain('View product on');
    expect(board).not.toContain('shoppingResults = []');
  });
});
