import { DiagramGenerator } from './dist/diagram-generator.js';

// Test the refactored getEntitiesByDomain function
const generator = new DiagramGenerator();

// Create some dummy entities for testing
generator.analyzeOpenAPISpec({
  components: {
    schemas: {
      'Student': { properties: { id: { type: 'string' } } },
      'School': { properties: { id: { type: 'string' } } },
      'Assessment': { properties: { id: { type: 'string' } } },
      'UnknownEntity': { properties: { id: { type: 'string' } } }
    }
  }
});

console.log('Testing domain categorization with version 4.0:');
try {
  const domains = generator.getEntitiesByDomain('4.0');
  console.log('Success! Domains found:', Object.keys(domains));
  console.log('Domain content sample:', domains);
} catch (error) {
  console.error('Error:', error.message);
}

console.log('\nTesting with invalid version:');
try {
  const domains = generator.getEntitiesByDomain('999.0');
  console.log('Domains:', domains);
} catch (error) {
  console.error('Expected error:', error.message);
}
