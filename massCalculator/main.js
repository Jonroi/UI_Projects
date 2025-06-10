// Main Application Module
import { CONFIG } from './config.js';
import { PhysicsEngine } from './physics.js';
import { SimulationRenderer, EnergyGraphRenderer } from './renderer.js';

class SpringMassSimulation {
  constructor() {
    this.initializeElements();
    this.initializeEngines();
    this.initializeInteraction();
    this.initializeUI();
    this.startAnimation();
  }

  initializeElements() {
    // Canvas elements
    this.simulationCanvas = document.getElementById('sim-canvas');
    this.energyCanvas = document.getElementById('energy-canvas');
    this.energyValuesDisplay = document.getElementById('energy-values');

    // Form elements
    this.settingsForm = document.getElementById('settings-form');
    this.pauseBtn = document.getElementById('pause-btn');
    this.forceToggleBtn = document.getElementById('force-toggle-btn');
    this.resetBtn = document.getElementById('reset-btn');

    // Input elements
    this.stiffnessInput = document.getElementById('stiffness');
    this.dampingInput = document.getElementById('damping');
    this.gravityInput = document.getElementById('gravity');
    this.massInput = document.getElementById('mass');
  }

  initializeEngines() {
    // Physics engine
    this.physics = new PhysicsEngine();
    this.physics.reset();

    // Renderers
    this.simulationRenderer = new SimulationRenderer(this.simulationCanvas);
    this.energyRenderer = new EnergyGraphRenderer(this.energyCanvas);

    // Animation state
    this.lastTime = null;
    this.animationId = null;
  }

  initializeInteraction() {
    // Mouse interaction state
    this.dragOffset = { x: 0, y: 0 };
    this.connectStart = null;
    this.lastClickTime = 0;
    this.lastClickMass = null;

    // Mouse event listeners
    this.simulationCanvas.addEventListener('mousedown', (e) =>
      this.handleMouseDown(e)
    );
    this.simulationCanvas.addEventListener('mousemove', (e) =>
      this.handleMouseMove(e)
    );
    this.simulationCanvas.addEventListener('mouseup', (e) =>
      this.handleMouseUp(e)
    );
    this.simulationCanvas.addEventListener('mouseleave', (e) =>
      this.handleMouseLeave(e)
    );
    this.simulationCanvas.addEventListener('click', (e) => this.handleClick(e));
  }

  initializeUI() {
    // Settings form
    this.settingsForm.addEventListener('input', (e) =>
      this.handleSettingsChange(e)
    );

    // Control buttons
    this.pauseBtn.addEventListener('click', () => this.togglePause());
    this.forceToggleBtn.addEventListener('click', () => this.toggleForces());
    this.resetBtn.addEventListener('click', () => this.resetSimulation());

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.applyPreset(btn.dataset));
    });
  }

  getMousePosition(event) {
    const rect = this.simulationCanvas.getBoundingClientRect();
    return {
      x:
        (event.clientX - rect.left) *
        (this.simulationCanvas.width / rect.width),
      y:
        (event.clientY - rect.top) *
        (this.simulationCanvas.height / rect.height),
    };
  }

  handleMouseDown(event) {
    const mouse = this.getMousePosition(event);
    const foundMass = this.physics.findMassAt(mouse.x, mouse.y);

    if (foundMass && !foundMass.fixed) {
      this.physics.dragTarget = foundMass;
      this.simulationRenderer.setDragTarget(foundMass);
      this.dragOffset.x = foundMass.x - mouse.x;
      this.dragOffset.y = foundMass.y - mouse.y;
    }
  }

  handleMouseMove(event) {
    if (this.physics.dragTarget) {
      const mouse = this.getMousePosition(event);
      this.physics.dragTarget.setPosition(
        mouse.x + this.dragOffset.x,
        mouse.y + this.dragOffset.y
      );
      this.physics.dragTarget.vx = 0;
      this.physics.dragTarget.vy = 0;
    }
  }

  handleMouseUp() {
    this.physics.dragTarget = null;
    this.simulationRenderer.setDragTarget(null);
  }

  handleMouseLeave() {
    this.physics.dragTarget = null;
    this.simulationRenderer.setDragTarget(null);
  }

  handleClick(event) {
    const mouse = this.getMousePosition(event);
    const foundMass = this.physics.findMassAt(mouse.x, mouse.y);
    const currentTime = Date.now();

    // Double-click detection
    if (
      foundMass &&
      this.lastClickMass === foundMass &&
      currentTime - this.lastClickTime < CONFIG.interaction.doubleClickTime
    ) {
      foundMass.fixed = !foundMass.fixed;
      foundMass.vx = 0;
      foundMass.vy = 0;
      this.lastClickMass = null;
      this.lastClickTime = 0;
      return;
    }

    this.lastClickMass = foundMass;
    this.lastClickTime = currentTime;

    if (foundMass) {
      // Spring connection logic
      if (this.connectStart === null) {
        this.connectStart = foundMass;
        this.simulationRenderer.setConnectStart(foundMass);
      } else if (
        this.connectStart !== foundMass &&
        !this.physics.springExists(this.connectStart, foundMass)
      ) {
        this.physics.addSpring(
          this.connectStart,
          foundMass,
          CONFIG.physics.stiffness
        );
        this.connectStart = null;
        this.simulationRenderer.setConnectStart(null);
      } else {
        this.connectStart = foundMass;
        this.simulationRenderer.setConnectStart(foundMass);
      }
    } else {
      // Add new mass
      const newMass = this.physics.addMass(
        mouse.x,
        mouse.y,
        CONFIG.physics.mass
      );

      // Auto-connect to last mass if possible
      if (this.physics.masses.length > 1) {
        const lastMass = this.physics.masses[this.physics.masses.length - 2];
        if (!this.physics.springExists(lastMass, newMass)) {
          this.physics.addSpring(lastMass, newMass, CONFIG.physics.stiffness);
        }
      }

      this.connectStart = null;
      this.simulationRenderer.setConnectStart(null);
    }
  }

  handleSettingsChange(event) {
    const { id, value } = event.target;
    const numValue = parseFloat(value);

    switch (id) {
      case 'stiffness':
        CONFIG.physics.stiffness = numValue;
        this.physics.updateStiffness(numValue);
        break;
      case 'damping':
        CONFIG.physics.damping = numValue;
        break;
      case 'gravity':
        CONFIG.physics.gravity = numValue;
        break;
      case 'mass':
        CONFIG.physics.mass = numValue;
        break;
    }
  }

  applyPreset(dataset) {
    const { k, c, g } = dataset;

    CONFIG.physics.stiffness = parseFloat(k);
    CONFIG.physics.damping = parseFloat(c);
    CONFIG.physics.gravity = parseFloat(g);

    // Update UI
    this.stiffnessInput.value = CONFIG.physics.stiffness;
    this.dampingInput.value = CONFIG.physics.damping;
    this.gravityInput.value = CONFIG.physics.gravity;

    // Update physics
    this.physics.updateStiffness(CONFIG.physics.stiffness);
  }

  togglePause() {
    this.physics.isPaused = !this.physics.isPaused;
    this.pauseBtn.innerHTML = this.physics.isPaused
      ? '<i class="fas fa-play mr-2"></i>Resume'
      : '<i class="fas fa-pause mr-2"></i>Pause';

    this.pauseBtn.className = this.physics.isPaused
      ? 'flex-1 py-2.5 px-3 bg-white text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 text-sm shadow-sm hover:shadow-md transition font-medium'
      : 'flex-1 py-2.5 px-3 bg-white text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 text-sm shadow-sm hover:shadow-md transition font-medium';
  }

  toggleForces() {
    this.physics.showForces = !this.physics.showForces;
    this.forceToggleBtn.innerHTML = this.physics.showForces
      ? '<i class="fas fa-eye-slash mr-2"></i>Hide Forces'
      : '<i class="fas fa-eye mr-2"></i>Show Forces';

    this.forceToggleBtn.className = this.physics.showForces
      ? 'flex-1 py-2.5 px-3 bg-white text-green-700 border border-green-200 rounded-lg hover:bg-green-100 text-sm shadow-sm hover:shadow-md transition font-medium'
      : 'flex-1 py-2.5 px-3 bg-white text-red-700 border border-red-200 rounded-lg hover:bg-gray-100 text-sm shadow-sm hover:shadow-md transition font-medium';
  }

  resetSimulation() {
    this.physics.reset();
    this.energyRenderer.reset();
    this.connectStart = null;
    this.simulationRenderer.setConnectStart(null);
  }

  animate(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;

    const deltaTime = Math.min(
      (timestamp - this.lastTime) / 1000,
      CONFIG.physics.timeStep
    );
    this.lastTime = timestamp;

    // Update physics
    this.physics.step(
      deltaTime,
      CONFIG.canvas.simulation.width,
      CONFIG.canvas.simulation.height
    );

    // Update energy data
    const energyInfo = this.physics.calculateTotalEnergy();
    this.energyRenderer.addEnergyData(energyInfo);

    // Update energy display
    this.energyValuesDisplay.textContent = `KE: ${energyInfo.kinetic.toFixed(
      2
    )} J | PE: ${energyInfo.potential.toFixed(
      2
    )} J | Total: ${energyInfo.total.toFixed(2)} J`;

    // Render
    this.simulationRenderer.render(this.physics);
    this.energyRenderer.render();

    // Schedule next frame
    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  startAnimation() {
    this.animationId = requestAnimationFrame((t) => this.animate(t));
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.simulation = new SpringMassSimulation();
});

// Handle window resize
window.addEventListener('resize', () => {
  // Could implement responsive canvas resizing here
});
