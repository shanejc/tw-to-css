// Test TypeScript types for the /node export
import { generateClassMap, saveClassMap, createRuntime, BuildTimeOptions, TailwindRuntime } from 'tw-to-css/node';

// This should compile without errors if types are correct
const options: BuildTimeOptions = {
  css: '@import "tailwindcss";',
  classes: ['w-4', 'bg-blue-500'],
  resolveVariables: true
};

async function testTypes() {
  const classMap = await generateClassMap(options);
  await saveClassMap(classMap, 'test.json');
  
  const runtime: TailwindRuntime = createRuntime({ classMap });
  const result = runtime.twj('w-4');
  
  console.log('Types work correctly!', result);
}

export { testTypes };

