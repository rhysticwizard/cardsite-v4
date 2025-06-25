'use client';

import React, { useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Foil shader material
const FoilMaterial = shaderMaterial(
  {
    uTime: 0,
    uMouse: new THREE.Vector2(0.5, 0.5),
    uHovered: 0,
    uRainbowIntensity: 1.0,
    uGlitterScale: 15.0,
    uShimmerSpeed: 1.0,
  },
  // Vertex shader
  `
    varying vec2 vUv;
    varying vec3 vViewDirection;
    
    void main() {
      vUv = uv;
      
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vViewDirection = normalize(cameraPosition - worldPosition.xyz);
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader - Rainbow foil effect
  `
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uHovered;
    uniform float uRainbowIntensity;
    uniform float uGlitterScale;
    uniform float uShimmerSpeed;
    
    varying vec2 vUv;
    varying vec3 vViewDirection;
    
    // HSV to RGB conversion
    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
    
    // Noise function
    float random(vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
    }
    
    float noise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      
      vec2 u = f * f * (3.0 - 2.0 * f);
      
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }
    
    void main() {
      vec2 uv = vUv;
      
      // Create view-dependent rainbow effect
      vec2 viewUV = uv + vViewDirection.xy * 0.1;
      float rainbowPhase = viewUV.x + viewUV.y + uTime * uShimmerSpeed * 0.5;
      
      // Create rainbow colors using HSV
      float hue = fract(rainbowPhase * 2.0);
      vec3 rainbow = hsv2rgb(vec3(hue, 0.8, 1.0));
      
      // Create glitter/sparkle effect
      vec2 glitterUV = uv * uGlitterScale + uTime * 0.1;
      float glitter = noise(glitterUV);
      glitter = pow(glitter, 4.0); // Make it more concentrated
      
      // Animate glitter
      glitter *= sin(uTime * 3.0 + glitter * 10.0) * 0.5 + 0.5;
      
      // Create shimmer bands
      float shimmerBand = sin((uv.x - uv.y) * 20.0 + uTime * uShimmerSpeed * 2.0) * 0.5 + 0.5;
      shimmerBand = pow(shimmerBand, 3.0);
      
      // Combine effects
      vec3 foilColor = rainbow * (0.3 + shimmerBand * 0.4 + glitter * 0.3);
      
      // Add holographic intensity based on viewing angle
      float viewAngle = dot(vViewDirection, vec3(0.0, 0.0, 1.0));
      float holographicIntensity = pow(1.0 - abs(viewAngle), 2.0);
      
      // Create base color (simulating card content)
      vec3 baseColor = vec3(0.2, 0.2, 0.3);
      
      // Mix base with foil effect
      vec3 finalColor = mix(
        baseColor, 
        baseColor + foilColor * uRainbowIntensity,
        holographicIntensity * 0.6 + uHovered * 0.4
      );
      
      // Add extra brightness for metallic look
      finalColor += foilColor * 0.3;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);

// Extend the material to use it in JSX
extend({ FoilMaterial });

function FoilCardMesh({ onPointerMove, onPointerEnter, onPointerLeave, hovered }: {
  onPointerMove: (event: any) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  hovered: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);
  
  useFrame((state: any) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
      materialRef.current.uHovered = hovered ? 1 : 0;
    }
  });

  return (
    <mesh
      ref={meshRef}
      // @ts-ignore
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <planeGeometry args={[2, 2.8]} />
      {/* @ts-ignore */}
      <foilMaterial
        ref={materialRef}
        uRainbowIntensity={1.5}
        uGlitterScale={25.0}
        uShimmerSpeed={1.5}
        transparent
      />
    </mesh>
  );
}

function CardLoader() {
  return (
    <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
    </div>
  );
}

interface SimpleCardData {
  name: string;
  imageUrl?: string;
}

export function FoilCardSimple({ 
  card, 
  width = 240, 
  height = 336, 
  className = '',
  onCardClick
}: {
  card: SimpleCardData;
  width?: number;
  height?: number;
  className?: string;
  onCardClick?: () => void;
}) {
  const [hovered, setHovered] = React.useState(false);

  const handlePointerMove = (event: any) => {
    // Handle mouse movement for future enhancements
  };

  const handlePointerEnter = () => {
    setHovered(true);
  };

  const handlePointerLeave = () => {
    setHovered(false);
  };

  return (
    <div 
      className={`relative rounded-lg overflow-hidden ${className}`}
      style={{ width, height }}
      onClick={onCardClick}
    >
      {/* Card image as background */}
      {card.imageUrl && (
        <img 
          src={card.imageUrl} 
          alt={card.name}
          className="absolute inset-0 w-full h-full object-cover rounded-lg"
          style={{ zIndex: 1 }}
        />
      )}
      
      {/* WebGL foil overlay */}
      <div className="absolute inset-0" style={{ zIndex: 2, mixBlendMode: 'screen' }}>
        <Suspense fallback={<CardLoader />}>
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0, 3], fov: 50 }}
            gl={{ 
              antialias: true, 
              alpha: true,
              powerPreference: "high-performance" 
            }}
            style={{ background: 'transparent' }}
          >
            {/* @ts-ignore */}
            <ambientLight intensity={0.3} />
            {/* @ts-ignore */}
            <directionalLight position={[10, 10, 5]} intensity={0.5} />
            
            <FoilCardMesh
              onPointerMove={handlePointerMove}
              onPointerEnter={handlePointerEnter}
              onPointerLeave={handlePointerLeave}
              hovered={hovered}
            />
          </Canvas>
        </Suspense>
      </div>
      
      {/* Card name overlay for accessibility */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-sm font-medium opacity-0 hover:opacity-100 transition-opacity"
        style={{ zIndex: 3 }}
      >
        {card.name}
      </div>
    </div>
  );
} 