'use client';

import React, { useRef, useEffect, Suspense, useState } from 'react';
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Proper foil shader that makes the card metallic with angle-dependent rainbow
const FoilMaterial3D = shaderMaterial(
  {
    uTime: 0,
    uCardTexture: null,
    uHasTexture: 0,
    uLightPosition: new THREE.Vector3(2, 2, 2),
    uViewPosition: new THREE.Vector3(0, 0, 2),
    uMetallicness: 0.8,
    uRoughness: 0.1,
    uIridescence: 1.0,
  },
  // Vertex shader - calculate proper normals and positions
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewDirection;
    varying vec3 vLightDirection;
    
    uniform vec3 uLightPosition;
    uniform vec3 uViewPosition;
    
    void main() {
      vUv = uv;
      
      // Transform normal to world space
      vNormal = normalize(normalMatrix * normal);
      
      // World position
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      
      // View direction (from surface to camera)
      vViewDirection = normalize(uViewPosition - vWorldPosition);
      
      // Light direction (from surface to light)
      vLightDirection = normalize(uLightPosition - vWorldPosition);
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader - proper metallic foil with angle-dependent rainbow
  `
    uniform float uTime;
    uniform sampler2D uCardTexture;
    uniform float uHasTexture;
    uniform vec3 uLightPosition;
    uniform vec3 uViewPosition;
    uniform float uMetallicness;
    uniform float uRoughness;
    uniform float uIridescence;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    varying vec3 vViewDirection;
    varying vec3 vLightDirection;
    
    // Convert HSV to RGB for rainbow effect
    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
    
    // Fresnel effect for realistic metallic reflection
    float fresnel(vec3 viewDir, vec3 normal, float f0) {
      float cosTheta = max(0.0, dot(viewDir, normal));
      return f0 + (1.0 - f0) * pow(1.0 - cosTheta, 5.0);
    }
    
    void main() {
      vec2 uv = vUv;
      
      // Use texture if available, otherwise create a gradient placeholder
      vec4 cardColor;
      if (uHasTexture > 0.5) {
        cardColor = texture2D(uCardTexture, uv);
      } else {
        // Create a nice gradient placeholder that looks like a card
        vec3 gradientColor = mix(
          vec3(0.2, 0.3, 0.6), // Dark blue
          vec3(0.1, 0.2, 0.4), // Darker blue
          uv.y
        );
        // Add some pattern
        float pattern = sin(uv.x * 20.0) * sin(uv.y * 15.0) * 0.1;
        gradientColor += pattern;
        cardColor = vec4(gradientColor, 1.0);
      }
      
      // Create mask to preserve blacks (text, borders, etc.)
      // Calculate luminance of the card color
      float luminance = dot(cardColor.rgb, vec3(0.299, 0.587, 0.114));
      
      // Create black mask - stronger effect for darker areas
      float blackMask = smoothstep(0.0, 0.3, luminance); // 0 = pure black, 1 = lighter colors
      
      // Additional mask for very dark colors (like dark borders)
      float darkMask = smoothstep(0.0, 0.15, luminance);
      
      // Calculate reflection vector
      vec3 reflectionDir = reflect(-vViewDirection, vNormal);
      
      // Create metallic silver color instead of rainbow
      vec3 metallicColor = vec3(0.9, 0.9, 0.95); // Slightly cool metallic silver
      
      // Calculate fresnel for metallic reflection - stronger metallic effect
      float fresnelFactor = fresnel(vViewDirection, vNormal, 0.08);
      
      // Metallic reflection intensity based on view angle - much stronger
      float metallicReflection = fresnelFactor * uMetallicness * 2.0;
      
      // Create foil effect overlay - pure metallic without rainbow
      vec3 metallicReflection_color = metallicColor * metallicReflection * 1.5;
      
      // Add stronger specular highlight
      vec3 halfVector = normalize(vLightDirection + vViewDirection);
      float specular = pow(max(0.0, dot(vNormal, halfVector)), 16.0); // Lower power = wider highlight
      vec3 foilEffect = metallicReflection_color + vec3(1.0) * specular * 0.8; // Much stronger specular
      
      // Apply black mask to foil effect
      // Black areas get NO foil effect, preserving inky blacks
      foilEffect *= blackMask;
      
      // Reduce foil intensity on dark areas even more
      float foilIntensity = metallicReflection * blackMask * darkMask;
      
      // Output foil effect with black preservation - stronger overall effect
      // Pure black areas will be completely transparent, preserving the card's blacks
      gl_FragColor = vec4(foilEffect, foilIntensity * 0.9); // Much stronger alpha
    }
  `
);

extend({ FoilMaterial3D });

interface FoilCard3DMeshProps {
  cardImageUrl?: string;
  rotation: [number, number, number];
}

function FoilCard3DMesh({ cardImageUrl, rotation }: FoilCard3DMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);
  const { camera } = useThree();
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [hasTexture, setHasTexture] = useState(false);

  // Load texture manually with error handling
  useEffect(() => {
    if (!cardImageUrl) return;

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous'); // Try to handle CORS
    
    loader.load(
      cardImageUrl,
      // Success
      (loadedTexture) => {
        setTexture(loadedTexture);
        setHasTexture(true);
      },
      // Progress
      undefined,
      // Error - fallback gracefully
      (error) => {
        console.warn('Failed to load card texture, using placeholder:', error);
        setHasTexture(false);
      }
    );
  }, [cardImageUrl]);
  
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
      materialRef.current.uViewPosition = camera.position;
      materialRef.current.uHasTexture = hasTexture ? 1.0 : 0.0;
      
      if (texture) {
        materialRef.current.uCardTexture = texture;
      }
      
      // Update light position to create dynamic lighting
      const lightX = Math.sin(state.clock.elapsedTime * 0.5) * 3;
      const lightY = Math.cos(state.clock.elapsedTime * 0.3) * 2 + 2;
      materialRef.current.uLightPosition = new THREE.Vector3(lightX, lightY, 3);
    }
    
    // Apply 3D rotation
    if (meshRef.current) {
      meshRef.current.rotation.x = rotation[0];
      meshRef.current.rotation.y = rotation[1];
      meshRef.current.rotation.z = rotation[2];
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2.8]} />
      {/* @ts-ignore */}
      <foilMaterial3D
        ref={materialRef}
        uMetallicness={0.95}
        uRoughness={0.05}
        uIridescence={2.0}
        side={THREE.FrontSide}
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

export function FoilCard3D({ 
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
  const [hovered, setHovered] = useState(false);
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    
    // Calculate 3D rotation - this affects the foil reflection!
    const rotationX = (y - 0.5) * 0.5;
    const rotationY = (x - 0.5) * -0.5;
    
    setRotation([rotationX, rotationY, 0]);
  };

  const handleMouseEnter = () => {
    setHovered(true);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setRotation([0, 0, 0]);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative rounded-lg overflow-hidden cursor-pointer ${className}`}
      style={{ 
        width, 
        height,
        perspective: '1000px',
        transformStyle: 'preserve-3d'
      }}
      onClick={onCardClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Show regular card image as background for better UX */}
      {card.imageUrl && (
        <img 
          src={card.imageUrl} 
          alt={card.name}
          className="absolute inset-0 w-full h-full object-cover rounded-lg"
          style={{ 
            zIndex: 1,
            transform: `rotateX(${rotation[0]}rad) rotateY(${rotation[1]}rad)`,
            transition: hovered ? 'none' : 'transform 0.3s ease-out'
          }}
        />
      )}
      
      {/* WebGL foil overlay - adds metallic effect on top */}
      <div 
        className="absolute inset-0" 
        style={{ 
          zIndex: 2,
          mixBlendMode: 'overlay',
          opacity: 0.7,
          transform: `rotateX(${rotation[0]}rad) rotateY(${rotation[1]}rad)`,
          transition: hovered ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        <Suspense fallback={<CardLoader />}>
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0, 2], fov: 50 }}
            gl={{ 
              antialias: true, 
              alpha: true, // Allow transparency so background shows through
              powerPreference: "high-performance"
            }}
            style={{ background: 'transparent' }}
          >
            <ambientLight intensity={0.3} />
            <directionalLight position={[2, 2, 2]} intensity={1.0} />
            <FoilCard3DMesh 
              cardImageUrl={card.imageUrl} 
              rotation={rotation} 
            />
          </Canvas>
        </Suspense>
      </div>
      
      {/* Card name overlay */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-sm font-medium opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
        style={{ zIndex: 3 }}
      >
        {card.name}
      </div>
      
      {/* WebGL indicator */}
      <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded pointer-events-none" style={{ zIndex: 4 }}>
        Metallic Foil
      </div>
      
      {/* Debug info */}
      {hovered && (
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none" style={{ zIndex: 4 }}>
          Angle: {rotation[0].toFixed(2)}, {rotation[1].toFixed(2)}
        </div>
      )}
    </div>
  );
} 