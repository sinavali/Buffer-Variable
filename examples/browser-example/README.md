# Browser Example

## Overview
This example demonstrates using the `buffer-variables` package in a browser with the UMD build. It creates a `SharedArrayBuffer` to store a `UserProfile` object, encodes it using the `View` class, and updates the DOM when the user levels up. Requires cross-origin isolation for `SharedArrayBuffer`.

## Files
- `browser-example.ts`: The main script for encoding/decoding and DOM interaction.
- `index.html`: The HTML file to load the UMD build and script.

## Setup
1. Ensure cross-origin isolation headers:
   ```bash
   npx http-server -p 8080 --coep require-corp --coop same-origin
   ```
2. Build the package:
   ```bash
   cd P:\buffer-variables
   npm run build
   ```
3. Compile the example:
   ```bash
   cd examples/browser-example
   tsc browser-example.ts --module esnext --target es2020
   ```
4. Serve and open `http://localhost:8080/examples/browser-example`.

## What Happens
1. Creates a `View` for a `UserProfile` object (`username`, `level`, `achievements`).
2. Allocates a SAB and encodes the initial data.
3. Displays the decoded data in a `<pre>` element.
4. Adds a "Level Up" button to increment `level` and update the DOM.

## Expected Output
- Initial DOM display:
  ```json
  {
    "username": "PlayerOne",
    "level": 5,
    "achievements": [true, false, true]
  }
  ```
- After clicking "Level Up":
  ```json
  {
    "username": "PlayerOne",
    "level": 6,
    "achievements": [true, false, true]
  }
  ```

## Features Demonstrated
- **Schema Inference**: Infers schema for `UserProfile`.
- **Encoding/Decoding**: Serializes/deserializes data to/from SAB.
- **Mutation**: Updates `level` using `view.set`.
- **Browser Compatibility**: Uses UMD build with cross-origin isolation.