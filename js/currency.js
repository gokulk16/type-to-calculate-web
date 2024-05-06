"use strict";
import * as storage from "./storage.js";
import * as constants from "./constants.js";
const _ = require("lodash");
const countryToCurrency = require('country-to-currency');

export function getHomeCurrency(country) {
    return countryToCurrency[country.toUpperCase()].toUpperCase()
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
    const apiUrl = 'https://v6.exchangerate-api.com/v6/c31d7f7585019bed53787831/latest/USD';
    try {

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        // Check if the API call was successful
        if (data.result !== 'success') {
            throw new Error('API call was not successful');
        }

        // checking if currencies data exists
        if (!data.conversion_rates || typeof data.conversion_rates !== 'object') {
            throw new Error('Fetched currency data is not in expected JSON format');
        }
        return data;
    } catch (error) {
        console.error('Failed to fetch currency rates:', error);
    }

}

export async function getConversionRates() {
    let currencyApiData;
    const cachedApiData = await storage.load('currenciesApiData', null);

    if (!_.isEmpty(cachedApiData)) {
        const time_last_update_unix = cachedApiData.time_last_update_unix;
        const currentTime = Date.now();
        const lastUpdateTime = new Date(time_last_update_unix * 1000);
        const timeDifference = currentTime - lastUpdateTime.getTime();
        if (timeDifference > constants.cacheDuration) {
            currencyApiData = await fetchCurrencyRatesFromAPI();
            await storage.save('currenciesApiData', currencyApiData);
        } else {
            currencyApiData = cachedApiData;
            console.log('Currency conversion data taken from local storage cache')
        }
    } else {
        currencyApiData = await fetchCurrencyRatesFromAPI();
        await storage.save('currenciesApiData', currencyApiData);
    }

    // Example: Convert 1 units of each currency to different currencies
    const amountToConvert = 1;
    const convertedRates = {};
    const currencies = currencyApiData.conversion_rates;
    Object.keys(currencies).forEach(baseCurrency => {
        convertedRates[baseCurrency] = {};
        Object.keys(currencies).forEach(targetCurrency => {
            // Formula: (Amount in base currency / base currency rate) * target currency rate
            const conversionRate = (amountToConvert / currencies[baseCurrency]) * currencies[targetCurrency];
            convertedRates[baseCurrency][targetCurrency] = conversionRate;
        });
    });

    return convertedRates;
}