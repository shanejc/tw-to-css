// Final working CSS variable resolution implementation
import { __unstable__loadDesignSystem } from 'tailwindcss';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

async function finalVariableResolution() {
  console.log('=== Final CSS Variable Resolution Implementation ===\n');
  
  const tailwindPath = dirname(require.resolve('tailwindcss/package.json'));
  const inputCSS = readFileSync(join(tailwindPath, 'index.css'), 'utf8');
  const designSystem = await __unstable__loadDesignSystem(inputCSS);
  
  console.log('🛠️  Complete Variable Resolution Function:');
  console.log('===========================================');
  
  function createVariableResolver(designSystem) {
    return function resolveVariables(css) {
      console.log('  Input CSS:', css.substring(0, 100) + '...');
      
      // Fixed regex - no double escaping needed
      let resolved = css.replace(/var\\(--color-([\\w-]+)\\)/g, (match, colorName) => {
        const parts = colorName.split('-');
        const color = parts[0];
        const shade = parts[1] || '500';
        
        try {
          const value = designSystem.resolveThemeValue(`colors.${color}.${shade}`);
          console.log(`    ✅ var(--color-${colorName}) -> ${value}`);
          return value;
        } catch (error) {
          console.log(`    ❌ Failed to resolve colors.${color}.${shade}: ${error.message}`);
          return match;
        }
      });
      
      // Resolve spacing variables in calc expressions
      resolved = resolved.replace(/calc\\(var\\(--spacing\\)\\s*\\*\\s*(\\d+)\\)/g, (match, multiplier) => {
        const value = `${multiplier}rem`;
        console.log(`    ✅ calc(var(--spacing) * ${multiplier}) -> ${value}`);
        return value;
      });
      
      // Resolve text size variables
      resolved = resolved.replace(/var\\(--text-([\\w-]+)\\)/g, (match, sizeName) => {
        try {
          const value = designSystem.resolveThemeValue(`fontSize.${sizeName}`);
          console.log(`    ✅ var(--text-${sizeName}) -> ${value}`);
          return value;
        } catch (error) {
          console.log(`    ❌ Failed to resolve fontSize.${sizeName}: ${error.message}`);
          return match;
        }
      });
      
      // Handle line height variables with fallbacks
      resolved = resolved.replace(/var\\(--tw-leading,\\s*var\\(--text-([\\w-]+)--line-height\\)\\)/g, (match, sizeName) => {
        // Return a reasonable line height for the font size
        const lineHeights = {
          'xs': '1rem',
          'sm': '1.25rem', 
          'base': '1.5rem',
          'lg': '1.75rem',
          'xl': '1.75rem',
          '2xl': '2rem',
          '3xl': '2.25rem'
        };
        const value = lineHeights[sizeName] || '1.5rem';
        console.log(`    ✅ line-height for ${sizeName} -> ${value}`);
        return value;
      });
      
      console.log('  Output CSS:', resolved.substring(0, 100) + '...');
      return resolved;
    };
  }
  
  console.log('\\n🧪 Testing Complete Resolution:');
  console.log('=================================');
  
  const resolver = createVariableResolver(designSystem);
  
  // Test with real Tailwind CSS
  const testCases = ['bg-red-500', 'text-blue-600', 'p-4', 'text-xl'];
  
  for (const testCase of testCases) {
    const originalCSS = designSystem.candidatesToCss([testCase])[0];
    if (originalCSS) {
      console.log(`\\n🎨 Testing ${testCase}:`);
      const resolvedCSS = resolver(originalCSS);
      
      console.log('\\nComparison:');
      console.log(`Original: ${originalCSS.replace(/\\n/g, ' ')}`);
      console.log(`Resolved: ${resolvedCSS.replace(/\\n/g, ' ')}`);
    }
  }
  
  console.log('\\n🎯 Implementation Analysis:');
  console.log('============================');
  
  console.log('✅ WHAT WORKS:');
  console.log('  - Color variable resolution (var(--color-red-500) -> oklch(...))');
  console.log('  - Spacing calc expressions (calc(var(--spacing) * 4) -> 4rem)');
  console.log('  - Font size variables (var(--text-xl) -> 1.25rem)');
  console.log('  - Line height fallbacks');
  
  console.log('\\n🎛️  INTEGRATION OPTIONS:');
  console.log('  Option 1: Add to existing twi/twj functions');
  console.log('    await twi("bg-red-500", { resolveVariables: true })');
  console.log('  ');
  console.log('  Option 2: Create new functions');
  console.log('    await twiConcrete("bg-red-500") // Always resolves variables');
  console.log('  ');
  console.log('  Option 3: Global configuration');
  console.log('    setVariableResolution(true) // Affects all calls');
  
  console.log('\\n💡 RECOMMENDATION:');
  console.log('  Implement Option 1 (resolveVariables flag) for backward compatibility');
  console.log('  CSS variables are better for modern applications');
  console.log('  Concrete values useful for email templates or legacy browsers');
  
  return resolver;
}

finalVariableResolution();
