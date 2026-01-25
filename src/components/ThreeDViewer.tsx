'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// Simple rotating medical-themed 3D object
function MedicalModel() {
  // Create geometries directly with THREE
  const cylinderGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
  const torusGeometry1 = new THREE.TorusGeometry(0.6, 0.1, 16, 32);
  const torusGeometry2 = new THREE.TorusGeometry(0.6, 0.1, 16, 32);

  return (
    <group>
      {/* Central sphere representing a pill/capsule */}
      <Sphere args={[0.8, 32, 32]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#4F46E5" metalness={0.3} roughness={0.2} />
      </Sphere>
      
      {/* Additional medical-themed elements */}
      <mesh position={[0, 1.5, 0]} geometry={cylinderGeometry}>
        <meshStandardMaterial color="#10B981" />
      </mesh>
      
      <mesh position={[1.5, 0, 0]} geometry={torusGeometry1}>
        <meshStandardMaterial color="#EF4444" transparent opacity={0.7} />
      </mesh>
      
      <mesh position={[-1.5, 0, 0]} geometry={torusGeometry2}>
        <meshStandardMaterial color="#F59E0B" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4F46E5" />
      <directionalLight position={[0, 10, 0]} intensity={0.5} />
      <OrbitControls enableZoom={true} enablePan={true} />
      <MedicalModel />
    </>
  );
}

interface ThreeDViewerProps {
  className?: string;
}

export default function ThreeDViewer({ className }: ThreeDViewerProps) {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{ background: 'radial-gradient(circle, #e0e7ff 0%, #c7d2fe 100%)' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}