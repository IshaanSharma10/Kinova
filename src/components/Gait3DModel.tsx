// src/components/Gait3DModel.tsx

"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import React, { useState } from "react";

// 3D Model
function Model() {
  const { scene } = useGLTF("/human.glb");
  return <primitive object={scene} />;
}

useGLTF.preload("/human.glb");

export default function Gait3DModel() {
  const [autoRotate, setAutoRotate] = useState(true);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0.3, 0.8, 2.2], fov: 50 }}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Lights */}
        <ambientLight intensity={1} />
        <directionalLight position={[5, 10, 5]} intensity={1.5} />

        {/* Centered + scaled */}
        <group position={[0.3, -0.1, 0]} scale={0.4}>
          <Model />
        </group>

        {/* Orbit Controls */}
        <OrbitControls
          enablePan={false}
          target={[0.3, 0.8, 0]}
          maxPolarAngle={Math.PI / 2}

          autoRotate={autoRotate}
          autoRotateSpeed={4}   // <-- fixed rotation speed

          onStart={() => setAutoRotate(false)}  // STOP rotation on user interaction
        />
      </Canvas>
    </div>
  );
}
