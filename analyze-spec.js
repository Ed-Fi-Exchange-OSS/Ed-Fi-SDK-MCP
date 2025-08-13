import axios from 'axios';
import fs from 'fs';

async function analyzeEdFiSpec() {
  try {
    console.log('Fetching Ed-Fi spec...');
    const response = await axios.get('https://api.ed-fi.org/v7.3/api/metadata/data/v3/resources/swagger.json');
    const spec = response.data;
    
    console.log('API Info:', spec.info?.title, spec.info?.version);
    
    const schemas = Object.keys(spec.components?.schemas || {});
    console.log(`\nFound ${schemas.length} schemas`);
    
    // Look for core entities
    const coreEntities = schemas.filter(name => 
      ['student', 'school', 'assessment', 'course', 'section', 'staff', 'grade', 'attendance']
        .some(core => name.toLowerCase().includes(core))
    );
    
    console.log('\nCore entities found:');
    coreEntities.slice(0, 20).forEach(entity => console.log('  -', entity));
    
    // Analyze a few schemas for relationships
    console.log('\nAnalyzing Student schema...');
    const studentSchema = spec.components.schemas['edfi_student'];
    if (studentSchema) {
      console.log('Student properties:', Object.keys(studentSchema.properties || {}));
    }
    
    // Save a small sample for analysis
    const sample = {
      info: spec.info,
      coreSchemas: coreEntities.slice(0, 10).reduce((acc, name) => {
        acc[name] = spec.components.schemas[name];
        return acc;
      }, {})
    };
    
    fs.writeFileSync('/tmp/edfi-sample.json', JSON.stringify(sample, null, 2));
    console.log('\nSample saved to /tmp/edfi-sample.json');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

analyzeEdFiSpec();