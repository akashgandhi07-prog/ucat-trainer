/**
 * Strong password validation for registration and password reset.
 * Requirements: min length 10, uppercase, lowercase, digit, special character.
 */

const MIN_LENGTH = 10;
const MAX_LENGTH = 128;

const HAS_UPPER = /[A-Z]/;
const HAS_LOWER = /[a-z]/;
const HAS_DIGIT = /[0-9]/;
const HAS_SPECIAL = /[^A-Za-z0-9]/;

export type PasswordValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export function validatePassword(password: string): PasswordValidationResult {
  const p = password;
  if (!p || p.length < MIN_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${MIN_LENGTH} characters.`,
    };
  }
  if (p.length > MAX_LENGTH) {
    return {
      valid: false,
      message: `Password must be no more than ${MAX_LENGTH} characters.`,
    };
  }
  if (!HAS_UPPER.test(p)) {
    return { valid: false, message: "Password must include at least one uppercase letter." };
  }
  if (!HAS_LOWER.test(p)) {
    return { valid: false, message: "Password must include at least one lowercase letter." };
  }
  if (!HAS_DIGIT.test(p)) {
    return { valid: false, message: "Password must include at least one number." };
  }
  if (!HAS_SPECIAL.test(p)) {
    return { valid: false, message: "Password must include at least one special character (e.g. !@#$%^&*)." };
  }
  return { valid: true };
}

export function getPasswordRequirementHint(): string {
  return `At least ${MIN_LENGTH} characters, with uppercase, lowercase, a number and a special character.`;
}
