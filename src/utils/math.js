export function approach(current, target, dt, speed) {
  return current + (target - current) * (1 - Math.exp((-speed * dt) / 1000));
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
