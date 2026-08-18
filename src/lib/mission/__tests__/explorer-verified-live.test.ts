import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const explorer = readFileSync(new URL('../../shopping/explorer.functions.ts', import.meta.url), 'utf8');
const board = readFileSync(new URL('../../../components/mission/ShoppingBoard.jsx', import.meta.url), 'utf8');

describe('Live Explorer verified product rendering', () => {
  it('shows only the latest product-page-verified shopping results', () => {
    expect(explorer).toContain('order("created_at", { ascending: false })');
    expect(explorer).toContain('limit(1)');
    expect(explorer).toContain('verified_product_page');
    expect(explorer).toContain('image_url');
    expect(explorer).toContain('SIMULATED DEVELOPMENT DATA');
  });

  it('does not render the broad historical result feed as current products', () => {
    expect(board).toContain('getLatestVerifiedExplorerResults');
    expect(board).toContain("['shopping-workspace', 'verified-products']");
    expect(board).toContain('Explorer will not recycle older or simulated cards');
    expect(board).toContain('View real product on');
    expect(board).not.toContain('shoppingResults = []');
  });
});
