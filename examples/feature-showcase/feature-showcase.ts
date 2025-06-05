/**
 * Showcases advanced features of buffer-variables.
 * Demonstrates diff/patch, low-level APIs, and schema updates in Node.js.
 *
 * @module feature-showcase
 * @requires buffer-variables
 */

import { View, diff, applyPatch } from 'buffer-variables';

/**
 * Sample data structure for testing.
 * Represents a project task.
 */
interface Task {
  title: string;
  priority: number;
  tags: Uint8Array;
}

/**
 * Main function for the feature showcase.
 * Tests diff/patch, low-level APIs, and schema updates.
 */
function main(): void {
  const initialData: Task = {
    title: 'Complete Project',
    priority: 3,
    tags: new Uint8Array([1, 2]),
  };

  // Create View with low-level API
  const view = View.createView(initialData, { mutable: true, exposedLowLevelApi: true });
  const sab = new SharedArrayBuffer(view.byteSize);
  view.encode(initialData, sab);

  // Diff/Patch
  const newData: Task = {
    title: 'Complete Project v2',
    priority: 4,
    tags: new Uint8Array([1, 2, 3]),
  };
  const patches = diff(view, sab, newData);
  console.log('Diff patches:', patches);

  patches.forEach(patch => applyPatch(view, sab, patch));
  console.log('After patch:', view.decode(sab));

  // Low-Level API
  const lowLevel = view.getLowLevel()!;
  const titleOffset = lowLevel.resolvePath('title').offset;
  const rawTitle = lowLevel.readRaw(titleOffset, 'String', sab);
  console.log('Raw title read:', rawTitle);

  lowLevel.writeRaw(titleOffset, 'String', 'Final Project', sab);
  console.log('After raw write:', view.decode(sab));

  // Schema Update
  view.schemaUpdate('priority', 5, sab);
  console.log('After schema update:', view.decode(sab));

  // Export Schema
  const schemaJson = view.exportSchema();
  console.log('Exported schema size:', schemaJson.length);
}

main();