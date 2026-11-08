import { resolveCSSVariables } from './tailwind-variable-resolver';

/**
 * Context-aware CSS selector resolution for Satori compatibility
 */

export interface CSSContext {
  /** 
   * Variant context: map of variant names to boolean values
   * - true: resolve this variant (include its styles)
   * - false/undefined: skip this variant (exclude its styles)
   * 
   * Examples:
   * - 'dark': true           // Resolve dark: variants
   * - 'hover': false         // Skip hover: variants
   * - 'lg': true             // Resolve lg: breakpoint
   * - 'focus': false         // Skip focus: variants
   * - 'group-hover': true    // Resolve group-hover: variants
   * - 'data-[state=open]': true  // Custom arbitrary variants
   */
  [variantName: string]: boolean;
}

/**
 * Resolves nested CSS selectors based on context, flattening them for Satori
 */
export function resolveContextualCSS(
  cssObject: Record<string, any>, 
  context: CSSContext = {}
): Record<string, any> {
  const flattenedProperties: Record<string, any> = {};
  
  // Helper to check if a selector matches the current context
  function matchesContext(selector: string): boolean {
    // Base properties (no @ or & prefixes) - always include
    if (!selector.startsWith('@') && !selector.startsWith('&')) {
      return true;
    }
    
    // Check each variant in context to see if this selector matches
    for (const [variantName, shouldInclude] of Object.entries(context)) {
      if (shouldInclude && selectorMatchesVariant(selector, variantName)) {
        return true;
      }
    }
    
    // Default: exclude conditional selectors that don't match any active variants
    return false;
  }
  
  // Helper to check if a CSS selector matches a specific variant
  function selectorMatchesVariant(selector: string, variantName: string): boolean {
    // Handle different types of selectors that Tailwind generates
    
    // Responsive breakpoints: @media (width >= XXrem)
    if (variantName === 'sm' && selector.includes('width >= 40rem')) return true;
    if (variantName === 'md' && selector.includes('width >= 48rem')) return true;
    if (variantName === 'lg' && selector.includes('width >= 64rem')) return true;
    if (variantName === 'xl' && selector.includes('width >= 80rem')) return true;
    if (variantName === '2xl' && selector.includes('width >= 96rem')) return true;
    
    // Dark mode: @media (prefers-color-scheme: dark) or &:is(.dark *)
    if (variantName === 'dark' && (
      selector.includes('prefers-color-scheme: dark') || 
      selector.includes('&:is(.dark *)') ||
      selector.includes(':is(.dark *)')
    )) {
      return true;
    }
    
    // Pseudo-classes: &:hover, &:focus, etc.
    if (selector.includes(`:${variantName}`)) {
      return true;
    }
    
    // Media queries for interaction: @media (hover: hover)
    if (variantName === 'hover' && selector.includes('hover: hover')) {
      return true;
    }
    
    // Group variants: &:is(:hover *), &:is(:focus *), etc.
    if (variantName.startsWith('group-')) {
      const groupState = variantName.replace('group-', '');
      if (selector.includes(`:is(:${groupState} *)`)) {
        return true;
      }
    }
    
    // Arbitrary variants: data-[state=open], aria-[expanded=true], etc.
    // These would appear as attribute selectors in CSS
    if (variantName.includes('[') && variantName.includes(']')) {
      // Convert variant name to CSS selector format
      const attributeSelector = variantName.replace(/[[\]]/g, '\\$&');
      if (selector.includes(attributeSelector)) {
        return true;
      }
    }
    
    // Generic fallback: check if variant name appears in selector
    // This handles most custom variants
    if (selector.includes(variantName)) {
      return true;
    }
    
    return false;
  }
  
  // Recursively process CSS object
  function processProperties(obj: Record<string, any>, currentSelector = '') {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // This is a nested selector
        const nestedSelector = key;
        
        if (matchesContext(nestedSelector)) {
          // Flatten matching selectors into base properties
          processProperties(value, nestedSelector);
        }
        // If it doesn't match context, skip this branch
      } else {
        // This is a CSS property - add it to flattened properties
        flattenedProperties[key] = value;
      }
    }
  }
  
  processProperties(cssObject);
  
  // If no properties were extracted (all were conditional and didn't match context),
  // return an empty object to indicate this class should be excluded
  return flattenedProperties;
}

/**
 * Enhanced CSS variable resolver that also handles contextual selectors
 */
export async function resolveContextualCSSVariables(
  css: string, 
  designSystem: any, 
  context: CSSContext = {}
): Promise<Record<string, any>> {
  // First, resolve CSS variables (existing logic)
  const resolvedCSS = await resolveCSSVariables(css, designSystem);
  
  // Then, parse to CSS object and resolve context
  const postcss = require('postcss');
  const postcssJs = require('postcss-js');
  
  const root = postcss.parse(resolvedCSS);
  const cssObject = postcssJs.objectify(root);
  
  return resolveContextualCSS(cssObject, context);
}
