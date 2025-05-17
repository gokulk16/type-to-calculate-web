const loadingMessages = [
  "Warming up the calculators...",
  "Crunching some numbers...",
  "Loading mathematical wonders...",
  "Calibrating the decimal points...",
  "Getting everything ready...",
  "Almost there...",
  "Loading advanced calculations...",
  "Initializing math functions...",
  "Setting up your calculator...",
  "We will be more accurate than AI...",
  "Loading the magic of math...",
  "Preparing the ultimate calculator..."
];

let messageInterval;
let currentMessageIndex = 0;

export function initLoader() {
  // Start showing messages after 3 seconds
  setTimeout(() => {
    const messageContainer = document.getElementById('loading-message');
    if (!messageContainer) {
      return;
    }

    messageContainer.style.opacity = '1';
    showLoadingMessage(true);
    messageInterval = setInterval(showLoadingMessage, 4500);
  }, 3000);
}

function showLoadingMessage(isFirst = false) {
  const messageContainer = document.getElementById('loading-message');
  if (!messageContainer) {
    if (messageInterval) {
      clearInterval(messageInterval);
      messageInterval = null;
    }
    return;
  }

  // Get a random message that's different from the current one
  let newIndex;
  do {
    newIndex = Math.floor(Math.random() * loadingMessages.length);
  } while (newIndex === currentMessageIndex && loadingMessages.length > 1);

  currentMessageIndex = newIndex;
  messageContainer.textContent = loadingMessages[currentMessageIndex];

}

initLoader();
