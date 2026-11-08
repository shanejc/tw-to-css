import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const tailwindPath = dirname(require.resolve('tailwindcss/package.json'));
const realTailwindCSS = readFileSync(join(tailwindPath, 'index.css'), 'utf8');

async function investigateCalcAPI() {
  const { __unstable__loadDesignSystem } = await import('tailwindcss');
  
  console.log('=== Investigating Tailwind Calc/Math APIs ===\n');
  
  const loadStylesheet = async (id, base) => {
    if (id === 'tailwindcss') {
      return { path: id, base, content: realTailwindCSS };
    }
    throw new Error(`Unknown stylesheet: ${id}`);
  };
  
  const designSystem = await __unstable__loadDesignSystem('@import "tailwindcss";', { loadStylesheet });
  
  console.log('1. DesignSystem methods:');
  const methods = Object.getOwnPropertyNames(designSystem).filter(prop => typeof designSystem[prop] === 'function');
  console.log('   Functions:', methods);
  
  console.log('\n2. Theme methods:');
  if (designSystem.theme) {
    const themeMethods = Object.getOwnPropertyNames(designSystem.theme).filter(prop => typeof designSystem.theme[prop] === 'function');
    console.log('   Functions:', themeMethods);
  }
  
  console.log('\n3. Testing theme.resolve with calc expressions:');
  try {
    // Test if theme.resolve can handle calc expressions
    const calcTest1 = designSystem.theme.resolve('calc(1rem * 2)', []);
    console.log('   theme.resolve("calc(1rem * 2)", []):', calcTest1);
    
    const calcTest2 = designSystem.theme.resolve('calc(infinity * 1px)', []);
    console.log('   theme.resolve("calc(infinity * 1px)", []):', calcTest2);
  } catch (error) {
    console.log('   theme.resolve with calc failed:', error.message);
  }
  
  console.log('\n4. Testing theme.resolveValue with calc expressions:');
  try {
    const calcTest3 = designSystem.theme.resolveValue('calc(8px - 4px)', []);
    console.log('   theme.resolveValue("calc(8px - 4px)", []):', calcTest3);
  } catch (error) {
    console.log('   theme.resolveValue with calc failed:', error.message);
  }
  
  console.log('\n5. Testing resolveThemeValue with calc expressions:');
  try {
    const calcTest4 = designSystem.resolveThemeValue('calc(1.5 / 1)');
    console.log('   resolveThemeValue("calc(1.5 / 1)"):', calcTest4);
  } catch (error) {
    console.log('   resolveThemeValue with calc failed:', error.message);
  }
  
  console.log('\n6. Checking for Lightning CSS or Oxide exposure:');
  // Look for any Lightning CSS or Oxide-related APIs
  const allProps = Object.getOwnPropertyNames(designSystem);
  const possibleCalcProps = allProps.filter(prop => 
    prop.includes('calc') || 
    prop.includes('math') || 
    prop.includes('eval') || 
    prop.includes('resolve') ||
    prop.includes('lightning') ||
    prop.includes('oxide')
  );
  console.log('   Calc/Math related properties:', possibleCalcProps);
  
  console.log('\n7. Checking what Lightning CSS might be available:');
  try {
    // Try to import Lightning CSS directly
    const lightningcss = await import('lightningcss');
    console.log('   Lightning CSS available:', !!lightningcss);
    console.log('   Lightning CSS exports:', Object.keys(lightningcss));
  } catch (error) {
    console.log('   Lightning CSS not directly available:', error.message);
  }
}

investigateCalcAPI().catch(console.error);

