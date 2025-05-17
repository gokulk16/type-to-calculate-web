"use strict";
import * as Sentry from "@sentry/browser";
import * as currency from "./currency.js";
import { createHelpTables } from "./help_page.js";
import { convertXToMultiplication } from "./utils/convert_x_to_multiply.js";
import showToast from "show-toast";
import { LocalStorage } from "web-browser-storage";
import { createUnit, unit, evaluate as mathjs_evaluate } from "mathjs";
import { callAI } from "./AI.js";
const storage = new LocalStorage();
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
let aiEvaluatedindexes = []; // AI evaluations by line
let docId;
let calculator;
let separators;
let startX;
let editorWidthBefore;
let outputWidthBefore;

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

export async function setupEvaluator() {
  homeCurrency = await setupHomeCurrency();
  createUnit(homeCurrency.toLowerCase());
  let currencyUnitsAdded = false;
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
    currencyUnitsAdded = true;
  } catch (error) {
    console.error("Error setting up currency tokens:", error);
  }
  return currencyUnitsAdded;
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
  editor = document.getElementById("editor");
  focusEditor();
  output = document.getElementById("output");
  docId = generateDocID();
  currentDocData.docId = docId;
  helpButton = document.getElementById("help-button");
  helpOverlayTables = document.getElementById("help-overlay-tables");
  createHelpTables();

  if (navigator.userAgent.toLowerCase().includes("firefox")) {
    // since firefox browsers don't support the contenteditable="plaintext-only"
    // reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/contenteditable#browser_compatibility
    // set the editor's contenteditable to true from plaintext-only
    editor.setAttribute("contenteditable", "true");
  }
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

    const separatorElement = document.createElement("div");
    separatorElement.className = "separator";
    separatorElement.id = "separator";

    historyItemsElement.appendChild(historyItemEditor);
    historyItemsElement.appendChild(separatorElement);
    historyItemsElement.appendChild(historyItemsOutput);
    noOfHistoryLines += history.lines.length;
  }
  return noOfHistoryLines;
}

function hideCalculatorHistory() {
  var calculatorHistory = document.getElementById("calculator-history");
  calculatorHistory.style.display = "none";
  var calculator = document.getElementById("calculator");
  calculator.style.minHeight = "100vh";
  calculator.style.maxHeight = "100vh";
}

// Function to display calculator history
function displayCalculatorHistory() {
  const noOfHistoryLines = createHistoryElements();
  if (noOfHistoryLines < 2) {
    return;
  }
  var calculatorHistory = document.getElementById("calculator-history");
  calculatorHistory.style.display = "block";
  var calculator = document.getElementById("calculator");
  // to add the height based on the number of elements in history
  if (noOfHistoryLines < 3) {
    calculator.style.minHeight = "92vh";
    calculator.style.maxHeight = "92vh";
    calculatorHistory.style.minHeight = "8vh";
    calculatorHistory.style.maxHeight = "8vh";
  } else if (noOfHistoryLines < 10) {
    calculator.style.minHeight = "85vh";
    calculator.style.maxHeight = "85vh";
    calculatorHistory.style.minHeight = "15vh";
    calculatorHistory.style.maxHeight = "15vh";
  } else {
    calculator.style.minHeight = "70vh";
    calculator.style.maxHeight = "70vh";
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

export function loadPlaceholderData(
  editorElement,
  history,
  currencyConversionsLoaded
) {
  //show placeholder only when no history .i.e., no previous usage of our app
  if (!_.isEmpty(history)) {
    return;
  }
  let placeholderText = "2+1\n12x3\n3miles to km\ndata = 12\ndata+5\n";
  if (currencyConversionsLoaded) {
    placeholderText += "10 usd to inr";
  }
  placeholderText += "\n\n";

  if (_.isEmpty(editorElement.innerText)) {
    editorElement.innerText = placeholderText;
  }

  return placeholderText;
}

async function loadData() {
  await loadHistory();
}

function setupListeners() {
  editor.addEventListener("input", onEditorInput, false);
  document.addEventListener("keydown", onEditorKeydown, false);
  output.addEventListener("click", onOutputClick, false);
  helpButton.addEventListener("click", onHelpClick, false);
  helpOverlayTables.addEventListener("click", onOverlayClick, false);
  var calculatorHistory = document.getElementById("calculator-history");
  calculatorHistory.addEventListener("click", onHistoryClick, false);
  window.addEventListener("resize", onWindowResize, false);
  separators = document.body.querySelectorAll("#separator");
  calculator = document.getElementById("calculator");
  separators.forEach(function (separator) {
    separator.addEventListener("mousedown", updateWidthOnResize, false);
  });
}

async function onEditorInput() {
  aiEvaluatedindexes = [];
  parse(editor.innerText, output);
}

export function parse(value, outputElement) {
  outputElement.innerText = "";
  evaluate(value);
  updateOutputDisplay(outputElement);
  saveData();
}

function updateOutputDisplay(outputElement) {
  let results = getResultTokens(evaluatedValues);
  for (const [i, result] of results.entries()) {
    let button;
    let span;
    let br = document.createElement("br");
    let value = result.value;
    let len = results.length;
    let localizedValue =
      typeof value === "number"
        ? value.toLocaleString("en-US", { maximumFractionDigits: 5 })
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
        outputElement.appendChild(button);
        outputElement = addAITagToOutput(outputElement, i);
        break;
      case "error":
        span = document.createElement("span");
        span.innerText = chrome.i18n.getMessage("error");
        span.setAttribute("title", value);
        span.classList.add(result.type);
        outputElement.appendChild(span);
        break;
    }

    if (len > i + 1) {
      outputElement.appendChild(br);
    }
  }
}

function addAITagToOutput(outputElement, currIndex) {
  // use currIndex to find the index exists in aiEvaluatedindexes
  // if yes, then add the ai tag to the output
  if (aiEvaluatedindexes.includes(currIndex)) {
    let span = document.createElement("span");
    span.innerText = "AI";
    span.classList.add("ai-tag");
    span.style.backgroundColor = "#A19977"; // Light yellow background
    span.style.color = "#000"; // Black text
    span.style.padding = "0";
    span.style.margin = "4px";
    span.style.fontSize = "12px";
    span.style.borderRadius = "50%"; // Circular shape
    span.style.display = "inline-block"; // Inline-block for centering
    span.style.textAlign = "center"; // Center text horizontally
    span.style.lineHeight = "24px"; // Center text vertically by matching line height to height
    span.style.justifyContent = "center"; // Center text horizontally
    span.style.alignItems = "center"; // Center text vertically
    span.style.width = "24px"; // Fixed width for circle
    span.style.height = "24px"; // Fixed height for circle
    span.style.backgroundColor = "#A19977"; // Light yellow background
    span.style.cursor = "default"; // Default cursor since it's not clickable
    span.title = "Computed by AI. There is a potential for error"; // On hover text
    outputElement.appendChild(span);
    console.log("AI tag added to output for index: ", currIndex);
  }
  return outputElement;
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

export function getTitle(str) {
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

function isNumberResult(item) {
  return !_.isEmpty(item) && _.isNumber(item.result);
}

// find the last not empty value from evaluatedValues
function findLastValue(values) {
  let lastValue = values.findLast(isNumberResult);
  return lastValue ? lastValue.result : null;
}

export async function copyLastValue(values) {
  // copy the last result to clipboard
  let lastValue = findLastValue(values);
  if (_.isNumber(lastValue)) {
    lastValue = parseFloat(lastValue.toFixed(5));
    copyValueToClipboard(lastValue);
    return lastValue;
  } else {
    showToastMessage(`No result to copy`);
  }
}

export async function copyPasteLastValue(values) {
  let lastValue = await copyLastValue(values);
  if (lastValue) {
    insertNode(lastValue);
  }
}

async function onEditorKeydown(e) {
  let key = e.key;
  // Order of below conditions matter since there is subset condition
  if (key === "Enter" && e.shiftKey && (e.metaKey || e.ctrlKey)) {
    // copy & paste last value
    copyPasteLastValue(evaluatedValues);
  } else if (key === "Enter" && (e.metaKey || e.ctrlKey)) {
    // copy last value
    copyLastValue(evaluatedValues);
  } else if (key === "/" && (e.metaKey || e.ctrlKey)) {
    // open/close help
    toggleHelpOverlay();
  } else if (key === "h" && (e.metaKey || e.ctrlKey)) {
    // open/close history
    toggleHistory();
  }
}

export function insertNode(...nodes) {
  for (let node of nodes) {
    document.execCommand("insertText", false, node);
  }
}

function isTotalKeyword(word) {
  return ["total", "sum", "="].includes(word.toLowerCase().trim());
}

export function postProcess(inputs, outputs) {
  try {
    if (inputs.length === 0) {
      return outputs;
    }
    // confirm if input length and output length
    if (inputs.length !== outputs.length) {
      console.error(
        "Post Processing failed. Input and Output lengths must be same."
      );
      return outputs;
    }
    // processing for total keyword
    let total = 0;
    for (let index = 0; index < outputs.length; index++) {
      if (typeof outputs[index] === "number") {
        total += outputs[index];
      }

      if (isTotalKeyword(inputs[index])) {
        outputs[index] = total;
      }
    }
    return outputs;
  } catch {
    return outputs;
  }
}

export function evaluate(inputvalue) {
  //create a copy of the value to avoid mutation
  var value = _.clone(inputvalue);

  let lines = value.split("\n");
  evaluatedValues = [];
  let results = useMathJs(lines);
  results = postProcess(lines, results);
  for (let index = 0; index < results.length; index++) {
    const result_expression = {
      type: "expression",
      value: lines[index].trim(),
      result: results[index],
    };
    evaluatedValues[index] = result_expression;
  }
  aiEvaluation(value, lines);

  return evaluatedValues;
}

function replaceInputsInIndex(input, replaceWithValue, index) {
  // split input with \n and then replce in the index
  let tempLines = input.split("\n");
  tempLines[index] = replaceWithValue;
  return tempLines.join("\n");
}

function isValidResult(resultValue) {
  return (_.isString(resultValue) && resultValue.length > 0) || (_.isNumber(resultValue));
}

function isValidAiResult(resultValue) {
  return (
    (_.isString(resultValue) && resultValue.length > 0) ||
    (_.isNumber(resultValue))
  );
}

function isNonEmptyString(val) {
  return typeof val === "string" && val.trim() !== "";
}

async function aiEvaluation(inputValues, lines) {
  // check if any line is non-empty but evaluatedValue is having empty result for same index
  // if yes, then call AI
  // if no, then return
  // check if aiEvaluated indexes are empty
  if (!_.isEmpty(aiEvaluatedindexes)) {
    return;
  }

  let anyEvalsFailed = false;
  for (let index = 0; index < lines.length; index++) {
    if (
      !_.isEmpty(lines[index].trim()) &&
      _.isEmpty(evaluatedValues[index].result)
    ) {
      anyEvalsFailed = true;
      break;
    }
  }
  if (!anyEvalsFailed) {
    console.log("All evaluations not needed. We saved AI !!!");
    return;
  }

  callAI(inputValues).then((response) => {
    if (response) {
      var response_lines = response.split("\n");
      // proceed only if ai response and evaluatedValues are of equal length
      if (response_lines.length !== evaluatedValues.length) {
        // if evaluatedValues's last value is just empty string or empty, then can ignore that item and compare length again
        if (_.isEmpty(evaluatedValues[evaluatedValues.length - 1].result)) {
          evaluatedValues.pop();
        }

        if (response_lines.length !== evaluatedValues.length) {
          console.log("AI response and evaluatedValues length is still mismatched.");
          return;
        }
      }
      // check if the response is empty
      // if empty, then return the evaluatedValues
      if (_.isEmpty(response_lines)) {
        console.log("AI response is empty.");
        return;
      }

      // override the result of evaluatedValues only if the aiEvaluated value is not empty and at the same position evaluatedValue is giving a empty result
      // also check and override the input value to be non empty
      for (let index = 0; index < response_lines.length; index++) {
        console.log('in index: ', index);
        if (
          isValidAiResult(response_lines[index]) &&
          !isValidResult(evaluatedValues[index]?.result) &&
          isNonEmptyString(lines[index])
        ) {
          // change the inputValues and send again to evaluate() again
          inputValues = replaceInputsInIndex(
            inputValues,
            response_lines[index],
            index
          );
          aiEvaluatedindexes.push(index);
          parse(inputValues, output);
        }
      }
    }

  }).catch(error => {
    console.log("Error in AI call:", error);
  });
}

export function getResultTokens(evalResults) {
  let results = [];

  for (const expression of evalResults) {
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

function hideSplashScreen() {
  // Hide splash screen after setupEvaluator completes
  const splashScreen = document.getElementById('splash-screen');
  splashScreen.classList.add('hidden');
  setTimeout(() => {
    splashScreen.remove();
  }, 500);
}

function onWindowResize(e) {
  // update with default values on window resize
  updateWidthOfCalculator("1fr", "minmax(150px, 37%)");
  updateWidthOfHistory("1fr", "minmax(150px, 37%)");
}

function updateWidthOnResize(e) {
  startX = e.clientX;
  const gridStyles = window.getComputedStyle(calculator);
  const existingGridWidths = gridStyles
    .getPropertyValue("grid-template-columns")
    .split(" ");
  editorWidthBefore = parseFloat(existingGridWidths[0]);
  outputWidthBefore = parseFloat(existingGridWidths[2]);

  document.addEventListener("mousemove", resize);
  document.addEventListener("mouseup", stopResize);
}

async function updateWidthOfHistory(editorWidth, outputWidth) {
  let historyItemsList = document.body.querySelectorAll("#history-items");
  if (!_.isEmpty(historyItemsList)) {
    historyItemsList.forEach((item) => {
      item.style.gridTemplateColumns = `${editorWidth} 5px ${outputWidth}`;
    });
  }
}

function updateWidthOfCalculator(editorWidth, outputWidth) {
  calculator.style.gridTemplateColumns = `${editorWidth} 5px ${outputWidth}`;
}

function resize(e) {
  const dx = e.clientX - startX;
  const editorWidthAfter = `${editorWidthBefore + dx}px`;
  const outputWidthAfter = `${outputWidthBefore - dx}px`;
  updateWidthOfCalculator(editorWidthAfter, outputWidthAfter);
  updateWidthOfHistory(editorWidthAfter, outputWidthAfter);
}

function stopResize() {
  document.removeEventListener("mousemove", resize);
  document.removeEventListener("mouseup", stopResize);
}

export async function initSentry() {
  try {
    Sentry.init({
      dsn: "https://f6181e1f6794abaf08674441d2c08403@o4507406315159552.ingest.de.sentry.io/4507406320992336",
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: 1.0, //  Capture 100% of the transactions
      // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
      tracePropagationTargets: ["localhost", /^https:\/\/typetocalculate\.in/],
      // Session Replay
      replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
      replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
    });
  } catch (error) {
    console.log("Sentry initialization failed:", error);
  }
}

export async function registerSW() {
  try {
    if (!("serviceWorker" in navigator)) {
      console.log("Service Workers are not supported by this browser");
      return;
    }

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("../sw.js")
        .then((registration) => { })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    });
  } catch (error) {
    console.error("Service Worker registration failed:", error);
  }
}

export async function init() {
  registerSW();
  initSentry();
  setupDocument();
  await loadSettings();
  await loadData();
  let currencyUnitsAdded = await setupEvaluator();
  hideSplashScreen();

  loadPlaceholderData(editor, historyData, currencyUnitsAdded);
  focusEditor();
  setupListeners();
  evaluate(editor.innerText);
  updateOutputDisplay(output);
}
