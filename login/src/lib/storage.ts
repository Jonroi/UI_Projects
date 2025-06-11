/**
 * Storage Manager - Handles localStorage operations with error handling
 */
export class StorageManager {
  static getItem<T>(key: string, defaultValue: T | null = null): T | null {
    if (typeof window === 'undefined') return defaultValue;

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn('Storage read failed:', error);
      return defaultValue;
    }
  }

  static setItem<T>(key: string, value: T): boolean {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn('Storage write failed:', error);
      return false;
    }
  }

  static removeItem(key: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('Storage remove failed:', error);
      return false;
    }
  }

  static clear(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('Storage clear failed:', error);
      return false;
    }
  }

  // Specific getters for type safety
  static getUsers(): Record<string, string> {
    return this.getItem('registeredUsers', {}) || {};
  }

  static getUserData(): Record<string, any> {
    return this.getItem('allUserData', {}) || {};
  }

  static getSession(): any {
    return this.getItem('userSession');
  }

  static getRememberedEmail(): string | null {
    return this.getItem('rememberedEmail');
  }

  static getDraftEmail(): string | null {
    return this.getItem('draftEmail');
  }

  static getLoginAttempts(): number {
    return this.getItem('loginFailedAttempts', 0) || 0;
  }

  static getLastFailedAttempt(): number | null {
    return this.getItem('lastFailedAttempt');
  }

  static getCurrentOTP(): any {
    return this.getItem('currentOTP');
  }

  static getOTPFailedAttempts(): number {
    return this.getItem('otpFailedAttempts', 0) || 0;
  }

  static getOTPResendCount(): number {
    return this.getItem('otpResendCount', 0) || 0;
  }

  static getLastOTPResend(): number | null {
    return this.getItem('lastOTPResend');
  }

  static getPasswordResetVerified(): any {
    return this.getItem('passwordResetVerified');
  }

  static getLoginHistory(): any[] {
    return this.getItem('loginHistory', []) || [];
  }

  static getRegistrationHistory(): any[] {
    return this.getItem('registrationHistory', []) || [];
  }
}
