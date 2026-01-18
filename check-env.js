// Quick script to check if .env file is being loaded correctly
require('dotenv').config();

console.log('=== Environment Variables Check ===\n');

if (process.env.DATABASE_URL) {
  console.log('✅ DATABASE_URL is set');
  // Show first 60 chars (hide password)
  const url = process.env.DATABASE_URL;
  const match = url.match(/postgresql:\/\/postgres:([^@]+)@(.+)/);
  if (match) {
    console.log('   Password length:', match[1].length, 'characters');
    console.log('   Host:', match[2]);
    console.log('   Full URL (first 80 chars):', url.substring(0, 80) + '...');
  } else {
    console.log('   ⚠️  URL format might be incorrect');
    console.log('   URL:', url.substring(0, 100));
  }
} else {
  console.log('❌ DATABASE_URL is NOT set');
  console.log('   The .env file is not being loaded or DATABASE_URL is missing');
}

console.log('\nADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? '✅ Set' : '❌ Not set');
console.log('PORT:', process.env.PORT || '3000 (default)');

console.log('\n=== Checking .env file location ===');
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');

if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists at:', envPath);
  const stats = fs.statSync(envPath);
  console.log('   File size:', stats.size, 'bytes');
  console.log('   Last modified:', stats.mtime);
} else {
  console.log('❌ .env file NOT found at:', envPath);
}

console.log('\n=== Current working directory ===');
console.log(process.cwd());
