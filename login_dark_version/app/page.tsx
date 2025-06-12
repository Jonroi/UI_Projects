'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Building2, Mail, Lock, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  email: string;
  password: string;
  fullName?: string;
  registrationDate?: number;
  isEmailVerified?: boolean;
}

interface OTPData {
  otp: string;
  email: string;
  timestamp: number;
  expires: number;
}

export default function LoginPage() {
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isOTPOpen, setIsOTPOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [rememberMe, setRememberMe] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  // Constants
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_MINUTES = 15;
  const OTP_LENGTH = 6;
  const OTP_EXPIRY_MINUTES = 5;

  // Load remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  // Helper functions
  const generateOTP = () =>
    Math.floor(100000 + Math.random() * 900000).toString();

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const isStrongPassword = (password: string) =>
    password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);

  const getFromStorage = (key: string, defaultValue: any = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const saveToStorage = (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Storage failed:', error);
    }
  };

  const isAccountLocked = () => {
    const attempts = getFromStorage('loginFailedAttempts', 0);
    const lastAttempt = getFromStorage('lastFailedAttempt');

    if (attempts >= MAX_LOGIN_ATTEMPTS && lastAttempt) {
      const timeSince = Date.now() - lastAttempt;
      const lockoutTime = LOCKOUT_MINUTES * 60 * 1000;
      if (timeSince < lockoutTime) {
        return Math.ceil((lockoutTime - timeSince) / 60000);
      }
    }
    return false;
  };

  const tryLogin = (email: string, password: string, rememberMe: boolean) => {
    const users = getFromStorage('registeredUsers', {});

    if (users[email] === password) {
      // Success
      localStorage.removeItem('loginFailedAttempts');
      localStorage.removeItem('lastFailedAttempt');

      const sessionData = {
        email,
        loginTime: Date.now(),
        sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
        rememberMe,
      };
      saveToStorage('userSession', sessionData);

      if (rememberMe) {
        saveToStorage('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      return { success: true };
    } else {
      // Failed
      const attempts = getFromStorage('loginFailedAttempts', 0) + 1;
      saveToStorage('loginFailedAttempts', attempts);
      saveToStorage('lastFailedAttempt', Date.now());

      const remaining = MAX_LOGIN_ATTEMPTS - attempts;
      return {
        success: false,
        attempts,
        remaining: Math.max(0, remaining),
        locked: attempts >= MAX_LOGIN_ATTEMPTS,
      };
    }
  };

  const registerUser = (userData: any) => {
    const users = getFromStorage('registeredUsers', {});

    if (users[userData.email]) {
      return { success: false, error: 'Email already exists' };
    }

    users[userData.email] = userData.password;
    saveToStorage('registeredUsers', users);

    const fullUserData = {
      ...userData,
      registrationDate: Date.now(),
      userId: `user_${Math.random().toString(36).substr(2, 9)}`,
      isEmailVerified: true,
      lastLogin: null,
    };

    const allUsers = getFromStorage('allUserData', {});
    allUsers[userData.email] = fullUserData;
    saveToStorage('allUserData', allUsers);

    return { success: true };
  };

  const createOTP = (email: string) => {
    const otp = generateOTP();
    const otpData: OTPData = {
      otp,
      email,
      timestamp: Date.now(),
      expires: Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
    };
    saveToStorage('currentOTP', otpData);
    return otp;
  };

  const verifyOTP = (inputOTP: string) => {
    const storedData = getFromStorage('currentOTP');
    if (!storedData) {
      return { success: false, error: 'OTP session expired' };
    }

    if (Date.now() > storedData.expires) {
      localStorage.removeItem('currentOTP');
      return { success: false, error: 'OTP has expired' };
    }

    if (inputOTP === storedData.otp) {
      localStorage.removeItem('currentOTP');
      return { success: true };
    } else {
      return { success: false, error: 'Invalid OTP code' };
    }
  };

  // Event handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const lockoutTime = isAccountLocked();
    if (lockoutTime) {
      toast.error(
        `Too many failed attempts. Please try again in ${lockoutTime} minutes.`,
      );
      return;
    }

    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const result = tryLogin(email, password, rememberMe);

    if (result.success) {
      toast.success('Login successful! Welcome back.');
      // Clear form
      if (!rememberMe) {
        setEmail('');
      }
      setPassword('');
    } else {
      if (result.locked) {
        toast.error(
          'Too many failed attempts. Account temporarily locked for 15 minutes.',
        );
      } else {
        toast.error(
          `Invalid credentials. ${result.remaining} attempts remaining.`,
        );
      }
    }

    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signUpData.fullName.length < 2) {
      toast.error('Please enter your full name (at least 2 characters)');
      return;
    }

    if (!isValidEmail(signUpData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!isStrongPassword(signUpData.password)) {
      toast.error(
        'Password must be at least 8 characters with uppercase, lowercase, and number',
      );
      return;
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!signUpData.agreeTerms) {
      toast.error('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const result = registerUser(signUpData);

    if (result.success) {
      toast.success(
        `Account created successfully! Welcome ${signUpData.fullName}!`,
      );
      setEmail(signUpData.email);
      setIsSignUpOpen(false);
      setSignUpData({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        agreeTerms: false,
      });
    } else {
      toast.error(`Registration failed: ${result.error}`);
    }

    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!isValidEmail(email)) {
      toast.error('Please enter your email address first');
      return;
    }

    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const otp = createOTP(email);
    console.log('Generated OTP:', otp);
    toast.success(`OTP sent to ${email}! For testing: ${otp}`);
    setIsOTPOpen(true);

    setIsLoading(false);
  };

  const handleVerifyOTP = async () => {
    const otp = otpValues.join('');

    if (otp.length !== OTP_LENGTH) {
      toast.error(`Please enter the complete ${OTP_LENGTH}-digit code`);
      return;
    }

    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const result = verifyOTP(otp);

    if (result.success) {
      toast.success(
        'OTP verified successfully! You can now reset your password.',
      );
      setIsOTPOpen(false);
      setOtpValues(['', '', '', '', '', '']);
    } else {
      toast.error(result.error);
      setOtpValues(['', '', '', '', '', '']);
    }

    setIsLoading(false);
  };

  const handleOTPInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtpValues = [...otpValues];
    newOtpValues[index] = value.slice(-1);
    setOtpValues(newOtpValues);

    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center p-6'>
      <div className='w-full max-w-md'>
        {/* Logo and Header */}
        <div className='text-center mb-10'>
          <div className='w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-accent-600 to-accent-700 rounded-2xl flex items-center justify-center shadow-lg shadow-accent-500/20 animate-float'>
            <Building2 className='text-white' size={40} />
          </div>
          <h1 className='text-3xl font-bold text-white mb-3 tracking-tight'>
            Welcome Back
          </h1>
          <p className='text-dark-400 text-lg'>
            Access your enterprise dashboard
          </p>
        </div>

        {/* Main Login Form */}
        <div className='card-modern p-8 mb-8'>
          <form onSubmit={handleLogin} className='space-y-6'>
            {/* Email Field */}
            <div className='relative'>
              <div className='absolute left-4 top-1/2 -translate-y-1/2 text-dark-400'>
                <Mail size={20} />
              </div>
              <input
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className='input-modern pl-12'
                placeholder='Email address'
                required
              />
            </div>

            {/* Password Field */}
            <div className='relative'>
              <div className='absolute left-4 top-1/2 -translate-y-1/2 text-dark-400'>
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className='input-modern pl-12 pr-12'
                placeholder='Password'
                required
              />
              <button
                type='button'
                onClick={() => setShowPassword(!showPassword)}
                className='absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-dark-700'>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className='flex items-center justify-between'>
              <label className='flex items-center cursor-pointer'>
                <input
                  type='checkbox'
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className='w-4 h-4 text-accent-600 border-dark-600 rounded focus:ring-accent-500 bg-dark-700'
                />
                <span className='ml-3 text-sm text-dark-300'>Remember me</span>
              </label>
              <button
                type='button'
                onClick={handleForgotPassword}
                disabled={isLoading}
                className='text-sm text-accent-400 hover:text-accent-300 transition-colors'>
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button type='submit' disabled={isLoading} className='btn-primary'>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Social Login Divider */}
          <div className='relative my-8'>
            <div className='absolute inset-0 flex items-center'>
              <div className='w-full border-t border-dark-700'></div>
            </div>
            <div className='relative flex justify-center text-sm'>
              <span className='px-6 bg-dark-800 text-dark-400'>
                Or continue with
              </span>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className='flex justify-center space-x-4'>
            <button
              onClick={() => toast('Google login will be enabled soon')}
              className='w-12 h-12 rounded-full bg-white/10 border border-dark-600 flex items-center justify-center hover:bg-white/20 transition-all duration-300 hover:-translate-y-1'>
              <div className='w-5 h-5 bg-white rounded-full'></div>
            </button>
            <button
              onClick={() => toast('Apple login will be enabled soon')}
              className='w-12 h-12 rounded-full bg-dark-900 border border-dark-600 flex items-center justify-center hover:bg-dark-700 transition-all duration-300 hover:-translate-y-1'>
              <div className='w-5 h-5 bg-white rounded-sm'></div>
            </button>
          </div>
        </div>

        {/* Sign Up Link */}
        <div className='text-center text-dark-400'>
          Don&apos;t have an account?{' '}
          <button
            onClick={() => setIsSignUpOpen(true)}
            className='text-accent-400 hover:text-accent-300 font-semibold transition-colors'>
            Sign up
          </button>
        </div>
      </div>

      {/* OTP Modal */}
      {isOTPOpen && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
          <div className='card-modern p-8 w-full max-w-sm mx-auto'>
            <div className='text-center mb-8'>
              <h2 className='text-xl font-bold text-white mb-3'>
                Enter Verification Code
              </h2>
              <p className='text-dark-400 text-sm'>
                We&apos;ve sent a 6-digit code to your email
              </p>
            </div>

            <div className='grid grid-cols-6 gap-3 mb-8'>
              {otpValues.map((value, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type='text'
                  maxLength={1}
                  value={value}
                  onChange={(e) => handleOTPInput(index, e.target.value)}
                  onKeyDown={(e) => handleOTPKeyDown(index, e)}
                  className='aspect-square text-center text-lg font-bold bg-dark-900/50 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500'
                />
              ))}
            </div>

            <button
              onClick={handleVerifyOTP}
              disabled={isLoading}
              className='btn-primary mb-6'>
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>

            <div className='text-center'>
              <button
                onClick={() => toast('Resend functionality would be here')}
                className='text-sm text-dark-400 hover:text-dark-300 transition-colors'>
                Didn&apos;t receive code?{' '}
                <span className='text-accent-400 font-semibold'>Resend</span>
              </button>
            </div>

            <button
              onClick={() => setIsOTPOpen(false)}
              className='absolute top-4 right-4 text-dark-400 hover:text-white p-1 rounded-lg hover:bg-dark-700 transition-colors'>
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Sign Up Modal */}
      {isSignUpOpen && (
        <div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
          <div className='card-modern p-8 w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto'>
            <div className='mb-8'>
              <h2 className='text-xl font-bold text-white mb-3'>
                Create Account
              </h2>
              <p className='text-dark-400'>
                Join us today! Create your corporate account
              </p>
            </div>

            <form onSubmit={handleSignUp} className='space-y-6'>
              <input
                type='text'
                value={signUpData.fullName}
                onChange={(e) =>
                  setSignUpData({ ...signUpData, fullName: e.target.value })
                }
                className='input-modern'
                placeholder='Full Name'
                required
              />

              <input
                type='email'
                value={signUpData.email}
                onChange={(e) =>
                  setSignUpData({ ...signUpData, email: e.target.value })
                }
                className='input-modern'
                placeholder='Email address'
                required
              />

              <div className='relative'>
                <input
                  type={showSignUpPassword ? 'text' : 'password'}
                  value={signUpData.password}
                  onChange={(e) =>
                    setSignUpData({ ...signUpData, password: e.target.value })
                  }
                  className='input-modern pr-12'
                  placeholder='Password'
                  required
                />
                <button
                  type='button'
                  onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                  className='absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-dark-700'>
                  {showSignUpPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>

              <div className='relative'>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={signUpData.confirmPassword}
                  onChange={(e) =>
                    setSignUpData({
                      ...signUpData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className='input-modern pr-12'
                  placeholder='Confirm Password'
                  required
                />
                <button
                  type='button'
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className='absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-dark-700'>
                  {showConfirmPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>

              <div className='flex items-start'>
                <input
                  type='checkbox'
                  checked={signUpData.agreeTerms}
                  onChange={(e) =>
                    setSignUpData({
                      ...signUpData,
                      agreeTerms: e.target.checked,
                    })
                  }
                  className='w-4 h-4 text-accent-600 border-dark-600 rounded focus:ring-accent-500 bg-dark-700 mt-0.5'
                  required
                />
                <label className='ml-2 text-sm text-dark-300'>
                  I agree to the{' '}
                  <span className='text-accent-400 hover:text-accent-300 cursor-pointer'>
                    Terms of Service
                  </span>{' '}
                  and{' '}
                  <span className='text-accent-400 hover:text-accent-300 cursor-pointer'>
                    Privacy Policy
                  </span>
                </label>
              </div>

              <button
                type='submit'
                disabled={isLoading}
                className='btn-primary'>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className='text-center mt-8 text-dark-400 text-sm'>
              Already have an account?{' '}
              <button
                onClick={() => setIsSignUpOpen(false)}
                className='text-accent-400 hover:text-accent-300 font-semibold transition-colors'>
                Sign in
              </button>
            </div>

            <button
              onClick={() => setIsSignUpOpen(false)}
              className='absolute top-4 right-4 text-dark-400 hover:text-white p-1 rounded-lg hover:bg-dark-700 transition-colors'>
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
