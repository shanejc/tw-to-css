/**
 * Node.js-specific type definitions for tw-to-css
 * Includes build-time processing functionality
 */

import { CSSProperties } from "react";

// Re-export everything from main index
export * from './index';

// Build-time processing types and functions
export interface BuildTimeOptions {
  css: string;
  classes?: string[];
  context?: CSSContext;
  resolveVariables?: boolean;
}

export interface BuildTimeClassMap {
  [className: string]: CSSProperties | null;
}

export declare function generateClassMap(options: BuildTimeOptions): Promise<BuildTimeClassMap>;
export declare function saveClassMap(classMap: BuildTimeClassMap, outputPath: string): Promise<void>;
export declare function loadClassMap(inputPath: string): Promise<BuildTimeClassMap>;

// Node.js-specific runtime functions
export declare function createRuntimeFromFile(classMapPath: string): Promise<TailwindRuntime>;

// Re-export types from main index for convenience
export type { CSSContext, RuntimeClassMap, RuntimeOptions, TailwindRuntime } from './index';

