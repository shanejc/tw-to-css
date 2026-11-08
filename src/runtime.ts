/**
 * Lightweight runtime for build-time processed class maps
 * This provides the same API as the traditional tw-to-css but with pre-resolved styles
 */

import { CSSProperties } from 'react';

export interface ClassMap {
  [className: string]: CSSProperties | null;
}

export interface RuntimeOptions {
  /** Pre-generated class map from build-time processing */
  classMap: ClassMap;
}

/**
 * Create runtime functions from a pre-generated class map
 */
export function createRuntime(options: RuntimeOptions) {
  const { classMap } = options;
  
  /**
   * Get CSS properties for a class (JSON format)
   * @param className - The class name to look up
   * @returns CSS properties object or null if not found
   */
  const twj = (className: string): CSSProperties | null => {
    return classMap[className] || null;
  };
  
  /**
   * Get CSS string for a class (inline format)
   * @param className - The class name to look up
   * @returns CSS string or empty string if not found
   */
  const twi = (className: string): string => {
    const styles = classMap[className];
    if (!styles || typeof styles !== 'object') {
      return '';
    }
    
    return Object.entries(styles)
      .map(([property, value]) => {
        // Convert camelCase back to kebab-case for CSS
        const cssProperty = property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
        return `${cssProperty}: ${value}`;
      })
      .join('; ');
  };
  
  /**
   * Get CSS properties for multiple classes (merged)
   * @param classNames - Array of class names or space-separated string
   * @returns Merged CSS properties object
   */
  const twjMultiple = (classNames: string[] | string): CSSProperties => {
    const classes = Array.isArray(classNames) 
      ? classNames 
      : classNames.split(/\s+/).filter(Boolean);
    
    const merged: CSSProperties = {};
    
    for (const className of classes) {
      const styles = classMap[className];
      if (styles && typeof styles === 'object') {
        Object.assign(merged, styles);
      }
    }
    
    return merged;
  };
  
  /**
   * Get CSS string for multiple classes (merged)
   * @param classNames - Array of class names or space-separated string
   * @returns Merged CSS string
   */
  const twiMultiple = (classNames: string[] | string): string => {
    const merged = twjMultiple(classNames);
    
    return Object.entries(merged)
      .map(([property, value]) => {
        const cssProperty = property.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
        return `${cssProperty}: ${value}`;
      })
      .join('; ');
  };
  
  /**
   * Check if a class exists in the map
   * @param className - The class name to check
   * @returns true if class exists (even if null), false if not found
   */
  const hasClass = (className: string): boolean => {
    return className in classMap;
  };
  
  /**
   * Get all available class names
   * @returns Array of all class names in the map
   */
  const getAvailableClasses = (): string[] => {
    return Object.keys(classMap);
  };
  
  /**
   * Get statistics about the class map
   * @returns Object with statistics
   */
  const getStats = () => {
    const total = Object.keys(classMap).length;
    const resolved = Object.values(classMap).filter(v => v !== null).length;
    const nullClasses = total - resolved;
    
    return {
      totalClasses: total,
      resolvedClasses: resolved,
      nullClasses,
      resolvedPercentage: Math.round((resolved / total) * 100)
    };
  };
  
  return {
    twj,
    twi,
    twjMultiple,
    twiMultiple,
    hasClass,
    getAvailableClasses,
    getStats
  };
}

/**
 * Create a runtime from a JSON file (for use in build tools - Node.js only)
 */
export async function createRuntimeFromFile(classMapPath: string) {
  const { readFileSync } = await import('fs');
  const classMapContent = readFileSync(classMapPath, 'utf8');
  const classMap: ClassMap = JSON.parse(classMapContent);
  
  return createRuntime({ classMap });
}

/**
 * Type definitions for the runtime functions
 */
export interface TailwindRuntime {
  twj: (className: string) => CSSProperties | null;
  twi: (className: string) => string;
  twjMultiple: (classNames: string[] | string) => CSSProperties;
  twiMultiple: (classNames: string[] | string) => string;
  hasClass: (className: string) => boolean;
  getAvailableClasses: () => string[];
  getStats: () => {
    totalClasses: number;
    resolvedClasses: number;
    nullClasses: number;
    resolvedPercentage: number;
  };
}
