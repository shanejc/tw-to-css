/**
 * Proper Tailwind v4 CSS variable resolution using the official API
 */

// Type for the design system (based on Tailwind v4 types)
interface DesignSystem {
  resolveThemeValue(path: string, forceInline?: boolean): string | undefined;
  candidatesToCss(classes: string[]): (string | null)[];
}

/**
 * Resolves calc() expressions using Lightning CSS transform
 */
async function resolveCalcExpressions(css: string): Promise<string> {
  // If there are no calc expressions, return as-is
  if (!css.includes('calc(')) {
    return css;
  }
  
  // First, use our fallback to resolve mixed-unit expressions that Lightning CSS can't handle
  let resolvedCSS = fallbackCalcResolution(css);
  
  try {
    // Only try Lightning CSS in Node.js environment for remaining calc expressions
    if (typeof process !== 'undefined' && process.versions?.node && resolvedCSS.includes('calc(')) {
      try {
        // Use eval to prevent bundlers from trying to analyze this import
        const lightningCSS = await (new Function('return import("lightningcss")')());
        const { transform } = lightningCSS;
        
        // Use Lightning CSS to resolve remaining same-unit calc expressions
        const result = transform({
          code: Buffer.from(resolvedCSS),
          minify: false,
          targets: {
            // Target modern browsers that support all CSS features
            chrome: 90 << 16,
          }
        });
        
        return result.code.toString();
      } catch (lightningError) {
        // Lightning CSS not available or failed, return what we have
        console.warn('Lightning CSS not available, using fallback-only calc resolution');
        return resolvedCSS;
      }
    } else {
      // In browser environment or no remaining calc expressions, return fallback result
      return resolvedCSS;
    }
  } catch (error) {
    // If anything fails, return fallback result
    console.warn('Lightning CSS calc resolution failed, using fallback result:', (error as any)?.message);
    return resolvedCSS;
  }
}

/**
 * Fallback calc resolution for when Lightning CSS is not available
 */
function fallbackCalcResolution(css: string): string {
  let resolvedCSS = css;
  
  // Handle calc(infinity * 1px) and similar infinity expressions
  resolvedCSS = resolvedCSS.replace(/calc\([^)]*infinity[^)]*\)/g, '9999px');
  
  // Handle calc expressions
  try {
    // Replace calc(1.5 / 1) -> 1.5
    resolvedCSS = resolvedCSS.replace(/calc\(([0-9.]+)\s*\/\s*([0-9.]+)\)/g, (match, num1, num2) => {
      const result = parseFloat(num1) / parseFloat(num2);
      return result.toString();
    });
    
    // Handle mixed unit arithmetic (rem/em + px) - assume 1rem = 16px
    // calc(.25rem - 4px) -> calc(4px - 4px) -> 0
    resolvedCSS = resolvedCSS.replace(/calc\(([0-9.]+)(rem|em)\s*-\s*([0-9.]+)px\)/g, (match, remValue, remUnit, pxValue) => {
      const remInPx = parseFloat(remValue) * 16; // Convert rem to px
      const result = remInPx - parseFloat(pxValue);
      return result === 0 ? '0' : `${result}px`;
    });
    
    // calc(.25rem + 4px) -> calc(4px + 4px) -> 8px
    resolvedCSS = resolvedCSS.replace(/calc\(([0-9.]+)(rem|em)\s*\+\s*([0-9.]+)px\)/g, (match, remValue, remUnit, pxValue) => {
      const remInPx = parseFloat(remValue) * 16; // Convert rem to px
      const result = remInPx + parseFloat(pxValue);
      return `${result}px`;
    });
    
    // calc(4px - .25rem) -> calc(4px - 4px) -> 0
    resolvedCSS = resolvedCSS.replace(/calc\(([0-9.]+)px\s*-\s*([0-9.]+)(rem|em)\)/g, (match, pxValue, remValue, remUnit) => {
      const remInPx = parseFloat(remValue) * 16; // Convert rem to px
      const result = parseFloat(pxValue) - remInPx;
      return result === 0 ? '0' : `${result}px`;
    });
    
    // calc(4px + .25rem) -> calc(4px + 4px) -> 8px
    resolvedCSS = resolvedCSS.replace(/calc\(([0-9.]+)px\s*\+\s*([0-9.]+)(rem|em)\)/g, (match, pxValue, remValue, remUnit) => {
      const remInPx = parseFloat(remValue) * 16; // Convert rem to px
      const result = parseFloat(pxValue) + remInPx;
      return `${result}px`;
    });
    
    // Replace calc(8px - 4px) -> 4px (same units only)
    resolvedCSS = resolvedCSS.replace(/calc\(([0-9.]+)(px|rem|em|%)\s*-\s*([0-9.]+)\2\)/g, (match, num1, unit, num2) => {
      const result = parseFloat(num1) - parseFloat(num2);
      return result === 0 ? '0' : `${result}${unit}`;
    });
    
    // Replace calc(4px + 8px) -> 12px (same units only)
    resolvedCSS = resolvedCSS.replace(/calc\(([0-9.]+)(px|rem|em|%)\s*\+\s*([0-9.]+)\2\)/g, (match, num1, unit, num2) => {
      const result = parseFloat(num1) + parseFloat(num2);
      return `${result}${unit}`;
    });
  } catch (error) {
    // If fallback fails, return original
  }
  
  return resolvedCSS;
}

/**
 * Resolves CSS variables in a CSS string using Tailwind's official resolveThemeValue API
 * and @property rule parsing
 */
export async function resolveCSSVariables(css: string, designSystem: DesignSystem): Promise<string> {
  // First, extract @property rules to get initial values for CSS custom properties
  const propertyValues = new Map<string, string>();
  const propertyRegex = /@property\s+(--[^{]+)\s*\{[^}]*initial-value:\s*([^;}]+)[^}]*\}/g;
  
  let propertyMatch;
  while ((propertyMatch = propertyRegex.exec(css)) !== null) {
    const propertyName = propertyMatch[1].trim();
    const initialValue = propertyMatch[2].trim().replace(/['"]/g, ''); // Remove quotes
    propertyValues.set(propertyName, initialValue);
  }
  
  // Match all var() expressions in the CSS
  // Regex to match: var(--variable-name) or var(--variable-name, --fallback-name)
  const varRegex = /var\((--[^,)]+)(?:,\s*(--[^)]+))?\)/g;
  
  let resolvedCSS = css.replace(varRegex, (match, primaryVar, fallbackVar) => {
    // Try to resolve the primary variable using Tailwind's theme API first
    const primaryValue = designSystem.resolveThemeValue(primaryVar);
    if (primaryValue !== undefined) {
      return primaryValue;
    }
    
    // If not found in theme, check @property rules
    const propertyValue = propertyValues.get(primaryVar);
    if (propertyValue !== undefined) {
      return propertyValue;
    }
    
    // If primary fails and there's a fallback, try the fallback
    if (fallbackVar) {
      const fallbackValue = designSystem.resolveThemeValue(fallbackVar);
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }
      
      // Also check fallback in @property rules
      const fallbackPropertyValue = propertyValues.get(fallbackVar);
      if (fallbackPropertyValue !== undefined) {
        return fallbackPropertyValue;
      }
    }
    
    // If neither resolves, return the original var() expression
    // This maintains compatibility with CSS that might be valid in other contexts
    return match;
  });
  
  // After resolving variables, resolve calc() expressions using Lightning CSS
  return await resolveCalcExpressions(resolvedCSS);
}

/**
 * Resolves CSS variables in CSS declarations for JSON output
 */
export async function resolveCSSVariablesInDeclarations(declarations: Record<string, any>, designSystem: DesignSystem): Promise<Record<string, any>> {
  const resolved: Record<string, any> = {};
  
  for (const [property, value] of Object.entries(declarations)) {
    if (typeof value === 'string' && value.includes('var(')) {
      resolved[property] = await resolveCSSVariables(value, designSystem);
    } else if (typeof value === 'object' && value !== null) {
      // Handle nested objects (like media queries)
      resolved[property] = await resolveCSSVariablesInDeclarations(value, designSystem);
    } else {
      resolved[property] = value;
    }
  }
  
  return resolved;
}
