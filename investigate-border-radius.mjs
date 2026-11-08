import { generateClassMap, createRuntime } from './dist/node.mjs';

async function investigateBorderRadius() {
  console.log('=== Investigating Border Radius Classes ===\n');
  
  const testCSS = `@import "tailwindcss";`;
  
  // Test some common border-radius classes that might have calc expressions
  const borderRadiusClasses = [
    'rounded', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl',
    'rounded-full', 'rounded-none',
    'rounded-t', 'rounded-r', 'rounded-b', 'rounded-l',
    'rounded-tl', 'rounded-tr', 'rounded-br', 'rounded-bl',
    'rounded-t-sm', 'rounded-r-sm', 'rounded-b-sm', 'rounded-l-sm',
    'rounded-t-md', 'rounded-r-md', 'rounded-b-md', 'rounded-l-md',
    'rounded-t-lg', 'rounded-r-lg', 'rounded-b-lg', 'rounded-l-lg',
    // Custom radius values that might use calc
    'rounded-[4px]', 'rounded-[8px]', 'rounded-[12px]',
    'rounded-[0.25rem]', 'rounded-[0.5rem]', 'rounded-[1rem]',
  ];
  
  console.log('🔍 Testing border-radius classes for calc expressions...\n');
  
  // Test with runtime to see which ones have calc
  const { twj } = (await import('./dist/index.mjs')).tailwindToCSS({ 
    css: testCSS,
    options: { 
      resolveVariables: true,
      context: { dark: true }
    }
  });
  
  const classesWithCalc = [];
  
  for (const className of borderRadiusClasses) {
    try {
      const result = await twj(className);
      if (result) {
        const resultStr = JSON.stringify(result);
        if (resultStr.includes('calc(')) {
          console.log(`  🧮 ${className}: ${resultStr}`);
          classesWithCalc.push(className);
        } else if (resultStr.includes('borderRadius')) {
          console.log(`  ✅ ${className}: ${resultStr}`);
        }
      }
    } catch (error) {
      console.log(`  💥 ${className}: Error - ${error.message}`);
    }
  }
  
  console.log(`\n📊 Found ${classesWithCalc.length} border-radius classes with calc expressions`);
  
  if (classesWithCalc.length > 0) {
    console.log('\n🔍 Now checking if these are in the build-time class map...');
    
    const classMap = await generateClassMap({
      css: testCSS,
      context: { dark: true },
      resolveVariables: true
    });
    
    const runtime = createRuntime({ classMap });
    
    for (const className of classesWithCalc) {
      const buildTimeResult = runtime.twj(className);
      if (buildTimeResult) {
        console.log(`  ✅ ${className}: Found in build-time map`);
      } else {
        console.log(`  ❌ ${className}: Missing from build-time map - will use runtime fallback`);
      }
    }
  }
  
  // Test the specific calc expression you mentioned
  console.log('\n🧮 Testing calc(.25rem - 4px) resolution...');
  
  // Try to find which class generates this specific calc
  const testClasses = ['rounded', 'rounded-sm', 'rounded-md', 'rounded-lg'];
  for (const className of testClasses) {
    const result = await twj(className);
    if (result && JSON.stringify(result).includes('calc(.25rem - 4px)')) {
      console.log(`  🎯 Found: ${className} generates calc(.25rem - 4px)`);
    }
  }
}

investigateBorderRadius().catch(console.error);

