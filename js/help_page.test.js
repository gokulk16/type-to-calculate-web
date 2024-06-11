import { createHelpTables } from "./help_page";
import { describe, it, expect } from "vitest";
import path from "path";
import fs from "fs";

describe("createHelpTables tests", () => {
  const indexPath = path.resolve(__dirname, "../html/index.html");
  const indexHtml = fs.readFileSync(indexPath, "utf-8");
  document.body.innerHTML = indexHtml;

  createHelpTables();

  it("should create shortcut tables contents", () => {
    const shortcutTables = document.getElementById("shortcut-table-container");
    expect(shortcutTables.querySelectorAll("td")[4].outerHTML).toEqual(
      "<td>Open/Close calculator History</td>"
    );
  });

  it("should create operator tables contents", () => {
    const operatorTables = document.getElementById("operator-table-container");
    expect(operatorTables.querySelectorAll("td")[2].outerHTML).toEqual(
      "<td>2 + 3 = 5</td>"
    );
  });

  it("should create unit tables contents", () => {
    const unitTables = document.getElementById("unit-table-container");
    expect(unitTables.querySelectorAll("td")[5].outerHTML).toEqual(
      "<td>m2, sqin, sqft, sqyd, sqmi, sqrd, sqch, sqmil, acre, hectare</td>"
    );
  });
});
