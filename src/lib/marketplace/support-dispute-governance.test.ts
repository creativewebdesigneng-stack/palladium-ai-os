import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Marketplace support-dispute governance", () => {
  const sql = readFileSync(
    new URL("../../../supabase/migrations/20260926134000_marketplace_support_dispute_governance.sql", import.meta.url),
    "utf8",
  );
  const trust = readFileSync(new URL("./marketplace-trust.functions.ts", import.meta.url), "utf8");
  const admin = readFileSync(new URL("./marketplace-admin.functions.ts", import.meta.url), "utf8");

  it("removes browser insert/update bypasses and leaves governed RPC entry points", () => {
    expect(sql).toContain("revoke insert, update on public.marketplace_disputes from authenticated");
    expect(sql).toContain("drop policy if exists marketplace_disputes_buyer_insert");
    expect(sql).toContain("drop policy if exists marketplace_disputes_parties_update");
    expect(sql).toContain("drop policy if exists marketplace_disputes_admin_update");
    expect(sql).toContain("grant execute on function public.blackstar_open_marketplace_support_dispute");
    expect(sql).toContain("grant execute on function public.blackstar_respond_marketplace_support_dispute");
    expect(sql).toContain("grant execute on function public.blackstar_resolve_marketplace_support_dispute");
  });

  it("opens only buyer-owned paid/fulfilled orders under an order lock and one active case per order", () => {
    expect(sql).toContain("create unique index if not exists marketplace_disputes_one_active_per_order_idx");
    expect(sql).toContain("where status in ('open','seller_response','under_review')");
    expect(sql).toContain("where id=p_order_id and buyer_id=v_user");
    expect(sql).toContain("for update;");
    expect(sql).toContain("if v_order.status not in ('paid','fulfilled','disputed')");
    expect(sql).toContain("marketplace order already has an active support dispute");
    expect(sql).toContain("set status='disputed'");
    expect(sql).toContain("where id=p_order_id and status=v_order.status");
  });

  it("allows seller response only through seller ownership and active dispute state", () => {
    expect(sql).toContain("blackstar_respond_marketplace_support_dispute");
    expect(sql).toContain("d.status in ('open','seller_response')");
    expect(sql).toContain("o.id=d.order_id and o.seller_id=v_user");
    expect(sql).toContain("seller_response=btrim(p_response)");
    expect(sql).toContain("status='seller_response'");
  });

  it("resolves only for Marketplace admins without overriding provider financial truth", () => {
    expect(sql).toContain("select 1 from public.marketplace_admins a where a.user_id=v_user");
    expect(sql).toContain("v_order.refund_state='full' or v_order.status='refunded'");
    expect(sql).toContain("elsif v_order.status='charged_back'");
    expect(sql).toContain("marketplace_provider_disputes pd");
    expect(sql).toContain("elsif v_provider_active");
    expect(sql).toContain("elsif p_decision='resolved_buyer'");
    expect(sql).toContain("v_target := 'disputed'");
    expect(sql).toContain("v_dispute.pre_dispute_status");
    expect(sql).toContain("where id=v_order.id and status=v_order.status");
  });

  it("routes app writes through RPCs instead of direct dispute insert/update", () => {
    expect(trust).toContain("sb.rpc('blackstar_open_marketplace_support_dispute'");
    expect(trust).toContain("sb.rpc('blackstar_respond_marketplace_support_dispute'");
    expect(trust).not.toContain("from('marketplace_disputes').insert({...data,opened_by:context.userId})");
    expect(admin).toContain("sb.rpc('blackstar_resolve_marketplace_support_dispute'");
    expect(admin).not.toContain("from('marketplace_disputes').update({status:data.decision");
  });

  it("does not treat a buyer-favourable support decision itself as provider refund evidence", () => {
    const buyerBranch = sql.slice(
      sql.indexOf("elsif p_decision='resolved_buyer'"),
      sql.indexOf("elsif v_order.status='disputed'"),
    );
    expect(buyerBranch).toContain("v_target := 'disputed'");
    expect(buyerBranch).not.toContain("refunded");
  });
});
