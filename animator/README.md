# Animation Studio

A professional animation editor built with React, TypeScript, and modern web technologies. Create stunning animations with an intuitive timeline-based interface.

![Animation Studio](https://via.placeholder.com/800x400/3B82F6/FFFFFF?text=Animation+Studio+Preview)

## ✨ Features

- **Timeline-based Animation**: Intuitive keyframe animation system
- **Layer Management**: Organize animations with multiple layers
- **Multiple Export Formats**: CSS animations, SVG, and JSON export
- **Real-time Preview**: See your animations as you create them
- **Easing Functions**: Built-in and custom cubic bezier easing
- **Professional UI**: Clean, modern interface built with Tailwind CSS

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd animation-studio
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📖 Usage

### Creating Animations

1. **Add Layers**: Click the "Add" button in the layers panel
2. **Set Keyframes**: Double-click on the timeline to add keyframes
3. **Adjust Properties**: Modify position, size, opacity, rotation, and scale
4. **Preview**: Use the play button to see your animation
5. **Export**: Choose from CSS, SVG, or JSON export formats

### Keyboard Shortcuts

- `Space`: Play/Pause animation
- `Delete`: Remove selected keyframe
- `Ctrl/Cmd + Z`: Undo (coming soon)

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── ErrorBoundary/   # Error handling
│   ├── Export/          # Export functionality
│   ├── KeyframeEditor/  # Keyframe editing modal
│   ├── LayerPanel/      # Layer management
│   ├── PreviewCanvas/   # Animation preview
│   └── Timeline/        # Timeline and keyframe UI
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
│   ├── animation.ts     # Animation calculations
│   └── layer.ts         # Layer management
└── App.tsx              # Main application component
```

## 🛠️ Development

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Fix ESLint issues
- `npm run type-check`: Run TypeScript type checking
- `npm run format`: Format code with Prettier

### Technology Stack

- **React 19**: UI library
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling
- **ESLint**: Code linting
- **Prettier**: Code formatting

## 🔧 Configuration

The project uses modern tooling with sensible defaults:

- **TypeScript**: Strict mode enabled
- **ESLint**: React and TypeScript rules
- **Prettier**: Consistent code formatting
- **Vite**: Fast builds and HMR

## 🎯 Future Enhancements

- [ ] Undo/Redo functionality
- [ ] Import from external files
- [ ] More animation properties
- [ ] Audio synchronization
- [ ] Plugin system
- [ ] Collaborative editing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Powered by [Vite](https://vitejs.dev/)
