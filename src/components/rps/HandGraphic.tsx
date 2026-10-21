"use client";

import React from "react";
import type { RoundMove } from "@/lib/rps";
import { cn } from "@/lib/utils";

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
 * EVOAIQU Realistic Hand Graphic Component
 *
 * Vector hand illustrations styled in Coastal Modern:
 * Ivory/White (#FFFFFF, #F7F8F4), Deep Evergreen stroke (#203331),
 * Teal accent & shadows (#167D78, #DDF2EB), and Coral highlight (#D95F49).
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
        glow && "drop-shadow-[0_4px_12px_rgba(22,125,120,0.25)]",
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

/** 1. ROCK: Closed clenched fist with defined knuckles & thumb tucked */
function RockHandSvg() {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        <linearGradient id="rockSkin" x1="25" y1="20" x2="75" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#F4F8F6" />
          <stop offset="100%" stopColor="#DDF2EB" />
        </linearGradient>
        <linearGradient id="rockShadow" x1="50" y1="50" x2="80" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#167D78" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#167D78" stopOpacity="0.28" />
        </linearGradient>
      </defs>

      {/* Wrist */}
      <path
        d="M 36 94 L 38 72 C 38 72 32 64 34 50"
        stroke="#203331"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M 64 94 L 66 74"
        stroke="#203331"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Fist outline & fill */}
      <path
        d="M 37 72
           C 31 66 26 56 28 44
           C 29 35 36 30 46 29
           C 51 24 60 23 68 28
           C 74 32 77 38 76 46
           C 78 54 75 62 70 68
           C 66 74 62 78 54 80
           Z"
        fill="url(#rockSkin)"
        stroke="#203331"
        strokeWidth="3.4"
        strokeLinejoin="round"
      />

      {/* Shading layer */}
      <path
        d="M 44 48
           C 54 50 64 54 72 65
           C 68 73 60 78 52 79
           C 42 77 38 68 40 58
           Z"
        fill="url(#rockShadow)"
      />

      {/* Knuckle definition segments */}
      {/* Index finger knuckle */}
      <path
        d="M 44 29 C 48 37 49 46 47 54"
        stroke="#203331"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Middle finger knuckle */}
      <path
        d="M 57 26 C 60 36 61 46 58 54"
        stroke="#203331"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Ring finger knuckle */}
      <path
        d="M 68 31 C 70 38 71 47 68 53"
        stroke="#203331"
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* Thumb folded across front */}
      <path
        d="M 30 46
           C 32 38 40 40 46 44
           C 53 47 60 51 60 57
           C 59 63 53 65 47 64
           C 39 63 35 56 32 50 Z"
        fill="#FFFFFF"
        stroke="#203331"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />

      {/* Thumb knuckle crease & nail accent */}
      <path
        d="M 38 44 C 42 46 47 48 50 51"
        stroke="#167D78"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="56" cy="56" r="1.5" fill="#167D78" opacity="0.6" />

      {/* Palm crease highlight */}
      <path
        d="M 46 68 C 50 70 56 71 61 68"
        stroke="#167D78"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

/** 2. PAPER: Flat open hand with five distinct extended fingers */
function PaperHandSvg() {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        <linearGradient id="paperSkin" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="65%" stopColor="#F6FAF8" />
          <stop offset="100%" stopColor="#DDF2EB" />
        </linearGradient>
      </defs>

      {/* Wrist */}
      <path
        d="M 38 94 L 40 76"
        stroke="#203331"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M 62 94 L 64 78"
        stroke="#203331"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Hand & 5 fingers outline */}
      <path
        d="M 40 76
           C 36 70 32 64 26 62
           C 20 60 17 53 20 48
           C 23 43 28 44 34 50
           L 36 44
           L 36 22
           C 36 17 42 16 43 21
           L 44 40
           L 45 15
           C 45 10 52 10 53 15
           L 54 40
           L 55 20
           C 55 15 62 16 62 21
           L 63 44
           L 64 30
           C 64 25 71 26 71 31
           C 71 42 71 54 69 64
           C 67 72 65 76 64 78
           Z"
        fill="url(#paperSkin)"
        stroke="#203331"
        strokeWidth="3.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Finger separation lines */}
      <path d="M 44 38 L 44 54" stroke="#203331" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M 54 38 L 54 54" stroke="#203331" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M 63 42 L 63 56" stroke="#203331" strokeWidth="2.4" strokeLinecap="round" />

      {/* Palm contour lines (Coastal Teal) */}
      <path
        d="M 33 54 C 38 58 45 61 55 60"
        stroke="#167D78"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M 40 66 C 46 69 53 70 60 67"
        stroke="#167D78"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      {/* Thumb crease */}
      <path
        d="M 30 52 C 34 58 37 66 38 74"
        stroke="#167D78"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}

/** 3. SCISSORS: Index and middle fingers extended apart in a crisp V, others tucked */
function ScissorsHandSvg() {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        <linearGradient id="scissorsSkin" x1="20" y1="10" x2="80" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="65%" stopColor="#F6FAF8" />
          <stop offset="100%" stopColor="#DDF2EB" />
        </linearGradient>
      </defs>

      {/* Wrist */}
      <path
        d="M 38 94 L 40 76"
        stroke="#203331"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M 64 94 L 66 78"
        stroke="#203331"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Main hand outline with Index & Middle in V */}
      <path
        d="M 40 76
           C 36 72 34 62 36 52
           L 32 20
           C 32 14 39 12 42 17
           L 47 42
           L 57 18
           C 60 13 67 15 66 21
           L 59 46
           C 65 47 71 52 70 60
           C 69 68 66 74 65 78
           Z"
        fill="url(#scissorsSkin)"
        stroke="#203331"
        strokeWidth="3.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* V gap between fingers */}
      <path
        d="M 47 42 L 53 43"
        stroke="#203331"
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* Folded ring & pinky fingers */}
      <path
        d="M 57 49
           C 62 50 67 52 66 59
           C 65 65 59 66 55 64"
        stroke="#203331"
        strokeWidth="2.8"
        fill="#FFFFFF"
        strokeLinecap="round"
      />
      <path
        d="M 54 62
           C 59 63 64 65 64 71
           C 63 75 58 76 54 74"
        stroke="#203331"
        strokeWidth="2.6"
        fill="#FFFFFF"
        strokeLinecap="round"
      />

      {/* Thumb folded over the curled fingers */}
      <path
        d="M 36 54
           C 38 48 46 48 51 52
           C 55 55 55 62 50 64
           C 44 65 38 62 36 54 Z"
        fill="#FFFFFF"
        stroke="#203331"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />

      {/* Thumb accent crease */}
      <path
        d="M 41 53 C 44 55 47 57 49 59"
        stroke="#167D78"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Index and middle knuckle accents */}
      <path d="M 36 29 L 41 31" stroke="#167D78" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
      <path d="M 57 30 L 62 32" stroke="#167D78" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

/** 4. TIMEOUT: Clock timer with warning indicators in Coastal Coral */
function TimeoutSvg() {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        <linearGradient id="timeoutBg" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF1EE" />
          <stop offset="100%" stopColor="#FCE6DE" />
        </linearGradient>
      </defs>

      {/* Clock Outer Ring */}
      <circle
        cx="50"
        cy="52"
        r="36"
        fill="url(#timeoutBg)"
        stroke="#D95F49"
        strokeWidth="3.5"
      />

      {/* Clock top button */}
      <rect x="45" y="10" width="10" height="6" rx="2" fill="#D95F49" />
      <path d="M 50 16 L 50 19" stroke="#D95F49" strokeWidth="3" strokeLinecap="round" />

      {/* Bell / alarm wings */}
      <path d="M 24 22 L 32 30" stroke="#D95F49" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 76 22 L 68 30" stroke="#D95F49" strokeWidth="3.5" strokeLinecap="round" />

      {/* Clock hands pointing at 10 and 2 (urgent) */}
      <circle cx="50" cy="52" r="3.5" fill="#203331" />
      <path d="M 50 52 L 50 32" stroke="#203331" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M 50 52 L 68 45" stroke="#D95F49" strokeWidth="3" strokeLinecap="round" />

      {/* Warning exclamation badge */}
      <circle cx="70" cy="68" r="9" fill="#D95F49" />
      <path d="M 70 63 L 70 67" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <circle cx="70" cy="71" r="1" fill="#FFFFFF" />
    </svg>
  );
}
