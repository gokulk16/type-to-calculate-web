"use strict";

import * as currency from "./currency.js";
import * as regex from "./regex.js";
import helpOperators from "./help_operators.json";
import helpShortcuts from "./help_shortcuts.json";
import helpUnits from "./help_units.json";
import { LocalStorage } from "web-browser-storage";
import { createUnit, unit, evaluate as mathjs_evaluate } from "mathjs";

const storage = new LocalStorage();
import showToast from "show-toast";

var _ = require("lodash");

let editor;
let output;
let currentDocData = {};
let settingsData = {};
let historyData = [];
let helpButton;
let helpOverlayTables;
let conversionRates;
let homeCurrency;
let showHelp = false;
let evaluatedValues = []; // All evaluated expressions by line
let docId;
document.addEventListener("DOMContentLoaded", init);

export async function setupHomeCurrency() {
  const fallbackHomeCurrency = "USD";
  var homeCurr;
  try {
    homeCurr = await currency.getHomeCurrency();
  } catch (error) {
    console.error("Error fetching home currency:", error);
  } finally {
    if (!homeCurr) {
      homeCurr = fallbackHomeCurrency;
    }
  }

  return homeCurr;
}

function toggleHelpOverlay() {
  if (showHelp) {
    onOverlayClick();
  } else {
    onHelpClick();
  }
}

function onHelpClick() {
  showHelp = true;
  document.getElementById("help-overlay").style.display = "block";
}

// referred from https://stackoverflow.com/a/3866442/3967709
function setEndOfContenteditable(contentEditableElement) {
  var range, selection;
  if (document.createRange) {
    //For Firefox, Chrome, Opera, Safari, IE 9+
    range = document.createRange(); //Create a range (a range is a like the selection but invisible)
    range.selectNodeContents(contentEditableElement); //Select the entire contents of the element with the range
    range.collapse(false); //collapse the range to the end point. false means collapse to end rather than the start
    selection = window.getSelection(); //get the selection object (allows you to change selection)
    selection.removeAllRanges(); //remove any selections already made
    selection.addRange(range); //make the range you have just created the visible selection
  } else if (document.selection) {
    //IE 8 and lower
    range = document.body.createTextRange(); //Create a range (a range is a like the selection but invisible)
    range.moveToElementText(contentEditableElement); //Select the entire contents of the element with the range
    range.collapse(false); //collapse the range to the end point. false means collapse to end rather than the start
    range.select(); //Select the range (make it the visible selection
  }
}

function focusEditor() {
  editor.focus();
  setEndOfContenteditable(editor);
}

function onOverlayClick() {
  showHelp = false;
  document.getElementById("help-overlay").style.display = "none";
  focusEditor();
}

async function createHelpTables() {
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

export async function setupEvaluator() {
  homeCurrency = await setupHomeCurrency();
  createUnit(homeCurrency.toLowerCase());
  try {
    // setup conversionRates
    conversionRates = await currency.getConversionRates();

    // dynamically adding conversion token to convert from one currency to another currency
    // example: '1 usd to gbp' should consider 'usd to gbp' as token and do the conversion
    // example: '1 usd in gbp' should consider 'usd in gbp' as token and do the conversion
    Object.entries(conversionRates).forEach(([fromCurrencyCode, rates]) => {
      // Dynamically add conversion tokens for all supported currencies to home currency
      // example, if 1 USD = 83 INR

      if (fromCurrencyCode !== homeCurrency) {
        try {
          createUnit(
            fromCurrencyCode.toLowerCase(),
            unit(1 * rates[homeCurrency], homeCurrency.toLowerCase())
          );
        } catch {
          try {
            createUnit(
              fromCurrencyCode.toUpperCase(),
              unit(1 * rates[homeCurrency], homeCurrency.toLowerCase())
            );
          } catch {
            console.log(
              `couldnt add ${fromCurrencyCode.toUpperCase()} or ${fromCurrencyCode.toLowerCase()} as currency unit`
            );
          }
        }
      }
    });
  } catch (error) {
    console.error("Error setting up currency tokens:", error);
  }
}

function removeMatches(supersetArray, removeArray) {
  let result = supersetArray.filter((match) => !removeArray.includes(match));
  return result;
}

function replaceFirstXAfterIndex(str, index) {
  return str.substring(0, index) + str.substring(index).replace("x", "*");
}
function convertXToMultiplication(lines) {
  for (let i = 0; i < lines.length; i++) {
    // Converting 'x' as a mutiplication operator.
    // for these examples: 'data x 2', 'data x2', '2x2', '2 x2', '2x 2', '2 x 2', '2x data', '2 x data', '2x2x2', data x 2 x data', '2x2x2 x2 x x2 x2 x2 x 2 x 22'
    // then convert the 'x' to '*' in that line
    // for these examples: '0x90 x 2', '0x90 x2', '0x90 x 2'
    // then convert them to '0x90 * 2', '0x90 *2', '0x90 * 2' since here 0x represents hexadecimal value

    let matchesOfX = [...lines[i].matchAll(regex.X_IN_EXPRESSION)];
    let matchesOfHexa = [...lines[i].matchAll(regex.HEXADECIMAL_VALUE)];

    let XIndices = matchesOfX.map((ele) => ele.index);
    let HexaIndices = matchesOfHexa.map((ele) => ele.index);

    let filteredMatches = removeMatches(XIndices, HexaIndices);
    // filteredMatches contains all the indexes where the x will be present on or after the index

    for (let index = 0; index < filteredMatches.length; index++) {
      lines[i] = replaceFirstXAfterIndex(lines[i], filteredMatches[index]);
    }

    // if line still matches with regex.X_IN_EXPRESSION then go through the same operations once again
    let confirmMatchesOfX = [...lines[i].matchAll(regex.X_IN_EXPRESSION)];

    if (!_.isEmpty(confirmMatchesOfX)) {
      matchesOfHexa = [...lines[i].matchAll(regex.HEXADECIMAL_VALUE)];

      XIndices = confirmMatchesOfX.map((ele) => ele.index);
      HexaIndices = matchesOfHexa.map((ele) => ele.index);
      filteredMatches = removeMatches(XIndices, HexaIndices);
      for (let index = 0; index < filteredMatches.length; index++) {
        lines[i] = replaceFirstXAfterIndex(lines[i], filteredMatches[index]);
      }
    }
  }
  return lines;
}

function useMathJs(lines) {
  var mjs_results = [];

  // pre evaluation
  lines = convertXToMultiplication(lines);

  try {
    mjs_results = mathjs_evaluate(lines);
  } catch (error) {
    /* evaluate individual lines from index 0
     * if any line is throwing an error, then put empty string for that line and continue
     * if no error, then add that line also to evaluate next time
     */
    try {
      var tmpLines = []; // remove errored lines and execute the rest
      for (let index = 0; index < lines.length; index++) {
        try {
          tmpLines.push(lines[index]);
          var lineResult = mathjs_evaluate(tmpLines);
          mjs_results[index] = lineResult[index];
        } catch (error) {
          console.log(`Couldn't evaluate: ${lines[index]}`);
          mjs_results[index] = undefined;
          tmpLines[index] = ""; // Put empty string for lines that throw an error
        }
      }
    } catch (error) {
      // console.log('evaluation failed - - ', error);
    }
  }

  // post evaluation
  for (const [i, result] of mjs_results.entries()) {
    try {
      // Convert non-number results to numbers if possible
      if (!_.isNumber(result)) {
        mjs_results[i] = result.toNumber();
      }
    } catch (error) {
      console.log("no result for line ", i + 1);
      mjs_results[i] = ""; // Ensure non-convertible results are set to empty string
    }
  }

  return mjs_results;
}

function setupDocument() {
  if (navigator.userAgent.toLowerCase().includes("firefox")) {
    //since firefox browsers don't support the contenteditable="plaintext-only"
    // reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable#browser_compatibility
    // set the editor's contenteditable to true from plaintext-only
    editor.setAttribute("contenteditable", true);
  }
  editor = document.getElementById("editor");
  focusEditor();
  output = document.getElementById("output");
  docId = generateDocID();
  currentDocData.docId = docId;
  helpButton = document.getElementById("help-button");
  helpOverlayTables = document.getElementById("help-overlay-tables");
  createHelpTables();
}

function removeOverlay() {
  document.body.classList.remove("loading");
}

function sortHistory(a, b) {
  // sorting comparison method to use in sort()
  const a_timestamp = new Date(a.modified);
  const b_timestamp = new Date(b.modified);
  if (a_timestamp < b_timestamp) {
    return 1;
  } else {
    return -1;
  }
}

function createHistoryItems(historySessionData) {
  // Create the history editor div and its child divs
  const historyEditor = document.createElement("div");
  historyEditor.className = "history-editor";
  historyEditor.id = "history-editor";

  // Create the history output div
  const historyOutput = document.createElement("div");
  historyOutput.className = "history-output";
  historyOutput.id = "history-output";

  for (let index = 0; index < historySessionData.lines.length; index++) {
    const line = historySessionData.lines[index];
    const result = historySessionData.results[index];

    const editorDiv = document.createElement("button");
    editorDiv.className = "history-editor-item";
    if (_.isEmpty(line)) {
      editorDiv.innerText = "\n";
    } else {
      editorDiv.innerText = line;
    }
    editorDiv.title = "Click to copy\nShift + click to copy & paste";
    historyEditor.appendChild(editorDiv);
    let br1 = document.createElement("br");
    historyEditor.appendChild(br1);

    var button = document.createElement("button");
    button.innerText = result;
    button.classList.add("history-result-btn");
    button.classList.add("history-result");
    button.dataset.value = result;
    button.title = "Click to copy\nShift + click to copy & paste";
    historyOutput.appendChild(button);

    let br2 = document.createElement("br");
    historyOutput.appendChild(br2);
  }

  return [historyEditor, historyOutput];
}

function createHistoryElements() {
  let noOfHistoryLines = 0;
  var calculatorHistory = document.getElementById("calculator-history");
  for (let history of historyData) {
    if (!("lines" in history)) {
      continue;
    }
    if (history.lines.length === 1 && history.lines[0] === "") {
      continue;
    }
    const historyItemsElement = document.createElement("div");
    historyItemsElement.id = "history-items";
    calculatorHistory.appendChild(historyItemsElement);
    let [historyItemEditor, historyItemsOutput] = createHistoryItems(history);
    historyItemsElement.appendChild(historyItemEditor);
    historyItemsElement.appendChild(historyItemsOutput);
    noOfHistoryLines += history.lines.length;
  }
  return noOfHistoryLines;
}

function hideCalculatorHistory() {
  var calculatorHistory = document.getElementById("calculator-history");
  calculatorHistory.style.display = "none";
  editor.style.minHeight = "100vh";
  editor.style.maxHeight = "100vh";
  output.style.minHeight = "100vh";
  output.style.maxHeight = "100vh";
}

// Function to display calculator history
function displayCalculatorHistory() {
  const noOfHistoryLines = createHistoryElements();
  if (noOfHistoryLines < 2) {
    return;
  }
  var calculatorHistory = document.getElementById("calculator-history");
  calculatorHistory.style.display = "block";
  // to add the height based on the number of elements in history
  if (noOfHistoryLines < 3) {
    editor.style.minHeight = "92vh";
    editor.style.maxHeight = "92vh";
    output.style.minHeight = "92vh";
    output.style.maxHeight = "92vh";
    calculatorHistory.style.minHeight = "8vh";
    calculatorHistory.style.maxHeight = "8vh";
  } else if (noOfHistoryLines < 10) {
    editor.style.minHeight = "85vh";
    editor.style.maxHeight = "85vh";
    output.style.minHeight = "85vh";
    output.style.maxHeight = "85vh";
    calculatorHistory.style.minHeight = "15vh";
    calculatorHistory.style.maxHeight = "15vh";
  } else {
    editor.style.minHeight = "70vh";
    editor.style.maxHeight = "70vh";
    output.style.minHeight = "70vh";
    output.style.maxHeight = "70vh";
    calculatorHistory.style.minHeight = "30vh";
    calculatorHistory.style.maxHeight = "30vh";
  }
}

async function loadHistory() {
  var storageKeys = storage.keys();

  for (let index = 0; index < storageKeys.length; index++) {
    const key = storageKeys[index];
    if (key.includes("type-to-calculate-")) {
      historyData.push(storage.get(key));
    }
  }
  if (historyData) {
    historyData = historyData.sort(sortHistory);
  }
  if (settingsData.showHistory) {
    displayCalculatorHistory();
  }
}

function toggleHistory() {
  settingsData.showHistory = !settingsData.showHistory;
  saveSettings();

  if (settingsData.showHistory) {
    displayCalculatorHistory();
  } else {
    hideCalculatorHistory();
  }
}

function loadPlaceholderData() {
  const placeholderText = "2+1\n\n";
  if (_.isEmpty(editor.innerText)) {
    editor.innerText = placeholderText;
  }
  focusEditor();
}

async function loadData() {
  await loadHistory();
  if (_.isEmpty(historyData)) {
    loadPlaceholderData();
  }
}

function setupListeners() {
  editor.addEventListener("input", onEditorInput, false);
  document.addEventListener("keydown", onEditorKeydown, false);
  output.addEventListener("click", onOutputClick, false);
  helpButton.addEventListener("click", onHelpClick, false);
  helpOverlayTables.addEventListener("click", onOverlayClick, false);
  var calculatorHistory = document.getElementById("calculator-history");
  calculatorHistory.addEventListener("click", onHistoryClick, false);
}

async function onEditorInput() {
  parse(editor.innerText);
  saveData();
}

export function parse(value) {
  output.innerText = "";
  evaluate(value);
  updateOutputDisplay();
}

function updateOutputDisplay() {
  let results = getResultTokens();

  for (const [i, result] of results.entries()) {
    let button;
    let span;
    let br = document.createElement("br");
    let value = result.value;
    let len = results.length;
    let localizedValue =
      typeof value === "number"
        ? value.toLocaleString("en-US", { maximumFractionDigits: 15 })
        : value;

    switch (result.type) {
      case "null":
        break;
      case "variable":
      case "result":
        button = document.createElement("button");
        button.innerText = localizedValue;
        button.classList.add("result-btn");
        button.classList.add(result.type);
        button.dataset.value = result.value;
        output.appendChild(button);
        break;
      case "error":
        span = document.createElement("span");
        span.innerText = chrome.i18n.getMessage("error");
        span.setAttribute("title", value);
        span.classList.add(result.type);
        output.appendChild(span);
        break;
    }

    if (len > i + 1) {
      output.appendChild(br);
    }
  }
}

export function generateDocID() {
  return Math.random().toString(36).replace("0.", "").substring(0, 10);
}

function saveSettings() {
  storage.set(`ttc-settings`, settingsData);
}

function loadSettings() {
  settingsData = storage.get("ttc-settings") || { showHistory: false };
}

let saveData = debounce(async function () {
  let text = editor.innerText || "";
  let title = getTitle(text);
  let date = new Date().getTime();

  currentDocData.modified = date;
  let lines = text.split("\n");
  let results = evaluatedValues.map((item) => item.result);
  let nonEmptyLines = [];
  let nonEmptyResults = [];
  for (let index = 0; index < lines.length; index++) {
    if (!_.isNil(lines[index]) && lines[index] !== "") {
      nonEmptyLines.push(lines[index]);
      nonEmptyResults.push(results[index]);
    } else if (
      !_.isNil(lines[index]) &&
      lines[index] === "" &&
      index > 0 &&
      lines[index - 1] !== ""
    ) {
      nonEmptyLines.push(lines[index]);
      nonEmptyResults.push(results[index]);
    } else {
      continue;
    }
  }

  currentDocData.title = title;
  currentDocData.lines = nonEmptyLines;
  currentDocData.results = nonEmptyResults;

  storage.set(`type-to-calculate-${docId}`, currentDocData);
}, 500);

function getTitle(str) {
  if (str.length <= 0) return str;
  let maxLength = 30;
  str = str.trim();
  let split = str.split("\n")[0];
  let substring = split.substring(0, maxLength);

  if (split.length <= maxLength || !substring.includes(" ")) {
    return substring;
  } else {
    return split.substr(0, str.lastIndexOf(" ", maxLength));
  }
}

function debounce(callback, wait) {
  let timeout;

  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback.apply(this, args), wait);
  };
}

function isNotEmptyResult(item) {
  return !_.isEmpty(item) && _.isNumber(item.result);
}

// find the last not empty value from evaluatedValues
function findLastValue() {
  let lastValue = evaluatedValues.findLast(isNotEmptyResult);
  return lastValue ? lastValue.result : null;
}

async function copyLastValue() {
  // copy the last result to clipboard
  const lastValue = findLastValue();
  if (_.isNumber(lastValue)) {
    copyValueToClipboard(lastValue);
  } else {
    showToastMessage(`No result to copy`);
  }
}

function onEditorKeydown(e) {
  let key = e.key;
  if (key === "Enter" && (e.metaKey || e.ctrlKey)) {
    copyLastValue();
  } else if (key === "/" && (e.metaKey || e.ctrlKey)) {
    toggleHelpOverlay();
  } else if (key === "h" && (e.metaKey || e.ctrlKey)) {
    toggleHistory();
  }
}

function insertNode(...nodes) {
  for (let node of nodes) {
    document.execCommand("insertText", false, node);
  }
}

export function evaluate(value) {
  let lines = value.split("\n");
  evaluatedValues = [];
  let results = useMathJs(lines);
  for (let index = 0; index < results.length; index++) {
    const result_expression = {
      type: "expression",
      value: lines[index].trim(),
      result: results[index],
    };
    evaluatedValues[index] = result_expression;
  }
  return evaluatedValues;
}

function getResultTokens() {
  let results = [];

  for (const expression of evaluatedValues) {
    switch (expression.type) {
      case "newline":
      case "comment":
        results.push({
          type: "null",
          value: "",
        });
        break;
      case "variable":
        results.push({
          type: "variable",
          value: expression.value,
          name: expression.name,
        });
        break;
      case "error":
        results.push({
          type: "error",
          value: expression.value,
        });
        break;
      case "expression":
        if (isNaN(expression.result) || expression.result == null) {
          results.push({
            type: "null",
            value: "",
          });
        } else {
          results.push({
            type: "result",
            value: expression.result,
          });
        }
        break;
    }
  }

  return results;
}

function onHistoryClick(e) {
  onOutputClick(e);
}

function onOutputClick(e) {
  let ctrlPressed;
  let shiftPressed;
  let metaPressed;
  let modifierKeyPressed = false;
  let classes = ["result", "variable", "history-editor-item", "history-result"];

  try {
    ctrlPressed = e.ctrlKey;
    shiftPressed = e.shiftKey;
    metaPressed = e.metaKey;
  } finally {
    modifierKeyPressed = ctrlPressed || shiftPressed || metaPressed;
  }

  if (classes.some((className) => e.target.classList.contains(className))) {
    let value = e.target.dataset.value || e.target.innerText;

    if (modifierKeyPressed) {
      insertNode(value);
    } else {
      copyValueToClipboard(value);
    }
  }
}
async function showToastMessage(message, timeOut = 2000) {
  showToast({
    str: message,
    time: timeOut,
    position: "bottom",
  });
}

async function copyValueToClipboard(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToastMessage(`Copied '${value}' to clipboard.`);
  } catch (err) {
    alert(chrome.i18n.getMessage("clipboard_failure"));
  }
}

export async function init() {
  setupDocument();
  await loadSettings();
  await loadData();
  await setupEvaluator();

  setupListeners();
  evaluate(editor.innerText);
  updateOutputDisplay();
  removeOverlay();
}
