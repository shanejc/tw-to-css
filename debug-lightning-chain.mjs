// Debug the Lightning CSS call chain

async function debugLightningChain() {
  console.log('=== Debugging Lightning CSS Call Chain ===\n');
  
  // Test 1: Direct Lightning CSS call
  console.log('1. Direct Lightning CSS test:');
  try {
    const { transform } = await import('lightningcss');
    const testCSS = '.test { width: calc(infinity * 1px); }';
    const result = transform({
      code: Buffer.from(testCSS),
      minify: false,
      targets: { chrome: 90 << 16 }
    });
    console.log('   Input:', testCSS);
    console.log('   Output:', result.code.toString().trim());
    console.log('   ✅ Lightning CSS works directly\n');
  } catch (error) {
    console.log('   ❌ Lightning CSS failed:', error.message, '\n');
  }
  
  // Test 2: Test our resolve function directly
  console.log('2. Testing our resolve function:');
  try {
    // Import our function (we need to make it work in isolation)
    const testResolveCalc = async (css) => {
      if (!css.includes('calc(')) {
        return css;
      }
      
      try {
        const { transform } = await import('lightningcss');
        const result = transform({
          code: Buffer.from(css),
          minify: false,
          targets: { chrome: 90 << 16 }
        });
        return result.code.toString();
      } catch (error) {
        console.warn('Lightning CSS failed:', error.message);
        return css; // fallback
      }
    };
    
    const testCSS = '.test { height: calc(1.5 / 1); padding: calc(8px - 4px); }';
    const resolved = await testResolveCalc(testCSS);
    console.log('   Input:', testCSS);
    console.log('   Output:', resolved.trim());
    console.log('   ✅ Our resolve function works\n');
  } catch (error) {
    console.log('   ❌ Our resolve function failed:', error.message, '\n');
  }
  
  // Test 3: Check if the issue is in the tw-to-css pipeline
  console.log('3. Testing tw-to-css pipeline:');
  try {
    const { tailwindToCSS } = await import('./dist/index.mjs');
    
    // Simple test with just one calc
    const simpleCSS = `
      @import "tailwindcss";
      @layer components {
        .simple-calc { width: calc(1.5 / 1); }
      }
    `;
    
    const { twj } = tailwindToCSS({ css: simpleCSS });
    const result = await twj('simple-calc');
    
    console.log('   tw-to-css result:', JSON.stringify(result, null, 2));
    
    if (result && result.width) {
      const isResolved = !result.width.toString().includes('calc(');
      console.log(`   Width resolved: ${isResolved ? '✅ YES' : '❌ NO'} (${result.width})`);
    }
    
  } catch (error) {
    console.log('   ❌ tw-to-css pipeline failed:', error.message);
  }
}

debugLightningChain().catch(console.error);

