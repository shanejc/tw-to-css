async function testLightningCSSOptions() {
  console.log('=== Testing Lightning CSS Options for Mixed Units ===\n');
  
  try {
    // Import Lightning CSS
    const lightningCSS = await (new Function('return import("lightningcss")')());
    const { transform } = lightningCSS;
    
    console.log('✅ Lightning CSS imported successfully');
    
    const testCSS = `
      .test {
        border-radius: calc(.25rem - 4px);
        margin: calc(1rem + 8px);
        padding: calc(16px - 0.5rem);
        width: calc(100px - 20px);
      }
    `;
    
    console.log('🔍 Input CSS:');
    console.log(testCSS);
    
    // Test different Lightning CSS configurations
    const configs = [
      {
        name: 'Default',
        config: {
          code: Buffer.from(testCSS),
          minify: false
        }
      },
      {
        name: 'With targets',
        config: {
          code: Buffer.from(testCSS),
          minify: false,
          targets: { chrome: 90 << 16 }
        }
      },
      {
        name: 'With customMedia',
        config: {
          code: Buffer.from(testCSS),
          minify: false,
          targets: { chrome: 90 << 16 },
          customMedia: true
        }
      }
    ];
    
    for (const { name, config } of configs) {
      try {
        console.log(`\n🧪 Testing ${name} configuration:`);
        const result = transform(config);
        const output = result.code.toString();
        console.log(output);
        
        // Check if calc expressions were resolved
        if (output.includes('calc(.25rem - 4px)')) {
          console.log('  ❌ calc(.25rem - 4px) NOT resolved');
        } else {
          console.log('  ✅ calc(.25rem - 4px) resolved!');
        }
        
        if (output.includes('calc(100px - 20px)')) {
          console.log('  ❌ calc(100px - 20px) NOT resolved');
        } else {
          console.log('  ✅ calc(100px - 20px) resolved!');
        }
        
      } catch (error) {
        console.log(`  💥 ${name} failed:`, error.message);
      }
    }
    
    // Check Lightning CSS API documentation
    console.log('\n📚 Checking Lightning CSS transform options...');
    try {
      // Try to get help on available options
      const result = transform({
        code: Buffer.from('.test { color: red; }'),
        minify: false
      });
      
      console.log('Available transform result properties:', Object.keys(result));
    } catch (error) {
      console.log('Error checking API:', error.message);
    }
    
  } catch (error) {
    console.error('💥 Lightning CSS import failed:', error.message);
    console.log('\nThis means Lightning CSS is not available in this environment.');
    console.log('Mixed unit calc resolution will use the fallback method.');
  }
}

testLightningCSSOptions().catch(console.error);

