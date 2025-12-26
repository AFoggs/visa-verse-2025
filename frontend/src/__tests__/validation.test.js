/**
 * Validation Tests
 * Tests for form validation logic used across the application
 */

import { describe, it, expect } from 'vitest';

// Email validation function (from Register.jsx)
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation rules (from Register.jsx)
const getPasswordRules = (password) => {
  return {
    minLength: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(password),
  };
};

const isPasswordValid = (password) => {
  const rules = getPasswordRules(password);
  return Object.values(rules).every(Boolean);
};

// Age validation (from Onboarding.jsx)
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const isValidAge = (age) => age !== null && age >= 18 && age <= 100;

describe('Email Validation', () => {
  it('should accept valid email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.user@domain.org')).toBe(true);
    expect(isValidEmail('name+tag@company.co.uk')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
    expect(isValidEmail('spaces in@email.com')).toBe(false);
  });
});

describe('Password Validation', () => {
  it('should validate minimum length of 8 characters', () => {
    expect(getPasswordRules('short1!').minLength).toBe(false);
    expect(getPasswordRules('longenough1!').minLength).toBe(true);
  });

  it('should require at least one letter', () => {
    expect(getPasswordRules('12345678!').hasLetter).toBe(false);
    expect(getPasswordRules('12345678a!').hasLetter).toBe(true);
  });

  it('should require at least one number', () => {
    expect(getPasswordRules('password!').hasNumber).toBe(false);
    expect(getPasswordRules('password1!').hasNumber).toBe(true);
  });

  it('should require at least one special character', () => {
    expect(getPasswordRules('password1').hasSpecial).toBe(false);
    expect(getPasswordRules('password1!').hasSpecial).toBe(true);
    expect(getPasswordRules('password1@').hasSpecial).toBe(true);
    expect(getPasswordRules('password1#').hasSpecial).toBe(true);
  });

  it('should accept valid passwords', () => {
    expect(isPasswordValid('Password1!')).toBe(true);
    expect(isPasswordValid('SecureP@ss123')).toBe(true);
    expect(isPasswordValid('MyP@ssw0rd')).toBe(true);
  });

  it('should reject invalid passwords', () => {
    expect(isPasswordValid('short1!')).toBe(false);
    expect(isPasswordValid('password')).toBe(false);
    expect(isPasswordValid('12345678')).toBe(false);
    expect(isPasswordValid('passwordnonum!')).toBe(false);
  });
});

describe('Age Validation', () => {
  it('should calculate correct age', () => {
    const today = new Date();
    const thirtyYearsAgo = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate());
    expect(calculateAge(thirtyYearsAgo.toISOString().split('T')[0])).toBe(30);
  });

  it('should handle birthday not yet passed this year', () => {
    const today = new Date();
    // Birthday 6 months in the future
    const futureMonth = (today.getMonth() + 6) % 12;
    const birthYear = today.getFullYear() - 25;
    const birthDate = new Date(birthYear, futureMonth, 15);

    const age = calculateAge(birthDate.toISOString().split('T')[0]);
    // Should be 24 if birthday hasn't passed, 25 if it has
    expect(age).toBeGreaterThanOrEqual(24);
    expect(age).toBeLessThanOrEqual(25);
  });

  it('should return null for empty date', () => {
    expect(calculateAge('')).toBe(null);
    expect(calculateAge(null)).toBe(null);
    expect(calculateAge(undefined)).toBe(null);
  });

  it('should accept ages between 18 and 100', () => {
    expect(isValidAge(18)).toBe(true);
    expect(isValidAge(25)).toBe(true);
    expect(isValidAge(50)).toBe(true);
    expect(isValidAge(100)).toBe(true);
  });

  it('should reject ages under 18', () => {
    expect(isValidAge(17)).toBe(false);
    expect(isValidAge(10)).toBe(false);
    expect(isValidAge(0)).toBe(false);
  });

  it('should reject ages over 100', () => {
    expect(isValidAge(101)).toBe(false);
    expect(isValidAge(150)).toBe(false);
  });

  it('should reject null age', () => {
    expect(isValidAge(null)).toBe(false);
  });
});

describe('Name Validation', () => {
  const isValidName = (name) => name.trim().length >= 2;

  it('should accept valid names', () => {
    expect(isValidName('Al')).toBe(true);
    expect(isValidName('John')).toBe(true);
    expect(isValidName('Mary Jane')).toBe(true);
    expect(isValidName('Jean-Pierre')).toBe(true);
  });

  it('should reject names shorter than 2 characters', () => {
    expect(isValidName('A')).toBe(false);
    expect(isValidName('')).toBe(false);
    expect(isValidName('   ')).toBe(false);
  });

  it('should trim whitespace before validation', () => {
    expect(isValidName('  A  ')).toBe(false);
    expect(isValidName('  Al  ')).toBe(true);
  });
});

describe('Registration Form Validation', () => {
  const isFormValid = (formData) => {
    const { name, email, password, confirmPassword } = formData;
    return (
      name.trim().length >= 2 &&
      isValidEmail(email) &&
      isPasswordValid(password) &&
      password === confirmPassword
    );
  };

  it('should accept valid form data', () => {
    expect(isFormValid({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
    })).toBe(true);
  });

  it('should reject when name is too short', () => {
    expect(isFormValid({
      name: 'J',
      email: 'john@example.com',
      password: 'Password1!',
      confirmPassword: 'Password1!',
    })).toBe(false);
  });

  it('should reject when email is invalid', () => {
    expect(isFormValid({
      name: 'John Doe',
      email: 'invalid-email',
      password: 'Password1!',
      confirmPassword: 'Password1!',
    })).toBe(false);
  });

  it('should reject when password is invalid', () => {
    expect(isFormValid({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'weak',
      confirmPassword: 'weak',
    })).toBe(false);
  });

  it('should reject when passwords do not match', () => {
    expect(isFormValid({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password1!',
      confirmPassword: 'Password2!',
    })).toBe(false);
  });
});

describe('Onboarding Step Validation', () => {
  const isStep1Valid = (profile) => {
    const age = calculateAge(profile.dateOfBirth);
    return profile.name.trim().length >= 2 && isValidAge(age);
  };

  const isStep2Valid = (mobility) => mobility.mode !== '';

  const isStep3Valid = (mobility) => {
    return mobility.area.country.trim().length > 0 &&
      (mobility.mode === 'TRAVELER' ? mobility.travelReason !== '' : mobility.localReason !== '');
  };

  const isStep4Valid = (mobility) => {
    return mobility.goal !== '' && mobility.connectionIntent !== '';
  };

  const isStep5Valid = (profile) => profile.interests.length >= 5;

  it('should validate step 1 correctly', () => {
    const today = new Date();
    const validDOB = new Date(today.getFullYear() - 25, 0, 1).toISOString().split('T')[0];
    const invalidDOB = new Date(today.getFullYear() - 15, 0, 1).toISOString().split('T')[0];

    expect(isStep1Valid({ name: 'John', dateOfBirth: validDOB })).toBe(true);
    expect(isStep1Valid({ name: 'J', dateOfBirth: validDOB })).toBe(false);
    expect(isStep1Valid({ name: 'John', dateOfBirth: invalidDOB })).toBe(false);
  });

  it('should validate step 2 correctly', () => {
    expect(isStep2Valid({ mode: 'LOCAL' })).toBe(true);
    expect(isStep2Valid({ mode: 'TRAVELER' })).toBe(true);
    expect(isStep2Valid({ mode: '' })).toBe(false);
  });

  it('should validate step 3 correctly for travelers', () => {
    expect(isStep3Valid({
      mode: 'TRAVELER',
      area: { country: 'Germany' },
      travelReason: 'RELOCATING',
    })).toBe(true);

    expect(isStep3Valid({
      mode: 'TRAVELER',
      area: { country: 'Germany' },
      travelReason: '',
    })).toBe(false);

    expect(isStep3Valid({
      mode: 'TRAVELER',
      area: { country: '' },
      travelReason: 'RELOCATING',
    })).toBe(false);
  });

  it('should validate step 3 correctly for locals', () => {
    expect(isStep3Valid({
      mode: 'LOCAL',
      area: { country: 'Germany' },
      localReason: 'WELCOME_OTHERS',
    })).toBe(true);

    expect(isStep3Valid({
      mode: 'LOCAL',
      area: { country: 'Germany' },
      localReason: '',
    })).toBe(false);
  });

  it('should validate step 4 correctly', () => {
    expect(isStep4Valid({
      goal: 'MAKE_FRIENDS',
      connectionIntent: 'COMMUNITY',
    })).toBe(true);

    expect(isStep4Valid({
      goal: '',
      connectionIntent: 'COMMUNITY',
    })).toBe(false);

    expect(isStep4Valid({
      goal: 'MAKE_FRIENDS',
      connectionIntent: '',
    })).toBe(false);
  });

  it('should validate step 5 correctly', () => {
    expect(isStep5Valid({
      interests: ['Travel', 'Music', 'Photography', 'Cooking', 'Reading'],
    })).toBe(true);

    expect(isStep5Valid({
      interests: ['Travel', 'Music', 'Photography'],
    })).toBe(false);

    expect(isStep5Valid({
      interests: [],
    })).toBe(false);
  });
});
