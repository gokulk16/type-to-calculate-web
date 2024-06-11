"use strict";
import * as regex from "./regex.js";
var _ = require("lodash");

function removeMatches(supersetArray, removeArray) {
  let result = supersetArray.filter((match) => !removeArray.includes(match));
  return result;
}

function replaceFirstXAfterIndex(str, index) {
  return str.substring(0, index) + str.substring(index).replace("x", "*");
}

export function convertXToMultiplication(lines) {
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
