import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const tailwindPath = dirname(require.resolve('tailwindcss/package.json'));
const realTailwindCSS = readFileSync(join(tailwindPath, 'index.css'), 'utf8');

async function debugBorderS() {
  const { __unstable__loadDesignSystem } = await import('tailwindcss');
  
  console.log('=== Debugging border-s Variable Resolution ===\n');
  
  const loadStylesheet = async (id, base) => {
    if (id === 'tailwindcss') {
      return { path: id, base, content: realTailwindCSS };
    }
    throw new Error(`Unknown stylesheet: ${id}`);
  };
  
  const designSystem = await __unstable__loadDesignSystem('@import "tailwindcss";', { loadStylesheet });
  
  // 1. Get the raw CSS for border-s
  const borderSCSS = designSystem.candidatesToCss(['border-s']);
  console.log('1. Raw CSS for border-s:');
  console.log(borderSCSS[0]);
  
  // 2. Check what variables are involved
  console.log('\n2. Checking --tw-border-style resolution:');
  const borderStyleValue = designSystem.resolveThemeValue('--tw-border-style');
  console.log('   --tw-border-style resolves to:', borderStyleValue);
  
  // 3. Check other border-related variables
  console.log('\n3. Checking other border variables:');
  const borderWidthValue = designSystem.resolveThemeValue('--tw-border-width');
  console.log('   --tw-border-width resolves to:', borderWidthValue);
  
  const borderColorValue = designSystem.resolveThemeValue('--tw-border-color');
  console.log('   --tw-border-color resolves to:', borderColorValue);
  
  // 4. Test our updated variable resolver
  console.log('\n4. Testing our updated variable resolver:');
  const testCSS = borderSCSS[0]; // Use the full CSS with @property rules
  
  // Simulate our updated resolver with @property parsing
  const propertyValues = new Map();
  const propertyRegex = /@property\s+(--[^{]+)\s*\{[^}]*initial-value:\s*([^;}]+)[^}]*\}/g;
  
  let propertyMatch;
  while ((propertyMatch = propertyRegex.exec(testCSS)) !== null) {
    const propertyName = propertyMatch[1].trim();
    const initialValue = propertyMatch[2].trim().replace(/['"]/g, '');
    propertyValues.set(propertyName, initialValue);
    console.log(`   Found @property: ${propertyName} = ${initialValue}`);
  }
  
  const varRegex = /var\((--[^,)]+)(?:,\s*(--[^)]+))?\)/g;
  const resolved = testCSS.replace(varRegex, (match, primaryVar, fallbackVar) => {
    // Try theme first
    const primaryValue = designSystem.resolveThemeValue(primaryVar);
    if (primaryValue !== undefined) {
      return primaryValue;
    }
    
    // Try @property rules
    const propertyValue = propertyValues.get(primaryVar);
    if (propertyValue !== undefined) {
      return propertyValue;
    }
    
    // Try fallbacks
    if (fallbackVar) {
      const fallbackValue = designSystem.resolveThemeValue(fallbackVar);
      if (fallbackValue !== undefined) {
        return fallbackValue;
      }
      const fallbackPropertyValue = propertyValues.get(fallbackVar);
      if (fallbackPropertyValue !== undefined) {
        return fallbackPropertyValue;
      }
    }
    
    return match;
  });
  
  console.log('\n   Resolved CSS:');
  console.log(resolved);
}

debugBorderS().catch(console.error);
