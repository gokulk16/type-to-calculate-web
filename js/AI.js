
let lastCallTime = Date.now();

// Debounce function
function debounce(callback, delay) {
  let timeout;
  return (...args) => {
    return new Promise((resolve, reject) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(async () => {
        try {
          const result = await callback(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
}

// Debounced API call
const debouncedCallAI = debounce(async (value) => {
  const payload = { input: value };
  try {
    const response = await fetch("https://fdeblqjfpiwn52phc3cmb4qiui0jrvzf.lambda-url.us-east-2.on.aws/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      let responseObj = await response.json();
      // if responseObj is not an object, convert to object
      if (typeof responseObj !== 'object') {
        try {
          responseObj = JSON.parse(responseObj);
        } catch (e) {
          console.log("Error parsing response as JSON:", e);
          return null;
        }
      }
      if (responseObj && (responseObj?.status_code == 200 || responseObj.status_code == '200') && responseObj.output?.length > 0) {
        return responseObj.output;
      }
      console.log("Error in response: ", responseObj);
      return [];

    } else {
      console.log("Assuming no response from AI.");
    }
  } catch (error) {
    console.log("Error while sending data to the API:", error);
  }
}, 3000);

function canCallAI(value) {

  // Check if the input is empty
  if (!value) {
    console.log("Input is empty, not calling AI.");
    return false;
  }
  // Check if the input is too short
  if (value.length < 5) {
    console.log("Input is too short, not calling AI.");
    return false;
  }
  // Check if the input is too long
  if (value.length > 1000) {
    console.log("Input is too long, not calling AI.");
    return false;
  }
  // Check if the input contains only whitespace
  if (value.trim().length === 0) {
    console.log("Input contains only whitespace, not calling AI.");
    return false;
  }
  // Check if the input contains only numbers and spaces and special characters
  if (/^[\d\s!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/.test(value)) {
    console.log("Input contains only numbers and spaces and special characters, not calling AI.");
    return false;
  }
  return true;
}

export async function callAI(value) {
  if (!canCallAI(value)) {
    return null;
  }
  return await debouncedCallAI(value);
}