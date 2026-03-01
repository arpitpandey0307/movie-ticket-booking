/**
 * ENTERPRISE: Environment Variable Validation
 * 
 * Validates all required environment variables at startup.
 * Fails fast if any critical variable is missing.
 * 
 * Production apps MUST NOT start with missing configuration.
 */

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
] as const;

const OPTIONAL_ENV_VARS = [
  'STRIPE_SECRET_KEY',
  'CORS_ORIGIN',
] as const;

const PRODUCTION_REQUIRED_ENV_VARS = [
  'STRIPE_WEBHOOK_SECRET',
] as const;

export function validateEnvironment(): void {
  const missing: string[] = [];

  // Check required variables
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Check production-specific variables
  if (process.env.NODE_ENV === 'production') {
    for (const varName of PRODUCTION_REQUIRED_ENV_VARS) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }
  }

  if (missing.length > 0) {
    console.error('❌ FATAL: Missing required environment variables:');
    missing.forEach((varName) => {
      console.error(`   - ${varName}`);
    });
    console.error('\nApplication cannot start without these variables.');
    console.error('Please check your .env file or environment configuration.\n');
    process.exit(1);
  }

  // Warn about optional variables
  const missingOptional: string[] = [];
  for (const varName of OPTIONAL_ENV_VARS) {
    if (!process.env[varName]) {
      missingOptional.push(varName);
    }
  }

  if (missingOptional.length > 0) {
    console.warn('⚠️  WARNING: Optional environment variables not set:');
    missingOptional.forEach((varName) => {
      console.warn(`   - ${varName}`);
    });
    console.warn('Some features may not work correctly.\n');
  }

  // Validate DATABASE_URL format for production
  if (process.env.NODE_ENV === 'production') {
    const dbUrl = process.env.DATABASE_URL!;
    
    // Check for SSL mode in production
    if (!dbUrl.includes('sslmode=require') && !dbUrl.includes('ssl=true')) {
      console.warn('⚠️  WARNING: DATABASE_URL does not include SSL configuration.');
      console.warn('   Production databases should use: ?sslmode=require');
      console.warn('   Connection may fail with hosted databases like Supabase.\n');
    }
  }

  console.log('✅ Environment variables validated');
}
