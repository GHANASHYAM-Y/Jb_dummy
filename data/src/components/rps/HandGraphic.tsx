"use client";

import React from "react";
import type { RoundMove } from "@/lib/rps";
import { cn } from "@/shared/lib/utils";

interface HandGraphicProps {
  move: RoundMove;
  size?: "sm" | "md" | "lg" | "xl";
  flip?: boolean;
  className?: string;
  glow?: boolean;
}

const SIZE_MAP = {
  sm: "w-7 h-7",
  md: "w-12 h-12",
  lg: "w-20 h-20 sm:w-24 sm:h-24",
  xl: "w-24 h-24 sm:w-32 sm:h-32",
};

/**
 * EVOAIQU Futuristic Cybernetic Hand Graphic Component
 *
 * Stylized 3D-inspired vector hand illustrations matching the premium futuristic arena aesthetic:
 * - Deep navy plates (#0A1033, #151D4D)
 * - Electric Blue (#315BFF) & Vivid Purple (#8B2CFF) core gradients
 * - High-energy Cyan (#39DFFF) circuitry, edge lights, and plasma accents
 * - Preserves function names and SVG viewBox contracts for test compatibility.
 */
export function HandGraphic({
  move,
  size = "md",
  flip = false,
  className,
  glow = false,
}: HandGraphicProps) {
  const sizeClass = SIZE_MAP[size];

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center transition-transform select-none shrink-0",
        sizeClass,
        flip && "scale-x-[-1]",
        glow && "drop-shadow-[0_0_16px_rgba(57,223,255,0.45)]",
        className
      )}
      aria-hidden="true"
    >
      {move === "rock" && <RockHandSvg />}
      {move === "paper" && <PaperHandSvg />}
      {move === "scissors" && <ScissorsHandSvg />}
      {move === "timeout" && <TimeoutSvg />}
    </div>
  );
}

/** 1. ROCK: Stylized cybernetic armored clenched fist with illuminated cyan circuitry */
export function RockHandSvg() {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        {/* Armored Fist Primary Gradient */}
        <linearGradient id="cyberRockMetal" x1="20" y1="20" x2="80" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4A75FF" />
          <stop offset="35%" stopColor="#2A45C8" />
          <stop offset="75%" stopColor="#121C58" />
          <stop offset="100%" stopColor="#0B113B" />
        </linearGradient>

        {/* Highlight Specular Gradient */}
        <linearGradient id="cyberRockHighlight" x1="30" y1="25" x2="70" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EAF6FF" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#39DFFF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#315BFF" stopOpacity="0" />
        </linearGradient>

        {/* Thumb Plate Gradient */}
        <linearGradient id="cyberRockThumb" x1="25" y1="45" x2="65" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5B87FF" />
          <stop offset="60%" stopColor="#253EBA" />
          <stop offset="100%" stopColor="#0E1648" />
        </linearGradient>

        {/* Cyan Knuckle Glow Filter */}
        <filter id="cyanKnuckleGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Wrist / Forearm Armored Sleeve */}
      <path
        d="M 33 94 L 36 74 L 64 74 L 67 94 Z"
        fill="#0D1540"
        stroke="#315BFF"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <line x1="42" y1="78" x2="42" y2="90" stroke="#39DFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      <line x1="58" y1="78" x2="58" y2="90" stroke="#39DFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />

      {/* Main Fist Chassis */}
      <path
        d="M 36 74
           C 30 68 25 58 27 45
           C 28 34 37 28 47 28
           C 52 23 62 22 71 27
           C 77 31 80 38 78 47
           C 80 56 76 65 70 70
           C 65 75 60 77 50 78
           Z"
        fill="url(#cyberRockMetal)"
        stroke="#39DFFF"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* Specular Light Reflection on Top Edge */}
      <path
        d="M 32 44
           C 33 36 40 30 48 30
           C 54 26 63 25 70 29
           C 74 32 76 37 75 44"
        stroke="url(#cyberRockHighlight)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Knuckle Armor Plates with Glowing Cyan Seams */}
      {/* Index Knuckle */}
      <path
        d="M 44 28 C 47 37 48 48 45 56"
        stroke="#39DFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        filter="url(#cyanKnuckleGlow)"
      />
      <circle cx="45" cy="30" r="2" fill="#39DFFF" />

      {/* Middle Knuckle */}
      <path
        d="M 58 25 C 60 36 61 47 57 56"
        stroke="#39DFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
        filter="url(#cyanKnuckleGlow)"
      />
      <circle cx="59" cy="27" r="2" fill="#39DFFF" />

      {/* Ring Knuckle */}
      <path
        d="M 70 30 C 72 38 72 48 68 55"
        stroke="#39DFFF"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#cyanKnuckleGlow)"
      />
      <circle cx="71" cy="32" r="1.8" fill="#39DFFF" />

      {/* Forefront Folded Thumb with Energy Joint */}
      <path
        d="M 29 48
           C 31 39 40 40 47 44
           C 54 47 62 51 62 58
           C 61 64 54 67 47 66
           C 38 65 34 58 31 52 Z"
        fill="url(#cyberRockThumb)"
        stroke="#8B2CFF"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* Thumb Power Node Crease */}
      <path
        d="M 37 46 C 42 48 48 51 51 54"
        stroke="#39DFFF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="57" cy="57" r="2" fill="#39DFFF" filter="url(#cyanKnuckleGlow)" />

      {/* Lower Palm Energy Vent Highlight */}
      <path
        d="M 44 70 C 50 72 57 73 63 69"
        stroke="#315BFF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

/** 2. PAPER: Flat extended cybernetic palm with illuminated fingertip nodes & circuit traces */
export function PaperHandSvg() {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        {/* Cyber Palm Primary Gradient */}
        <linearGradient id="cyberPaperMetal" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8B2CFF" />
          <stop offset="40%" stopColor="#4A34D8" />
          <stop offset="75%" stopColor="#1B175B" />
          <stop offset="100%" stopColor="#0B0E33" />
        </linearGradient>

        {/* Cyan Circuit Glow */}
        <filter id="cyanCircuitGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Wrist Mount */}
      <path
        d="M 36 94 L 38 76 L 64 78 L 66 94 Z"
        fill="#0D133D"
        stroke="#8B2CFF"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="51" cy="85" r="3" fill="#39DFFF" filter="url(#cyanCircuitGlow)" />

      {/* Main Open Hand Silhouette with 5 Distinct Fingers */}
      <path
        d="M 38 76
           C 34 70 30 64 24 62
           C 18 60 15 53 18 48
           C 21 43 26 44 32 50
           L 34 44
           L 34 22
           C 34 16 41 15 42 21
           L 43 39
           L 44 14
           C 44 8 52 8 53 14
           L 54 39
           L 55 19
           C 55 13 63 14 63 20
           L 64 43
           L 65 29
           C 65 23 72 24 72 30
           C 72 42 72 55 70 65
           C 68 73 66 77 64 78
           Z"
        fill="url(#cyberPaperMetal)"
        stroke="#39DFFF"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Fingertip Energy Nodes */}
      <circle cx="21" cy="47" r="2.2" fill="#39DFFF" filter="url(#cyanCircuitGlow)" />
      <circle cx="38" cy="18" r="2.2" fill="#39DFFF" filter="url(#cyanCircuitGlow)" />
      <circle cx="48" cy="11" r="2.2" fill="#39DFFF" filter="url(#cyanCircuitGlow)" />
      <circle cx="59" cy="16" r="2.2" fill="#39DFFF" filter="url(#cyanCircuitGlow)" />
      <circle cx="68" cy="27" r="2.2" fill="#39DFFF" filter="url(#cyanCircuitGlow)" />

      {/* Finger Joint Energy Lines */}
      <path d="M 43 36 L 43 54" stroke="#8B2CFF" strokeWidth="2" strokeLinecap="round" />
      <path d="M 54 36 L 54 54" stroke="#8B2CFF" strokeWidth="2" strokeLinecap="round" />
      <path d="M 64 40 L 64 56" stroke="#8B2CFF" strokeWidth="2" strokeLinecap="round" />

      {/* Palm Center Power Core (Holographic Repulsor Ring) */}
      <circle cx="50" cy="62" r="7" stroke="#39DFFF" strokeWidth="1.8" fill="#141B4D" />
      <circle cx="50" cy="62" r="3.2" fill="#39DFFF" filter="url(#cyanCircuitGlow)" />

      {/* Radiating Palm Circuit Traces */}
      <path d="M 43 62 L 32 54" stroke="#39DFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      <path d="M 57 62 L 64 58" stroke="#39DFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      <path d="M 50 69 L 50 76" stroke="#39DFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

/** 3. SCISSORS: Dynamic two-finger energy cut gesture with razor-sharp plasma edges */
export function ScissorsHandSvg() {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        {/* Plasma Blade Edge Gradient */}
        <linearGradient id="cyberBladePlasma" x1="30" y1="15" x2="70" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#39DFFF" />
          <stop offset="50%" stopColor="#315BFF" />
          <stop offset="100%" stopColor="#8B2CFF" />
        </linearGradient>

        {/* Chassis Gradient */}
        <linearGradient id="cyberScissorsMetal" x1="20" y1="15" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2F4CDE" />
          <stop offset="50%" stopColor="#1B2880" />
          <stop offset="100%" stopColor="#0B113B" />
        </linearGradient>

        <filter id="plasmaGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Wrist Mounting */}
      <path
        d="M 37 94 L 39 76 L 66 78 L 68 94 Z"
        fill="#0D143D"
        stroke="#315BFF"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <line x1="52" y1="80" x2="52" y2="92" stroke="#39DFFF" strokeWidth="1.5" strokeLinecap="round" />

      {/* Main Hand Body with V-Extended Fingers */}
      <path
        d="M 39 76
           C 35 71 33 61 35 51
           L 30 19
           C 30 13 37 11 41 16
           L 47 41
           L 58 17
           C 61 11 68 13 67 20
           L 60 45
           C 66 46 72 51 71 59
           C 70 67 67 73 66 77
           Z"
        fill="url(#cyberScissorsMetal)"
        stroke="#39DFFF"
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Razor Plasma Edge Along Index Finger */}
      <path
        d="M 31 22 L 35 48"
        stroke="url(#cyberBladePlasma)"
        strokeWidth="2.4"
        strokeLinecap="round"
        filter="url(#plasmaGlow)"
      />
      <circle cx="36" cy="15" r="2.2" fill="#39DFFF" filter="url(#plasmaGlow)" />

      {/* Razor Plasma Edge Along Middle Finger */}
      <path
        d="M 66 23 L 59 47"
        stroke="url(#cyberBladePlasma)"
        strokeWidth="2.4"
        strokeLinecap="round"
        filter="url(#plasmaGlow)"
      />
      <circle cx="63" cy="16" r="2.2" fill="#39DFFF" filter="url(#plasmaGlow)" />

      {/* V-Intersection Energy Spark */}
      <path d="M 46 41 L 53 42" stroke="#39DFFF" strokeWidth="2.5" strokeLinecap="round" />

      {/* Tucked Curled Fingers (Ring & Pinky) */}
      <path
        d="M 58 48 C 63 49 68 51 67 58 C 66 64 60 65 56 63"
        fill="#121A4F"
        stroke="#315BFF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M 55 61 C 60 62 65 64 65 70 C 64 74 59 75 55 73"
        fill="#121A4F"
        stroke="#315BFF"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Front Folded Armored Thumb Clamp */}
      <path
        d="M 36 53
           C 38 47 46 47 51 51
           C 55 54 55 61 50 63
           C 44 64 38 61 36 53 Z"
        fill="#1F2F85"
        stroke="#8B2CFF"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle cx="47" cy="57" r="2" fill="#39DFFF" filter="url(#plasmaGlow)" />
    </svg>
  );
}

/** 4. TIMEOUT: Holographic cyber-clock with pulsing neon warning aura */
export function TimeoutSvg() {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        <linearGradient id="cyberTimeoutBg" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2E0E24" />
          <stop offset="50%" stopColor="#1B0E2A" />
          <stop offset="100%" stopColor="#0B0920" />
        </linearGradient>

        <filter id="coralNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Cyber Outer Ring */}
      <circle
        cx="50"
        cy="52"
        r="36"
        fill="url(#cyberTimeoutBg)"
        stroke="#FF4B72"
        strokeWidth="2.8"
        filter="url(#coralNeonGlow)"
      />

      {/* Inner Ticks Track */}
      <circle
        cx="50"
        cy="52"
        r="30"
        stroke="#8B2CFF"
        strokeWidth="1.2"
        strokeDasharray="3 4"
        fill="none"
        opacity="0.6"
      />

      {/* Clock Top Trigger */}
      <rect x="44" y="9" width="12" height="6" rx="2" fill="#FF4B72" />
      <path d="M 50 15 L 50 18" stroke="#FF4B72" strokeWidth="2.5" strokeLinecap="round" />

      {/* Cyber Alarm Fins */}
      <path d="M 23 21 L 31 29" stroke="#FF4B72" strokeWidth="3" strokeLinecap="round" />
      <path d="M 77 21 L 69 29" stroke="#FF4B72" strokeWidth="3" strokeLinecap="round" />

      {/* Glowing Central Hub & Angular Neon Hands */}
      <circle cx="50" cy="52" r="3.5" fill="#39DFFF" />
      <path d="M 50 52 L 50 31" stroke="#39DFFF" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M 50 52 L 67 43" stroke="#FF4B72" strokeWidth="3" strokeLinecap="round" filter="url(#coralNeonGlow)" />

      {/* Urgent Warning Badge */}
      <circle cx="70" cy="69" r="8.5" fill="#FF4B72" filter="url(#coralNeonGlow)" />
      <path d="M 70 64 L 70 68" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <circle cx="70" cy="72" r="1" fill="#FFFFFF" />
    </svg>
  );
}
