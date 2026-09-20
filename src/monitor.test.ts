import assert from "node:assert/strict";
import { decideHandoff, monitorRequest } from "./marketplace_monitor.ts";

const request = monitorRequest.parse({url: "https://market.example/item/7", previousBody: "price: 10", sellerId: "seller-1", buyerId: "buyer-4", orderId: "order-9"});
assert.equal(decideHandoff(request, "price: 10").state, "unchanged");
assert.equal(decideHandoff(request, "price: 11").state, "changed");
assert.equal(decideHandoff(request, "price: 11").orderId, "order-9");
console.log("handoff decision test passed");
