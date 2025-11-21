import React, { useMemo } from "react";

import statsData from "../data/stats.json";
import placeCategoryData from "../data/placeCategories.json";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

const buildShapes = (recoveryIndex: number, explorationIndex: number) => {
  const layerCount = 6;
  return Array.from({ length: layerCount }, (_, idx) => {
    const strength = recoveryIndex * 0.6 + explorationIndex * 0.4;
    const radius = 38 + idx * 12 + randomBetween(-6, 12) * strength;
    const rotation = randomBetween(0, 360);
    const wobble = randomBetween(4, 14);
    const opacity = 0.22 + strength * 0.18 + idx * 0.02;

    return { radius, rotation, wobble, opacity };
  });
};

const mapPlaceCategories = (
  baseRadius: number,
  placeCategories: typeof placeCategoryData,
  rideProgress: number,
) => {
  return placeCategories.map((place, idx) => {
    const angle = randomBetween(0, Math.PI * 2);
    const spread = randomBetween(10, 28) * place.intensity;
    const offset = 10 + idx * 4;
    const radius = baseRadius + offset + place.intensity * 18;
    const cx = 100 + Math.cos(angle) * spread;
    const cy = 100 + Math.sin(angle) * spread;
    const hue = 200 + idx * 25 + rideProgress * 30;

    return {
      cx,
      cy,
      radius,
      hue,
      opacity: 0.18 + place.intensity * 0.3,
    };
  });
};

type Props = {
  stats?: typeof statsData;
  placeCategories?: typeof placeCategoryData;
  className?: string;
};

const MovementSwirlAvatar = ({ stats = statsData, placeCategories = placeCategoryData, className }: Props) => {
  const rideProgress = clamp(stats.rideMilesYTDApprox / stats.rideGoalYTDApprox, 0, 1);
  const recoveryIndex = clamp(stats.recoveryIndex, 0, 1);
  const explorationIndex = clamp(stats.explorationIndex, 0, 1);

  const shapes = useMemo(() => buildShapes(recoveryIndex, explorationIndex), [recoveryIndex, explorationIndex]);
  const mappedPlaces = useMemo(
    () => mapPlaceCategories(70 + explorationIndex * 14, placeCategories, rideProgress),
    [explorationIndex, placeCategories, rideProgress],
  );

  const pulses = useMemo(
    () =>
      Array.from({ length: 3 }, (_, idx) => ({
        radius: 50 + idx * 28,
        delay: `${idx * 0.8}s`,
        opacity: 0.1 + idx * 0.06 + recoveryIndex * 0.08,
      })),
    [recoveryIndex],
  );

  const saturationBoost = 0.6 + recoveryIndex * 0.4;

  return (
    <div className={`flex flex-col items-center gap-4 ${className ?? ""}`}>
      <div className="group relative isolate w-full max-w-[420px] overflow-hidden rounded-3xl bg-gradient-to-br from-surface/70 via-surface/40 to-surface/70 p-6 shadow-xl ring-1 ring-border/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.12),transparent_35%),radial-gradient(circle_at_70%_40%,rgba(16,185,129,0.12),transparent_32%),radial-gradient(circle_at_50%_80%,rgba(236,72,153,0.12),transparent_40%)]" aria-hidden="true" />
        <svg
          className="relative aspect-square w-full drop-shadow-xl"
          viewBox="0 0 200 200"
          role="img"
          aria-label="Abstract avatar representing exploration, movement, and recovery levels"
        >
          <defs>
            <linearGradient id="swirl-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={`hsl(${210 + explorationIndex * 40}, ${70 * saturationBoost}%, 70%)`} />
              <stop offset="100%" stopColor={`hsl(${320 - recoveryIndex * 20}, ${65 * saturationBoost}%, 68%)`} />
            </linearGradient>
            <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={`hsl(${180 + rideProgress * 60}, 72%, ${65 + recoveryIndex * 10}%)`} />
              <stop offset="100%" stopColor={`hsl(${260 + explorationIndex * 30}, 70%, ${58 + recoveryIndex * 12}%)`} />
            </linearGradient>
          </defs>

          <g className="transition-all duration-700 motion-reduce:transition-none">
            {pulses.map((pulse, idx) => (
              <circle
                key={`pulse-${idx}`}
                cx="100"
                cy="100"
                r={pulse.radius}
                fill="none"
                stroke="url(#ring-gradient)"
                strokeWidth={1.4}
                opacity={pulse.opacity}
                className="motion-safe:animate-[ping_4s_ease-in-out_infinite] motion-reduce:animate-none"
                style={{ animationDelay: pulse.delay }}
              />
            ))}

            {shapes.map((shape, idx) => (
              <g key={`shape-${idx}`} transform={`rotate(${shape.rotation} 100 100)`}>
                <ellipse
                  cx="100"
                  cy="100"
                  rx={shape.radius}
                  ry={shape.radius * 0.68}
                  fill="url(#swirl-gradient)"
                  opacity={shape.opacity}
                  className="mix-blend-screen"
                />
                <ellipse
                  cx="100"
                  cy="100"
                  rx={shape.radius - shape.wobble}
                  ry={(shape.radius - shape.wobble) * 0.66}
                  fill="none"
                  stroke="url(#swirl-gradient)"
                  strokeWidth={1.6}
                  opacity={shape.opacity + 0.08}
                  className="transition-transform duration-700 motion-safe:group-hover:scale-[1.02] motion-reduce:transition-none"
                />
              </g>
            ))}

            {mappedPlaces.map((place) => (
              <circle
                key={place.id}
                cx={place.cx}
                cy={place.cy}
                r={place.radius}
                fill={`hsla(${place.hue}, ${62 * saturationBoost}%, 62%, ${place.opacity})`}
                className="mix-blend-screen motion-safe:animate-pulse"
              />
            ))}

            <circle
              cx="100"
              cy="100"
              r={46 + rideProgress * 16}
              fill="url(#ring-gradient)"
              opacity={0.6 + recoveryIndex * 0.2}
              className="drop-shadow-md"
            />
            <circle cx="100" cy="100" r={30} fill="#0f172a" opacity={0.25} />
          </g>
        </svg>
      </div>
      <p className="max-w-lg text-center text-sm text-text-tertiary">
        Auto-generated snapshot of how much I’ve been exploring, moving, and recovering lately. Approximate by design.
      </p>
    </div>
  );
};

export default MovementSwirlAvatar;
