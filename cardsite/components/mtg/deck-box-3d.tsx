'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface DeckBox3DProps {
  deckName?: string;
  cardCount?: number;
  className?: string;
  width?: number;
  height?: number;
  onClick?: () => void;
  cardArtUrl?: string;
}

export default function DeckBox3D({ 
  deckName = "Deck Box", 
  cardCount = 60,
  className = "",
  width = 300,
  height = 400,
  onClick,
  cardArtUrl
}: DeckBox3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const deckBoxGroupRef = useRef<THREE.Group | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 2, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x4080ff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Create deck box group
    const deckBoxGroup = new THREE.Group();
    deckBoxGroupRef.current = deckBoxGroup;
    scene.add(deckBoxGroup);

    // Materials
    let boxMaterial: THREE.MeshPhongMaterial;
    let lidMaterial: THREE.MeshPhongMaterial;

    if (cardArtUrl) {
      // Load card art texture
      const textureLoader = new THREE.TextureLoader();
      const cardTexture = textureLoader.load(cardArtUrl);
      cardTexture.wrapS = THREE.ClampToEdgeWrapping;
      cardTexture.wrapT = THREE.ClampToEdgeWrapping;
      
      boxMaterial = new THREE.MeshPhongMaterial({ 
        map: cardTexture,
        shininess: 20,
        specular: 0x333333
      });

      lidMaterial = new THREE.MeshPhongMaterial({ 
        map: cardTexture,
        shininess: 25,
        specular: 0x444444
      });
    } else {
      boxMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xffffff,
        shininess: 20,
        specular: 0x666666
      });

      lidMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xf8f8f8,
        shininess: 25,
        specular: 0x777777
      });
    }

    const seamMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xeeeeee,
      shininess: 10,
      specular: 0x555555
    });

    // Create main box body (bottom part)
    const boxGeometry = new THREE.BoxGeometry(2.8, 3.2, 2);
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    boxMesh.position.y = -0.4;
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    deckBoxGroup.add(boxMesh);

    // Create lid (top part flush with box)
    const lidGeometry = new THREE.BoxGeometry(2.8, 1.6, 2);
    const lidMesh = new THREE.Mesh(lidGeometry, lidMaterial);
    lidMesh.position.y = 1.2;
    lidMesh.castShadow = true;
    deckBoxGroup.add(lidMesh);

    // Create the seam line where lid meets box
    const seamGeometry = new THREE.BoxGeometry(2.82, 0.02, 2.02);
    const seamMesh = new THREE.Mesh(seamGeometry, seamMaterial);
    seamMesh.position.y = 0.4;
    deckBoxGroup.add(seamMesh);

    // Create lid top surface (flush with lid)
    const lidTopGeometry = new THREE.BoxGeometry(2.8, 0.02, 2);
    const lidTopMesh = new THREE.Mesh(lidTopGeometry, lidMaterial);
    lidTopMesh.position.y = 2.01;
    deckBoxGroup.add(lidTopMesh);

    // Add text geometry for "DECK BOX" (simplified as planes for now)
    const textMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    });

    // Create text planes (simplified representation)
    const createTextPlane = (text: string, x: number, y: number, z: number, scale: number = 1) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = 512;
      canvas.height = 128;
      context.fillStyle = 'black';
      context.font = `bold ${48 * scale}px Arial`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.MeshPhongMaterial({ 
        map: texture, 
        transparent: true,
        opacity: 0.9
      });
      
      const geometry = new THREE.PlaneGeometry(2.5 * scale, 0.6 * scale);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      return mesh;
    };

    // Add "DECK BOX" text to front (positioned like in the image)
    const deckBoxText = createTextPlane("DECK BOX", 0, 0.2, 1.51, 0.7);
    if (deckBoxText) deckBoxGroup.add(deckBoxText);

    // Add deck name text (smaller, below DECK BOX)
    const nameText = createTextPlane(deckName, 0, -0.6, 1.51, 0.5);
    if (nameText) deckBoxGroup.add(nameText);

    // Add card count text (very small, at bottom)
    const countText = createTextPlane(`${cardCount} Cards`, 0, -1.4, 1.51, 0.3);
    if (countText) deckBoxGroup.add(countText);

    // Add "Ultra PRO" text to bottom right corner (like in image)
    const ultraProText = createTextPlane("Ultra PRO", 0.6, -1.7, 1.51, 0.25);
    if (ultraProText) {
      ultraProText.rotation.z = -0.05;
      deckBoxGroup.add(ultraProText);
    }

    // Add Ultra PRO logo text to lid top
    const lidLogoText = createTextPlane("Ultra PRO", 0, 0, 2.02, 0.3);
    if (lidLogoText) {
      lidLogoText.rotation.x = -Math.PI / 2;
      deckBoxGroup.add(lidLogoText);
    }

    // Animation loop
    const animate = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    // Mouse move handler for perspective shift
    const handleMouseMove = (event: MouseEvent) => {
      if (!mountRef.current || !deckBoxGroupRef.current) return;

      const rect = mountRef.current.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Apply rotation based on mouse position
      const maxRotation = 0.3;
      deckBoxGroupRef.current.rotation.y = x * maxRotation;
      deckBoxGroupRef.current.rotation.x = y * maxRotation * 0.5;
    };

    const handleMouseEnter = () => {
      setIsHovered(true);
      if (deckBoxGroupRef.current) {
        // Slight lift animation on hover
        deckBoxGroupRef.current.position.y = 0.2;
      }
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      if (deckBoxGroupRef.current) {
        // Reset position and rotation
        deckBoxGroupRef.current.rotation.x = 0;
        deckBoxGroupRef.current.rotation.y = 0;
        deckBoxGroupRef.current.position.y = 0;
      }
    };

    const element = mountRef.current;
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);

      if (rendererRef.current && mountRef.current?.contains(rendererRef.current.domElement)) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      
      // Dispose of Three.js resources
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
      
      rendererRef.current?.dispose();
    };
  }, [width, height, deckName, cardCount]);

  return (
    <div 
      ref={mountRef} 
      className={`deck-box-3d ${className} ${isHovered ? 'hovered' : ''}`}
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease-out'
      }}
      onClick={onClick}
    />
  );
} 