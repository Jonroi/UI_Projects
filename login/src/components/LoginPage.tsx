'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faEye,
  faEyeSlash,
  faTimes,
  faUsers,
  faShieldAlt,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { StorageManager } from '@/lib/storage';
import { CONFIG } from '@/lib/constants';
import type {
  LoginResult,
  OTPResult,
  RegistrationResult,
  FormValidationResult,
} from '@/types';

export function LoginPage() {
  // State management
  const [isOTPModalOpen, setIsOTPModalOpen] = useState(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form data
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  // Initialize form with remembered/draft email
  useEffect(() => {
    const rememberedEmail = StorageManager.getRememberedEmail();
    const draftEmail = StorageManager.getDraftEmail();

    if (rememberedEmail) {
      setLoginData((prev) => ({
        ...prev,
        email: rememberedEmail,
        rememberMe: true,
      }));
    } else if (draftEmail) {
      setLoginData((prev) => ({ ...prev, email: draftEmail }));
    }
  }, []);

  // Utility functions
  const generateId = () => Math.random().toString(36).substr(2, 9);
  const generateOTP = () =>
    Math.floor(100000 + Math.random() * 900000).toString();
  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isStrongPassword = (password: string) =>
    password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);

  // Toast functions
  const showSuccessToast = (message: string) => toast.success(message);
  const showErrorToast = (message: string) => toast.error(message);
  const showWarningToast = (message: string) => toast.warning(message);
  const showInfoToast = (message: string) => toast.info(message);

  // Validation
  const validateLoginForm = (): FormValidationResult => {
    const errors: Record<string, string> = {};

    if (!isValidEmail(loginData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (loginData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  const validateSignUpForm = (): FormValidationResult => {
    const errors: Record<string, string> = {};

    if (signUpData.fullName.length < 2) {
      errors.fullName = 'Please enter your full name (at least 2 characters)';
    }

    if (!isValidEmail(signUpData.email)) {
      errors.email = 'Please enter a valid email address';
    } else {
      const existingUsers = StorageManager.getUsers();
      if (existingUsers[signUpData.email]) {
        errors.email = 'An account with this email already exists';
      }
    }

    if (!isStrongPassword(signUpData.password)) {
      errors.password =
        'Password must be at least 8 characters with uppercase, lowercase, and number';
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!signUpData.agreeTerms) {
      errors.agreeTerms =
        'Please agree to the Terms of Service and Privacy Policy';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  // Account security
  const isAccountLocked = () => {
    const attempts = StorageManager.getLoginAttempts();
    const lastAttempt = StorageManager.getLastFailedAttempt();

    if (attempts >= CONFIG.MAX_LOGIN_ATTEMPTS && lastAttempt) {
      const timeSince = Date.now() - lastAttempt;
      const lockoutTime = CONFIG.LOCKOUT_MINUTES * 60 * 1000;
      if (timeSince < lockoutTime) {
        return Math.ceil((lockoutTime - timeSince) / 60000);
      }
    }
    return false;
  };

  // Authentication
  const tryLogin = (
    email: string,
    password: string,
    rememberMe: boolean,
  ): LoginResult => {
    const users = StorageManager.getUsers();

    if (users[email] === password) {
      // Success - clear failed attempts
      StorageManager.removeItem('loginFailedAttempts');
      StorageManager.removeItem('lastFailedAttempt');

      // Create session
      const sessionData = {
        email: email,
        loginTime: Date.now(),
        sessionId: `session_${generateId()}`,
        rememberMe: rememberMe,
      };
      StorageManager.setItem('userSession', sessionData);

      // Handle remember me
      if (rememberMe) {
        StorageManager.setItem('rememberedEmail', email);
      } else {
        StorageManager.removeItem('rememberedEmail');
      }

      // Record successful login
      const history = StorageManager.getLoginHistory();
      history.unshift({
        email: email,
        timestamp: Date.now(),
        success: true,
        userAgent: navigator.userAgent,
      });
      if (history.length > 10) history.pop();
      StorageManager.setItem('loginHistory', history);

      return { success: true };
    } else {
      // Failed - record attempt
      const attempts = StorageManager.getLoginAttempts() + 1;
      StorageManager.setItem('loginFailedAttempts', attempts);
      StorageManager.setItem('lastFailedAttempt', Date.now());

      // Record failed login
      const history = StorageManager.getLoginHistory();
      history.unshift({
        email: email,
        timestamp: Date.now(),
        success: false,
        userAgent: navigator.userAgent,
      });
      if (history.length > 10) history.pop();
      StorageManager.setItem('loginHistory', history);

      const remaining = CONFIG.MAX_LOGIN_ATTEMPTS - attempts;
      return {
        success: false,
        attempts: attempts,
        remaining: Math.max(0, remaining),
        locked: attempts >= CONFIG.MAX_LOGIN_ATTEMPTS,
      };
    }
  };

  const registerUser = (userData: typeof signUpData): RegistrationResult => {
    const users = StorageManager.getUsers();
    const allUsers = StorageManager.getUserData();

    if (users[userData.email]) {
      return { success: false, error: 'Email already exists' };
    }

    users[userData.email] = userData.password;
    StorageManager.setItem('registeredUsers', users);

    const fullUserData = {
      ...userData,
      registrationDate: Date.now(),
      userId: `user_${generateId()}`,
      isEmailVerified: true,
      lastLogin: null,
    };

    allUsers[userData.email] = fullUserData;
    StorageManager.setItem('allUserData', allUsers);

    // Record registration
    const history = StorageManager.getRegistrationHistory();
    history.unshift({
      email: userData.email,
      fullName: userData.fullName,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    });
    if (history.length > 50) history.pop();
    StorageManager.setItem('registrationHistory', history);

    return { success: true };
  };

  // OTP functions
  const createOTP = (email: string) => {
    const otp = generateOTP();
    const otpData = {
      otp: otp,
      email: email,
      timestamp: Date.now(),
      expires: Date.now() + CONFIG.OTP_EXPIRY_MINUTES * 60 * 1000,
    };

    StorageManager.setItem('currentOTP', otpData);
    StorageManager.removeItem('otpFailedAttempts');

    return otp;
  };

  const verifyOTP = (inputOTP: string): OTPResult => {
    const storedData = StorageManager.getCurrentOTP();
    if (!storedData) {
      return { success: false, error: 'OTP session expired' };
    }

    if (Date.now() > storedData.expires) {
      StorageManager.removeItem('currentOTP');
      return { success: false, error: 'OTP has expired' };
    }

    if (inputOTP === storedData.otp) {
      StorageManager.removeItem('currentOTP');
      StorageManager.removeItem('otpFailedAttempts');

      const verificationData = {
        email: storedData.email,
        verified: true,
        timestamp: Date.now(),
        resetToken: `reset_${generateId()}`,
      };
      StorageManager.setItem('passwordResetVerified', verificationData);

      return { success: true, verificationData: verificationData };
    } else {
      const attempts = StorageManager.getOTPFailedAttempts() + 1;
      StorageManager.setItem('otpFailedAttempts', attempts);

      if (attempts >= 3) {
        StorageManager.removeItem('currentOTP');
        StorageManager.removeItem('otpFailedAttempts');
        return {
          success: false,
          error: 'Too many failed attempts',
          maxReached: true,
        };
      }

      return {
        success: false,
        error: `Invalid code. ${3 - attempts} attempts remaining`,
        remaining: 3 - attempts,
      };
    }
  };

  // Event handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const lockoutTime = isAccountLocked();
    if (lockoutTime) {
      showErrorToast(
        `Too many failed attempts. Please try again in ${lockoutTime} minutes.`,
      );
      return;
    }

    const validation = validateLoginForm();
    if (!validation.isValid) {
      Object.values(validation.errors).forEach((error) =>
        showErrorToast(error),
      );
      return;
    }

    setIsLoading(true);

    // Simulate API call delay
    setTimeout(() => {
      const result = tryLogin(
        loginData.email,
        loginData.password,
        loginData.rememberMe,
      );

      if (result.success) {
        showSuccessToast('Login successful! Welcome back.');

        // Clear form fields after successful login
        if (!loginData.rememberMe) {
          setLoginData((prev) => ({ ...prev, email: '' }));
          StorageManager.removeItem('draftEmail');
        }
        setLoginData((prev) => ({ ...prev, password: '' }));
      } else {
        if (result.locked) {
          showErrorToast(
            'Too many failed attempts. Account temporarily locked for 15 minutes.',
          );
        } else {
          showErrorToast(
            `Invalid credentials. ${result.remaining} attempts remaining before lockout.`,
          );
        }
      }

      setIsLoading(false);
    }, 1500);
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateSignUpForm();
    if (!validation.isValid) {
      Object.values(validation.errors).forEach((error) =>
        showErrorToast(error),
      );
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = registerUser(signUpData);

      if (result.success) {
        showSuccessToast(
          `Account created successfully! Welcome ${signUpData.fullName}! You can now sign in with your email and password.`,
        );

        setLoginData((prev) => ({ ...prev, email: signUpData.email }));
        setIsSignUpModalOpen(false);
        setSignUpData({
          fullName: '',
          email: '',
          password: '',
          confirmPassword: '',
          agreeTerms: false,
        });
      } else {
        showErrorToast(`Registration failed: ${result.error}`);
      }

      setIsLoading(false);
    }, 2000);
  };

  const handleForgotPassword = () => {
    if (!isValidEmail(loginData.email)) {
      showErrorToast('Please enter your email address first');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const otp = createOTP(loginData.email);

      console.log('Generated OTP:', otp);
      showInfoToast(
        `OTP sent to ${loginData.email}! For testing purposes, your OTP is: ${otp} (In real app, this would be sent via email)`,
      );

      setIsOTPModalOpen(true);
      setIsLoading(false);
    }, 1500);
  };

  const handleOTPSubmit = () => {
    const otp = otpValues.join('');

    if (otp.length !== CONFIG.OTP_LENGTH) {
      showWarningToast(
        `Please enter the complete ${CONFIG.OTP_LENGTH}-digit code`,
      );
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = verifyOTP(otp);

      if (result.success) {
        showSuccessToast(
          'OTP verified successfully! You can now reset your password.',
        );
        setIsOTPModalOpen(false);
        setOtpValues(['', '', '', '', '', '']);
        console.log(
          'Reset token generated:',
          result.verificationData?.resetToken,
        );
      } else {
        showErrorToast(result.error || 'Verification failed');
        if (result.maxReached) {
          setIsOTPModalOpen(false);
        } else {
          setOtpValues(['', '', '', '', '', '']);
        }
      }

      setIsLoading(false);
    }, 1000);
  };

  const handleOTPInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newValues = [...otpValues];
    newValues[index] = value.slice(-1);
    setOtpValues(newValues);

    // Auto-focus next input
    if (value && index < CONFIG.OTP_LENGTH - 1) {
      const nextInput = document.querySelector(
        `input[data-otp-index="${index + 1}"]`,
      ) as HTMLInputElement;
      nextInput?.focus();
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      const prevInput = document.querySelector(
        `input[data-otp-index="${index - 1}"]`,
      ) as HTMLInputElement;
      prevInput?.focus();
    }
  };

  // Auto-save draft email
  useEffect(() => {
    if (loginData.email) {
      StorageManager.setItem('draftEmail', loginData.email);
    } else {
      StorageManager.removeItem('draftEmail');
    }
  }, [loginData.email]);

  return (
    <div className='min-h-screen flex items-center justify-center antialiased relative z-10'>
      {/* Skip link for accessibility */}
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-emerald-600 text-white px-4 py-2 rounded-lg z-50 modern-button'>
        Skip to main content
      </a>

      {/* Main Container */}
      <div
        className='w-full max-w-sm mx-auto px-4 py-6 animate-fade-in'
        role='main'
        id='main-content'>
        {/* Logo and Title */}
        <header className='text-center mb-8'>
          <div className='w-24 h-24 mx-auto mb-6 group'>
            <div className='glass-morphism rounded-3xl w-full h-full flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform duration-500'>
              <div className='absolute inset-0 bg-gradient-to-br from-emerald-400/30 to-green-600/30'></div>
              <FontAwesomeIcon
                icon={faBuilding}
                className='text-white text-5xl drop-shadow-lg relative z-10 group-hover:scale-110 transition-transform duration-300'
              />
              <div className='absolute inset-0 bg-gradient-to-t from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
            </div>
          </div>
          <h1 className='text-3xl font-bold text-white tracking-tight mb-2 drop-shadow-lg'>
            Welcome Back
          </h1>
          <p className='text-white/80 mt-2 text-base font-medium drop-shadow-sm'>
            Access your enterprise dashboard
          </p>
        </header>

        {/* Login Form */}
        <main className='glass-card rounded-3xl p-8 relative overflow-hidden animate-scale-in'>
          <div className='absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 rounded-3xl pointer-events-none'></div>
          <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-green-500 rounded-t-3xl'></div>

          <div className='relative z-10'>
            <form onSubmit={handleLoginSubmit} className='space-y-5'>
              {/* Email Field */}
              <div className='relative input-group mb-6'>
                <input
                  type='email'
                  id='email'
                  name='email'
                  value={loginData.email}
                  onChange={(e) =>
                    setLoginData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className='modern-input w-full px-6 py-4 rounded-2xl outline-none text-slate-800 font-medium text-base peer placeholder-transparent'
                  placeholder='Email address'
                  required
                />
                <label
                  htmlFor='email'
                  className={`floating-label absolute left-6 top-4 text-slate-600 pointer-events-none font-medium transition-all duration-300 ${
                    loginData.email ? 'active' : ''
                  }`}>
                  Email address
                </label>
              </div>

              {/* Password Field */}
              <div className='relative input-group mb-6'>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id='password'
                  name='password'
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className='modern-input w-full px-6 py-4 pr-14 rounded-2xl outline-none text-slate-800 font-medium text-base peer placeholder-transparent'
                  placeholder='Password'
                  required
                />
                <label
                  htmlFor='password'
                  className={`floating-label absolute left-6 top-4 text-slate-600 pointer-events-none font-medium transition-all duration-300 ${
                    loginData.password ? 'active' : ''
                  }`}>
                  Password
                </label>
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-4 top-4 text-slate-500 hover:text-emerald-600 transition-all duration-300 p-2 hover:bg-white/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 group'>
                  <FontAwesomeIcon
                    icon={showPassword ? faEyeSlash : faEye}
                    className='text-lg group-hover:scale-110 transition-transform duration-200'
                  />
                </button>
              </div>

              {/* Remember Me and Forgot Password */}
              <div className='flex items-center justify-between mb-8'>
                <label className='flex items-center cursor-pointer group'>
                  <input
                    type='checkbox'
                    id='rememberMe'
                    checked={loginData.rememberMe}
                    onChange={(e) =>
                      setLoginData((prev) => ({
                        ...prev,
                        rememberMe: e.target.checked,
                      }))
                    }
                    className='w-5 h-5 text-emerald-600 border-2 border-slate-300 rounded-lg focus:ring-emerald-500 focus:ring-2 focus:ring-offset-2 focus:outline-none transition-all duration-300 bg-white/80'
                  />
                  <span className='ml-3 text-sm text-slate-700 font-medium group-hover:text-slate-900 transition-colors'>
                    Remember me
                  </span>
                </label>
                <button
                  type='button'
                  onClick={handleForgotPassword}
                  disabled={isLoading}
                  className='text-sm text-emerald-600 hover:text-emerald-700 font-semibold transition-all duration-300 py-2 px-4 rounded-xl hover:bg-emerald-50/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 backdrop-blur-sm disabled:opacity-50'>
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type='submit'
                disabled={isLoading}
                className='modern-button w-full text-white py-4 rounded-2xl font-semibold text-base relative z-10 mb-8 disabled:opacity-50'>
                <span className='relative z-10'>
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </span>
              </button>
            </form>

            {/* Social Login Divider */}
            <div className='relative my-8'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-white/20'></div>
              </div>
              <div className='relative flex justify-center text-sm'>
                <span className='px-6 bg-white/10 backdrop-blur-sm text-slate-700 font-medium rounded-full py-2'>
                  Or continue with
                </span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className='flex justify-center space-x-6 mb-6'>
              <button
                aria-label='Sign in with Social Provider A'
                className='social-button w-16 h-16 rounded-2xl flex items-center justify-center group focus:outline-none focus:ring-4 focus:ring-blue-500/30'>
                <FontAwesomeIcon
                  icon={faUsers}
                  className='text-slate-700 text-2xl transition-all duration-300 relative z-10'
                />
              </button>
              <button
                aria-label='Sign in with Social Provider B'
                className='social-button w-16 h-16 rounded-2xl flex items-center justify-center group focus:outline-none focus:ring-4 focus:ring-emerald-500/30'>
                <FontAwesomeIcon
                  icon={faShieldAlt}
                  className='text-slate-700 text-2xl transition-all duration-300 relative z-10'
                />
              </button>
            </div>
          </div>
        </main>

        {/* Sign Up Link */}
        <footer className='text-center mt-8 text-white/90 text-base font-medium'>
          Don't have an account?
          <button
            onClick={() => setIsSignUpModalOpen(true)}
            className='text-white font-bold transition-all duration-300 py-3 px-6 rounded-2xl hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm ml-2 border border-white/20 hover:border-white/40'>
            Sign up
          </button>
        </footer>
      </div>

      {/* OTP Modal */}
      {isOTPModalOpen && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 z-50'>
          <div className='bg-white/95 backdrop-blur-xl rounded-3xl p-5 w-full max-w-sm mx-auto shadow-2xl border border-white/50 relative overflow-hidden'>
            <div className='absolute inset-0 bg-gradient-to-br from-white/60 to-white/30 rounded-3xl'></div>

            <div className='relative z-10'>
              <div className='text-center mb-6'>
                <h2 className='text-xl font-bold text-slate-800 mb-2'>
                  Enter Verification Code
                </h2>
                <p className='text-slate-600 text-sm font-medium'>
                  We've sent a 6-digit code to your email
                </p>
              </div>

              <div className='grid grid-cols-6 gap-3 mb-6'>
                {otpValues.map((value, index) => (
                  <input
                    key={index}
                    type='text'
                    maxLength={1}
                    value={value}
                    onChange={(e) =>
                      handleOTPInputChange(index, e.target.value)
                    }
                    onKeyDown={(e) => handleOTPKeyDown(index, e)}
                    data-otp-index={index}
                    className='otp-input aspect-square border-2 border-slate-200 rounded-lg text-center text-lg font-bold text-slate-900 bg-slate-50/80 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/40 focus:shadow-lg transition-all duration-300'
                  />
                ))}
              </div>

              <button
                onClick={handleOTPSubmit}
                disabled={isLoading}
                className='w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-4 rounded-xl font-semibold text-base shadow-lg shadow-emerald-500/30 hover:from-emerald-700 hover:to-green-700 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/50 focus:ring-offset-2 transform hover:-translate-y-0.5 active:translate-y-0 mb-4 disabled:opacity-50'>
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </button>

              <div className='text-center'>
                <button className='text-sm text-slate-600 hover:text-slate-700 font-medium transition-all duration-200 py-2 px-3 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/50 focus:bg-slate-100'>
                  Didn't receive code?
                  <span className='text-emerald-600 font-semibold'>
                    {' '}
                    Resend
                  </span>
                </button>
              </div>

              <button
                onClick={() => setIsOTPModalOpen(false)}
                className='absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500/50 focus:bg-slate-100'>
                <FontAwesomeIcon icon={faTimes} className='text-xl' />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Up Modal */}
      {isSignUpModalOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 modal-backdrop z-50'>
          <div className='bg-white rounded-2xl p-6 max-w-md w-full mx-4'>
            <header className='mb-6'>
              <h2 className='text-xl font-semibold text-gray-900 mb-2'>
                Create Account
              </h2>
              <p className='text-gray-600 text-base'>
                Join us today! Create your corporate account
              </p>
            </header>

            <form onSubmit={handleSignUpSubmit} className='space-y-5'>
              <div className='relative'>
                <input
                  type='text'
                  value={signUpData.fullName}
                  onChange={(e) =>
                    setSignUpData((prev) => ({
                      ...prev,
                      fullName: e.target.value,
                    }))
                  }
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg outline-none text-gray-900 text-base'
                  placeholder='Full Name'
                  required
                />
              </div>

              <div className='relative'>
                <input
                  type='email'
                  value={signUpData.email}
                  onChange={(e) =>
                    setSignUpData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className='w-full px-4 py-3 border border-gray-300 rounded-lg outline-none text-gray-900 text-base'
                  placeholder='Email address'
                  required
                />
              </div>

              <div className='relative'>
                <input
                  type={showSignUpPassword ? 'text' : 'password'}
                  value={signUpData.password}
                  onChange={(e) =>
                    setSignUpData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className='w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg outline-none text-gray-900 text-base'
                  placeholder='Password'
                  required
                />
                <button
                  type='button'
                  onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                  className='absolute right-3 top-3.5 text-gray-500 hover:text-gray-700 transition-colors p-1'>
                  <FontAwesomeIcon
                    icon={showSignUpPassword ? faEyeSlash : faEye}
                    className='text-lg'
                  />
                </button>
              </div>

              <div className='relative'>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={signUpData.confirmPassword}
                  onChange={(e) =>
                    setSignUpData((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  className='w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg outline-none text-gray-900 text-base'
                  placeholder='Confirm Password'
                  required
                />
                <button
                  type='button'
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className='absolute right-3 top-3.5 text-gray-500 hover:text-gray-700 transition-colors p-1'>
                  <FontAwesomeIcon
                    icon={showConfirmPassword ? faEyeSlash : faEye}
                    className='text-lg'
                  />
                </button>
              </div>

              <div className='flex items-start'>
                <input
                  type='checkbox'
                  checked={signUpData.agreeTerms}
                  onChange={(e) =>
                    setSignUpData((prev) => ({
                      ...prev,
                      agreeTerms: e.target.checked,
                    }))
                  }
                  className='w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 mt-0.5'
                  required
                />
                <label className='ml-2 text-sm text-gray-600'>
                  I agree to the
                  <a
                    href='#'
                    className='text-emerald-600 hover:text-emerald-700'>
                    {' '}
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href='#'
                    className='text-emerald-600 hover:text-emerald-700'>
                    Privacy Policy
                  </a>
                </label>
              </div>

              <button
                type='submit'
                disabled={isLoading}
                className='w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-4 rounded-xl font-semibold text-base shadow-lg shadow-emerald-500/30 hover:from-emerald-700 hover:to-green-700 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50'>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <footer className='text-center mt-6 text-gray-600 text-sm'>
              Already have an account?
              <button
                onClick={() => setIsSignUpModalOpen(false)}
                className='text-emerald-600 hover:text-emerald-700 font-semibold transition-all duration-200 py-2 px-3 rounded-lg hover:bg-emerald-50'>
                Sign in
              </button>
            </footer>

            <button
              onClick={() => setIsSignUpModalOpen(false)}
              className='absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 -m-2'>
              <FontAwesomeIcon icon={faTimes} className='text-xl' />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
