import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { createRequire } from 'module';

// Get the actual Tailwind CSS file
const require = createRequire(import.meta.url);
const tailwindPath = dirname(require.resolve('tailwindcss/package.json'));
const realTailwindCSS = readFileSync(join(tailwindPath, 'index.css'), 'utf8');

async function debugEscapingTheory() {
  const { __unstable__loadDesignSystem } = await import('tailwindcss');
  
  console.log('=== Testing Escaping Theory ===\n');
  
  const loadStylesheet = (id) => {
    if (id === 'tailwindcss') {
      return { content: realTailwindCSS };
    }
    throw new Error(`Unknown stylesheet: ${id}`);
  };
  
  // Load design system with real Tailwind CSS
  const designSystem = await __unstable__loadDesignSystem('@import "tailwindcss";', { loadStylesheet });
  
  // Test the problematic classes
  const testCases = [
    ['w-2.5'],
    ['dark:border-gray-700'],
    ['w-4'], // Known working case
  ];
  
  for (const candidates of testCases) {
    console.log(`\n=== Testing: ${candidates.join(' ')} ===`);
    
    const cssResults = designSystem.candidatesToCss(candidates);
    console.log('Raw CSS results:');
    cssResults.forEach((css, i) => {
      if (css) {
        console.log(`${i + 1}. ${JSON.stringify(css)}`);
        
        // Look for selectors in the raw CSS string
        const selectorMatches = css.match(/\.[^{]+/g);
        if (selectorMatches) {
          console.log('   Found selectors:');
          selectorMatches.forEach(selector => {
            console.log(`   - "${selector.trim()}"`);
          });
        }
      } else {
        console.log(`${i + 1}. null`);
      }
    });
  }
}

debugEscapingTheory().catch(console.error);
