import {
  setupEvaluator,
  setupHomeCurrency,
  generateDocID,
  evaluate,
  loadPlaceholderData,
  copyLastValue,
} from "../js/editor";
import { describe, it, expect, vi, test } from "vitest";

// AAA Principle to write a test case: Arrange, Act, Assert

await setupEvaluator();

describe("testing generateDocID", () => {
  test("generating Doc ID", () => {
    const abc = generateDocID();
    expect(abc.length).toBeGreaterThanOrEqual(5);
  });
});

describe("testing setupHomeCurrency", () => {
  test("setting up Home Currency", async () => {
    const homeCurr = await setupHomeCurrency();
    expect(homeCurr).toBe("INR");
  });
});

describe("testing evaluate", () => {
  test("Evaluate empty string", async () => {
    const evalValues = await evaluate("");
    expect(evalValues[0].result).toBe("");
  });

  test("Evaluate one line 1+2", async () => {
    const evalValues = await evaluate("1+2");
    expect(evalValues[0].result).toBe(3);
  });

  test("Evaluate no of results when empty string 1+2\n\n\n", async () => {
    const evalValues = await evaluate("1+2\n\n\n");
    expect(evalValues.length).toBe(4);
  });

  test("Evaluate one line 1+2x3", async () => {
    const evalValues = await evaluate("1+2x3");
    expect(evalValues[0].result).toBe(7);
  });

  test("Evaluate one line 1+2-1", async () => {
    const evalValues = await evaluate("1+2-1");
    expect(evalValues[0].result).toBe(2);
  });

  test("Evaluate one line 1+2/2", async () => {
    const evalValues = await evaluate("1+2/2");
    expect(evalValues[0].result).toBe(2);
  });

  test("Evaluate one line 100 + (200 x25%)", async () => {
    const evalValues = await evaluate("100 + (200 x25%)");
    expect(evalValues[0].result).toBe(150);
  });

  test("Evaluate one line 8%5", async () => {
    const evalValues = await evaluate("8%5");
    expect(evalValues[0].result).toBe(3);
  });

  test("Evaluate one line 2.5^7", async () => {
    const evalValues = await evaluate("2.5^7");
    expect(evalValues[0].result).toBe(610.3515625);
  });

  test("Evaluate one line -1+ 90 -78", async () => {
    const evalValues = await evaluate("-1+ 90 -78");
    expect(evalValues[0].result).toBe(11);
  });

  test("Evaluate one line 7!", async () => {
    const evalValues = await evaluate("7!");
    expect(evalValues[0].result).toBe(5040);
  });

  test("Evaluate one line 3x2 x2 x 4x1.7x0.41 ", async () => {
    const evalValues = await evaluate("3x2 x2 x 4x1.7x0.41 ");
    expect(evalValues[0].result).toBeCloseTo(33.455);
  });

  test("Evaluate one line 3x2x2x4x1.7x0.41", async () => {
    const evalValues = await evaluate("3x2x2x4x1.7x0.41");
    expect(evalValues[0].result).toBeCloseTo(33.455);
  });

  test("Evaluate one line 3x2.791", async () => {
    const evalValues = await evaluate("3x2.791");
    expect(evalValues[0].result).toBe(8.373);
  });

  test("Evaluate one line 100 usd", async () => {
    const evalValues = await evaluate("100 usd");
    expect(evalValues[0].result).toBeCloseTo(100);
  });

  test("Evaluate one line 100 usd to usd", async () => {
    const evalValues = await evaluate("100 usd to usd");
    expect(evalValues[0].result).toBeCloseTo(100);
  });

  test("Evaluate one line 100 usd in usd", async () => {
    const evalValues = await evaluate("100 usd in usd");
    expect(evalValues[0].result).toBeCloseTo(100);
  });

  test("Evaluate one line 1 kg in lbs", async () => {
    const evalValues = await evaluate("1 kg in lbs");
    expect(evalValues[0].result).toBeCloseTo(2.204);
  });

  test("Evaluate one line 1 liter in cc", async () => {
    const evalValues = await evaluate("1 liter in cc");
    expect(evalValues[0].result).toBeCloseTo(1000);
  });

  test("Evaluate one line 1 acre in sqft", async () => {
    const evalValues = await evaluate("1 acre in sqft");
    expect(evalValues[0].result).toBeCloseTo(43560.038);
  });

  test("Evaluate multi-line data=10\ndata x2.5", async () => {
    const evalValues = await evaluate("data=10\ndata x2.5");
    expect(evalValues[1].result).toBeCloseTo(25);
  });

  test("Evaluate multi-line data=9\ndata^2.5", async () => {
    const evalValues = await evaluate("data=9\ndata^2.5");
    expect(evalValues[1].result).toBeCloseTo(243);
  });

  test("Evaluate multi-line data=10+10-1\ndata +2.5-0.50001x1.1", async () => {
    const evalValues = await evaluate("data=10+10-1\ndata +2.5-0.50001x1.1");
    expect(evalValues[1].result).toBeCloseTo(20.949);
  });
});

// Mocking necessary parts of the global scope and DOM
global.editor = {
  innerText: "",
};
global.historyData = [];

describe("testing loadPlaceholderData", () => {
  it("should set placeholder text when no history data is present and currency conversions are loaded", async () => {
    editor.innerText = "";
    await loadPlaceholderData(editor, historyData, true);

    expect(editor.innerText).toContain("10 usd to inr");
  });

  it("should not set placeholder text when history data is present", async () => {
    editor.innerText = "";
    await loadPlaceholderData(editor, [{ mockHistoryData: 1 }], true);

    expect(editor.innerText).toBe("");
  });

  it("should set basic placeholder text when no currency conversions are loaded", async () => {
    editor.innerText = "";
    await loadPlaceholderData(editor, historyData, false);

    expect(editor.innerText).toContain(
      "2+1\n12x3\n3miles to km\ndata = 12\ndata+5\n"
    );
    expect(editor.innerText).not.toContain("10 usd to inr");
  });
});

// Mocking lodash and clipboard functionalities
vi.mock("lodash", () => ({
  isNumber: vi.fn(),
}));
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe("testing copyLastValue", () => {
  it("should not attempt to copy when no numeric results are available", async () => {
    global.evaluatedValues = [{ result: "text" }, { result: "some text" }];
    await copyLastValue(global.evaluatedValues);
    //arrange .not.toHaveBeenCalled tests first since all calls in the test file will be counted
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it("should copy the last numeric result to the clipboard", async () => {
    global.evaluatedValues = [{ result: "text" }, { result: 42 }];
    await copyLastValue(global.evaluatedValues);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(42);
  });

  it("should not attempt to copy when no numeric results are available", async () => {
    global.evaluatedValues = [{ result: 21 }, { result: "" }];
    await copyLastValue(global.evaluatedValues);
    expect(navigator.clipboard.writeText).toHaveBeenCalled(21);
  });
});
