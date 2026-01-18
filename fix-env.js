// Script to help fix .env file
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const templatePath = path.join(__dirname, 'env-template.txt');

console.log('=== Fixing .env File ===\n');

// Read the template
const template = fs.readFileSync(templatePath, 'utf8');
console.log('Template content:');
console.log(template);
console.log('\n---\n');

// Check if .env exists
if (fs.existsSync(envPath)) {
  const current = fs.readFileSync(envPath, 'utf8');
  console.log('Current .env content:');
  console.log(current);
  console.log('\n---\n');
  
  // Check for common issues
  const issues = [];
  
  if (current.includes('"') || current.includes("'")) {
    issues.push('❌ Found quotes in .env file - remove them!');
  }
  
  if (current.includes(' = ')) {
    issues.push('❌ Found spaces around = sign - remove them!');
  }
  
  if (!current.includes('DATABASE_URL=')) {
    issues.push('❌ DATABASE_URL line is missing or malformed');
  }
  
  if (current.includes('*1DOLEadmin*') && !current.includes('%2A1DOLEadmin%2A')) {
    issues.push('⚠️  Password in DATABASE_URL needs URL encoding (* should be %2A)');
  }
  
  if (issues.length > 0) {
    console.log('Issues found:');
    issues.forEach(issue => console.log('  ' + issue));
    console.log('\n---\n');
    console.log('Creating backup and writing corrected .env file...\n');
    
    // Backup
    fs.writeFileSync(envPath + '.backup', current);
    console.log('✅ Backup created: .env.backup');
    
    // Write corrected version
    fs.writeFileSync(envPath, template);
    console.log('✅ Corrected .env file written');
    console.log('\nNow test with: node check-env.js');
  } else {
    console.log('✅ .env file format looks correct');
    console.log('But it\'s still not loading. Possible causes:');
    console.log('  1. File encoding issue (should be UTF-8)');
    console.log('  2. Hidden characters (BOM)');
    console.log('  3. Line ending issues');
    console.log('\nTrying to fix by rewriting...');
    
    // Backup
    fs.writeFileSync(envPath + '.backup', current);
    console.log('✅ Backup created: .env.backup');
    
    // Write fresh version
    fs.writeFileSync(envPath, template, { encoding: 'utf8' });
    console.log('✅ Rewritten .env file with clean encoding');
    console.log('\nNow test with: node check-env.js');
  }
} else {
  console.log('❌ .env file not found. Creating it...');
  fs.writeFileSync(envPath, template);
  console.log('✅ Created .env file');
  console.log('\nNow test with: node check-env.js');
}
