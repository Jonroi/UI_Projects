// Rendering Module
import { CONFIG } from './config.js';

export class SimulationRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dragTarget = null;
    this.connectStart = null;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawSprings(springs) {
    springs.forEach((spring) => {
      this.ctx.save();
      const extension = spring.getExtension();

      // Color coding: Red = extended, Blue = compressed
      if (extension > 0) {
        this.ctx.strokeStyle = CONFIG.visual.colors.springExtended;
      } else {
        this.ctx.strokeStyle = CONFIG.visual.colors.springCompressed;
      }

      // Line thickness indicates force magnitude
      this.ctx.lineWidth = Math.max(
        2,
        Math.min(6, Math.abs(extension) * 0.1 + 2)
      );

      this.ctx.beginPath();
      this.ctx.moveTo(spring.mass1.x, spring.mass1.y);
      this.ctx.lineTo(spring.mass2.x, spring.mass2.y);
      this.ctx.stroke();
      this.ctx.restore();
    });
  }

  drawForceVectors(forceVectors) {
    forceVectors.forEach((vector) => {
      this.ctx.save();
      this.ctx.strokeStyle = vector.color;
      this.ctx.lineWidth = 2;

      // Draw force vector line
      this.ctx.beginPath();
      this.ctx.moveTo(vector.x1, vector.y1);
      this.ctx.lineTo(vector.x2, vector.y2);
      this.ctx.stroke();

      // Draw arrowhead
      this.drawArrowhead(
        vector.x1,
        vector.y1,
        vector.x2,
        vector.y2,
        vector.color
      );
      this.ctx.restore();
    });
  }

  drawArrowhead(x1, y1, x2, y2, color) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length > 6) {
      const ux = dx / length;
      const uy = dy / length;

      this.ctx.beginPath();
      this.ctx.moveTo(x2, y2);
      this.ctx.lineTo(x2 - 8 * ux + 4 * uy, y2 - 8 * uy - 4 * ux);
      this.ctx.lineTo(x2 - 8 * ux - 4 * uy, y2 - 8 * uy + 4 * ux);
      this.ctx.closePath();
      this.ctx.fillStyle = color;
      this.ctx.globalAlpha = 0.4;
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;
    }
  }

  drawMasses(masses) {
    masses.forEach((mass, index) => {
      this.ctx.save();

      // Draw mass circle
      this.ctx.beginPath();
      this.ctx.arc(mass.x, mass.y, CONFIG.visual.massRadius, 0, 2 * Math.PI);

      // Color coding: Purple = fixed, Blue = moveable
      this.ctx.fillStyle = mass.fixed
        ? CONFIG.visual.colors.massFixed
        : CONFIG.visual.colors.massMoveable;

      this.ctx.globalAlpha = 0.93;
      this.ctx.shadowColor = 'rgba(67,56,202,0.10)';
      this.ctx.shadowBlur = 5;
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;
      this.ctx.shadowBlur = 0;

      // Border
      this.ctx.strokeStyle = '#334155';
      this.ctx.lineWidth = 2.5;
      this.ctx.stroke();

      // Text label: "X" for fixed, number for moveable
      this.ctx.font = '12px Inter, Arial';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(mass.fixed ? 'X' : index + 1, mass.x, mass.y);

      this.ctx.restore();
    });
  }

  drawInteractionHighlights() {
    // Drag highlight
    if (this.dragTarget) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(
        this.dragTarget.x,
        this.dragTarget.y,
        CONFIG.visual.highlightRadius,
        0,
        2 * Math.PI
      );
      this.ctx.strokeStyle = CONFIG.visual.colors.massHighlight;
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([5, 7]);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Connection highlight
    if (this.connectStart) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(
        this.connectStart.x,
        this.connectStart.y,
        CONFIG.visual.highlightRadius,
        0,
        2 * Math.PI
      );
      this.ctx.strokeStyle = CONFIG.visual.colors.connectionHighlight;
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([3, 5]);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  render(physicsEngine) {
    this.clear();
    this.drawSprings(physicsEngine.springs);

    if (physicsEngine.showForces) {
      this.drawForceVectors(physicsEngine.forceVectors);
    }

    this.drawMasses(physicsEngine.masses);
    this.drawInteractionHighlights();
  }

  setDragTarget(mass) {
    this.dragTarget = mass;
  }

  setConnectStart(mass) {
    this.connectStart = mass;
  }
}

export class EnergyGraphRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.energyData = [];
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  addEnergyData(energyInfo) {
    this.energyData.push({
      ...energyInfo,
      timestamp: performance.now() / 1000,
    });

    // Keep data within limits
    if (this.energyData.length > CONFIG.energy.historyLength) {
      this.energyData.shift();
    }
  }

  calculateEnergyRange() {
    if (this.energyData.length < 2) return { min: 0, max: 100 };

    const allValues = this.energyData.flatMap((data) => [
      data.kinetic,
      data.potential,
      data.total,
    ]);

    let min = Math.min(...allValues);
    let max = Math.max(...allValues);

    // Ensure minimum range for visibility
    if (max - min < CONFIG.energy.minRange) {
      min -= CONFIG.energy.minRange / 2;
      max += CONFIG.energy.minRange / 2;
    }

    return { min, max };
  }

  mapEnergyToY(energy, min, max) {
    const graphHeight = this.canvas.height - CONFIG.energy.margin * 2;
    return (
      CONFIG.energy.margin +
      graphHeight -
      ((energy - min) / (max - min)) * graphHeight
    );
  }

  drawGrid() {
    this.ctx.save();
    this.ctx.strokeStyle = '#e5e7eb';
    this.ctx.lineWidth = 1.2;

    // Horizontal baseline
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height - 18);
    this.ctx.lineTo(this.canvas.width, this.canvas.height - 18);
    this.ctx.stroke();

    // Vertical axis
    this.ctx.beginPath();
    this.ctx.moveTo(CONFIG.energy.axisOffset, 0);
    this.ctx.lineTo(CONFIG.energy.axisOffset, this.canvas.height);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawEnergyLine(energyType, color, lineStyle = []) {
    if (this.energyData.length < 2) return;

    const { min, max } = this.calculateEnergyRange();

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2.2;
    if (lineStyle.length > 0) {
      this.ctx.setLineDash(lineStyle);
    }

    this.ctx.beginPath();
    this.energyData.forEach((data, index) => {
      const x = CONFIG.energy.axisOffset + index;
      const y = this.mapEnergyToY(data[energyType], min, max);

      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });

    this.ctx.stroke();
    this.ctx.restore();
  }

  drawLegend() {
    this.ctx.save();
    this.ctx.font = 'bold 11px Inter, Arial';

    this.ctx.fillStyle = CONFIG.visual.colors.energyKinetic;
    this.ctx.fillText('KE', 7, 20);

    this.ctx.fillStyle = CONFIG.visual.colors.energyPotential;
    this.ctx.fillText('PE', 7, 35);

    this.ctx.fillStyle = CONFIG.visual.colors.energyTotal;
    this.ctx.fillText('Total', 7, 50);

    this.ctx.restore();
  }

  render() {
    this.clear();

    if (this.energyData.length < 2) return;

    this.drawGrid();

    // Draw energy lines
    this.drawEnergyLine('kinetic', CONFIG.visual.colors.energyKinetic);
    this.drawEnergyLine('potential', CONFIG.visual.colors.energyPotential);
    this.drawEnergyLine('total', CONFIG.visual.colors.energyTotal, [5, 5]);

    this.drawLegend();
  }

  reset() {
    this.energyData = [];
  }
}
