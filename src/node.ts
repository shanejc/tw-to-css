/**
 * Node.js-specific exports for tw-to-css
 * This includes build-time processing functionality that requires Node.js built-ins
 */

// Re-export everything from the main index
export * from './index';

// Build-time processing exports (Node.js only)
export { 
  generateClassMap, 
  saveClassMap, 
  loadClassMap,
  type BuildTimeOptions,
  type ClassMap as BuildTimeClassMap
} from './build-time';

// Node.js-specific runtime exports
export { 
  createRuntimeFromFile
} from './runtime';

