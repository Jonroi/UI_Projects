import { Mass, Spring, PhysicsEngine } from './modules/physics.js';
import { Renderer } from './modules/renderer.js';
import { UI } from './modules/ui.js';

console.log('App.js: Module loaded');

export class SpringMassApp {
  constructor() {
    console.log('App.js: Constructor called');

    // Initialize physics parameters
    this.params = {
      stiffness: 100,
      damping: 0.05,
      gravity: 9.8,
      mass: 1.0,
    };

    // Get canvas elements
    this.simCanvas = document.getElementById('sim-canvas');
    this.energyCanvas = document.getElementById('energy-canvas');

    console.log('App.js: Canvas elements found:', {
      simCanvas: !!this.simCanvas,
      energyCanvas: !!this.energyCanvas,
    });

    // Initialize modules
    try {
      this.physics = new PhysicsEngine(this.params);
      console.log('App.js: Physics engine initialized');

      this.renderer = new Renderer(this.simCanvas, this.energyCanvas);
      console.log('App.js: Renderer initialized');

      this.ui = new UI(this.physics, this.renderer);
      console.log('App.js: UI initialized');
    } catch (error) {
      console.error('App.js: Error initializing modules:', error);
    }

    // Set initial canvas dimensions
    this.handleResize();

    // Initialize with two masses and a spring
    try {
      const p1 = new Mass(this.simCanvas.width / 2, 100, this.params.mass);
      p1.fixed = true;
      const p2 = new Mass(this.simCanvas.width / 2, 200, this.params.mass);
      this.physics.masses.push(p1, p2);
      this.physics.springs.push(new Spring(p1, p2, this.params.stiffness));
      console.log('App.js: Initial masses and spring created');
    } catch (error) {
      console.error('App.js: Error creating initial masses:', error);
    }

    // Start animation loop
    this.lastTime = null;
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
    console.log('App.js: Animation loop started');
  }

  animate(t) {
    if (!this.lastTime) this.lastTime = t;
    const dt = Math.min((t - this.lastTime) / 1000, 0.035);
    this.lastTime = t;

    try {
      // Update physics
      const energy = this.physics.step(dt);

      // Update renderer
      this.renderer.drawSimulation(this.physics);
      const energyValues = this.renderer.drawEnergyGraph(energy);

      // Update energy values display
      const energyDisplay = document.getElementById('energy-values');
      if (energyDisplay) {
        energyDisplay.textContent = `KE: ${energyValues.KE.toFixed(
          2,
        )} J | PE: ${energyValues.PE.toFixed(
          2,
        )} J | Total: ${energyValues.total.toFixed(2)} J`;
      }
    } catch (error) {
      console.error('App.js: Error in animation loop:', error);
    }

    requestAnimationFrame(this.animate);
  }

  handleResize() {
    try {
      const sidebar = document.getElementById('settings-sidebar');
      const mainContent = document.getElementById('main-content');
      const simulationContainer = document.getElementById(
        'simulation-container',
      );
      const canvasContainers = document.querySelectorAll('.canvas-container');

      // Get available width and height
      const availableWidth =
        window.innerWidth - (sidebar.classList.contains('hidden') ? 0 : 320);
      const availableHeight = window.innerHeight;

      // Calculate canvas dimensions maintaining aspect ratio
      const simAspectRatio = 1200 / 500; // Original aspect ratio
      const energyAspectRatio = 1200 / 150;

      // Calculate new dimensions
      let simWidth = availableWidth;
      let simHeight = simWidth / simAspectRatio;

      // If height is too large, scale based on height instead
      if (simHeight > availableHeight * 0.6) {
        simHeight = availableHeight * 0.6;
        simWidth = simHeight * simAspectRatio;
      }

      // Calculate energy graph dimensions
      let energyWidth = simWidth;
      let energyHeight = energyWidth / energyAspectRatio;

      // If total height exceeds available space, scale down
      const totalHeight = simHeight + energyHeight + 32; // 32px for margins
      if (totalHeight > availableHeight) {
        const scale = availableHeight / totalHeight;
        simHeight *= scale;
        simWidth *= scale;
        energyHeight *= scale;
        energyWidth *= scale;
      }

      // Update canvas dimensions
      this.simCanvas.width = simWidth;
      this.simCanvas.height = simHeight;
      this.energyCanvas.width = energyWidth;
      this.energyCanvas.height = energyHeight;

      // Update renderer
      this.renderer.resize(simWidth, simHeight, energyWidth, energyHeight);

      // Scale masses and springs to new dimensions
      const scaleX = simWidth / 1200;
      const scaleY = simHeight / 500;

      for (const mass of this.physics.masses) {
        mass.x *= scaleX;
        mass.y *= scaleY;
      }

      console.log('App.js: Canvas resized', {
        simWidth,
        simHeight,
        energyWidth,
        energyHeight,
        scaleX,
        scaleY,
      });
    } catch (error) {
      console.error('App.js: Error in handleResize:', error);
    }
  }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('App.js: DOM loaded, creating app instance');
  try {
    window.app = new SpringMassApp();
    console.log('App.js: App instance created successfully');
  } catch (error) {
    console.error('App.js: Error creating app instance:', error);
  }
});
