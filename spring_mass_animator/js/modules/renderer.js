import { Mass, Spring } from './physics.js';

console.log('Renderer.js: Module loaded');

export class Renderer {
  constructor(simCanvas, energyCanvas) {
    console.log('Renderer.js: Constructor called');
    this.simCanvas = simCanvas;
    this.energyCanvas = energyCanvas;
    this.simCtx = simCanvas.getContext('2d');
    this.energyCtx = energyCanvas.getContext('2d');
    this.energyData = [];
    this.ENERGY_HISTORY = 1000;

    // Set initial canvas dimensions
    this.resize(
      simCanvas.width,
      simCanvas.height,
      energyCanvas.width,
      energyCanvas.height,
    );
  }

  resize(simWidth, simHeight, energyWidth, energyHeight) {
    // Update canvas dimensions
    this.simCanvas.width = simWidth;
    this.simCanvas.height = simHeight;
    this.energyCanvas.width = energyWidth;
    this.energyCanvas.height = energyHeight;

    // Enable high-quality rendering
    this.simCtx.imageSmoothingEnabled = true;
    this.simCtx.imageSmoothingQuality = 'high';
    this.energyCtx.imageSmoothingEnabled = true;
    this.energyCtx.imageSmoothingQuality = 'high';

    // Clear canvases
    this.simCtx.clearRect(0, 0, simWidth, simHeight);
    this.energyCtx.clearRect(0, 0, energyWidth, energyHeight);

    // Reset line styles
    this.simCtx.setLineDash([]);
    this.energyCtx.setLineDash([]);
  }

  drawSimulation(physics) {
    // Clear canvas
    this.simCtx.clearRect(0, 0, this.simCanvas.width, this.simCanvas.height);

    // Draw springs
    for (let s of physics.springs) {
      let m1 = s.m1,
        m2 = s.m2;
      let dx = m2.x - m1.x,
        dy = m2.y - m1.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      let ext = dist - s.restLength;

      // Set spring color based on extension
      this.simCtx.strokeStyle = ext > 0 ? '#ef4444' : '#3b82f6';
      this.simCtx.lineWidth = Math.min(5, Math.max(1, Math.abs(ext) * 0.5));

      // Draw spring with gradient
      const gradient = this.simCtx.createLinearGradient(m1.x, m1.y, m2.x, m2.y);
      gradient.addColorStop(0, ext > 0 ? '#ef4444' : '#3b82f6');
      gradient.addColorStop(1, ext > 0 ? '#dc2626' : '#2563eb');
      this.simCtx.strokeStyle = gradient;

      this.simCtx.beginPath();
      this.simCtx.moveTo(m1.x, m1.y);
      this.simCtx.lineTo(m2.x, m2.y);
      this.simCtx.stroke();
    }

    // Draw force vectors if enabled
    if (physics.showForces) {
      for (let f of physics.forceVectors) {
        this.simCtx.beginPath();
        this.simCtx.moveTo(f.x1, f.y1);
        this.simCtx.lineTo(f.x2, f.y2);
        this.simCtx.strokeStyle = f.color;
        this.simCtx.lineWidth = 1.5;
        this.simCtx.stroke();

        // Draw arrow head
        let angle = Math.atan2(f.y2 - f.y1, f.x2 - f.x1);
        let size = 6;
        this.simCtx.beginPath();
        this.simCtx.moveTo(f.x2, f.y2);
        this.simCtx.lineTo(
          f.x2 - size * Math.cos(angle - Math.PI / 6),
          f.y2 - size * Math.sin(angle - Math.PI / 6),
        );
        this.simCtx.lineTo(
          f.x2 - size * Math.cos(angle + Math.PI / 6),
          f.y2 - size * Math.sin(angle + Math.PI / 6),
        );
        this.simCtx.closePath();
        this.simCtx.fillStyle = f.color;
        this.simCtx.fill();
      }
    }

    // Draw masses
    for (let m of physics.masses) {
      // Draw shadow
      this.simCtx.beginPath();
      this.simCtx.arc(m.x + 2, m.y + 2, 12, 0, Math.PI * 2);
      this.simCtx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      this.simCtx.fill();

      // Draw mass
      this.simCtx.beginPath();
      this.simCtx.arc(m.x, m.y, 10, 0, Math.PI * 2);
      const gradient = this.simCtx.createRadialGradient(
        m.x - 3,
        m.y - 3,
        1,
        m.x,
        m.y,
        10,
      );
      gradient.addColorStop(0, m.fixed ? '#c084fc' : '#818cf8');
      gradient.addColorStop(1, m.fixed ? '#a855f7' : '#6366f1');
      this.simCtx.fillStyle = gradient;
      this.simCtx.fill();

      // Draw border
      this.simCtx.strokeStyle = '#ffffff';
      this.simCtx.lineWidth = 2;
      this.simCtx.stroke();

      // Draw fixed indicator
      if (m.fixed) {
        this.simCtx.beginPath();
        this.simCtx.moveTo(m.x - 5, m.y - 5);
        this.simCtx.lineTo(m.x + 5, m.y + 5);
        this.simCtx.moveTo(m.x + 5, m.y - 5);
        this.simCtx.lineTo(m.x - 5, m.y + 5);
        this.simCtx.strokeStyle = '#ffffff';
        this.simCtx.lineWidth = 2;
        this.simCtx.stroke();
      }
    }

    // Draw interaction highlight
    if (physics.dragTarget) {
      this.simCtx.beginPath();
      this.simCtx.arc(
        physics.dragTarget.x,
        physics.dragTarget.y,
        15,
        0,
        Math.PI * 2,
      );
      this.simCtx.strokeStyle = '#f59e0b';
      this.simCtx.lineWidth = 2;
      this.simCtx.setLineDash([5, 5]);
      this.simCtx.stroke();
      this.simCtx.setLineDash([]);
    }
  }

  drawEnergyGraph(energy) {
    // Clear canvas
    this.energyCtx.clearRect(
      0,
      0,
      this.energyCanvas.width,
      this.energyCanvas.height,
    );

    // Add new energy data
    this.energyData.push({
      KE: energy.KE,
      PE: energy.PE,
      total: energy.total,
    });

    // Keep only the last ENERGY_HISTORY points
    if (this.energyData.length > this.ENERGY_HISTORY) {
      this.energyData.shift();
    }

    // Find min and max energy values
    let minE = 0;
    let maxE = Math.max(
      ...this.energyData.map((d) => Math.max(d.KE, d.PE, d.total)),
    );
    maxE = Math.max(maxE, 1); // Ensure we have some range

    // Draw grid
    this.energyCtx.strokeStyle = '#e5e7eb';
    this.energyCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      let y = this.mapE(i * (maxE / 4), minE, maxE);
      this.energyCtx.beginPath();
      this.energyCtx.moveTo(0, y);
      this.energyCtx.lineTo(this.energyCanvas.width, y);
      this.energyCtx.stroke();

      // Draw grid labels
      this.energyCtx.fillStyle = '#9ca3af';
      this.energyCtx.font = '9px Arial';
      this.energyCtx.textAlign = 'right';
      this.energyCtx.fillText((i * (maxE / 4)).toFixed(1), 30, y - 2);
    }

    // Draw energy lines
    this.drawEnergyLine('KE', '#ef4444', false);
    this.drawEnergyLine('PE', '#3b82f6', false);
    this.drawEnergyLine('total', '#10b981', true);

    // Draw labels with background
    this.energyCtx.font = '10px Arial';
    const labels = [
      { text: 'KE', color: '#ef4444', x: 5 },
      { text: 'PE', color: '#3b82f6', x: 35 },
      { text: 'Total', color: '#10b981', x: 65 },
    ];

    labels.forEach((label) => {
      this.energyCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      this.energyCtx.fillRect(label.x - 2, 0, 30, 15);
      this.energyCtx.fillStyle = label.color;
      this.energyCtx.fillText(label.text, label.x, 10);
    });

    return {
      KE: energy.KE,
      PE: energy.PE,
      total: energy.total,
    };
  }

  drawEnergyLine(type, color, dashed) {
    if (this.energyData.length < 2) return;

    this.energyCtx.beginPath();
    this.energyCtx.strokeStyle = color;
    this.energyCtx.lineWidth = 2;

    if (dashed) {
      this.energyCtx.setLineDash([5, 5]);
    } else {
      this.energyCtx.setLineDash([]);
    }

    let minE = 0;
    let maxE = Math.max(
      ...this.energyData.map((d) => Math.max(d.KE, d.PE, d.total)),
    );
    maxE = Math.max(maxE, 1);

    this.energyCtx.moveTo(0, this.mapE(this.energyData[0][type], minE, maxE));

    for (let i = 1; i < this.energyData.length; i++) {
      let x = (i / (this.ENERGY_HISTORY - 1)) * this.energyCanvas.width;
      let y = this.mapE(this.energyData[i][type], minE, maxE);
      this.energyCtx.lineTo(x, y);
    }

    this.energyCtx.stroke();
    this.energyCtx.setLineDash([]);
  }

  mapE(value, min, max) {
    return (
      this.energyCanvas.height -
      ((value - min) / (max - min)) * this.energyCanvas.height
    );
  }
}
