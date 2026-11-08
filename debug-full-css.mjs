import { tailwindToCSS } from './dist/index.mjs';
import postcss from 'postcss';

// Test by bypassing our extraction and looking at the full generated CSS
async function debugFullCSS() {
  console.log('=== Debugging Full CSS Generation ===\n');
  
  // Import the createTailwindcssPlugin directly to see what it generates
  const { createTailwindcssPlugin } = await import('./dist/index.mjs');
  
  // This won't work because createTailwindcssPlugin isn't exported, let me try a different approach
  
  // Let's manually create the plugin and see what CSS it generates
  const { __unstable__loadDesignSystem } = await import('tailwindcss');
  
  const loadStylesheet = (id) => {
    if (id === 'tailwindcss') {
      // Use bundled CSS for now
      return { content: '@layer theme, base, components, utilities;' };
    }
    throw new Error(`Unknown stylesheet: ${id}`);
  };
  
  const inputCSS = '@import "tailwindcss";';
  const candidates = ['w-2.5', 'dark:border-gray-700'];
  
  console.log('Testing candidates:', candidates);
  
  const designSystem = await __unstable__loadDesignSystem(inputCSS, { loadStylesheet });
  const cssResults = designSystem.candidatesToCss(candidates);
  
  console.log('Raw CSS results from Tailwind:');
  cssResults.forEach((css, i) => {
    console.log(`${i + 1}. ${css}`);
  });
  
  // Now let's see what happens when we parse this CSS
  const combinedCSS = cssResults.join('\n');
  console.log('\nCombined CSS:');
  console.log(combinedCSS);
  
  // Parse and see what selectors we get
  const root = postcss.parse(combinedCSS);
  console.log('\nParsed selectors:');
  root.walkRules((rule) => {
    console.log(`- "${rule.selector}"`);
  });
}

debugFullCSS().catch(console.error);

