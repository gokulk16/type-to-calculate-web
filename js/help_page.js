// Help page related activities happen in this File. Including DOM modifications

"use strict";
import helpOperators from "./help_operators.json";
import helpShortcuts from "./help_shortcuts.json";
import helpUnits from "./help_units.json";

export async function createHelpTables() {
  // Operator Table
  const operatorColumns = ["Name", "Operator", "Example"];
  const operatorsDataa = [...helpOperators.operators];
  const operatorTableHtml = createTable(operatorColumns, operatorsDataa);
  document.getElementById("operator-table-container").innerHTML =
    operatorTableHtml;

  // Keyboard shortcut table
  const shortcutColumns = ["Action", "Shortcut"];
  const shortcutsData = [...helpShortcuts.shortcuts];
  const shortcutTableHtml = createTable(shortcutColumns, shortcutsData);
  document.getElementById("shortcut-table-container").innerHTML =
    shortcutTableHtml;

  // Units table
  const unitColumns = ["Value", "Units"];
  const unitsData = [...helpUnits.units];
  const unitTableHtml = createTable(unitColumns, unitsData);
  document.getElementById("unit-table-container").innerHTML = unitTableHtml;
}

function createTable(columns, data) {
  let table = "<table>";

  // Create table header
  table += "<thead><tr>";
  columns.forEach((column) => {
    table += `<th>${column}</th>`;
  });
  table += "</tr></thead>";

  // Create table body
  table += "<tbody>";
  data.forEach((row) => {
    table += "<tr>";
    columns.forEach((column) => {
      table += `<td>`;

      if (Array.isArray(row[column])) {
        row[column].forEach((item) => {
          table += `${item}</br>`;
        });
      } else {
        table += `${row[column]}`;
      }
      table += "</td>";
    });
    table += "</tr>";
  });
  table += "</tbody></table>";
  return table;
}
