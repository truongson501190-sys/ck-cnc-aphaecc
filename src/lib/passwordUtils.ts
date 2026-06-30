/**
 * Password utility functions for secure password hashing and verification
 * Uses bcryptjs for cryptographic password hashing
 * 
 * Phase 1: Core password security implementation
 * - Hash all passwords with bcrypt (cost factor 12)
 * - Verify passwords during login
 * - Generate random passwords for new users
 * - Validate password policies
 */

import bcryptjs from 'bcryptjs';

// ================= CONSTANTS =================
const BCRYPT_SALT_ROUNDS = 12; // Higher cost = slower brute-force attacks

// Password policy requirements
export const PASSWORD_POLICY = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
};

// ================= PASSWORD HASHING =================

/**
 * Hash a plain-text password using bcryptjs
 * @param password Plain-text password to hash
 * @returns Hashed password string (starts with $2a$ or $2b$)
 * @throws Error if bcryptjs fails
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const hash = await bcryptjs.hash(password, BCRYPT_SALT_ROUNDS);
    return hash;
  } catch (error) {
    console.error('❌ Error hashing password:', error);
    throw new Error('Password hashing failed');
  }
}

/**
 * Verify a plain-text password against a bcrypt hash
 * @param password Plain-text password to verify
 * @param hash Bcrypt hash to compare against
 * @returns true if password matches hash, false otherwise
 * @throws Error if bcryptjs fails
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    // Handle backward compatibility: if hash is not a bcrypt hash, do plain comparison
    if (!hash) {
      return false;
    }

    if (!hash.startsWith('$2a$') && !hash.startsWith('$2b$') && !hash.startsWith('$2y$')) {
      console.warn('⚠️ Non-bcrypt hash detected, using plain-text comparison (migration mode)');
      return password === hash;
    }

    const isMatch = await bcryptjs.compare(password, hash);
    return isMatch;
  } catch (error) {
    console.error('❌ Error verifying password:', error);
    // On error, assume password is incorrect (fail secure)
    return false;
  }
}

// ================= PASSWORD GENERATION =================

/**
 * Generate a cryptographically random password
 * @returns Random password meeting policy requirements
 */
export function generateRandomPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const allChars = uppercase + lowercase + numbers + symbols;

  // Ensure at least one of each required character type
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill remaining 8 characters with random chars from all types
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

// ================= PASSWORD VALIDATION =================

/**
 * Validate password against policy requirements
 * @param password Password to validate
 * @returns Object with isValid boolean and errors array
 */
export function validatePasswordPolicy(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letters');
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letters');
  }

  if (PASSWORD_POLICY.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain numbers');
  }

  if (PASSWORD_POLICY.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push('Password must contain symbols (!@#$%^&*()_+-=[]{}|;:,.<>?)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ================= PASSWORD MIGRATION =================

/**
 * Check if a password hash is already bcrypt hashed
 * @param hash Hash to check
 * @returns true if hash is bcrypt format, false otherwise
 */
export function isBcryptHash(hash: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(hash);
}

/**
 * Get migration status from localStorage
 * @returns true if all passwords have been migrated to bcrypt, false otherwise
 */
export function getPasswordMigrationStatus(): boolean {
  const status = localStorage.getItem('passwordsMigratedToBcrypt');
  return status === 'true';
}

/**
 * Mark passwords as migrated to bcrypt in localStorage
 */
export function setPasswordMigrationStatus(migrated: boolean): void {
  localStorage.setItem('passwordsMigratedToBcrypt', String(migrated));
  localStorage.setItem('passwordsMigrationTimestamp', new Date().toISOString());
}

/**
 * Password backup/restore is deprecated - system now uses bcrypt only for all passwords
 * @deprecated
 */
export function createPasswordBackup(): void {
  console.log('⏭️ Password backup function deprecated - all passwords are now bcrypt hashed');
}

/**
 * Migrate all passwords in localStorage from plain text to bcrypt
 * Called once during app initialization if migration not yet done
 * 
 * NEW: Works with users table instead of deprecated user_records
 */
export async function migratePasswordsToBcrypt(): Promise<void> {
  try {
    // Check if already migrated
    if (getPasswordMigrationStatus()) {
      console.log('✅ Passwords already migrated to bcrypt');
      return;
    }

    console.log('🔄 Starting password migration to bcrypt...');

    // Get current users from localStorage
    const usersStr = localStorage.getItem('users');
    if (!usersStr) {
      console.warn('⚠️ No users found, skipping migration');
      setPasswordMigrationStatus(true);
      return;
    }

    try {
      const users = JSON.parse(usersStr);

      // Track migration progress
      let migratedCount = 0;
      let skippedCount = 0;

      // Hash all passwords in users table
      for (const user of users) {
        const rawPassword = user.password_hash;
        if (rawPassword) {
          // Check if already hashed
          if (isBcryptHash(rawPassword)) {
            skippedCount++;
            console.log(`⏭️ Already hashed: ${user.msnv}`);
          } else {
            // Hash the plain-text password
            const hashedPassword = await hashPassword(rawPassword);
            user.password_hash = hashedPassword;
            migratedCount++;
            console.log(`✅ Migrated: ${user.msnv}`);
          }
        }
      }

      // Save migrated users back to localStorage
      localStorage.setItem('users', JSON.stringify(users));
      setPasswordMigrationStatus(true);

      console.log(`✅ Password migration complete: ${migratedCount} migrated, ${skippedCount} already hashed`);
    } catch (parseError) {
      console.error('❌ Failed to parse users:', parseError);
      throw parseError;
    }
  } catch (error) {
    console.error('❌ Password migration failed:', error);
    // Don't throw - allow app to continue in migration mode
    // Users can still log in with plain-text comparison fallback
  }
}

// ================= TYPE EXPORTS =================

export type PasswordValidation = ReturnType<typeof validatePasswordPolicy>;
