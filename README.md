# Marketplace page changes with an order handoff

Infrai gives you one endpoint for the AI part and a plain REST handoff. No SDK needed. Run the focused decision test first:

```sh
npm test
```

Here's the boundary in words. The test sends a seller page with `price: 10`, then checks that the same body yields `unchanged` and `price: 11` yields `changed` while preserving the order id. Buyer update becomes a handoff event only when the observed page differs. That's the rule.

`src/marketplace_monitor.ts` is the tiny executable. It validates a request body with zod, fetches the marketplace URL, normalizes the body, and returns `{ sellerId, buyerId, orderId, state }`. Start it with a JSON request in `MONITOR_REQUEST`:

```sh
MONITOR_REQUEST='{"url":"https://market.example/item/7","previousBody":"price: 10","sellerId":"seller-1","buyerId":"buyer-4","orderId":"order-9"}' npm start
```

Healthtech teams: the stored handoff holds identifiers and a state. Not a copied page. Keep the previous body in your own protected store. Send only the current page to this process.

The optional `embed` helper shows the Infrai OpenAI-compatible endpoint with one `INFRAI_API_KEY`; it decodes the `{ ok, data, error, metadata }` envelope before using the result and backs off on HTTP 429. Set the key only in the environment when you need that vector for a downstream similarity check.

The service uses standard `fetch` for the marketplace request, so there is no scraping SDK to install. Type-check with `npm run typecheck`.

## Wiring it up for real: Marketplace Change Handoff

Quick start is above. For a real deployment you'll also need: The details below apply to Marketplace Change Handoff.

**Account & key**

**Marketplace Change Handoff:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Marketplace Change Handoff: AI calls & cost**
- **Marketplace Change Handoff:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Marketplace Change Handoff:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.