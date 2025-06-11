export interface User {
  id: string;
  email: string;
  fullName: string;
  password: string;
  registrationDate: number;
  isEmailVerified: boolean;
  lastLogin: number | null;
}

export interface UserSession {
  email: string;
  loginTime: number;
  sessionId: string;
  rememberMe: boolean;
}

export interface LoginAttempt {
  email: string;
  timestamp: number;
  success: boolean;
  userAgent: string;
}

export interface OTPData {
  otp: string;
  email: string;
  timestamp: number;
  expires: number;
}

export interface PasswordResetData {
  email: string;
  verified: boolean;
  timestamp: number;
  resetToken: string;
}

export interface LoginResult {
  success: boolean;
  attempts?: number;
  remaining?: number;
  locked?: boolean;
}

export interface OTPResult {
  success: boolean;
  error?: string;
  maxReached?: boolean;
  remaining?: number;
  verificationData?: PasswordResetData;
}

export interface ResendResult {
  success: boolean;
  canResend?: boolean;
  reason?: string;
  remaining?: number;
  otp?: string;
}

export interface RegistrationResult {
  success: boolean;
  error?: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface ToastType {
  SUCCESS: 'success';
  ERROR: 'error';
  WARNING: 'warning';
  INFO: 'info';
}

export interface Config {
  MAX_LOGIN_ATTEMPTS: number;
  LOCKOUT_MINUTES: number;
  OTP_LENGTH: number;
  OTP_EXPIRY_MINUTES: number;
  ANIMATION_DURATION: number;
  RESEND_COOLDOWN: number;
  MAX_RESENDS: number;
}
