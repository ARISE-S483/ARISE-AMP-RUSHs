// Liquid Glass effect using SVG displacement maps
// Based on kube.io's technique: https://kube.io/blog/liquid-glass-css-svg/
// Creates refraction + specular highlight for authentic Apple Liquid Glass

import { useEffect, useRef, useMemo } from 'react';

interface LiquidGlassConfig {
  id: string;
  width: number;
  height: number;
  borderRadius?: number;
  bezelWidth?: number;
  glassThickness?: number;
  scale?: number;
  blur?: number;
  specularOpacity?: number;
  tint?: string;
  tintOpacity?: number;
}

// Generate displacement map as data URL from canvas
function generateDisplacementMap(
  width: number,
  height: number,
  borderRadius: number,
  bezelWidth: number,
  glassThickness: number
): { mapUrl: string; specularUrl: string; maxDisplacement: number } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const specCanvas = document.createElement('canvas');
  specCanvas.width = width;
  specCanvas.height = height;
  const specCtx = specCanvas.getContext('2d')!;

  const imageData = ctx.createImageData(width, height);
  const specImageData = specCtx.createImageData(width, height);
  const data = imageData.data;
  const specData = specImageData.data;

  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.max(width, height) / 2;

  let maxMag = 0;

  // Pre-calculate displacement vectors
  const vectors: { dx: number; dy: number; mag: number; edgeDist: number }[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Distance from center
      const rx = (x - cx) / (width / 2);
      const ry = (y - cy) / (height / 2);

      // Calculate distance to edge considering border radius
      const absRx = Math.abs(rx);
      const absRy = Math.abs(ry);

      // Smoothed edge distance (accounts for rounded corners)
      const cornerX = Math.max(0, absRx - (1 - borderRadius / (width / 2)));
      const cornerY = Math.max(0, absRy - (1 - borderRadius / (height / 2)));
      const cornerDist = Math.sqrt(cornerX * cornerX + cornerY * cornerY);
      const edgeDist = 1 - Math.max(absRx, absRy, cornerDist);

      // Bezel zone: where refraction happens
      const bezelNorm = bezelWidth / maxDist;
      const bezelFactor = Math.min(1, Math.max(0, edgeDist / bezelNorm));

      // Surface curvature (convex bezel shape)
      const surfaceHeight = bezelFactor < 1
        ? glassThickness * Math.sin(bezelFactor * Math.PI / 2)
        : glassThickness;

      // Gradient of surface → displacement direction
      const epsilon = 0.005;
      const rxPlus = (x + 1 - cx) / (width / 2);
      const ryPlus = (y + 1 - cy) / (height / 2);

      const edgeDistXP = 1 - Math.max(Math.abs(rxPlus), absRy);
      const edgeDistYP = 1 - Math.max(absRx, Math.abs(ryPlus));

      const bfXP = Math.min(1, Math.max(0, edgeDistXP / bezelNorm));
      const bfYP = Math.min(1, Math.max(0, edgeDistYP / bezelNorm));

      const shXP = bfXP < 1 ? glassThickness * Math.sin(bfXP * Math.PI / 2) : glassThickness;
      const shYP = bfYP < 1 ? glassThickness * Math.sin(bfYP * Math.PI / 2) : glassThickness;

      const gradX = (shXP - surfaceHeight);
      const gradY = (shYP - surfaceHeight);

      const mag = Math.sqrt(gradX * gradX + gradY * gradY);

      vectors.push({ dx: gradX, dy: gradY, mag, edgeDist });
      if (mag > maxMag) maxMag = mag;
    }
  }

  // Normalize and write to image data
  for (let i = 0; i < vectors.length; i++) {
    const { dx, dy, mag, edgeDist } = vectors[i];
    const idx = i * 4;

    if (maxMag > 0 && mag > 0) {
      const nx = (dx / maxMag);
      const ny = (dy / maxMag);
      data[idx] = Math.round(128 + nx * 127);     // R = X displacement
      data[idx + 1] = Math.round(128 + ny * 127); // G = Y displacement
    } else {
      data[idx] = 128;
      data[idx + 1] = 128;
    }
    data[idx + 2] = 128; // B unused
    data[idx + 3] = 255; // A opaque

    // Specular highlight: bright at edges, dark in center
    const bezelNorm = bezelWidth / maxDist;
    const bezelFactor = Math.min(1, Math.max(0, edgeDist / bezelNorm));
    const specIntensity = bezelFactor < 1
      ? Math.pow(1 - bezelFactor, 0.6) * 255
      : 0;

    // Top-biased specular (light from above)
    const topBias = Math.max(0, 1 - (i / vectors.length * height / vectors.length));
    const yPos = Math.floor(i / width) / height;
    const specBias = Math.max(0, 1 - yPos * 1.5); // Brighter at top

    specData[idx] = Math.round(specIntensity * specBias);
    specData[idx + 1] = Math.round(specIntensity * specBias);
    specData[idx + 2] = Math.round(specIntensity * specBias);
    specData[idx + 3] = Math.round(specIntensity * 0.6);
  }

  ctx.putImageData(imageData, 0, 0);
  specCtx.putImageData(specImageData, 0, 0);

  return {
    mapUrl: canvas.toDataURL(),
    specularUrl: specCanvas.toDataURL(),
    maxDisplacement: maxMag > 0 ? maxMag * 80 : 10,
  };
}

// SVG filter definition component (invisible, placed in DOM once)
export function LiquidGlassFilter({
  id,
  width,
  height,
  borderRadius = 20,
  bezelWidth = 18,
  glassThickness = 0.4,
  scale: scaleOverride,
  blur = 0.5,
  specularOpacity = 0.35,
  tint = 'rgba(128,128,128,0.12)',
  tintOpacity = 0.12,
}: LiquidGlassConfig) {
  const { mapUrl, specularUrl, maxDisplacement } = useMemo(
    () => generateDisplacementMap(width, height, borderRadius, bezelWidth, glassThickness),
    [width, height, borderRadius, bezelWidth, glassThickness]
  );

  const effectiveScale = scaleOverride ?? maxDisplacement;

  return (
    <svg
      width={0}
      height={0}
      style={{ position: 'absolute', pointerEvents: 'none' }}
      colorInterpolationFilters="sRGB"
    >
      <defs>
        <filter
          id={id}
          x="0"
          y="0"
          width={width}
          height={height}
          filterUnits="userSpaceOnUse"
          primitiveUnits="userSpaceOnUse"
        >
          {/* Load displacement map */}
          <feImage
            href={mapUrl}
            x={0}
            y={0}
            width={width}
            height={height}
            result="dispMap"
          />

          {/* Apply displacement (refraction) */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="dispMap"
            scale={effectiveScale}
            xChannelSelector="R"
            yChannelSelector="G"
            result="refracted"
          />

          {/* Subtle blur on refracted content */}
          <feGaussianBlur in="refracted" stdDeviation={blur} result="blurred" />

          {/* Load specular highlight */}
          <feImage
            href={specularUrl}
            x={0}
            y={0}
            width={width}
            height={height}
            result="specHighlight"
          />

          {/* Blend specular on top */}
          <feBlend in="blurred" in2="specHighlight" mode="screen" result="withSpecular" />

          {/* Glass tint overlay */}
          <feFlood floodColor={tint} floodOpacity={tintOpacity} result="tintLayer" />
          <feBlend in="withSpecular" in2="tintLayer" mode="normal" />
        </filter>
      </defs>
    </svg>
  );
}

// CSS class generator for elements using liquid glass
export function liquidGlassStyle(filterId: string): React.CSSProperties {
  return {
    backdropFilter: `url(#${filterId})`,
    WebkitBackdropFilter: `url(#${filterId})`,
  };
}

// Pre-built filter configs
export const LIQUID_GLASS_CONFIGS = {
  sidebar: {
    id: 'liquidGlass-sidebar',
    width: 72,
    height: 260,
    borderRadius: 36,
    bezelWidth: 14,
    glassThickness: 0.35,
    scale: 12,
    blur: 0.3,
    specularOpacity: 0.4,
    tint: 'rgba(128,128,128,0.15)',
    tintOpacity: 0.15,
  },
  playerBar: {
    id: 'liquidGlass-player',
    width: 960,
    height: 72,
    borderRadius: 24,
    bezelWidth: 16,
    glassThickness: 0.3,
    scale: 10,
    blur: 0.4,
    specularOpacity: 0.35,
    tint: 'rgba(128,128,128,0.12)',
    tintOpacity: 0.12,
  },
} as const;
