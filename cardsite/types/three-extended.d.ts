import { Object3DNode, MaterialNode } from '@react-three/fiber';
import * as THREE from 'three';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      foilMaterial: MaterialNode<
        THREE.ShaderMaterial & {
          uTime: number;
          uTexture: THREE.Texture | null;
          uMouse: THREE.Vector2;
          uHovered: number;
          uRainbowIntensity: number;
          uGlitterScale: number;
          uShimmerSpeed: number;
        },
        typeof THREE.ShaderMaterial
      >;
    }
  }
} 