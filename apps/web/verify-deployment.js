#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Run this to check if your web app is properly configured for Railway deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Web App Deployment Configuration...\n');

let hasErrors = false;
let hasWarnings = false;

// Check 1: package.json exists and has required scripts
console.log('✓ Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  if (!packageJson.scripts.build) {
    console.error('  ❌ Missing "build" script in package.json');
    hasErrors = true;
  } else {
    console.log('  ✓ Build script found');
  }
  
  if (!packageJson.scripts.start) {
    console.error('  ❌ Missing "start" script in package.json');
    hasErrors = true;
  } else {
    console.log('  ✓ Start script found');
  }
} catch (error) {
  console.error('  ❌ Cannot read package.json:', error.message);
  hasErrors = true;
}

// Check 2: railway.json exists
console.log('\n✓ Checking railway.json...');
if (fs.existsSync('railway.json')) {
  console.log('  ✓ railway.json found');
  try {
    const railwayConfig = JSON.parse(fs.readFileSync('railway.json', 'utf8'));
    if (railwayConfig.build && railwayConfig.deploy) {
      console.log('  ✓ Railway configuration looks good');
    }
  } catch (error) {
    console.error('  ⚠️  railway.json exists but may have syntax errors');
    hasWarnings = true;
  }
} else {
  console.log('  ⚠️  railway.json not found (Railway will use defaults)');
  hasWarnings = true;
}

// Check 3: next.config.ts exists
console.log('\n✓ Checking Next.js configuration...');
if (fs.existsSync('next.config.ts') || fs.existsSync('next.config.js') || fs.existsSync('next.config.mjs')) {
  console.log('  ✓ Next.js config found');
} else {
  console.error('  ❌ No Next.js config file found');
  hasErrors = true;
}

// Check 4: .env.example exists
console.log('\n✓ Checking environment configuration...');
if (fs.existsSync('.env.example')) {
  console.log('  ✓ .env.example found');
  const envExample = fs.readFileSync('.env.example', 'utf8');
  
  if (envExample.includes('NEXT_PUBLIC_API_URL')) {
    console.log('  ✓ NEXT_PUBLIC_API_URL documented');
  } else {
    console.error('  ❌ NEXT_PUBLIC_API_URL not in .env.example');
    hasErrors = true;
  }
} else {
  console.log('  ⚠️  .env.example not found');
  hasWarnings = true;
}

// Check 5: app directory exists (Next.js 13+ App Router)
console.log('\n✓ Checking Next.js structure...');
if (fs.existsSync('app')) {
  console.log('  ✓ App directory found (App Router)');
} else if (fs.existsSync('pages')) {
  console.log('  ✓ Pages directory found (Pages Router)');
} else {
  console.error('  ❌ No app or pages directory found');
  hasErrors = true;
}

// Check 6: Verify no hardcoded localhost URLs in key files
console.log('\n✓ Checking for hardcoded localhost URLs...');
const filesToCheck = ['lib/api.ts', 'lib/axios.ts', 'utils/api.ts'];
let foundHardcodedUrls = false;

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('localhost:4000') && !content.includes('process.env')) {
      console.error(`  ⚠️  Found hardcoded localhost in ${file}`);
      foundHardcodedUrls = true;
      hasWarnings = true;
    }
  }
});

if (!foundHardcodedUrls) {
  console.log('  ✓ No obvious hardcoded URLs found');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(50));

if (!hasErrors && !hasWarnings) {
  console.log('✅ All checks passed! Your app is ready for Railway deployment.');
  console.log('\n📝 Next steps:');
  console.log('1. Push your code to GitHub/GitLab');
  console.log('2. Create a new service in Railway');
  console.log('3. Set root directory to: apps/web');
  console.log('4. Add environment variable: NEXT_PUBLIC_API_URL');
  console.log('5. Deploy!');
  process.exit(0);
} else if (hasErrors) {
  console.log('❌ Found critical issues that need to be fixed before deployment.');
  console.log('\n🔧 Please fix the errors above and run this script again.');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Found some warnings. Deployment may work but review the warnings above.');
  console.log('\n📝 You can proceed with deployment, but consider addressing the warnings.');
  process.exit(0);
}
