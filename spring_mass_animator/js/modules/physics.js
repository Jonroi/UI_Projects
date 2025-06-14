export class Mass {
  constructor(x, y, m = 1.0) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.fx = 0;
    this.fy = 0;
    this.m = m;
    this.fixed = false;
  }

  get pos() {
    return [this.x, this.y];
  }

  set pos([x, y]) {
    this.x = x;
    this.y = y;
  }
}

export class Spring {
  constructor(m1, m2, k = 100) {
    this.m1 = m1;
    this.m2 = m2;
    this.k = k;
    this.restLength = this.distance(m1, m2);
  }

  distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }
}

export class PhysicsEngine {
  constructor(params) {
    this.params = params;
    this.masses = [];
    this.springs = [];
    this.forceVectors = [];
    this.isPaused = false;
    this.showForces = false;
    this.dragTarget = null;
  }

  step(dt) {
    if (this.isPaused) return this.calculateEnergy();

    // Reset forces
    for (let m of this.masses) {
      m.fx = 0;
      m.fy = 0;
    }
    this.forceVectors = [];

    // Calculate spring forces
    for (let s of this.springs) {
      let m1 = s.m1,
        m2 = s.m2;
      let dx = m2.x - m1.x,
        dy = m2.y - m1.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1e-8;
      let ext = Math.max(-100, Math.min(100, dist - s.restLength));

      // Spring force
      let fx = ((s.k * ext * dx) / dist) * 1.5;
      let fy = ((s.k * ext * dy) / dist) * 1.5;

      // Damping force
      let dvx = m2.vx - m1.vx;
      let dvy = m2.vy - m1.vy;
      let dampingForce = this.params.damping * ((dvx * dx + dvy * dy) / dist);
      let fdx = (dampingForce * dx) / dist;
      let fdy = (dampingForce * dy) / dist;

      // Apply forces
      if (!m1.fixed) {
        m1.fx += Math.max(-1000, Math.min(1000, fx + fdx));
        m1.fy += Math.max(-1000, Math.min(1000, fy + fdy));
      }
      if (!m2.fixed) {
        m2.fx -= Math.max(-1000, Math.min(1000, fx + fdx));
        m2.fy -= Math.max(-1000, Math.min(1000, fy + fdy));
      }

      // Store force vectors
      if (this.showForces) {
        this.forceVectors.push({
          x1: m1.x,
          y1: m1.y,
          x2: m1.x + (fx + fdx) * 0.2,
          y2: m1.y + (fy + fdy) * 0.2,
          color: '#dc2626',
        });
        this.forceVectors.push({
          x1: m2.x,
          y1: m2.y,
          x2: m2.x - (fx + fdx) * 0.2,
          y2: m2.y - (fy + fdy) * 0.2,
          color: '#dc2626',
        });
      }
    }

    // Apply gravity and update positions
    for (let m of this.masses) {
      if (!m.fixed) {
        // Apply gravity
        m.fy += m.m * this.params.gravity;

        // Apply air resistance
        m.fx += -this.params.damping * m.vx * 0.5;
        m.fy += -this.params.damping * m.vy * 0.5;

        // Update velocity
        m.vx += (m.fx / m.m) * dt;
        m.vy += (m.fy / m.m) * dt;

        // Update position
        m.x += m.vx * dt;
        m.y += m.vy * dt;

        // Boundary collision with damping
        const margin = 10; // Margin from edges
        const restitution = 0.6; // Bounce factor
        const friction = 0.8; // Friction factor

        // Left wall
        if (m.x < margin) {
          m.x = margin;
          m.vx = -m.vx * restitution;
          m.vy *= friction;
        }
        // Right wall
        if (m.x > this.canvasWidth - margin) {
          m.x = this.canvasWidth - margin;
          m.vx = -m.vx * restitution;
          m.vy *= friction;
        }
        // Top wall
        if (m.y < margin) {
          m.y = margin;
          m.vy = -m.vy * restitution;
          m.vx *= friction;
        }
        // Bottom wall
        if (m.y > this.canvasHeight - margin) {
          m.y = this.canvasHeight - margin;
          m.vy = -m.vy * restitution;
          m.vx *= friction;
        }

        // Prevent excessive velocities
        const maxVelocity = 1000;
        m.vx = Math.max(-maxVelocity, Math.min(maxVelocity, m.vx));
        m.vy = Math.max(-maxVelocity, Math.min(maxVelocity, m.vy));
      }
    }

    return this.calculateEnergy();
  }

  calculateEnergy() {
    let KE = 0,
      PE = 0;

    // Kinetic energy
    for (let m of this.masses) {
      KE += 0.5 * m.m * (m.vx ** 2 + m.vy ** 2);
      PE += m.m * this.params.gravity * m.y * 1.5;
    }

    // Spring energy
    for (let s of this.springs) {
      let d = Math.sqrt((s.m2.x - s.m1.x) ** 2 + (s.m2.y - s.m1.y) ** 2);
      let ext = d - s.restLength;
      PE += 0.5 * s.k * ext ** 2 * 1.5;
    }

    return { KE, PE, total: KE + PE };
  }

  setCanvasDimensions(width, height) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  setPaused(paused) {
    this.isPaused = paused;
  }

  setShowForces(show) {
    this.showForces = show;
  }

  setDragTarget(target) {
    this.dragTarget = target;
  }
}
