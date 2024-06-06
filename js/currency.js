"use strict";
import { LocalStorage } from "web-browser-storage";
import * as constants from "./constants.js";

const _ = require("lodash");
import countryToCurrency from "country-to-currency";
const storage = new LocalStorage();

export function getCurrency(country) {
  return countryToCurrency[country.toUpperCase()].toUpperCase();
}
/**
 * Fetches the latest currency conversion rates from the API and returns them.
 *
 * @async
 * @function fetchCurrencyRates
 * @returns {Promise<Object>} A promise that resolves with an object containing currency conversion rates.
 * @throws {Error} Throws an error
 * if the network response is not ok,
 * the API call was not successful,
 * or the fetched data is not in the expected format.
 */

export async function fetchCurrencyRatesFromAPI() {
  const apiUrl =
    "https://v6.exchangerate-api.com/v6/c31d7f7585019bed53787831/latest/USD";
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const data = await response.json();
    // Check if the API call was successful
    if (data.result !== "success") {
      throw new Error("API call was not successful");
    }

    // checking if currencies data exists
    if (!data.conversion_rates || typeof data.conversion_rates !== "object") {
      throw new Error("Fetched currency data is not in expected JSON format");
    }
    return data;
  } catch (error) {
    console.error("Failed to fetch currency rates:", error);
  }
}

export async function getConversionRates() {
  let currencyApiData;
  const cachedApiData = storage.get("currenciesApiData");

  if (!_.isEmpty(cachedApiData)) {
    const time_last_update_unix = cachedApiData.time_last_update_unix;
    const currentTime = Date.now();
    const lastUpdateTime = new Date(time_last_update_unix * 1000);
    const timeDifference = currentTime - lastUpdateTime.getTime();
    if (timeDifference > constants.cacheDuration) {
      currencyApiData = await fetchCurrencyRatesFromAPI();
      storage.set("currenciesApiData", currencyApiData);
    } else {
      currencyApiData = cachedApiData;
      console.log("Currency conversion data taken from local storage cache");
    }
  } else {
    currencyApiData = await fetchCurrencyRatesFromAPI();
    await storage.set("currenciesApiData", currencyApiData);
  }

  // Example: Convert 1 units of each currency to different currencies
  const amountToConvert = 1;
  const convertedRates = {};
  const currencies = currencyApiData.conversion_rates;
  Object.keys(currencies).forEach((baseCurrency) => {
    convertedRates[baseCurrency] = {};
    Object.keys(currencies).forEach((targetCurrency) => {
      // Formula: (Amount in base currency / base currency rate) * target currency rate
      const conversionRate =
        (amountToConvert / currencies[baseCurrency]) *
        currencies[targetCurrency];
      _.set(convertedRates, [baseCurrency, targetCurrency], conversionRate);
    });
  });

  return convertedRates;
}

async function fetchCountryInfo(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",

      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch country information from ${url}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching country information from ${url}:`, error);
    throw error;
  }
}

function parseCurrency(data) {
  if (!_.isNil(data.currency) && typeof data.currency === "string") {
    return data.currency.toUpperCase();
  } else if (!_.isNil(data.country) || !_.isNil(data.countryCode)) {
    var country = data.country || data.countryCode;
    return getCurrency(country);
  } else {
    throw new Error("Failed to obtain country information");
  }
}

// Define a function to get the home currency from the fetched country information
async function getHomeCurrencyFromIPAPI() {
  const data = await fetchCountryInfo("https://ipapi.co/json/");
  return parseCurrency(data);
}

// Define a function to get the home currency from the fetched country information
async function getHomeCurrencyFromFreeIPAPI() {
  const data = await fetchCountryInfo("https://freeipapi.com/api/json/");
  return parseCurrency(data);
}

// Define a function to get the home currency from the fetched country information
async function getHomeCurrencyFromIPWhoIs() {
  const data = await fetchCountryInfo("https://ipwho.is/");
  return parseCurrency(data);
}

// Define a function to get the home currency from the fetched country information
async function getHomeCurrencyFromAPICountryIs() {
  const data = await fetchCountryInfo("https://api.country.is/");
  return parseCurrency(data);
}
export async function getHomeCurrency() {
  // Try to get the home currency from freeipapi.com
  let homeCurr;
  try {
    homeCurr = await getHomeCurrencyFromFreeIPAPI();
  } catch (error) {
    console.error(
      "Error fetching country information from freeipapi.com",
      error
    );
  }
  // If ipapi.co failed, try ipapi.co
  if (!homeCurr) {
    try {
      homeCurr = await getHomeCurrencyFromIPAPI();
    } catch (error) {
      console.error("Error fetching country information from ipapi.co", error);
    }
  }

  // If ipapi.co failed, try ipwho.is
  if (!homeCurr) {
    try {
      homeCurr = await getHomeCurrencyFromIPWhoIs();
    } catch (error) {
      console.error("Error fetching country information from ipwho.is:", error);
    }
  }

  // If ipwho.is failed, try api.country.is
  if (!homeCurr) {
    try {
      homeCurr = await getHomeCurrencyFromAPICountryIs();
    } catch (error) {
      console.error(
        "Error fetching country information from api.country.is:",
        error
      );
    }
  }
  return homeCurr;
}
