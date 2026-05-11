/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import Lenis from "lenis";
import { Scene } from "./components/Scene";
import { Overlay } from "./components/Overlay";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <main className="relative min-h-screen bg-brand-cream overflow-x-hidden selection:bg-strawberry selection:text-white">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-200 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-200 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-100 rounded-full blur-[100px]" />
      </div>

      {/* Large Background Text */}
      <div className="fixed inset-0 flex items-center justify-center z-0 pointer-events-none">
        <h1 className="text-[25vw] leading-none font-black text-white mix-blend-difference select-none opacity-20 tracking-tighter uppercase">
          NECTOR
        </h1>
      </div>

      {/* 3D Scene */}
      <Scene />

      {/* UI Layer */}
      <Overlay />

      {/* Noise Texture */}
      <div className="fixed inset-0 z-50 pointer-events-none opacity-[0.03] mix-blend-overlay">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>
    </main>
  );
}

