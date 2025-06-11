import { Config } from '@/types';

export const CONFIG: Config = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 15,
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 5,
  ANIMATION_DURATION: 300,
  RESEND_COOLDOWN: 60000,
  MAX_RESENDS: 3,
};

export const STORAGE_KEYS = {
  REGISTERED_USERS: 'registeredUsers',
  ALL_USER_DATA: 'allUserData',
  USER_SESSION: 'userSession',
  REMEMBERED_EMAIL: 'rememberedEmail',
  DRAFT_EMAIL: 'draftEmail',
  LOGIN_FAILED_ATTEMPTS: 'loginFailedAttempts',
  LAST_FAILED_ATTEMPT: 'lastFailedAttempt',
  CURRENT_OTP: 'currentOTP',
  OTP_FAILED_ATTEMPTS: 'otpFailedAttempts',
  OTP_RESEND_COUNT: 'otpResendCount',
  LAST_OTP_RESEND: 'lastOTPResend',
  PASSWORD_RESET_VERIFIED: 'passwordResetVerified',
  LOGIN_HISTORY: 'loginHistory',
  REGISTRATION_HISTORY: 'registrationHistory',
} as const;
