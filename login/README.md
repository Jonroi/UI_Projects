# Enterprise Login Portal

A modern, secure login application built with Next.js 14, TypeScript, and Tailwind CSS featuring glassmorphism design and comprehensive authentication features.

## 🚀 Features

### 🔐 Authentication

- **Secure Login System** with failed attempt tracking and account lockout
- **Two-Factor Authentication (2FA)** with OTP verification
- **Password Reset** functionality with email verification
- **Remember Me** functionality with secure session management
- **User Registration** with email validation

### 🎨 Modern UI/UX

- **Glassmorphism Design** with backdrop blur effects
- **Responsive Layout** optimized for mobile (320px-500px) and desktop
- **Smooth Animations** with spring-like transitions and micro-interactions
- **Accessibility Compliant** (WCAG 2.1 AA) with screen reader support
- **Toast Notifications** for user feedback

### 🛡️ Security Features

- **Account Lockout Protection** (5 attempts, 15-minute lockout)
- **Session Management** with configurable timeouts
- **Input Validation** with comprehensive error handling
- **XSS Protection** and secure headers
- **Type-Safe** implementation with TypeScript

### 📱 Mobile Optimization

- **Touch-Friendly** interface with proper tap targets
- **Keyboard Navigation** support
- **Focus Management** and trap functionality
- **Double-Tap Zoom Prevention**

## 🏗️ Architecture

### **Modular TypeScript Structure**

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles with custom CSS variables
│   ├── layout.tsx         # Root layout with metadata
│   └── page.tsx           # Main page component
├── components/            # React components
│   ├── LoginPage.tsx      # Main login page component
│   ├── LoginForm.tsx      # Login form with validation
│   ├── SignUpModal.tsx    # Registration modal
│   ├── OTPModal.tsx       # OTP verification modal
│   └── ui/                # Reusable UI components
├── lib/                   # Utility libraries
│   ├── storage.ts         # localStorage management
│   ├── constants.ts       # Configuration constants
│   ├── validation.ts      # Form validation utilities
│   ├── auth.ts           # Authentication logic
│   └── utils.ts          # General utilities
├── hooks/                 # Custom React hooks
│   ├── useAuth.ts        # Authentication hook
│   ├── useToast.ts       # Toast notification hook
│   └── useLocalStorage.ts # localStorage hook
└── types/                 # TypeScript type definitions
    └── index.ts          # Shared interfaces and types
```

## 🛠️ Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript 5.3+
- **Styling**: Tailwind CSS 3.4+
- **Icons**: Font Awesome 6.5+
- **Notifications**: React Toastify 9.1+
- **Animations**: Framer Motion 10.16+
- **Development**: ESLint, Prettier, PostCSS

## 📦 Installation

1. **Clone or navigate to the login directory**:

   ```bash
   cd login
   ```

2. **Install dependencies**:

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Run the development server**:

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser** and visit [http://localhost:3000](http://localhost:3000)

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check

## 💾 Local Storage Schema

The application uses localStorage for data persistence:

```typescript
// User Data
registeredUsers: Record<string, string>           // email -> password
allUserData: Record<string, User>                 // email -> full user data

// Session Management
userSession: UserSession                          // current session data
rememberedEmail: string                           // remembered email for login
draftEmail: string                               // auto-saved email input

// Security
loginFailedAttempts: number                      // failed login count
lastFailedAttempt: number                        // timestamp of last failure

// OTP System
currentOTP: OTPData                              // active OTP session
otpFailedAttempts: number                        // failed OTP attempts
otpResendCount: number                           // OTP resend counter

// History
loginHistory: LoginAttempt[]                     // login attempt history
registrationHistory: RegistrationRecord[]        // registration history
```

## 🎯 Key Features Detail

### **Glassmorphism Design System**

- Custom CSS variables for consistent glass effects
- Backdrop blur with fallbacks for browser compatibility
- Multi-layered shadows and gradients
- Smooth hover animations and state transitions

### **Authentication Flow**

1. **Login Attempt** → Validation → Security Check → Session Creation
2. **Failed Login** → Attempt Counter → Lockout Protection
3. **Forgot Password** → Email Input → OTP Generation → Verification
4. **Registration** → Form Validation → User Creation → Auto-login

### **Responsive Design**

- **Mobile First**: Optimized for 320px-500px screens
- **Adaptive Layout**: Scales beautifully to desktop
- **Touch Targets**: Minimum 44px touch targets
- **Keyboard Navigation**: Full keyboard accessibility

## 🔒 Security Considerations

- **No Real Email**: OTP displayed in console for testing
- **Local Storage**: For demonstration only - use secure backend in production
- **Password Hashing**: Implement proper hashing in production
- **HTTPS**: Always use HTTPS in production environments
- **Rate Limiting**: Implement server-side rate limiting

## 🌐 Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 90+
- **Features**: backdrop-filter, CSS Grid, ES2020+

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For questions or issues, please open a GitHub issue or contact the development team.

---

**Built with ❤️ using Next.js, TypeScript, and Tailwind CSS**
