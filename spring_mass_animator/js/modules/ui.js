import { Mass, Spring } from './physics.js';

console.log('UI.js: Module loaded');

export class UI {
  constructor(physics, renderer) {
    console.log('UI.js: Constructor called');
    this.physics = physics;
    this.renderer = renderer;
    this.dragTarget = null;
    this.dragOffset = { x: 0, y: 0 };
    this.connectStart = null;
    this.lastClickTime = 0;
    this.lastClickMass = null;

    // Bind methods to this instance
    this.handleParameterChange = this.handleParameterChange.bind(this);
    this.handlePresetClick = this.handlePresetClick.bind(this);
    this.resetSimulation = this.resetSimulation.bind(this);
    this.togglePause = this.togglePause.bind(this);
    this.toggleForces = this.toggleForces.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleRightClick = this.handleRightClick.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.switchTab = this.switchTab.bind(this);

    // Initialize UI
    this.setupEventListeners();
  }

  setupEventListeners() {
    console.log('UI.js: Setting up event listeners');
    try {
      // Settings form
      const settingsForm = document.getElementById('settings-form');
      if (settingsForm) {
        settingsForm.addEventListener('input', this.handleParameterChange);
        console.log('UI.js: Settings form listener added');
      } else {
        console.error('UI.js: Settings form not found');
      }

      // Preset buttons
      const presetButtons = document.querySelectorAll('.preset-btn');
      if (presetButtons.length > 0) {
        presetButtons.forEach((btn) => {
          btn.addEventListener('click', () => this.handlePresetClick(btn));
        });
        console.log('UI.js: Preset button listeners added');
      } else {
        console.error('UI.js: No preset buttons found');
      }

      // Control buttons
      const resetBtn = document.getElementById('reset-btn');
      const pauseBtn = document.getElementById('pause-btn');
      const forceToggleBtn = document.getElementById('force-toggle-btn');

      if (resetBtn) {
        resetBtn.addEventListener('click', this.resetSimulation);
        console.log('UI.js: Reset button listener added');
      }

      if (pauseBtn) {
        pauseBtn.addEventListener('click', this.togglePause);
        console.log('UI.js: Pause button listener added');
      }

      if (forceToggleBtn) {
        forceToggleBtn.addEventListener('click', this.toggleForces);
        console.log('UI.js: Force toggle button listener added');
      }

      // Canvas interactions
      const canvas = document.getElementById('sim-canvas');
      if (canvas) {
        canvas.addEventListener('mousedown', this.handleMouseDown);
        canvas.addEventListener('mousemove', this.handleMouseMove);
        canvas.addEventListener('mouseup', this.handleMouseUp);
        canvas.addEventListener('mouseleave', this.handleMouseUp);
        canvas.addEventListener('click', this.handleClick);
        canvas.addEventListener('contextmenu', this.handleRightClick);
        console.log('UI.js: Canvas event listeners added');
      } else {
        console.error('UI.js: Simulation canvas not found');
      }

      // Sidebar toggle
      const sidebarToggle = document.getElementById('sidebar-toggle');
      const sidebar = document.getElementById('settings-sidebar');
      const mainContent = document.getElementById('main-content');
      const simulationContainer = document.getElementById(
        'simulation-container',
      );
      const canvasContainers = document.querySelectorAll('.canvas-container');

      if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
          console.log('UI.js: Sidebar toggle clicked');
          sidebar.classList.toggle('hidden');
          if (mainContent) mainContent.classList.toggle('expanded');
          if (simulationContainer)
            simulationContainer.classList.toggle('expanded');
          canvasContainers.forEach((container) =>
            container.classList.toggle('expanded'),
          );

          const icon = sidebarToggle.querySelector('i');
          if (icon) {
            icon.classList.toggle('fa-chevron-left');
            icon.classList.toggle('fa-chevron-right');
          }

          this.handleResize();
        });
        console.log('UI.js: Sidebar toggle listener added');
      } else {
        console.error('UI.js: Sidebar elements not found');
      }

      // Tab switching
      const tabButtons = document.querySelectorAll('.tab-button');
      if (tabButtons.length > 0) {
        tabButtons.forEach((button) => {
          button.addEventListener('click', () => this.switchTab(button));
        });
        console.log('UI.js: Tab button listeners added');
      } else {
        console.error('UI.js: No tab buttons found');
      }

      // Window resize
      window.addEventListener('resize', this.handleResize);
      console.log('UI.js: Window resize listener added');
    } catch (error) {
      console.error('UI.js: Error setting up event listeners:', error);
    }
  }

  handleParameterChange(e) {
    clearTimeout(window.paramUpdateTimeout);
    window.paramUpdateTimeout = setTimeout(() => {
      const oldParams = { ...this.physics.params };

      switch (e.target.id) {
        case 'stiffness':
          this.physics.params.stiffness = Math.max(
            0.1,
            Math.min(1000, parseFloat(e.target.value) || 100),
          );
          break;
        case 'damping':
          this.physics.params.damping = Math.max(
            0,
            Math.min(10, parseFloat(e.target.value) || 0.05),
          );
          break;
        case 'gravity':
          this.physics.params.gravity = Math.max(
            0,
            Math.min(50, parseFloat(e.target.value) || 9.8),
          );
          break;
        case 'mass':
          this.physics.params.mass = Math.max(
            0.01,
            Math.min(10, parseFloat(e.target.value) || 1.0),
          );
          break;
      }

      // Update spring constants
      for (let s of this.physics.springs) {
        s.k = this.physics.params.stiffness;
      }

      // Reset velocities if parameters change significantly
      if (
        Math.abs(oldParams.gravity - this.physics.params.gravity) > 1 ||
        Math.abs(oldParams.damping - this.physics.params.damping) > 0.1
      ) {
        for (let m of this.physics.masses) {
          if (!m.fixed) {
            m.vx *= 0.5;
            m.vy *= 0.5;
          }
        }
      }
    }, 100);
  }

  handlePresetClick(btn) {
    const oldParams = { ...this.physics.params };

    this.physics.params.stiffness = Math.max(
      0.1,
      Math.min(1000, parseFloat(btn.dataset.k) || 100),
    );
    this.physics.params.damping = Math.max(
      0,
      Math.min(10, parseFloat(btn.dataset.c) || 0.05),
    );
    this.physics.params.gravity = Math.max(
      0,
      Math.min(50, parseFloat(btn.dataset.g) || 9.8),
    );
    this.physics.params.mass = Math.max(
      0.01,
      Math.min(10, parseFloat(btn.dataset.m) || 1.0),
    );

    // Update input fields
    document.getElementById('stiffness').value = this.physics.params.stiffness;
    document.getElementById('damping').value = this.physics.params.damping;
    document.getElementById('gravity').value = this.physics.params.gravity;
    document.getElementById('mass').value = this.physics.params.mass;

    // Update springs and masses
    for (let s of this.physics.springs) {
      s.k = this.physics.params.stiffness;
    }
    for (let m of this.physics.masses) {
      if (!m.fixed) {
        m.m = this.physics.params.mass;
      }
    }

    // Reset velocities if needed
    if (
      Math.abs(oldParams.gravity - this.physics.params.gravity) > 1 ||
      Math.abs(oldParams.damping - this.physics.params.damping) > 0.1
    ) {
      for (let m of this.physics.masses) {
        if (!m.fixed) {
          m.vx *= 0.5;
          m.vy *= 0.5;
        }
      }
    }
  }

  resetSimulation() {
    this.physics.masses = [];
    this.physics.springs = [];
    this.connectStart = null;
    let p1 = new Mass(
      this.renderer.simCanvas.width / 2,
      100,
      this.physics.params.mass,
    );
    p1.fixed = true;
    let p2 = new Mass(
      this.renderer.simCanvas.width / 2,
      200,
      this.physics.params.mass,
    );
    this.physics.masses.push(p1, p2);
    this.physics.springs.push(
      new Spring(p1, p2, this.physics.params.stiffness),
    );
  }

  togglePause(e) {
    this.physics.isPaused = !this.physics.isPaused;
    e.target.innerHTML = this.physics.isPaused
      ? '<i class="fas fa-play mr-2"></i>Resume'
      : '<i class="fas fa-pause mr-2"></i>Pause';
    e.target.className = this.physics.isPaused
      ? 'flex-1 py-2.5 px-3 bg-white text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 text-sm shadow-sm hover:shadow-md transition font-medium'
      : 'flex-1 py-2.5 px-3 bg-white text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 text-sm shadow-sm hover:shadow-md transition font-medium';
  }

  toggleForces(e) {
    this.physics.showForces = !this.physics.showForces;
    e.target.innerHTML = this.physics.showForces
      ? '<i class="fas fa-eye-slash mr-2"></i>Hide Forces'
      : '<i class="fas fa-eye mr-2"></i>Show Forces';
    e.target.className = this.physics.showForces
      ? 'flex-1 py-2.5 px-3 bg-white text-green-700 border border-green-200 rounded-lg hover:bg-green-100 text-sm shadow-sm hover:shadow-md transition font-medium'
      : 'flex-1 py-2.5 px-3 bg-white text-red-700 border border-red-200 rounded-lg hover:bg-gray-100 text-sm shadow-sm hover:shadow-md transition font-medium';
  }

  getMousePos(evt) {
    const rect = this.renderer.simCanvas.getBoundingClientRect();
    return {
      x:
        (evt.clientX - rect.left) *
        (this.renderer.simCanvas.width / rect.width),
      y:
        (evt.clientY - rect.top) *
        (this.renderer.simCanvas.height / rect.height),
    };
  }

  findMassAt(x, y) {
    for (let m of this.physics.masses) {
      if (Math.hypot(m.x - x, m.y - y) < 18) {
        return m;
      }
    }
    return null;
  }

  findSpringAt(x, y) {
    for (let s of this.physics.springs) {
      let m1 = s.m1,
        m2 = s.m2;
      let dx = m2.x - m1.x;
      let dy = m2.y - m1.y;
      let dist = Math.sqrt(dx * dx + dy * dy);

      let t = ((x - m1.x) * dx + (y - m1.y) * dy) / (dx * dx + dy * dy);
      t = Math.max(0, Math.min(1, t));

      let closestX = m1.x + t * dx;
      let closestY = m1.y + t * dy;

      if (Math.hypot(x - closestX, y - closestY) < 10) {
        return s;
      }
    }
    return null;
  }

  handleMouseDown(e) {
    const mouse = this.getMousePos(e);
    const foundMass = this.findMassAt(mouse.x, mouse.y);

    if (foundMass && !foundMass.fixed) {
      this.dragTarget = foundMass;
      this.dragOffset.x = foundMass.x - mouse.x;
      this.dragOffset.y = foundMass.y - mouse.y;
      this.physics.setDragTarget(foundMass);
    }
  }

  handleMouseMove(e) {
    if (this.dragTarget) {
      const mouse = this.getMousePos(e);
      this.dragTarget.x = mouse.x + this.dragOffset.x;
      this.dragTarget.y = mouse.y + this.dragOffset.y;
      this.dragTarget.vx = 0;
      this.dragTarget.vy = 0;
    }
  }

  handleMouseUp() {
    this.dragTarget = null;
    this.physics.setDragTarget(null);
  }

  handleClick(e) {
    const mouse = this.getMousePos(e);
    const foundMass = this.findMassAt(mouse.x, mouse.y);
    const currentTime = Date.now();

    if (
      foundMass &&
      this.lastClickMass === foundMass &&
      currentTime - this.lastClickTime < 500
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
      if (this.connectStart === null) {
        this.connectStart = foundMass;
      } else if (
        this.connectStart !== foundMass &&
        !this.springExists(this.connectStart, foundMass)
      ) {
        this.physics.springs.push(
          new Spring(
            this.connectStart,
            foundMass,
            this.physics.params.stiffness,
          ),
        );
        this.connectStart = null;
      } else {
        this.connectStart = foundMass;
      }
    } else {
      let newMass = new Mass(mouse.x, mouse.y, this.physics.params.mass);
      this.physics.masses.push(newMass);
      if (this.physics.masses.length > 1) {
        let lastMass = this.physics.masses[this.physics.masses.length - 2];
        if (!this.springExists(lastMass, newMass)) {
          this.physics.springs.push(
            new Spring(lastMass, newMass, this.physics.params.stiffness),
          );
        }
      }
      this.connectStart = null;
    }
  }

  handleRightClick(e) {
    e.preventDefault();
    const mouse = this.getMousePos(e);
    const foundSpring = this.findSpringAt(mouse.x, mouse.y);

    if (foundSpring) {
      this.physics.springs = this.physics.springs.filter(
        (s) => s !== foundSpring,
      );
    }
  }

  springExists(m1, m2) {
    return this.physics.springs.some(
      (s) => (s.m1 === m1 && s.m2 === m2) || (s.m1 === m2 && s.m2 === m1),
    );
  }

  switchTab(button) {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // Remove active class from all buttons and contents
    tabButtons.forEach((btn) => {
      btn.classList.remove(
        'active',
        'text-indigo-800',
        'font-semibold',
        'bg-gradient-to-b',
        'from-indigo-100/10',
        'to-indigo-100/5',
      );
      btn.classList.add('text-gray-600', 'hover:text-gray-800');
    });

    tabContents.forEach((content) => {
      content.classList.remove('active');
      content.classList.add('hidden');
    });

    // Add active class to clicked button and corresponding content
    button.classList.remove('text-gray-600', 'hover:text-gray-800');
    button.classList.add(
      'active',
      'text-indigo-800',
      'font-semibold',
      'bg-gradient-to-b',
      'from-indigo-100/10',
      'to-indigo-100/5',
    );

    const tabId = button.dataset.tab + '-tab';
    const tabContent = document.getElementById(tabId);
    if (tabContent) {
      tabContent.classList.remove('hidden');
      tabContent.classList.add('active');
    }
  }

  handleResize() {
    const sidebar = document.getElementById('settings-sidebar');
    const mainContent = document.getElementById('main-content');
    const simulationContainer = document.getElementById('simulation-container');
    const isSidebarHidden = sidebar.classList.contains('hidden');
    const containerWidth = isSidebarHidden
      ? window.innerWidth
      : window.innerWidth - 320;

    // Calculate available height
    const availableHeight = window.innerHeight - 32;
    const simHeight = Math.min(availableHeight * 0.6, 500);
    const energyHeight = Math.min(availableHeight * 0.2, 150);

    // Update canvas sizes
    this.renderer.resize(
      Math.min(containerWidth - 32, 1200),
      simHeight,
      Math.min(containerWidth - 32, 1200),
      energyHeight,
    );

    // Update container classes
    mainContent.classList.toggle('expanded', isSidebarHidden);
    simulationContainer.classList.toggle('expanded', isSidebarHidden);

    // Update canvas containers
    document.querySelectorAll('.canvas-container').forEach((container) => {
      container.classList.toggle('expanded', isSidebarHidden);
    });
  }
}
