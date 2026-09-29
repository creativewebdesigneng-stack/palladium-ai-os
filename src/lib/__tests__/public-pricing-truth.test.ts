import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('Blackstar public pricing truth contract', () => {
  it('keeps public copy on the current canonical plan set', () => {
    const plans = read('../../components/site/pricingPlans.jsx');
    const faq = read('../../components/site/PricingFaq.jsx');
    const cards = read('../../components/site/PricingCards.jsx');

    expect(plans).toContain("id: 'pro'");
    expect(plans).toContain("id: 'business'");
    expect(plans).toContain("id: 'enterprise'");
    expect(faq).toContain('Pro/Builder, Business and Enterprise');
    expect(cards).toContain('Pro/Builder is shown above; Business and Enterprise');
  });

  it('does not advertise retired or unavailable public tiers', () => {
    const faq = read('../../components/site/PricingFaq.jsx');
    const cards = read('../../components/site/PricingCards.jsx');
    const publicCopy = faq + cards;

    for (const stale of [
      'Basic, Professional',
      'Enterprise+',
      'Free and Pro plans are available above',
      'on-premise model integrations',
    ]) {
      expect(publicCopy).not.toContain(stale);
    }
  });

  it('does not promise subscription timing outside connected billing truth', () => {
    const faq = read('../../components/site/PricingFaq.jsx');

    expect(faq).not.toContain('Upgrades take effect immediately');
    expect(faq).not.toContain('downgrades take effect at the end');
    expect(faq).toContain('effective timing');
    expect(faq).toContain('connected billing system');
  });
});
