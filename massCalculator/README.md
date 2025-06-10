# Spring-Mass System Simulation

A professional, modular implementation of a spring-mass physics simulation with real-time energy visualization.

## Features

- **Real-time Physics**: Spring forces, damping, gravity, and collision detection
- **Interactive Masses**: Click to add, drag to move, double-click to fix/unfix
- **Spring Connections**: Click near masses to connect them with springs
- **Energy Visualization**: Real-time kinetic, potential, and total energy graphs
- **Physics Presets**: Quick configurations for different scenarios
- **Professional UI**: Modern design with Tailwind CSS and Font Awesome icons

## Project Structure

```
massCalculator/
├── index.html          # Main HTML file
├── styles.css          # Custom CSS styles
├── config.js           # Configuration and constants
├── physics.js          # Physics engine (Mass, Spring, PhysicsEngine classes)
├── renderer.js         # Rendering engine (SimulationRenderer, EnergyGraphRenderer)
├── main.js             # Main application logic and coordination
├── massCalculator.html # Legacy monolithic version
└── README.md           # This file
```

## Architecture

### Modular Design

The application follows a clean separation of concerns:

- **Configuration** (`config.js`): Centralized settings and constants
- **Physics Engine** (`physics.js`): Core physics calculations and object management
- **Rendering** (`renderer.js`): Canvas drawing and visualization
- **Main Application** (`main.js`): Coordination and user interface logic

### Key Classes

#### Physics Engine (`physics.js`)

- `Mass`: Represents individual masses with position, velocity, forces
- `Spring`: Handles spring connections between masses with Hooke's law
- `PhysicsEngine`: Manages the complete physics simulation

#### Renderers (`renderer.js`)

- `SimulationRenderer`: Draws masses, springs, and force vectors
- `EnergyGraphRenderer`: Creates real-time energy visualization

#### Main Application (`main.js`)

- `SpringMassSimulation`: Coordinates all components and handles user interaction

## Usage

### Basic Interaction

- **Add Mass**: Click on empty canvas
- **Move Mass**: Drag any moveable mass
- **Fix/Unfix Mass**: Double-click a mass
- **Connect Springs**: Click near two masses sequentially
- **Physics Controls**: Use sidebar to adjust parameters

### Physics Parameters

- **Spring Stiffness (k)**: Controls how "bouncy" springs are
- **Damping (c)**: Energy loss over time
- **Gravity (g)**: Downward acceleration
- **Mass (m)**: Default mass for new objects

### Presets

- **Default Physics**: Earth-like gravity with moderate damping
- **Microgravity**: Space-like environment with minimal gravity
- **Heavy Damping**: High energy loss, underwater-like behavior

## Development

### Adding New Features

1. **Physics Features**: Extend the `PhysicsEngine` class in `physics.js`
2. **Visual Features**: Add methods to renderer classes in `renderer.js`
3. **UI Features**: Modify the main application class in `main.js`
4. **Configuration**: Add new constants to `config.js`

### Customization

The modular structure makes it easy to:

- Replace the rendering engine (e.g., WebGL instead of Canvas 2D)
- Add different physics models
- Extend the user interface
- Modify visual styling
- Add new interaction modes

### Code Quality Features

- **ES6 Modules**: Clean import/export structure
- **Class-based Design**: Proper encapsulation and inheritance
- **Configuration Management**: Centralized constants
- **Separation of Concerns**: Each module has a single responsibility
- **Type Safety**: Clear method signatures and data structures

## Browser Compatibility

- Modern browsers with ES6 module support
- Canvas 2D context support
- ES6 classes and arrow functions

## Dependencies

- **Tailwind CSS**: Utility-first CSS framework
- **Font Awesome**: Icon library
- **Modern Browser**: ES6 modules and Canvas API

## Performance

- Optimized 60fps animation loop
- Efficient force calculations
- Bounded energy history tracking
- Minimal DOM manipulation during animation

## Educational Value

This simulation demonstrates:

- Classical mechanics (Newton's laws, Hooke's law)
- Energy conservation principles
- Real-time physics simulation techniques
- Modern JavaScript application architecture
- Professional web development practices
