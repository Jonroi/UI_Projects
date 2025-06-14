import type {
  EasingFunction,
  AnimatedProperty,
  Keyframe,
} from '../../types/animator';

const solveCubicBezierParameter = (
  x1: number,
  x2: number,
  t_progress: number,
): number => {
  // Newton's method to solve for t
  let t = t_progress;
  for (let i = 0; i < 5; i++) {
    const x =
      3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
    const dx =
      3 * (1 - t) * (1 - t) * x1 +
      6 * (1 - t) * t * (x2 - x1) +
      3 * t * t * (1 - x2);
    t = t - (x - t_progress) / dx;
  }
  return t;
};

const calculateCubicBezierY = (y1: number, y2: number, u: number): number => {
  return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
};

export const applyEasing = (
  t_progress: number,
  easing: EasingFunction,
): number => {
  if (typeof easing === 'string') {
    switch (easing) {
      case 'linear':
        return t_progress;
      case 'ease-in':
        return t_progress * t_progress;
      case 'ease-out':
        return t_progress * (2 - t_progress);
      case 'ease-in-out':
        return t_progress < 0.5
          ? 2 * t_progress * t_progress
          : -1 + (4 - 2 * t_progress) * t_progress;
      case 'easeInQuad':
        return t_progress * t_progress;
      case 'easeOutQuad':
        return t_progress * (2 - t_progress);
      case 'easeInOutQuad':
        return t_progress < 0.5
          ? 2 * t_progress * t_progress
          : -1 + (4 - 2 * t_progress) * t_progress;
      case 'easeInCubic':
        return t_progress * t_progress * t_progress;
      case 'easeOutCubic':
        return (t_progress - 1) * (t_progress - 1) * (t_progress - 1) + 1;
      case 'easeInOutCubic':
        return t_progress < 0.5
          ? 4 * t_progress * t_progress * t_progress
          : (t_progress - 1) * (2 * t_progress - 2) * (2 * t_progress - 2) + 1;
      case 'easeInQuart':
        return t_progress * t_progress * t_progress * t_progress;
      case 'easeOutQuart':
        return 1 - Math.pow(1 - t_progress, 4);
      case 'easeInOutQuart':
        return t_progress < 0.5
          ? 8 * t_progress * t_progress * t_progress * t_progress
          : 1 - Math.pow(-2 * t_progress + 2, 4) / 2;
      default:
        return t_progress;
    }
  } else {
    // Custom cubic-bezier
    const [x1, y1, x2, y2] = easing;
    const u = solveCubicBezierParameter(x1, x2, t_progress);
    return calculateCubicBezierY(y1, y2, u);
  }
};

export const getAnimatedValueAtTime = (
  property: AnimatedProperty,
  time: number,
): number => {
  if (!property.keyframes.length) {
    return property.defaultValue;
  }

  // Find the surrounding keyframes
  const beforeKeyframe = property.keyframes
    .filter((k: Keyframe) => k.time <= time)
    .sort((a: Keyframe, b: Keyframe) => b.time - a.time)[0];
  const afterKeyframe = property.keyframes
    .filter((k: Keyframe) => k.time > time)
    .sort((a: Keyframe, b: Keyframe) => a.time - b.time)[0];

  // If no keyframes before or after, return the default value
  if (!beforeKeyframe && !afterKeyframe) {
    return property.defaultValue;
  }

  // If only one keyframe exists, return its value
  if (!beforeKeyframe) {
    return afterKeyframe!.value;
  }
  if (!afterKeyframe) {
    return beforeKeyframe.value;
  }

  // Calculate the progress between keyframes
  const totalTime = afterKeyframe.time - beforeKeyframe.time;
  const progress = (time - beforeKeyframe.time) / totalTime;

  // Apply easing and interpolate
  const easedProgress = applyEasing(progress, beforeKeyframe.easing);
  return (
    beforeKeyframe.value +
    (afterKeyframe.value - beforeKeyframe.value) * easedProgress
  );
};

export const createDefaultAnimatedProperty = (
  defaultValue: number,
): AnimatedProperty => ({
  keyframes: [],
  defaultValue,
});

export const generateId = (): string =>
  `id_${Math.random().toString(36).substr(2, 9)}`;

export const formatPropertyName = (propertyKey: string): string => {
  return propertyKey
    .split(/(?=[A-Z])/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const createKeyframe = (
  time: number,
  value: number,
  easing: EasingFunction = 'linear',
): Keyframe => ({
  id: generateId(),
  time,
  value,
  easing,
});

export const addKeyframe = (
  property: AnimatedProperty,
  time: number,
  value: number,
  easing: EasingFunction = 'linear',
): AnimatedProperty => {
  const newKeyframe = createKeyframe(time, value, easing);
  return {
    ...property,
    keyframes: [...property.keyframes, newKeyframe].sort(
      (a, b) => a.time - b.time,
    ),
  };
};

export const updateKeyframe = (
  property: AnimatedProperty,
  keyframeId: string,
  updates: Partial<Omit<Keyframe, 'id'>>,
): AnimatedProperty => {
  return {
    ...property,
    keyframes: property.keyframes.map((kf) =>
      kf.id === keyframeId ? { ...kf, ...updates } : kf,
    ),
  };
};

export const removeKeyframe = (
  property: AnimatedProperty,
  keyframeId: string,
): AnimatedProperty => {
  return {
    ...property,
    keyframes: property.keyframes.filter((kf) => kf.id !== keyframeId),
  };
};
