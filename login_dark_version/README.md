# Enterprise Login - Dark Version

A modern, responsive enterprise login system featuring a sleek dark theme with glassmorphism effects. Built as a learning project to explore advanced authentication patterns and modern UI design.

## 🌟 What is this?

This is a **complete authentication interface** that demonstrates:

- **Modern UI Design**: Dark theme with glassmorphism effects and smooth animations
- **Advanced Authentication**: Multi-factor authentication with OTP verification
- **Security Features**: Account lockout protection, password strength validation, session management
- **User Experience**: Responsive design, loading states, toast notifications
- **Real Functionality**: Working registration, login, and password recovery flows

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm

### Quick Start

1. **Navigate to the project**:

```bash
cd login_dark_version
```

2. **Install dependencies**:

```bash
npm install
```

3. **Start the development server**:

```bash
npm run dev
```

4. **Open your browser**:
   Visit [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## ✨ Features

### Authentication System

- **Login/Register** with email and password
- **Multi-Factor Authentication** - OTP verification for password recovery
- **Account Security** - 5 failed attempts trigger 15-minute lockout
- **Remember Me** - Persistent login sessions
- **Password Validation** - Strength requirements and confirmation

### User Interface

- **Dark Theme** - Professional enterprise styling
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Glassmorphism Effects** - Modern card designs with backdrop blur
- **Smooth Animations** - Micro-interactions and transitions
- **Toast Notifications** - Success, error, and info messages
- **Loading States** - Visual feedback during form submission

### Technical Features

- **Form Validation** - Real-time validation with error messages
- **Local Storage** - User sessions and preferences
- **OTP System** - 6-digit verification codes with expiration
- **Modal System** - Registration and OTP verification modals

## 🛠 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS with custom dark theme
- **UI Library**: React 18 with modern hooks
- **Icons**: Lucide React for modern iconography
- **Notifications**: react-hot-toast for elegant toasts

## 🎨 Design Features

### Color Scheme

- **Dark Base**: Custom dark scale (dark.50-950)
- **Accent Colors**: Green accent palette for actions
- **Glassmorphism**: Backdrop blur effects with transparency

### Components

- **Modern Inputs**: Floating labels with icon support
- **Gradient Buttons**: Hover effects and disabled states
- **Toast System**: Dark-themed notifications
- **Modal Overlays**: Backdrop blur with smooth transitions

## 📱 Responsive Design

- **Mobile**: 375px+ optimized for touch
- **Tablet**: 768px+ enhanced layouts
- **Desktop**: 1024px+ full feature set

## 🔐 How Authentication Works

1. **Registration**: Create account with email, password, and terms agreement
2. **Login**: Authenticate with email/password, optional remember me
3. **Forgot Password**: Email-based OTP recovery (6-digit code)
4. **Account Lockout**: Protection against brute force attacks
5. **Session Management**: Secure session storage with logout

## 📚 Learning Outcomes

This project demonstrates:

- **Next.js 14** App Router patterns
- **TypeScript** integration in React
- **Tailwind CSS** custom theming
- **State management** with React hooks
- **Form handling** and validation
- **Local storage** for persistence
- **Responsive design** principles
- **Modern UI/UX** patterns

## 📄 License

MIT License - Feel free to use for your own learning!

---

**Built for learning modern web development** 🚀
