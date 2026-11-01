import { describe, expect, it } from "vitest";
import {
  BLACKSTAR_ENTERPRISE_OFFERS,
  ENTERPRISE_OFFER_TERMS,
  buildEnterpriseStatementOfWorkOutline,
  formatEnterpriseGbp,
  getBlackstarEnterpriseOffer,
} from "../high-value-offers";

describe("Blackstar enterprise proposed solution catalogue", () => {
  it("provides ten distinct £100k scopes and four £1m transformation programmes", () => {
    expect(BLACKSTAR_ENTERPRISE_OFFERS.filter((offer) => offer.priceGbp === 100000)).toHaveLength(10);
    expect(BLACKSTAR_ENTERPRISE_OFFERS.filter((offer) => offer.priceGbp === 1000000)).toHaveLength(4);
    const ids = BLACKSTAR_ENTERPRISE_OFFERS.map((offer) => offer.id);
    expect(new Set(ids).size).toBe(14);
    expect(BLACKSTAR_ENTERPRISE_OFFERS).toHaveLength(14);
  });

  it("requires specific buyer, three verifiable deliverables, prerequisites, boundaries and acceptance", () => {
    for (const offer of BLACKSTAR_ENTERPRISE_OFFERS) {
      expect(offer.buyer.length).toBeGreaterThan(8);
      expect(offer.summary.length).toBeGreaterThan(45);
      expect(offer.proposedDeliverables).toHaveLength(3);
      for (const deliverable of offer.proposedDeliverables) expect(deliverable.length).toBeGreaterThan(35);
      expect(offer.acceptanceEvidence.length).toBeGreaterThan(45);
      expect(offer.prerequisites.length).toBeGreaterThan(30);
      expect(offer.boundaries.length).toBeGreaterThan(35);
      expect(offer.proposedDeliveryWeeks).toMatch(/^\d+–\d+$/);
      expect(getBlackstarEnterpriseOffer(offer.id)).toBe(offer);
    }
    expect(getBlackstarEnterpriseOffer("not-an-offer")).toBeNull();
  });

  it("prohibits automatic Stripe checkout and never represents a proposal as delivery proof", () => {
    expect(ENTERPRISE_OFFER_TERMS.payment).toMatch(/contract and invoicing only/i);
    expect(ENTERPRISE_OFFER_TERMS.payment).toMatch(/no one-click stripe/i);
    expect(ENTERPRISE_OFFER_TERMS.offerStatus).toMatch(/subject to discovery/i);
    expect(ENTERPRISE_OFFER_TERMS.priceBasis).toMatch(/excluding VAT/i);
    expect(ENTERPRISE_OFFER_TERMS.procurement).toMatch(/signed SOW/i);
  });

  it("generates buyer-relevant non-binding SOW outlines with safety and exclusion terms", () => {
    for (const offer of BLACKSTAR_ENTERPRISE_OFFERS) {
      const outline = buildEnterpriseStatementOfWorkOutline(offer);
      expect(outline).toContain(offer.name);
      expect(outline).toContain(offer.buyer);
      expect(outline).toContain(formatEnterpriseGbp(offer.priceGbp));
      expect(outline).toContain(offer.acceptanceEvidence);
      expect(outline).toContain(offer.prerequisites);
      expect(outline).toContain(offer.boundaries);
      expect(outline).toContain("NOT AN AGREEMENT");
      expect(outline).toContain("Payment route");
      expect(outline).toContain("Before sale");
      offer.proposedDeliverables.forEach(deliverable => expect(outline).toContain(deliverable));
      expect(outline).not.toMatch(/payment completed|guaranteed roi|certified agi/i);
    }
  });

  it("formats valid GBP price points without rounded or unsafe amounts", () => {
    expect(formatEnterpriseGbp(100000)).toContain("100,000");
    expect(formatEnterpriseGbp(1000000)).toContain("1,000,000");
    expect(() => formatEnterpriseGbp(-1000)).toThrow();
    expect(() => formatEnterpriseGbp(Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });
});
