// Configuration and Constants
export const CONFIG = {
  // Physics Parameters
  physics: {
    stiffness: 100,
    damping: 0.05,
    gravity: 9.8,
    mass: 1.0,
    timeStep: 0.035, // Maximum time step for stability
    boundaryDamping: 0.4, // Energy loss on wall collision
  },

  // Canvas Settings
  canvas: {
    simulation: {
      width: 1000,
      height: 450,
    },
    energy: {
      width: 1000,
      height: 120,
    },
  },

  // Visual Settings
  visual: {
    massRadius: 14,
    highlightRadius: 19,
    forceScale: 0.2,
    colors: {
      massFixed: '#9333ea',
      massMoveable: '#818cf8',
      massHighlight: '#f59e42',
      connectionHighlight: '#10b981',
      springExtended: '#dc2626',
      springCompressed: '#2563eb',
      forceVector: '#dc2626',
      energyKinetic: '#3b82f6',
      energyPotential: '#10b981',
      energyTotal: '#dc2626',
    },
  },

  // Energy Graph Settings
  energy: {
    historyLength: 1000,
    minRange: 10,
    axisOffset: 30,
    margin: 12,
  },

  // Interaction Settings
  interaction: {
    clickRadius: 18,
    doubleClickTime: 500,
    dragDetection: 1e-8,
  },

  // Presets
  presets: {
    default: { k: 100, c: 0.05, g: 9.8 },
    microgravity: { k: 300, c: 0.02, g: 0 },
    heavyDamping: { k: 50, c: 0.3, g: 20 },
  },
};
