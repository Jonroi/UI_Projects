import type { EasingFunction, AnimatedProperty } from '../types';

/** Generates a simple unique ID. */
export const generateId = (): string =>
  `id_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Solves for `t` in a cubic Bezier equation `x(t) = x_target`.
 * This is needed to find the Bezier curve parameter `u` for a given time progression `t_progress`.
 * Uses Newton-Raphson method.
 * Control points P0=(0,0), P3=(1,1) are implicit.
 * @param x1 X-coordinate of the first control point.
 * @param x2 X-coordinate of the second control point.
 * @param t_progress The target x-value (time progress, 0 to 1).
 * @returns The parameter `u` such that BezierX(u) = t_progress.
 */
const solveCubicBezierParameter = (
  x1: number,
  x2: number,
  t_progress: number,
): number => {
  if (t_progress === 0 || t_progress === 1) return t_progress;

  const P1_X = x1;
  const P2_X = x2;

  // Coefficients for the cubic Bezier equation for X: B_x(u) = C_x * u^3 + B_x * u^2 + A_x * u
  // where P0=(0,0), P3=(1,1)
  const Ax = 3 * P1_X - 3 * P2_X + 1;
  const Bx = 3 * P2_X - 6 * P1_X;
  const Cx = 3 * P1_X;

  let u = t_progress; // Initial guess

  // Newton-Raphson iterations (typically 4-8 are enough)
  for (let i = 0; i < 8; i++) {
    const current_x = ((Ax * u + Bx) * u + Cx) * u;
    const derivative_x = (3 * Ax * u + 2 * Bx) * u + Cx;
    if (derivative_x === 0) break; // Avoid division by zero
    const error = current_x - t_progress;
    u -= error / derivative_x;
    u = Math.max(0, Math.min(1, u)); // Clamp u to [0, 1]
  }
  return u;
};

/**
 * Calculates the Y-value of a cubic Bezier curve for a given parameter `u`.
 * Control points P0=(0,0), P3=(1,1) are implicit.
 * @param y1 Y-coordinate of the first control point.
 * @param y2 Y-coordinate of the second control point.
 * @param u The Bezier curve parameter (0 to 1), typically solved from `solveCubicBezierParameter`.
 * @returns The eased Y-value.
 */
const calculateCubicBezierY = (y1: number, y2: number, u: number): number => {
  const P1_Y = y1;
  const P2_Y = y2;

  // Coefficients for the cubic Bezier equation for Y: B_y(u) = C_y * u^3 + B_y * u^2 + A_y * u
  const Ay = 3 * P1_Y - 3 * P2_Y + 1;
  const By = 3 * P2_Y - 6 * P1_Y;
  const Cy = 3 * P1_Y;

  return ((Ay * u + By) * u + Cy) * u;
};

/** Applies an easing function to a time progress value `t_progress` (0 to 1). */
export const applyEasing = (
  t_progress: number,
  easing: EasingFunction,
): number => {
  if (t_progress <= 0) return 0;
  if (t_progress >= 1) return 1;

  if (typeof easing === 'string') {
    switch (easing) {
      case 'linear':
        return t_progress;
      case 'ease-in':
        return t_progress * t_progress * t_progress; // Cubic
      case 'ease-out':
        return 1 - Math.pow(1 - t_progress, 3); // Cubic
      case 'ease-in-out':
        return t_progress < 0.5
          ? 4 * t_progress * t_progress * t_progress
          : 1 - Math.pow(-2 * t_progress + 2, 3) / 2; // Cubic
      default:
        return t_progress;
    }
  } else if (Array.isArray(easing) && easing.length === 4) {
    const [x1, y1, x2, y2] = easing;
    // Check for common linear case which doesn't need solving
    if (x1 === y1 && x2 === y2) return t_progress;
    const u = solveCubicBezierParameter(x1, x2, t_progress);
    return calculateCubicBezierY(y1, y2, u);
  }
  return t_progress; // Fallback
};

/**
 * Calculates the animated value of a property at a specific time.
 * @param property The AnimatedProperty object.
 * @param time The current time in milliseconds.
 * @returns The interpolated value.
 */
export const getAnimatedValueAtTime = (
  property: AnimatedProperty,
  time: number,
): number => {
  const { keyframes, defaultValue } = property;

  if (keyframes.length === 0) {
    return defaultValue;
  }

  // Keyframes should be sorted by time. Assume they are for performance.
  const sortedKeyframes = keyframes;

  if (time <= sortedKeyframes[0].time) {
    return sortedKeyframes[0].value;
  }

  if (time >= sortedKeyframes[sortedKeyframes.length - 1].time) {
    return sortedKeyframes[sortedKeyframes.length - 1].value;
  }

  let prevKeyframe = null;
  let nextKeyframe = null;

  for (const kf of sortedKeyframes) {
    if (kf.time <= time) {
      prevKeyframe = kf;
    } else {
      nextKeyframe = kf;
      break;
    }
  }

  if (!prevKeyframe || !nextKeyframe) {
    return defaultValue;
  }

  const timeDelta = nextKeyframe.time - prevKeyframe.time;
  const valueDelta = nextKeyframe.value - prevKeyframe.value;
  const t_progress = (time - prevKeyframe.time) / timeDelta;
  const easedProgress = applyEasing(t_progress, prevKeyframe.easing);
  return prevKeyframe.value + easedProgress * valueDelta;
};
