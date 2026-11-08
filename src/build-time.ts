/**
 * Build-time CSS processing for tw-to-css
 * Generates a pre-resolved class-to-styles mapping for optimal runtime performance
 */

// Note: Node.js built-ins are imported dynamically to avoid bundling issues
import postcss from 'postcss';
import postcssJs from 'postcss-js';
import { resolveCSSVariables } from './util/tailwind-variable-resolver';
import { resolveContextualCSS, CSSContext } from './util/context-resolver';

// Dynamic require creation for Node.js environments
const createDynamicRequire = async () => {
  const { createRequire } = await import('module');
  return createRequire(import.meta.url);
};

export interface BuildTimeOptions {
  /** Input CSS with @import "tailwindcss" and custom styles */
  css: string;
  /** Classes to include in the generated map. If not provided, includes common utilities */
  classes?: string[];
  /** Context for resolving conditional selectors (dark mode, hover, etc.) */
  context?: CSSContext;
  /** Whether to resolve CSS variables to actual values */
  resolveVariables?: boolean;
}

export interface ClassMap {
  [className: string]: Record<string, any> | null;
}

/**
 * Generate a comprehensive class-to-styles mapping at build time
 */
export async function generateClassMap(options: BuildTimeOptions): Promise<ClassMap> {
  const { css, classes, context = {}, resolveVariables = true } = options;
  
  try {
    // Load Tailwind v4 design system
    const { __unstable__loadDesignSystem } = await import('tailwindcss');
    
    // Load stylesheet function for @import resolution
    const loadStylesheet = async (id: string, base: string) => {
      if (id === 'tailwindcss') {
        try {
          // Try to load real Tailwind CSS from node_modules
          const { readFileSync } = await import('fs');
          const { dirname, join } = await import('path');
          const require = await createDynamicRequire();
          
          const tailwindPath = dirname(require.resolve('tailwindcss/package.json'));
          const realTailwindCSS = readFileSync(join(tailwindPath, 'index.css'), 'utf8');
          return { path: id, base, content: realTailwindCSS };
        } catch (error) {
          // Fallback to bundled CSS
          const { TAILWIND_V4_CSS } = await import('./util/tailwind-v4-css');
          return { path: id, base, content: TAILWIND_V4_CSS };
        }
      }
      if (id === 'tw-animate-css') {
        return { path: id, base, content: '/* animations not needed for build-time */' };
      }
      throw new Error(`Unknown stylesheet: ${id}`);
    };
    
    const designSystem = await __unstable__loadDesignSystem(css, { loadStylesheet });
    
    // Determine classes to process
    const classesToProcess = classes || await getComprehensiveClassList(designSystem, css);
    
    console.log(`Processing ${classesToProcess.length} classes at build time...`);
    
    const classMap: ClassMap = {};
    let processed = 0;
    
    for (const className of classesToProcess) {
      try {
        // Get CSS for this class from Tailwind
        const cssResults = designSystem.candidatesToCss([className]);
        let rawCSS = cssResults[0];
        
        if (rawCSS) {
          // Apply variable resolution if requested
          if (resolveVariables) {
            rawCSS = await resolveCSSVariables(rawCSS, designSystem);
          }
          
          // Convert CSS to object
          const root = postcss.parse(rawCSS);
          const cssObject = postcssJs.objectify(root);
          
          // Apply context resolution (flatten conditional selectors)
          const resolvedStyles = resolveContextualCSS(cssObject, context);
          
          if (resolvedStyles && Object.keys(resolvedStyles).length > 0) {
            classMap[className] = resolvedStyles;
          } else {
            classMap[className] = null; // Class found but no matching styles in context
          }
        } else {
          // Check if it's a custom class by processing the full CSS
          const fullProcessor = postcss();
          const fullResult = await fullProcessor.process(css, { from: undefined });
          
          // Look for the class in the full CSS output
          if (fullResult.css.includes(`.${className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)) {
            // Extract and process the custom class
            const customCSS = extractCustomClass(fullResult.css, className);
            if (customCSS) {
              let processedCSS = customCSS;
              if (resolveVariables) {
                processedCSS = await resolveCSSVariables(processedCSS, designSystem);
              }
              
              const customRoot = postcss.parse(processedCSS);
              const customObject = postcssJs.objectify(customRoot);
              const customResolved = resolveContextualCSS(customObject, context);
              
              if (customResolved && Object.keys(customResolved).length > 0) {
                classMap[className] = customResolved;
              } else {
                classMap[className] = null;
              }
            } else {
              classMap[className] = null;
            }
          } else {
            classMap[className] = null; // Class not found
          }
        }
        
        processed++;
        if (processed % 50 === 0) {
          console.log(`Processed ${processed}/${classesToProcess.length} classes...`);
        }
      } catch (error: any) {
        console.warn(`Failed to process class "${className}":`, error?.message);
        classMap[className] = null;
      }
    }
    
    console.log(`✅ Build-time processing complete! Generated map for ${processed} classes.`);
    
    return classMap;
    
  } catch (error: any) {
    console.error('Build-time class map generation failed:', error?.message || error);
    throw error;
  }
}

/**
 * Extract CSS for a specific custom class from full CSS output
 */
function extractCustomClass(fullCSS: string, className: string): string | null {
  const escapedClassName = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const classRegex = new RegExp(`\\.${escapedClassName}\\s*\\{[^}]+\\}`, 'g');
  const matches = fullCSS.match(classRegex);
  return matches ? matches.join('\n') : null;
}

/**
 * Get a comprehensive list of classes including both variable/calc classes and commonly used classes
 */
async function getComprehensiveClassList(designSystem: any, inputCSS: string): Promise<string[]> {
  console.log('🔍 Building comprehensive class list...');
  
  // Start with classes that have variables/calc (high value for build-time)
  const varCalcClasses = await getVariableAndCalcClasses(designSystem, inputCSS);
  
  // Add commonly used classes that might not have variables but are still valuable to cache
  const commonClasses = getCommonTailwindClasses();
  
  // Combine and deduplicate
  const allClasses = new Set([...varCalcClasses, ...commonClasses]);
  
  console.log(`📊 Comprehensive class list: ${varCalcClasses.length} var/calc + ${commonClasses.length} common = ${allClasses.size} total`);
  
  return Array.from(allClasses);
}

/**
 * Get classes that contain CSS variables or calc expressions (the main benefit of build-time processing)
 */
async function getVariableAndCalcClasses(designSystem: any, inputCSS: string): Promise<string[]> {
  console.log('🔍 Scanning for classes with variables and calc expressions...');
  
  const classesWithVarsOrCalc = new Set<string>();
  
  // Test a comprehensive set of Tailwind classes to find ones with vars/calc
  const testClasses = [
    // Spacing (often uses calc and variables)
    ...Array.from({length: 20}, (_, i) => `p-${i}`),
    ...Array.from({length: 20}, (_, i) => `m-${i}`),
    ...Array.from({length: 20}, (_, i) => `px-${i}`),
    ...Array.from({length: 20}, (_, i) => `py-${i}`),
    ...Array.from({length: 20}, (_, i) => `mx-${i}`),
    ...Array.from({length: 20}, (_, i) => `my-${i}`),
    
    // Fractional spacing (likely to have calc)
    'p-0.5', 'p-1.5', 'p-2.5', 'p-3.5', 'px-0.5', 'px-1.5', 'px-2.5', 'py-0.5', 'py-1.5', 'py-2.5',
    'm-0.5', 'm-1.5', 'm-2.5', 'm-3.5', 'mx-0.5', 'mx-1.5', 'mx-2.5', 'my-0.5', 'my-1.5', 'my-2.5',
    
    // Sizing (often uses variables)
    ...Array.from({length: 20}, (_, i) => `w-${i}`),
    ...Array.from({length: 20}, (_, i) => `h-${i}`),
    'w-0.5', 'w-1.5', 'w-2.5', 'w-3.5', 'h-0.5', 'h-1.5', 'h-2.5', 'h-3.5',
    
    // Colors (use CSS variables in v4)
    'bg-red-50', 'bg-red-100', 'bg-red-200', 'bg-red-300', 'bg-red-400', 'bg-red-500',
    'bg-blue-50', 'bg-blue-100', 'bg-blue-200', 'bg-blue-300', 'bg-blue-400', 'bg-blue-500',
    'bg-green-50', 'bg-green-100', 'bg-green-200', 'bg-green-300', 'bg-green-400', 'bg-green-500',
    'bg-gray-50', 'bg-gray-100', 'bg-gray-200', 'bg-gray-300', 'bg-gray-400', 'bg-gray-500',
    'text-red-500', 'text-blue-500', 'text-green-500', 'text-gray-500', 'text-gray-600', 'text-gray-700',
    'border-red-500', 'border-blue-500', 'border-green-500', 'border-gray-200', 'border-gray-300',
    
    // Border radius (often uses variables)
    'rounded', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full',
    
    // Shadows (use variables)
    'shadow', 'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl',
    
    // Ring (uses variables and calc)
    'ring-1', 'ring-2', 'ring-4', 'ring-8', 'ring-blue-500', 'ring-red-500',
    
    // Font sizes (use variables)
    'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl',
    
    // Line height (often calc)
    'leading-none', 'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed',
    
    // Gap (uses calc and variables)
    ...Array.from({length: 12}, (_, i) => `gap-${i}`),
    'gap-0.5', 'gap-1.5', 'gap-2.5', 'gap-3.5',
    
    // Inset (uses calc)
    ...Array.from({length: 12}, (_, i) => `inset-${i}`),
    'inset-0.5', 'inset-1.5', 'inset-2.5',
    
    // Dark mode variants (conditional, good for build-time)
    'dark:bg-gray-800', 'dark:bg-gray-900', 'dark:text-white', 'dark:text-gray-100',
    'dark:border-gray-700', 'dark:border-gray-600',
    
    // Responsive variants
    'sm:p-4', 'md:p-6', 'lg:p-8', 'sm:text-lg', 'md:text-xl',
  ];
  
  // Also extract custom classes from the input CSS
  const customClasses = extractCustomClassNames(inputCSS);
  testClasses.push(...customClasses);
  
  console.log(`Testing ${testClasses.length} classes for variables/calc...`);
  
  let checkedCount = 0;
  for (const className of testClasses) {
    try {
      const cssResults = designSystem.candidatesToCss([className]);
      const rawCSS = cssResults[0];
      
      if (rawCSS) {
        // Check if this class contains variables or calc expressions
        const hasVariables = rawCSS.includes('var(');
        const hasCalc = rawCSS.includes('calc(');
        
        if (hasVariables || hasCalc) {
          classesWithVarsOrCalc.add(className);
          if (classesWithVarsOrCalc.size <= 10) { // Log first few for debugging
            console.log(`  ✅ ${className}: ${hasVariables ? 'vars' : ''}${hasVariables && hasCalc ? '+' : ''}${hasCalc ? 'calc' : ''}`);
          }
        }
      }
      
      checkedCount++;
      if (checkedCount % 100 === 0) {
        console.log(`  Checked ${checkedCount}/${testClasses.length}, found ${classesWithVarsOrCalc.size} with vars/calc...`);
      }
    } catch (error) {
      // Ignore errors for individual classes
    }
  }
  
  const result = Array.from(classesWithVarsOrCalc);
  console.log(`🎯 Found ${result.length} classes with variables or calc expressions`);
  
  return result;
}

/**
 * Extract custom class names from CSS input
 */
function extractCustomClassNames(css: string): string[] {
  const customClasses = new Set<string>();
  
  // Match class definitions in @layer components and @layer utilities
  const classMatches = css.match(/\.([a-zA-Z][a-zA-Z0-9_-]*)\s*\{/g);
  if (classMatches) {
    classMatches.forEach(match => {
      const className = match.match(/\.([a-zA-Z][a-zA-Z0-9_-]*)/)?.[1];
      if (className) {
        customClasses.add(className);
      }
    });
  }
  
  return Array.from(customClasses);
}

/**
 * Get a comprehensive list of common Tailwind classes for build-time processing
 * (Kept for backward compatibility, but getVariableAndCalcClasses is preferred)
 */
function getCommonTailwindClasses(): string[] {
  return [
    // Display
    'block', 'inline-block', 'inline', 'flex', 'inline-flex', 'table', 'inline-table',
    'table-caption', 'table-cell', 'table-column', 'table-column-group', 'table-footer-group',
    'table-header-group', 'table-row-group', 'table-row', 'flow-root', 'grid', 'inline-grid',
    'contents', 'list-item', 'hidden',
    
    // Position
    'static', 'fixed', 'absolute', 'relative', 'sticky',
    
    // Top/Right/Bottom/Left
    'inset-0', 'inset-x-0', 'inset-y-0', 'top-0', 'right-0', 'bottom-0', 'left-0',
    'inset-1', 'inset-2', 'inset-4', 'inset-8', 'top-1', 'top-2', 'top-4', 'top-8',
    'right-1', 'right-2', 'right-4', 'right-8', 'bottom-1', 'bottom-2', 'bottom-4', 'bottom-8',
    'left-1', 'left-2', 'left-4', 'left-8',
    
    // Visibility
    'visible', 'invisible', 'collapse',
    
    // Z-Index
    'z-0', 'z-10', 'z-20', 'z-30', 'z-40', 'z-50', 'z-auto',
    
    // Flex
    'flex-1', 'flex-auto', 'flex-initial', 'flex-none',
    'flex-row', 'flex-row-reverse', 'flex-col', 'flex-col-reverse',
    'flex-wrap', 'flex-wrap-reverse', 'flex-nowrap',
    
    // Grid
    'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-6', 'grid-cols-12',
    'col-auto', 'col-span-1', 'col-span-2', 'col-span-3', 'col-span-4', 'col-span-6', 'col-span-12',
    'col-start-1', 'col-start-2', 'col-end-1', 'col-end-2',
    'grid-rows-1', 'grid-rows-2', 'grid-rows-3', 'grid-rows-4', 'grid-rows-6',
    'row-auto', 'row-span-1', 'row-span-2', 'row-span-3', 'row-start-1', 'row-end-1',
    
    // Gap
    'gap-0', 'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-5', 'gap-6', 'gap-8', 'gap-10', 'gap-12',
    'gap-x-0', 'gap-x-1', 'gap-x-2', 'gap-x-4', 'gap-x-6', 'gap-x-8',
    'gap-y-0', 'gap-y-1', 'gap-y-2', 'gap-y-4', 'gap-y-6', 'gap-y-8',
    
    // Justify Content
    'justify-normal', 'justify-start', 'justify-end', 'justify-center', 'justify-between',
    'justify-around', 'justify-evenly', 'justify-stretch',
    
    // Justify Items
    'justify-items-start', 'justify-items-end', 'justify-items-center', 'justify-items-stretch',
    
    // Justify Self
    'justify-self-auto', 'justify-self-start', 'justify-self-end', 'justify-self-center', 'justify-self-stretch',
    
    // Align Content
    'content-normal', 'content-center', 'content-start', 'content-end', 'content-between',
    'content-around', 'content-evenly', 'content-baseline', 'content-stretch',
    
    // Align Items
    'items-start', 'items-end', 'items-center', 'items-baseline', 'items-stretch',
    
    // Align Self
    'self-auto', 'self-start', 'self-end', 'self-center', 'self-stretch', 'self-baseline',
    
    // Place Content
    'place-content-center', 'place-content-start', 'place-content-end', 'place-content-between',
    'place-content-around', 'place-content-evenly', 'place-content-baseline', 'place-content-stretch',
    
    // Place Items
    'place-items-start', 'place-items-end', 'place-items-center', 'place-items-baseline', 'place-items-stretch',
    
    // Place Self
    'place-self-auto', 'place-self-start', 'place-self-end', 'place-self-center', 'place-self-stretch',
    
    // Padding
    'p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-8', 'p-10', 'p-12', 'p-16', 'p-20', 'p-24',
    'px-0', 'px-1', 'px-2', 'px-3', 'px-4', 'px-5', 'px-6', 'px-8', 'px-10', 'px-12',
    'py-0', 'py-1', 'py-2', 'py-3', 'py-4', 'py-5', 'py-6', 'py-8', 'py-10', 'py-12',
    'pt-0', 'pt-1', 'pt-2', 'pt-4', 'pt-6', 'pt-8', 'pr-0', 'pr-1', 'pr-2', 'pr-4', 'pr-6', 'pr-8',
    'pb-0', 'pb-1', 'pb-2', 'pb-4', 'pb-6', 'pb-8', 'pl-0', 'pl-1', 'pl-2', 'pl-4', 'pl-6', 'pl-8',
    
    // Margin
    'm-0', 'm-1', 'm-2', 'm-3', 'm-4', 'm-5', 'm-6', 'm-8', 'm-10', 'm-12', 'm-16', 'm-20', 'm-24', 'm-auto',
    'mx-0', 'mx-1', 'mx-2', 'mx-3', 'mx-4', 'mx-5', 'mx-6', 'mx-8', 'mx-10', 'mx-12', 'mx-auto',
    'my-0', 'my-1', 'my-2', 'my-3', 'my-4', 'my-5', 'my-6', 'my-8', 'my-10', 'my-12',
    'mt-0', 'mt-1', 'mt-2', 'mt-4', 'mt-6', 'mt-8', 'mr-0', 'mr-1', 'mr-2', 'mr-4', 'mr-6', 'mr-8',
    'mb-0', 'mb-1', 'mb-2', 'mb-4', 'mb-6', 'mb-8', 'ml-0', 'ml-1', 'ml-2', 'ml-4', 'ml-6', 'ml-8',
    
    // Width
    'w-0', 'w-1', 'w-2', 'w-3', 'w-4', 'w-5', 'w-6', 'w-8', 'w-10', 'w-12', 'w-16', 'w-20', 'w-24',
    'w-32', 'w-40', 'w-48', 'w-56', 'w-64', 'w-72', 'w-80', 'w-96',
    'w-auto', 'w-1/2', 'w-1/3', 'w-2/3', 'w-1/4', 'w-2/4', 'w-3/4', 'w-1/5', 'w-2/5', 'w-3/5', 'w-4/5',
    'w-1/6', 'w-2/6', 'w-3/6', 'w-4/6', 'w-5/6', 'w-1/12', 'w-2/12', 'w-3/12', 'w-4/12', 'w-5/12',
    'w-6/12', 'w-7/12', 'w-8/12', 'w-9/12', 'w-10/12', 'w-11/12', 'w-full', 'w-screen', 'w-min', 'w-max', 'w-fit',
    
    // Height
    'h-0', 'h-1', 'h-2', 'h-3', 'h-4', 'h-5', 'h-6', 'h-8', 'h-10', 'h-12', 'h-16', 'h-20', 'h-24',
    'h-32', 'h-40', 'h-48', 'h-56', 'h-64', 'h-72', 'h-80', 'h-96',
    'h-auto', 'h-1/2', 'h-1/3', 'h-2/3', 'h-1/4', 'h-2/4', 'h-3/4', 'h-1/5', 'h-2/5', 'h-3/5', 'h-4/5',
    'h-1/6', 'h-2/6', 'h-3/6', 'h-4/6', 'h-5/6', 'h-full', 'h-screen', 'h-min', 'h-max', 'h-fit',
    
    // Colors - Background
    'bg-inherit', 'bg-current', 'bg-transparent', 'bg-black', 'bg-white',
    'bg-slate-50', 'bg-slate-100', 'bg-slate-200', 'bg-slate-300', 'bg-slate-400', 'bg-slate-500',
    'bg-slate-600', 'bg-slate-700', 'bg-slate-800', 'bg-slate-900', 'bg-slate-950',
    'bg-gray-50', 'bg-gray-100', 'bg-gray-200', 'bg-gray-300', 'bg-gray-400', 'bg-gray-500',
    'bg-gray-600', 'bg-gray-700', 'bg-gray-800', 'bg-gray-900', 'bg-gray-950',
    'bg-red-50', 'bg-red-100', 'bg-red-200', 'bg-red-300', 'bg-red-400', 'bg-red-500',
    'bg-red-600', 'bg-red-700', 'bg-red-800', 'bg-red-900', 'bg-red-950',
    'bg-blue-50', 'bg-blue-100', 'bg-blue-200', 'bg-blue-300', 'bg-blue-400', 'bg-blue-500',
    'bg-blue-600', 'bg-blue-700', 'bg-blue-800', 'bg-blue-900', 'bg-blue-950',
    'bg-green-50', 'bg-green-100', 'bg-green-200', 'bg-green-300', 'bg-green-400', 'bg-green-500',
    'bg-green-600', 'bg-green-700', 'bg-green-800', 'bg-green-900', 'bg-green-950',
    
    // Colors - Text
    'text-inherit', 'text-current', 'text-transparent', 'text-black', 'text-white',
    'text-slate-50', 'text-slate-100', 'text-slate-200', 'text-slate-300', 'text-slate-400', 'text-slate-500',
    'text-slate-600', 'text-slate-700', 'text-slate-800', 'text-slate-900', 'text-slate-950',
    'text-gray-50', 'text-gray-100', 'text-gray-200', 'text-gray-300', 'text-gray-400', 'text-gray-500',
    'text-gray-600', 'text-gray-700', 'text-gray-800', 'text-gray-900', 'text-gray-950',
    'text-red-500', 'text-red-600', 'text-red-700', 'text-blue-500', 'text-blue-600', 'text-blue-700',
    'text-green-500', 'text-green-600', 'text-green-700',
    
    // Font Size
    'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl',
    
    // Font Weight
    'font-thin', 'font-extralight', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black',
    
    // Border
    'border-0', 'border', 'border-2', 'border-4', 'border-8',
    'border-t-0', 'border-t', 'border-t-2', 'border-t-4', 'border-t-8',
    'border-r-0', 'border-r', 'border-r-2', 'border-r-4', 'border-r-8',
    'border-b-0', 'border-b', 'border-b-2', 'border-b-4', 'border-b-8',
    'border-l-0', 'border-l', 'border-l-2', 'border-l-4', 'border-l-8',
    'border-x-0', 'border-x', 'border-x-2', 'border-y-0', 'border-y', 'border-y-2',
    
    // Border Color
    'border-inherit', 'border-current', 'border-transparent', 'border-black', 'border-white',
    'border-slate-200', 'border-slate-300', 'border-slate-400', 'border-slate-500',
    'border-gray-200', 'border-gray-300', 'border-gray-400', 'border-gray-500',
    'border-red-500', 'border-blue-500', 'border-green-500',
    
    // Border Radius
    'rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full',
    'rounded-t-none', 'rounded-t-sm', 'rounded-t', 'rounded-t-md', 'rounded-t-lg', 'rounded-t-xl',
    'rounded-r-none', 'rounded-r-sm', 'rounded-r', 'rounded-r-md', 'rounded-r-lg', 'rounded-r-xl',
    'rounded-b-none', 'rounded-b-sm', 'rounded-b', 'rounded-b-md', 'rounded-b-lg', 'rounded-b-xl',
    'rounded-l-none', 'rounded-l-sm', 'rounded-l', 'rounded-l-md', 'rounded-l-lg', 'rounded-l-xl',
    
    // Shadow
    'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl', 'shadow-inner', 'shadow-none',
    
    // Opacity
    'opacity-0', 'opacity-5', 'opacity-10', 'opacity-20', 'opacity-25', 'opacity-30', 'opacity-40',
    'opacity-50', 'opacity-60', 'opacity-70', 'opacity-75', 'opacity-80', 'opacity-90', 'opacity-95', 'opacity-100',
    
    // Dark mode variants (common ones)
    'dark:bg-slate-800', 'dark:bg-slate-900', 'dark:bg-gray-800', 'dark:bg-gray-900',
    'dark:text-white', 'dark:text-slate-100', 'dark:text-gray-100',
    'dark:border-slate-700', 'dark:border-gray-700',
    
    // Hover variants (common ones)
    'hover:bg-slate-100', 'hover:bg-gray-100', 'hover:bg-blue-500', 'hover:bg-red-500',
    'hover:text-blue-600', 'hover:text-red-600',
    
    // Focus variants (common ones)
    'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500', 'focus:ring-offset-2',
    
    // Responsive variants (common ones)
    'sm:block', 'sm:flex', 'sm:hidden', 'sm:w-full', 'sm:w-1/2',
    'md:block', 'md:flex', 'md:hidden', 'md:w-full', 'md:w-1/2',
    'lg:block', 'lg:flex', 'lg:hidden', 'lg:w-full', 'lg:w-1/2',
    'xl:block', 'xl:flex', 'xl:hidden', 'xl:w-full', 'xl:w-1/2',
    
    // Missing classes from user's error messages
    'border-s', 'dark:border-gray-700',
    'ms-6', 'me-2', 'ms-3',
    '-start-3', 'dark:ring-gray-900', 'dark:bg-blue-900',
    'text-blue-800', 'dark:text-blue-300',
    'dark:text-white', 'dark:text-gray-500', 'dark:text-gray-400',
    'mb-10', 'mb-1', 'mb-2', 'mb-4',
    'bg-blue-100', 'px-2.5', 'py-0.5',
    'leading-none',
    
    // Custom classes that might have calc expressions (wb project specific)
    'wb-item', 'wb-item-small', 'wb-item-medium', 'wb-item-large', 'wb-item-grid',
    
    // Additional logical start/end and margin classes
    'ms-1', 'ms-2', 'ms-3', 'ms-4', 'ms-5', 'ms-8', 'ms-10', 'ms-12',
    'me-1', 'me-2', 'me-3', 'me-4', 'me-5', 'me-8', 'me-10', 'me-12',
    '-start-1', '-start-2', '-start-4', '-start-5', '-start-6',
    '-end-1', '-end-2', '-end-3', '-end-4', '-end-5', '-end-6',
    
    // Additional border directions
    'border-e', 'border-t', 'border-b', 'border-l', 'border-r',
    
    // More dark mode text colors
    'dark:text-gray-100', 'dark:text-gray-200', 'dark:text-gray-300', 'dark:text-gray-600',
    'dark:text-red-300', 'dark:text-red-400', 'dark:text-green-300', 'dark:text-green-400',
    
    // More background colors with dark variants
    'bg-red-100', 'bg-green-100', 'bg-yellow-100', 'bg-purple-100',
    'dark:bg-red-900', 'dark:bg-green-900', 'dark:bg-yellow-900', 'dark:bg-purple-900',
    
    // More text colors
    'text-red-800', 'text-green-800', 'text-yellow-800', 'text-purple-800',
    
    // Ring colors with dark variants
    'ring-red-500', 'ring-green-500', 'ring-yellow-500',
    'dark:ring-red-900', 'dark:ring-green-900', 'dark:ring-yellow-900',
  ];
}

/**
 * Save the generated class map to a file
 */
export async function saveClassMap(classMap: ClassMap, outputPath: string): Promise<void> {
  const { writeFileSync } = await import('fs');
  const content = JSON.stringify(classMap, null, 2);
  writeFileSync(outputPath, content, 'utf8');
  console.log(`✅ Class map saved to ${outputPath}`);
}

/**
 * Load a previously generated class map from a file
 */
export async function loadClassMap(inputPath: string): Promise<ClassMap> {
  const { readFileSync } = await import('fs');
  const content = readFileSync(inputPath, 'utf8');
  return JSON.parse(content);
}
