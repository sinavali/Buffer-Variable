/**
 * Demonstrates buffer-variables usage in a browser environment.
 * Uses the UMD build to encode/decode data and display it in the DOM.
 *
 * @module browser-example
 * @requires buffer-variables
 */

import { View } from 'buffer-variables';

/**
 * Sample data structure for testing.
 * Represents a user profile.
 */
interface UserProfile {
  username: string;
  level: number;
  achievements: boolean[];
}

/**
 * Main function for the browser example.
 * Creates a View, encodes data to a SharedArrayBuffer, and updates the DOM.
 */
function main(): void {
  // Initial user profile
  const initialData: UserProfile = {
    username: 'PlayerOne',
    level: 5,
    achievements: [true, false, true],
  };

  // Create View
  const view = View.createView(initialData, { mutable: true });

  // Allocate SharedArrayBuffer
  const sab = new SharedArrayBuffer(view.byteSize);
  view.encode(initialData, sab);

  // Display initial state
  const output = document.createElement('pre');
  document.body.appendChild(output);
  output.textContent = JSON.stringify(view.decode(sab), null, 2);

  // Add update button
  const button = document.createElement('button');
  button.textContent = 'Level Up';
  button.onclick = () => {
    view.set('level', initialData.level + 1, sab);
    output.textContent = JSON.stringify(view.decode(sab), null, 2);
    initialData.level++;
  };
  document.body.appendChild(button);
}

// Run when DOM is loaded
document.addEventListener('DOMContentLoaded', main);