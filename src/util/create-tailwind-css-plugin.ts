import { AcceptedPlugin } from "postcss";
import { TAILWIND_V4_CSS } from "./tailwind-v4-css";
import { resolveCSSVariables } from "./tailwind-variable-resolver";

export const createTailwindcssPlugin = (props: {
  inputCSS?: string;
  content: string;
}): AcceptedPlugin => {
  return {
    postcssPlugin: 'tw-to-css-v4',
    async Once(root, { result }) {
      try {
        // Extract individual classes from the content string
        const candidates = props.content.split(/\s+/).filter(Boolean);
        
        // Import Tailwind v4 API
        const { __unstable__loadDesignSystem, compile } = await import('tailwindcss');
        
        let inputCSS = props.inputCSS;
        
        // If no CSS provided, try to load from Tailwind package or use bundled fallback
        if (!inputCSS) {
          // Try to load CSS directly from the package first (most reliable)
          if (typeof process !== 'undefined' && process.versions?.node) {
            try {
              const { readFileSync } = await import('fs');
              const { join, dirname } = await import('path');
              const { createRequire } = await import('module') as any;
              
              let require;
              try {
                require = createRequire(import.meta.url);
              } catch {
                require = createRequire(process.cwd() + '/package.json');
              }
              
              const tailwindPath = dirname(require.resolve('tailwindcss/package.json'));
              inputCSS = readFileSync(join(tailwindPath, 'index.css'), 'utf8');
            } catch (error: any) {
              // Silently fall back to bundled CSS
            }
          }
          
          // Fallback to bundled CSS if direct loading failed
          if (!inputCSS) {
            // Using bundled CSS as fallback
            inputCSS = TAILWIND_V4_CSS;
            if (!inputCSS) {
              throw new Error('No CSS available - provide inputCSS or ensure Tailwind v4 is installed');
            }
          }
        }
        
        // Check if inputCSS contains @apply directives or custom classes
        const hasCustomCSS = inputCSS.includes('@apply') || inputCSS.includes('@layer components');
        
        if (hasCustomCSS) {
          // Process the full CSS through Tailwind's compile API to resolve @apply directives
          const loadStylesheet = async (id: string, base: string) => {
            if (id === 'tailwindcss') {
              return { 
                path: id,
                base,
                content: TAILWIND_V4_CSS || inputCSS
              };
            }
            throw new Error(`Unknown stylesheet: ${id}`);
          };
          
          // Use Tailwind's compile API to process the CSS and resolve @apply directives
          const compiler = await compile(inputCSS, { loadStylesheet });
          
          // The compile API returns an object with a build() method
          // We need to call build() with the candidates to get the actual CSS
          const compiledCSS = compiler.build(candidates);
          
          // Extract CSS for the requested classes from the compiled result
          const extractedCSS = extractClassesFromProcessedCSS(compiledCSS, candidates);
          
          if (extractedCSS) {
            root.removeAll();
            root.append(extractedCSS);
            return;
          }
        }
        
        // Fallback to candidatesToCss for utility classes
        const loadStylesheet = async (id: string, base: string) => {
          if (id === 'tailwindcss') {
            // Try different approaches to get the complete Tailwind CSS
            
            // In Node.js environment, try to load from node_modules
            if (typeof process !== 'undefined' && process.versions?.node) {
              try {
                const fs = require('fs');
                const path = require('path');
                const module = require('module');
                
                // Create require function for resolving tailwindcss
                const createRequire = module.createRequire || module.createRequireFromPath;
                const requireResolve = createRequire(process.cwd() + '/package.json');
                
                const tailwindPath = path.dirname(requireResolve.resolve('tailwindcss/package.json'));
                const realTailwindCSS = fs.readFileSync(path.join(tailwindPath, 'index.css'), 'utf8');
                return { 
                  path: id,
                  base,
                  content: realTailwindCSS 
                };
              } catch (error: any) {
                console.warn('Could not load Tailwind CSS from node_modules:', (error as any)?.message);
              }
            }
            
            // Fallback to bundled Tailwind CSS
            return { 
              path: id,
              base,
              content: TAILWIND_V4_CSS 
            };
          }
          if (id === 'tw-animate-css') {
            // Return empty CSS for tw-animate-css since we don't need animations for Satori
            return { 
              path: id,
              base,
              content: '/* tw-animate-css not needed for Satori */' 
            };
          }
          throw new Error(`Unknown stylesheet: ${id}`);
        };
        
        const designSystem = await __unstable__loadDesignSystem(inputCSS, { loadStylesheet });
        
        const cssResults = designSystem.candidatesToCss(candidates);
        
        // Combine all valid CSS results as complete CSS rules
        const validCssRules = cssResults.filter(css => css !== null);
        
        if (validCssRules.length > 0) {
          root.removeAll();
          
          // Apply proper Tailwind v4 variable resolution to each CSS rule
          const resolvedCssRules = await Promise.all(validCssRules.map(async css => {
            // Use Tailwind's official resolveThemeValue API to resolve CSS variables
            return await resolveCSSVariables(css, designSystem);
          }));
          
          const combinedCSS = resolvedCssRules.join('\n');
          root.append(combinedCSS);
        }
        
      } catch (error: any) {
        console.error('Tailwind v4 CSS processing failed:', (error as any)?.message || error);
        throw new Error(`Tailwind v4 processing failed: ${(error as any)?.message || error}`);
      }
    }
  } as AcceptedPlugin;
};

/**
 * Extract CSS rules for specific classes from processed CSS
 */
function extractClassesFromProcessedCSS(processedCSS: string, classNames: string[]): string | null {
  const extractedRules: string[] = [];
  
  for (const className of classNames) {
    // Create a regex to match the class selector and its rules, including nested content
    // This handles both simple rules and complex nested rules with media queries, pseudo-selectors, etc.
    const escapedClassName = escapeRegExp(className);
    
    // Look for the class definition and capture everything until the matching closing brace
    let startIndex = processedCSS.indexOf(`.${className} {`);
    if (startIndex === -1) {
      // Try with different whitespace patterns
      const classRegex = new RegExp(`\\.${escapedClassName}\\s*{`, 'g');
      const match = classRegex.exec(processedCSS);
      if (match) {
        startIndex = match.index;
      }
    }
    
    if (startIndex !== -1) {
      // Find the matching closing brace by counting braces
      let braceCount = 0;
      let endIndex = startIndex;
      let inRule = false;
      
      for (let i = startIndex; i < processedCSS.length; i++) {
        const char = processedCSS[i];
        if (char === '{') {
          braceCount++;
          inRule = true;
        } else if (char === '}') {
          braceCount--;
          if (inRule && braceCount === 0) {
            endIndex = i + 1;
            break;
          }
        }
      }
      
      if (endIndex > startIndex) {
        const ruleCSS = processedCSS.substring(startIndex, endIndex);
        extractedRules.push(ruleCSS);
      }
    }
  }
  
  return extractedRules.length > 0 ? extractedRules.join('\n') : null;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
