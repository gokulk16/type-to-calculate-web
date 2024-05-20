import {
  setupEvaluator,
  setupHomeCurrency,
  generateDocID,
  evaluate,
} from "../js/editor";
import { expect, test } from "vitest";

// AAA Principle to write a test case: Arrange, Act, Assert

await setupEvaluator();

test("generating Doc ID", () => {
  const abc = generateDocID();
  console.log("abc length - - - ", abc.length);
  expect(abc.length).toBeGreaterThanOrEqual(5);
});

test("setting up Home Currency", async () => {
  const homeCurr = await setupHomeCurrency();
  console.log("abc length - - - ", homeCurr);
  expect(homeCurr).toBe("INR");
});

test("Evaluate empty string", async () => {
  const evalValues = await evaluate("");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[0].result).toBe("");
});

test("Evaluate one line 1+2", async () => {
  const evalValues = await evaluate("1+2");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[0].result).toBe(3);
});

test("Evaluate no of results when empty string 1+2\n\n\n", async () => {
  const evalValues = await evaluate("1+2\n\n\n");
  console.log("evalValues length - - - ", evalValues);
  expect(evalValues.length).toBe(4);
});

test("Evaluate one line 1+2x3", async () => {
  const evalValues = await evaluate("1+2x3");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[0].result).toBe(7);
});

test("Evaluate one line 1+2-1", async () => {
  const evalValues = await evaluate("1+2-1");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[0].result).toBe(2);
});

test("Evaluate one line 1+2/2", async () => {
  const evalValues = await evaluate("1+2/2");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[0].result).toBe(2);
});

test("Evaluate one line 100 + (200 x25%)", async () => {
  const evalValues = await evaluate("100 + (200 x25%)");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[0].result).toBe(150);
});

test("Evaluate one line 8%5", async () => {
  const evalValues = await evaluate("8%5");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[0].result).toBe(3);
});

test("Evaluate one line 2.5^7", async () => {
  const evalValues = await evaluate("2.5^7");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[0].result).toBe(610.3515625);
});

test("Evaluate one line -1+ 90 -78", async () => {
  const evalValues = await evaluate("-1+ 90 -78");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[0].result).toBe(11);
});

test("Evaluate one line 7!", async () => {
  const evalValues = await evaluate("7!");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[0].result).toBe(5040);
});

test("Evaluate one line 3x2 x2 x 4x1.7x0.41 ", async () => {
  const evalValues = await evaluate("3x2 x2 x 4x1.7x0.41 ");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[0].result).toBeCloseTo(33.455);
});

test("Evaluate one line 3x2x2x4x1.7x0.41", async () => {
  const evalValues = await evaluate("3x2x2x4x1.7x0.41");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[0].result).toBeCloseTo(33.455);
});

test("Evaluate one line 3x2.791", async () => {
  const evalValues = await evaluate("3x2.791");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[0].result).toBe(8.373);
});

test("Evaluate one line 100 usd", async () => {
  const evalValues = await evaluate("100 usd");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[0].result).toBeCloseTo(100);
});

test("Evaluate one line 100 usd to usd", async () => {
  const evalValues = await evaluate("100 usd to usd");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[0].result).toBeCloseTo(100);
});

test("Evaluate one line 100 usd in usd", async () => {
  const evalValues = await evaluate("100 usd in usd");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[0].result).toBeCloseTo(100);
});

test("Evaluate one line 1 kg in lbs", async () => {
  const evalValues = await evaluate("1 kg in lbs");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[0].result).toBeCloseTo(2.204);
});

test("Evaluate one line 1 liter in cc", async () => {
  const evalValues = await evaluate("1 liter in cc");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[0].result).toBeCloseTo(1000);
});

test("Evaluate one line 1 acre in sqft", async () => {
  const evalValues = await evaluate("1 acre in sqft");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[0].result).toBeCloseTo(43560.038);
});

test("Evaluate multi-line data=10\ndata x2.5", async () => {
  const evalValues = await evaluate("data=10\ndata x2.5");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[1].result).toBeCloseTo(25);
});

test("Evaluate multi-line data=9\ndata^2.5", async () => {
  const evalValues = await evaluate("data=9\ndata^2.5");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[1].result).toBeCloseTo(243);
});

test("Evaluate multi-line data=10+10-1\ndata +2.5-0.50001x1.1", async () => {
  const evalValues = await evaluate("data=10+10-1\ndata +2.5-0.50001x1.1");
  console.log("evalValues - - - ", evalValues);
  expect(evalValues[1].result).toBeCloseTo(20.949);
});
