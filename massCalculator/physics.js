// Physics Engine Module
import { CONFIG } from './config.js';

export class Mass {
  constructor(x, y, mass = CONFIG.physics.mass) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.fx = 0;
    this.fy = 0;
    this.mass = mass;
    this.fixed = false;
  }

  get position() {
    return { x: this.x, y: this.y };
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  resetForces() {
    this.fx = 0;
    this.fy = 0;
  }

  addForce(fx, fy) {
    this.fx += fx;
    this.fy += fy;
  }

  update(dt, canvasWidth, canvasHeight) {
    if (this.fixed) return;

    // Calculate acceleration
    const ax = this.fx / this.mass;
    const ay = this.fy / this.mass;

    // Update velocity and position
    this.vx += ax * dt;
    this.vy += ay * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Boundary collision
    const radius = CONFIG.visual.massRadius;
    const damping = CONFIG.physics.boundaryDamping;

    if (this.x < radius) {
      this.x = radius;
      this.vx *= -damping;
    }
    if (this.x > canvasWidth - radius) {
      this.x = canvasWidth - radius;
      this.vx *= -damping;
    }
    if (this.y > canvasHeight - radius) {
      this.y = canvasHeight - radius;
      this.vy *= -damping;
    }
    if (this.y < radius) {
      this.y = radius;
      this.vy *= -damping;
    }
  }

  getKineticEnergy() {
    return 0.5 * this.mass * (this.vx ** 2 + this.vy ** 2);
  }

  getPotentialEnergy(gravity) {
    return this.mass * gravity * this.y;
  }
}

export class Spring {
  constructor(mass1, mass2, stiffness = CONFIG.physics.stiffness) {
    this.mass1 = mass1;
    this.mass2 = mass2;
    this.stiffness = stiffness;
    this.restLength = this.calculateDistance();
  }

  calculateDistance() {
    const dx = this.mass2.x - this.mass1.x;
    const dy = this.mass2.y - this.mass1.y;
    return Math.sqrt(dx * dx + dy * dy) || CONFIG.interaction.dragDetection;
  }

  getCurrentLength() {
    return this.calculateDistance();
  }

  getExtension() {
    return this.getCurrentLength() - this.restLength;
  }

  applyForces(damping) {
    const dx = this.mass2.x - this.mass1.x;
    const dy = this.mass2.y - this.mass1.y;
    const distance = this.getCurrentLength();
    const extension = this.getExtension();

    // Spring force
    const springForceMagnitude = this.stiffness * extension;
    const fx = (springForceMagnitude * dx) / distance;
    const fy = (springForceMagnitude * dy) / distance;

    // Damping force
    const dvx = this.mass2.vx - this.mass1.vx;
    const dvy = this.mass2.vy - this.mass1.vy;
    const dampingForceMagnitude = damping * ((dvx * dx + dvy * dy) / distance);
    const fdx = (dampingForceMagnitude * dx) / distance;
    const fdy = (dampingForceMagnitude * dy) / distance;

    // Apply forces (Newton's third law)
    if (!this.mass1.fixed) {
      this.mass1.addForce(fx + fdx, fy + fdy);
    }
    if (!this.mass2.fixed) {
      this.mass2.addForce(-(fx + fdx), -(fy + fdy));
    }

    return {
      mass1Force: { x: fx + fdx, y: fy + fdy },
      mass2Force: { x: -(fx + fdx), y: -(fy + fdy) },
    };
  }

  getElasticPotentialEnergy() {
    const extension = this.getExtension();
    return 0.5 * this.stiffness * extension ** 2;
  }
}

export class PhysicsEngine {
  constructor() {
    this.masses = [];
    this.springs = [];
    this.forceVectors = [];
    this.isPaused = false;
    this.showForces = true;
    this.dragTarget = null;
  }

  addMass(x, y, mass) {
    const newMass = new Mass(x, y, mass);
    this.masses.push(newMass);
    return newMass;
  }

  addSpring(mass1, mass2, stiffness) {
    const spring = new Spring(mass1, mass2, stiffness);
    this.springs.push(spring);
    return spring;
  }

  findMassAt(x, y) {
    const radius = CONFIG.interaction.clickRadius;
    return this.masses.find((mass) => {
      const distance = Math.sqrt((mass.x - x) ** 2 + (mass.y - y) ** 2);
      return distance < radius;
    });
  }

  springExists(mass1, mass2) {
    return this.springs.some(
      (spring) =>
        (spring.mass1 === mass1 && spring.mass2 === mass2) ||
        (spring.mass1 === mass2 && spring.mass2 === mass1)
    );
  }

  step(dt, canvasWidth, canvasHeight) {
    if (this.isPaused) return;

    // Reset forces
    this.masses.forEach((mass) => mass.resetForces());
    this.forceVectors = [];

    // Apply spring forces
    this.springs.forEach((spring) => {
      const forces = spring.applyForces(CONFIG.physics.damping);

      // Store force vectors for visualization
      if (this.showForces) {
        const scale = CONFIG.visual.forceScale;
        this.forceVectors.push({
          x1: spring.mass1.x,
          y1: spring.mass1.y,
          x2: spring.mass1.x + forces.mass1Force.x * scale,
          y2: spring.mass1.y + forces.mass1Force.y * scale,
          color: CONFIG.visual.colors.forceVector,
        });
        this.forceVectors.push({
          x1: spring.mass2.x,
          y1: spring.mass2.y,
          x2: spring.mass2.x + forces.mass2Force.x * scale,
          y2: spring.mass2.y + forces.mass2Force.y * scale,
          color: CONFIG.visual.colors.forceVector,
        });
      }
    });

    // Apply external forces
    this.masses.forEach((mass) => {
      if (!mass.fixed) {
        // Gravity
        mass.addForce(0, mass.mass * CONFIG.physics.gravity);
        // Air resistance
        mass.addForce(
          -CONFIG.physics.damping * mass.vx * 0.5,
          -CONFIG.physics.damping * mass.vy * 0.5
        );
      }
    });

    // Update positions
    this.masses.forEach((mass) => {
      if (mass !== this.dragTarget) {
        mass.update(dt, canvasWidth, canvasHeight);
      }
    });
  }

  calculateTotalEnergy() {
    let kineticEnergy = 0;
    let potentialEnergy = 0;

    // Calculate kinetic and gravitational potential energy
    this.masses.forEach((mass) => {
      kineticEnergy += mass.getKineticEnergy();
      potentialEnergy += mass.getPotentialEnergy(CONFIG.physics.gravity);
    });

    // Calculate elastic potential energy
    this.springs.forEach((spring) => {
      potentialEnergy += spring.getElasticPotentialEnergy();
    });

    return {
      kinetic: kineticEnergy,
      potential: potentialEnergy,
      total: kineticEnergy + potentialEnergy,
    };
  }

  reset() {
    this.masses = [];
    this.springs = [];
    this.forceVectors = [];
    this.dragTarget = null;

    // Create default setup
    const centerX = CONFIG.canvas.simulation.width / 2;
    const mass1 = this.addMass(centerX, 100, CONFIG.physics.mass);
    mass1.fixed = true;
    const mass2 = this.addMass(centerX, 200, CONFIG.physics.mass);
    this.addSpring(mass1, mass2, CONFIG.physics.stiffness);
  }

  updateStiffness(newStiffness) {
    this.springs.forEach((spring) => {
      spring.stiffness = newStiffness;
    });
  }
}
