# Blackstar Food Delivery Connectors

## Objective

Add a provider-neutral food delivery layer so Blackstar users can connect supported food and courier services available in their market without locking agents to one provider.

## Product surfaces

### Consumer discovery and ordering

Where a provider exposes an approved consumer API, Blackstar can support restaurant discovery, menus/catalogues, basket construction, checkout hand-off or ordering, and delivery tracking. Availability must be capability- and country-driven; Blackstar must not imply a provider supports consumer ordering when only merchant APIs are available.

### Merchant operations

For restaurants, grocers, retailers and other merchants, Blackstar can connect approved provider APIs for store/site status, menus/catalogues, inventory, incoming orders, fulfilment, cancellations, reporting and promotions.

### Delivery as a service

Where a provider exposes courier/delivery APIs, Blackstar can request quotes, create approved delivery jobs and track fulfilment for orders originating in Blackstar or a connected merchant system.

## Initial provider adapters

- Uber Eats / Uber: consumer delivery where approved; merchant store, menu and order integration; delivery capabilities where contracted.
- Deliveroo: Partner Platform, Retail Platform and Signature capabilities according to the connected account and contract.
- Just Eat / Just Eat Takeaway.com: adapter remains capability-gated until official partner credentials and approved API scopes are available.
- Additional regional providers: adapters may be added without changing Blackstar's normalized contracts. Examples include DoorDash/Wolt, Grubhub, Glovo, foodpanda, Talabat, Careem, Swiggy, Zomato, GrabFood, Rappi, iFood and other providers where official integration access is available.

Provider names are not promises of API access. Production actions require the provider's official credentials, contracts/scopes where applicable, and a verified capability manifest.

## Location and availability

Blackstar should resolve providers from the user's explicitly supplied delivery address or permitted device location, then combine that with provider country/region coverage and live provider availability. A coarse profile location must never be treated as a delivery address.

The UI should show only services that are both geographically relevant and supported by a Blackstar adapter. If location permission is denied, users can enter an address/area manually.

## Normalized capabilities

Each connector advertises a capability manifest rather than Blackstar assuming feature parity:

- `consumer.restaurant_search`
- `consumer.menu_read`
- `consumer.cart_write`
- `consumer.order_create`
- `consumer.order_track`
- `merchant.store_read`
- `merchant.store_write`
- `merchant.menu_read`
- `merchant.menu_write`
- `merchant.inventory_write`
- `merchant.order_read`
- `merchant.order_accept`
- `merchant.order_reject`
- `merchant.order_cancel`
- `merchant.reporting_read`
- `merchant.promotion_write`
- `delivery.quote`
- `delivery.create`
- `delivery.track`

## Trust and approval rules

Reading public/authorized menus, store state, order status and reports may run without consequential-action approval when permitted by existing Blackstar policy.

Creating an order, spending money, cancelling an order, accepting/rejecting a merchant order, changing a menu/price/store state, creating a courier job, or modifying promotions is consequential. These actions must use Blackstar's existing approval system and immutable approved payload/exactly-once execution path before the provider side effect occurs.

Agents must never bypass provider authorization, automate consumer websites contrary to provider terms, store raw payment-card data, or claim an order/delivery was created unless the provider returned successful execution evidence.

## Architecture

Reuse Blackstar's existing integration/provider registry, OAuth/credential vault, MCP/API execution, approval system, audit trail, agent runtime and Astra routing. Do not create a second credential store, approval engine, agent runtime or audit system.

Normalized flow:

1. Resolve user/merchant location with explicit permission or address input.
2. Discover eligible providers for the region.
3. Connect provider through its official authorization mechanism.
4. Fetch and persist a capability manifest for that connection.
5. Agents plan against normalized Blackstar capabilities.
6. Read-only actions execute within granted scopes.
7. Consequential actions create an existing Blackstar approval request.
8. Approved immutable provider payload executes exactly once.
9. Provider evidence and normalized result are written to the existing audit/runtime records.
10. Webhooks reconcile asynchronous order, courier and cancellation state.

## Rollout

Phase 1: provider-neutral contracts, registry metadata, geographic/capability discovery and connection UI.

Phase 2: Uber Eats and Deliveroo sandbox integrations using official APIs and webhooks.

Phase 3: merchant operations, consumer ordering where officially approved, and delivery-as-a-service adapters.

Phase 4: expand regional provider catalogue according to official partner access and user demand.

## Production gate

A provider is marked `production_ready` only after authentication, scopes, webhook verification, sandbox/partner certification where required, idempotency, approval enforcement, audit evidence and live credentials have all been verified. Unsupported or pending providers remain visible as unavailable/request-access rather than simulated.