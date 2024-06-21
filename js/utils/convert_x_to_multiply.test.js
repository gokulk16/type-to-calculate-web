import { describe, test, expect } from "vitest";
import { convertXToMultiplication } from "./convert_x_to_multiply";

describe("testing convertXToMultiplication", () => {
  test("Convert all 'x' to multiplication operator", () => {
    const lines = [
      "2x3",
      "2 x 3",
      "2x 3",
      "2 x3",
      "2x data",
      "data x 2",
      "2x2x2x4x1.7x0.41",
    ];
    const convertedLines = convertXToMultiplication(lines);

    expect(convertedLines).toEqual([
      "2*3",
      "2 * 3",
      "2* 3",
      "2 *3",
      "2* data",
      "data * 2",
      "2*2*2*4*1.7*0.41",
    ]);
  });

  test("Dont convert some 'x' to multiplication operator in expressions", () => {
    const lines = ["2xdata", "0x90 x 2", "0x90x 2", "x22e x2x4x1.7x0.41"];
    const convertedLines = convertXToMultiplication(lines);

    expect(convertedLines).toEqual([
      "2xdata",
      "0x90 * 2",
      "0x90* 2",
      "x22e *2*4*1.7*0.41",
    ]);
  });
});
