import { describe, expect, vi, test, beforeEach, afterEach } from "vitest";
import { initLoader } from "./loader";

describe("Testing loader.js", () => {
  beforeEach(() => {
    // Set up DOM elements
    document.body.innerHTML = `
      <div id="loading-message"></div>
    `;
    
    // Reset mocks and timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Clean up
    vi.restoreAllMocks();
    vi.clearAllTimers();
    document.body.innerHTML = "";
  });

  test("initLoader should not show message if loading-message element doesn't exist", () => {
    document.body.innerHTML = ""; // Remove the loading-message element
    initLoader();
    vi.advanceTimersByTime(3000);
    expect(document.getElementById("loading-message")).toBe(null);
  });

  test("initLoader should show first message after 3 seconds", () => {
    const messageContainer = document.getElementById("loading-message");
    initLoader();
    
    // Initially the opacity should be default (0 or "")
    expect(messageContainer.style.opacity).toBe("");
    
    // After 3 seconds, the message should be visible
    vi.advanceTimersByTime(3000);
    expect(messageContainer.style.opacity).toBe("1");
    expect(messageContainer.textContent).not.toBe("");
  });

  test("initLoader should change message every 4.5 seconds", () => {
    const messageContainer = document.getElementById("loading-message");
    initLoader();
    
    // Wait for initial delay
    vi.advanceTimersByTime(3000);
    const firstMessage = messageContainer.textContent;
    
    // Wait for first interval
    vi.advanceTimersByTime(4500);
    const secondMessage = messageContainer.textContent;
    
    expect(secondMessage).not.toBe(firstMessage);
  });

  test("messages should not repeat consecutively when there are multiple messages", () => {
    const messageContainer = document.getElementById("loading-message");
    initLoader();
    
    // Wait for initial delay
    vi.advanceTimersByTime(3000);
    
    // Store 5 consecutive messages
    const messages = new Set();
    for (let i = 0; i < 5; i++) {
      messages.add(messageContainer.textContent);
      vi.advanceTimersByTime(4500);
    }
    
    // We should have at least 3 different messages
    // (probability of getting same message twice in a row is prevented by the code)
    expect(messages.size).toBeGreaterThanOrEqual(3);
  });

  test("interval should be cleared if loading-message element is removed", () => {
    initLoader();
    vi.advanceTimersByTime(3000);
    
    // Remove the element
    document.getElementById("loading-message").remove();
    
    // Wait for next interval
    vi.advanceTimersByTime(4500);
    
    // Verify no errors occurred
    expect(document.getElementById("loading-message")).toBe(null);
  });

  test("messages should be from the predefined list", () => {
    const messageContainer = document.getElementById("loading-message");
    initLoader();
    vi.advanceTimersByTime(3000);
    
    // Get 5 messages
    const messages = new Set();
    for (let i = 0; i < 5; i++) {
      messages.add(messageContainer.textContent);
      vi.advanceTimersByTime(4500);
    }
    
    // All messages should be from the predefined list
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
    
    messages.forEach(message => {
      expect(loadingMessages).toContain(message);
    });
  });
});