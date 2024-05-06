"use strict";

// import * as storage from "./storage.js";
// import * as win from "./window.js";
// import * as currency from "./currency.js";
import * as regex from "./regex.js";
import helpOperators from "./help_operators.json";
import helpShortcuts from "./help_shortcuts.json";
import helpUnits from "./help_units.json";

import { createUnit, unit, evaluate as mathjs_evaluate } from 'mathjs'

var showToast = require("show-toast");
var _ = require("lodash");

let editor;
let output;
let docId;
let helpButton;
let helpOverlay;
let conversionRates;
let homeCurrency;
let showHelp = false;
let evaluatedValues = []; // All evaluated expressions by line

document.addEventListener("DOMContentLoaded", init);

async function setupHomeCurrency() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) {
      throw new Error('Failed to fetch country information');
    }
    const data = await response.json();
    if (!_.isNil(data.currency)) {
      homeCurrency = data.currency.toUpperCase()
    } else if (!_.isNil(data.country)) {
      homeCurrency = currency.getHomeCurrency(data.country);
    } else {
      throw new Error('Failed to obtain country/currency information from ipapi.co');
    }
  } catch (error) {
    console.error("Error while computing home currency using ipapi.co/json", error);
    try {
      const response = await fetch('http://ip-api.com/json/');
      if (!response.ok) {
        throw new Error('Failed to fetch country information from ip-api.com');
      }
      const data = await response.json();
      const country = data.countryCode;
      homeCurrency = currency.getHomeCurrency(country);
    } catch {
      console.error("Error while computing home currency using ip-api.com/json; Falling back to USD as home currency", error);
      homeCurrency = 'USD'; // Fallback currency
    }
  } finally {
    createUnit(homeCurrency.toLowerCase())
  }
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

function onOverlayClick() {
  showHelp = false;
  document.getElementById("help-overlay").style.display = "none";
  editor.focus();
}

async function createHelpTables() {
  // Operator Table
  const operatorColumns = ['Name', 'Operator', 'Example'];
  const operatorsDataa = [...helpOperators.operators];
  const operatorTableHtml = createTable(operatorColumns, operatorsDataa);
  document.getElementById('operator-table-container').innerHTML = operatorTableHtml;

  // Keyboard shortcut table
  const shortcutColumns = ['Action', 'Shortcut'];
  const shortcutsData = [...helpShortcuts.shortcuts];
  const shortcutTableHtml = createTable(shortcutColumns, shortcutsData);
  document.getElementById('shortcut-table-container').innerHTML = shortcutTableHtml;


  // Units table
  const unitColumns = ['Value', 'Units'];
  const unitsData = [...helpUnits.units];
  const unitTableHtml = createTable(unitColumns, unitsData);
  document.getElementById('unit-table-container').innerHTML = unitTableHtml;
}

function createTable(columns, data) {
  let table = '<table>';

  // Create table header
  table += '<thead><tr>';
  columns.forEach(column => {
    table += `<th>${column}</th>`;
  });
  table += '</tr></thead>';

  // Create table body
  table += '<tbody>';
  data.forEach(row => {
    table += '<tr>';
    columns.forEach(column => {
      table += `<td>`;

      if (Array.isArray(row[column])) {
        row[column].forEach(item => {
          table += `${item}</br>`;
        });
      } else {
        table += `${row[column]}`;
      }
      table += '</td>';
    });
    table += '</tr>';
  });
  table += '</tbody></table>';
  return table;
}

async function setupEvaluator() {
  await setupHomeCurrency()

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
          createUnit(fromCurrencyCode.toLowerCase(), unit(1 * rates[homeCurrency], homeCurrency.toLowerCase()));
        } catch {
          try {
            createUnit(fromCurrencyCode.toUpperCase(), unit(1 * rates[homeCurrency], homeCurrency.toLowerCase()));
          } catch {
            console.log(`couldnt add ${fromCurrencyCode.toUpperCase()} or ${fromCurrencyCode.toLowerCase()} as currency unit`)
          }
        }
      }
    });
  } catch (error) {
    console.error("Error setting up currency tokens:", error);
  }

}

function removeMatches(supersetArray, removeArray) {
  let result = supersetArray.filter(match => !removeArray.includes(match));
  return result;
}

function replaceFirstXAfterIndex(str, index) {
  return str.substring(0, index) + str.substring(index).replace('x', '*');
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

    let XIndices = matchesOfX.map(ele => ele.index)
    let HexaIndices = matchesOfHexa.map(ele => ele.index)

    let filteredMatches = removeMatches(XIndices, HexaIndices);
    // filteredMatches contains all the indexes where the x will be present on or after the index

    for (let index = 0; index < filteredMatches.length; index++) {
      lines[i] = replaceFirstXAfterIndex(lines[i], filteredMatches[index])
    }

    // if line still matches with regex.X_IN_EXPRESSION then go through the same operations once again
    let confirmMatchesOfX = [...lines[i].matchAll(regex.X_IN_EXPRESSION)];

    if (!_.isEmpty(confirmMatchesOfX)) {
      matchesOfHexa = [...lines[i].matchAll(regex.HEXADECIMAL_VALUE)];

      XIndices = confirmMatchesOfX.map(ele => ele.index)
      HexaIndices = matchesOfHexa.map(ele => ele.index)
      filteredMatches = removeMatches(XIndices, HexaIndices);
      for (let index = 0; index < filteredMatches.length; index++) {
        lines[i] = replaceFirstXAfterIndex(lines[i], filteredMatches[index])
      }
    }
  }
  return lines
}


function useMathJs(lines) {
  var mjs_results = [];

  // pre evaluation
  lines = convertXToMultiplication(lines)

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
          mjs_results[index] = lineResult[index]
        } catch (error) {
          console.log(`Couldn't evaluate: ${lines[index]}`);
          mjs_results[index] = undefined;
          tmpLines[index] = ''; // Put empty string for lines that throw an error
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
        mjs_results[i] = result.toNumber()
      }
    } catch (error) {
      console.log('no result for line ', i + 1)
      mjs_results[i] = ''; // Ensure non-convertible results are set to empty string
    }
  }

  return mjs_results;
}

function setupDocument() {
  editor = document.getElementById("editor");
  editor.focus();
  output = document.getElementById("output");
  docId = getDocId();
  helpButton = document.getElementById("help-button");
  helpOverlay = document.getElementById("help-overlay");
  createHelpTables();
}

function removeOverlay() {
  document.body.classList.remove("loading");
}

function getDocId() {
  let url = window.location.search;
  let params = new URLSearchParams(url);
  let id = params.get("id");

  // Sanity check
  if (id && id !== "undefined") {
    return id;
  } else {
    window.close();
  }
}

async function loadData() {
  // let data = await getData();

  // if (data.text) {
  //   editor.innerText = data.text;
  // }

  // updateWindowTitle(data.title);
}

async function getData() {
  // return await storage.load(docId, {});
}

function setupListeners() {
  editor.addEventListener("input", onEditorInput, false);
  editor.addEventListener("keydown", onEditorKeydown, false);
  output.addEventListener("click", onOutputClick, false);
  helpButton.addEventListener("click", onHelpClick, false);
  helpOverlay.addEventListener("click", onOverlayClick, false);
  window.addEventListener("resize", onWindowResize);
  // chrome.storage.onChanged.addListener(onStorageChanged);
}

// let onWindowResize = debounce(async function () {
//   let dimensions = await win.getWindowDimensions();
//   // let docData = await storage.load(docId, {});

//   docData.width = dimensions.width;
//   docData.height = dimensions.height;

//   // await storage.save(docId, docData);
// }, 500);

async function onEditorInput() {
  parse(editor.innerText);
  // await saveData();
}

function parse(value) {
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

let saveData = debounce(async function () {
  // let docData = await storage.load(docId, {});
  let text = editor.innerText;
  let title = getTitle(text);
  let date = new Date().toString();

  if (Object.keys(docData).length <= 0) {
    docData.id = docId;
    docData.type = "document";
  }

  docData.modified = date;
  docData.text = text;
  docData.title = title;

  updateWindowTitle(title);

  // await storage.save(docId, docData);
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

// async function onStorageChanged(changes) {
//   if (changes[docId] && !document.hasFocus()) {
//     let data = await getData();

//     if (data.text) {
//       editor.innerText = data.text;
//     }
//   }
// }

function updateWindowTitle(value) {
  if (value && value.length > 0) {
    document.title = value;
  } else {
    document.title = chrome.i18n.getMessage("new_document");
  }
}

function isNotEmptyResult(item) {
  return !_.isEmpty(item) && _.isNumber(item.result)
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
    copyValueToClipboard(lastValue)
  } else {
    showToastMessage(`No result to copy`)
  }
}

function onEditorKeydown(e) {
  let key = e.key;
  if (key === "Tab") {
    e.preventDefault();
    insertNode("\t");
  } else if (key === "Enter" && (e.metaKey || e.ctrlKey)) {
    copyLastValue();
  } else if (key === "/" && (e.metaKey || e.ctrlKey)) {
    toggleHelpOverlay();
  }
}

function insertNode(...nodes) {
  for (let node of nodes) {
    document.execCommand("insertText", false, node);
  }
}

function evaluate(value) {
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

function onOutputClick(e) {
  let ctrlPressed;
  let shiftPressed;
  let metaPressed;
  let modifierKeyPressed = false;
  let classes = ["result", "variable"];

  try {
    ctrlPressed = e.ctrlKey;
    shiftPressed = e.shiftKey;
    metaPressed = e.metaKey;
  } finally {
    modifierKeyPressed = ctrlPressed || shiftPressed || metaPressed;
  }

  if (classes.some((className) => e.target.classList.contains(className))) {
    let value = e.target.dataset.value;

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
    position: 'bottom'
  })
}

async function copyValueToClipboard(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToastMessage(`Copied '${value}' to clipboard.`)
  } catch (err) {
    alert(chrome.i18n.getMessage("clipboard_failure"));
  }
}

async function init() {
  setupDocument();
  await loadData();
  await setupEvaluator();

  setupListeners();
  evaluate(editor.innerText);
  updateOutputDisplay();
  removeOverlay();
}