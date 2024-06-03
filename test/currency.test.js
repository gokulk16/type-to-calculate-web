import { getCurrency, getConversionRates } from "../js/currency";
import { expect, test } from "vitest";

test("get Home Currency given the country", () => {
  const curr = getCurrency("US");
  expect(curr).toBe("USD");
});

test("get Home Currency given the country", () => {
  const curr = getCurrency("IN");
  expect(curr).toBe("INR");
});

test("get conversion rates", async () => {
  const conv = await getConversionRates("US");
  expect(typeof conv.USD).toBe("object");
});
