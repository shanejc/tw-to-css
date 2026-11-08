import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import postcss from 'postcss';

const require = createRequire(import.meta.url);
const tailwindPath = dirname(require.resolve('tailwindcss/package.json'));
const realTailwindCSS = readFileSync(join(tailwindPath, 'index.css'), 'utf8');

async function debugExtraction() {
  const { __unstable__loadDesignSystem } = await import('tailwindcss');
  
  console.log('=== Debugging CSS Extraction ===\n');
  
  const loadStylesheet = async (id, base) => {
    if (id === 'tailwindcss') {
      return { path: id, base, content: realTailwindCSS };
    }
    throw new Error(`Unknown stylesheet: ${id}`);
  };
  
  const designSystem = await __unstable__loadDesignSystem('@import "tailwindcss";', { loadStylesheet });
  
  // Test text-base
  console.log('1. Raw CSS for text-base:');
  const textBaseCSS = designSystem.candidatesToCss(['text-base']);
  console.log(textBaseCSS[0]);
  
  console.log('\n2. Testing extraction logic:');
  const fullCSS = textBaseCSS[0];
  const className = 'text-base';
  
  // Parse the CSS
  const root = postcss.parse(fullCSS);
  const extractedRules = [];
  
  root.walkRules((rule) => {
    const selector = rule.selector;
    console.log(`   Checking selector: "${selector}"`);
    
    // Check if this rule matches the requested class
    const cssEscapedClassName = className.replace(/\./g, '\\.').replace(/:/g, '\\:');
    
    const matches = selector === `.${className}` ||                    // exact match
                   selector === `.${cssEscapedClassName}` ||          // CSS-escaped match
                   selector.includes(`.${className}:`) ||              // pseudo-classes
                   selector.includes(`.${className}\\:`) ||            // escaped colons
                   selector.includes(`.${cssEscapedClassName}`) ||     // CSS-escaped special chars
                   selector.includes(`.${className}[`) ||              // attribute selectors
                   selector.includes(`.${className} `) ||              // descendant selectors
                   selector.includes(`.${className}.`) ||              // multi-class selectors
                   selector.endsWith(`.${className}`) ||               // class at end
                   selector.endsWith(`.${cssEscapedClassName}`);       // CSS-escaped class at end
    
    console.log(`   Matches: ${matches}`);
    
    if (matches) {
      extractedRules.push(rule.toString());
    }
  });
  
  console.log(`\n3. Extracted rules (${extractedRules.length}):`);
  extractedRules.forEach((rule, i) => {
    console.log(`   ${i + 1}: ${rule}`);
  });
  
  const result = extractedRules.join('\n');
  console.log(`\n4. Final result: "${result}"`);
  console.log(`   Length: ${result.length}`);
  console.log(`   Trimmed length: ${result.trim().length}`);
  console.log(`   Is empty: ${!result || result.trim() === ''}`);
}

debugExtraction().catch(console.error);