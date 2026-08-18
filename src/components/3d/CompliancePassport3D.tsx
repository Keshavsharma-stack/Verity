import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, CheckCircle2, FileText, ArrowUpRight, Lock, Award } from 'lucide-react';
import * as THREE from 'three';

export function CompliancePassport3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check user preference for reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // WebGL 3D Background Lighting & Subtle Geometric Accent Particles
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 24;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    // Ambient & Directional Red/Warm Lighting
    const ambientLight = new THREE.AmbientLight(0x0a0a10, 2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xef4444, 4, 30);
    pointLight.position.set(6, 6, 8);
    scene.add(pointLight);

    const rimLight = new THREE.PointLight(0xb91c1c, 2.5, 25);
    rimLight.position.set(-8, -6, 5);
    scene.add(rimLight);

    // Minimal 3D floating geometric shield wireframe
    const shieldShape = new THREE.Shape();
    shieldShape.moveTo(0, 3.2);
    shieldShape.lineTo(2.4, 2.2);
    shieldShape.lineTo(2.4, -0.8);
    shieldShape.quadraticCurveTo(2.2, -3.2, 0, -4.2);
    shieldShape.quadraticCurveTo(-2.2, -3.2, -2.4, -0.8);
    shieldShape.lineTo(-2.4, 2.2);
    shieldShape.closePath();

    const geometry = new THREE.ShapeGeometry(shieldShape);
    const wireframeGeo = new THREE.WireframeGeometry(geometry);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.12,
    });
    const shieldMesh = new THREE.LineSegments(wireframeGeo, lineMat);
    shieldMesh.position.set(0, 0, -2);
    shieldMesh.scale.set(1.8, 1.8, 1.8);
    scene.add(shieldMesh);

    // Subtle orbiting halo particles (very lightweight, 24 points only)
    const particleCount = 24;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = 7 + Math.sin(i * 3) * 1.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * (radius * 0.6);
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xef4444,
      size: 0.18,
      transparent: true,
      opacity: 0.35,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    let animationFrameId: number;
    let clock = new THREE.Clock();

    const render = () => {
      const time = clock.getElapsedTime();

      if (!prefersReducedMotion) {
        shieldMesh.rotation.y = Math.sin(time * 0.3) * 0.15;
        shieldMesh.rotation.x = Math.cos(time * 0.25) * 0.08;
        particles.rotation.z = time * 0.04;
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      geometry.dispose();
      wireframeGeo.dispose();
      lineMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, [prefersReducedMotion]);

  // Pointer movement tracking for 3D card tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePos({ x: 0, y: 0 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  // Calculated 3D angles (lerped, clamped)
  const rotateX = prefersReducedMotion ? 0 : mousePos.y * -8;
  const rotateY = prefersReducedMotion ? 0 : mousePos.x * 12;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-[560px] h-[520px] sm:h-[540px] mx-auto flex items-center justify-center select-none perspective-[1200px]"
    >
      {/* Background WebGL Three.js Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Atmospheric Ambient Glow Behind Card */}
      <div 
        className="absolute w-72 h-72 rounded-full bg-red-600/15 blur-[90px] pointer-events-none transition-transform duration-700 ease-out"
        style={{
          transform: `translate(${mousePos.x * 25}px, ${mousePos.y * 25}px)`,
        }}
      />

      {/* MAIN 3D COMPLIANCE PASSPORT CARD */}
      <div
        className="relative z-10 w-full max-w-[420px] bg-[#0c0c11]/95 border border-zinc-700/80 rounded-2xl p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_30px_rgba(220,38,38,0.12)] backdrop-blur-xl transition-all duration-300 ease-out"
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(30px)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Card Header Top Crimson Edge Light */}
        <div className="absolute -top-[1px] left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444]" />

        {/* DEMO DATA Watermark Tag */}
        <div className="absolute top-4 right-5 px-2 py-0.5 rounded bg-zinc-900/90 border border-zinc-800 text-[9px] font-bold tracking-widest text-zinc-400 uppercase">
          DEMO DATA
        </div>

        {/* Passport Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 p-[1px] shadow-lg shadow-red-950/80 flex items-center justify-center">
            <div className="w-full h-full bg-[#09090c] rounded-[11px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-red-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-red-400">Verity Passport</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight">Contractor Compliance Credential</h3>
          </div>
        </div>

        {/* Contractor Identity Plate */}
        <div className="p-3.5 rounded-xl bg-[#121218]/90 border border-zinc-800/90 mb-4.5">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Verified Entity</div>
              <div className="text-base font-bold text-white tracking-tight">Apex Electrical Systems Inc.</div>
              <div className="text-[11px] text-zinc-400 font-medium mt-0.5">Commercial Electrical Subcontractor</div>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-emerald-950/80 border border-emerald-700/60 flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-extrabold uppercase tracking-wider">COMPLIANT</span>
            </div>
          </div>
        </div>

        {/* Verification Matrix Metrics */}
        <div className="grid grid-cols-3 gap-2.5 mb-4.5 text-center">
          <div className="p-2.5 rounded-lg bg-black/50 border border-zinc-800/80">
            <div className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Active COIs</div>
            <div className="text-sm font-bold text-white mt-0.5">8 / 8 Valid</div>
          </div>
          <div className="p-2.5 rounded-lg bg-black/50 border border-zinc-800/80">
            <div className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Safety Score</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">100% Verified</div>
          </div>
          <div className="p-2.5 rounded-lg bg-black/50 border border-zinc-800/80">
            <div className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider">Next Audit</div>
            <div className="text-sm font-bold text-zinc-300 mt-0.5">180 Days</div>
          </div>
        </div>

        {/* Verified Document List */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider px-1">
            <span>Critical Required Credentials</span>
            <span>Status</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-zinc-200 text-[11px]">General Liability ($2M Aggregate)</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400">Policy Verified</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-zinc-200 text-[11px]">Workers' Compensation & Employer Liability</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400">Valid</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-zinc-200 text-[11px]">State Master Electrician License</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-400">Active Good Standing</span>
          </div>
        </div>

        {/* Passport Footer Details */}
        <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400 font-medium">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-red-500" />
            <span>Digital Cryptographic Audit Hash: #VRT-9941</span>
          </div>
          <span className="text-red-400 font-semibold flex items-center gap-1">
            Site Access Authorized
            <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* FLOATING SATELLITE CHIP 1: Top Right (COI Verified Badge) */}
      <div
        className="hidden sm:flex absolute -top-4 -right-4 z-20 items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#111116]/95 border border-zinc-700/80 shadow-2xl shadow-black/80 backdrop-blur-md transition-transform duration-500 ease-out"
        style={{
          transform: `translate(${mousePos.x * -18}px, ${mousePos.y * -18}px) translateZ(55px)`,
        }}
      >
        <div className="w-7 h-7 rounded-lg bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400">
          <FileText className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-[11px] font-bold text-white">COI Upload Ingested</div>
          <div className="text-[9px] text-zinc-400 font-medium">Automated OCR Validation 100%</div>
        </div>
      </div>

      {/* FLOATING SATELLITE CHIP 2: Bottom Left (Gate Access Badge) */}
      <div
        className="hidden sm:flex absolute -bottom-3 -left-4 z-20 items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#111116]/95 border border-zinc-700/80 shadow-2xl shadow-black/80 backdrop-blur-md transition-transform duration-500 ease-out"
        style={{
          transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px) translateZ(45px)`,
        }}
      >
        <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
          <Award className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-[11px] font-bold text-white">Job Site Gate Pass</div>
          <div className="text-[9px] text-emerald-400 font-semibold">Active & Certified for Site Access</div>
        </div>
      </div>
    </div>
  );
}
