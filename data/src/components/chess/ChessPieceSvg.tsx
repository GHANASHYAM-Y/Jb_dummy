"use client";

import React from "react";

interface ChessPieceProps {
  piece: string; // "P", "N", "B", "R", "Q", "K", "p", "n", "b", "r", "q", "k"
  className?: string;
}

/**
 * High-definition SVG chess pieces for EVOAIQU Speed Chess.
 * White pieces: Sleek pearl ivory with subtle metallic bevels.
 * Black pieces: Deep obsidian / graphite with sharp luminous contours.
 */
export const ChessPieceSvg: React.FC<ChessPieceProps> = ({ piece, className = "w-full h-full" }) => {
  const isWhite = piece === piece.toUpperCase();
  const type = piece.toLowerCase();

  const whiteFill = "#FFFFFF";
  const whiteStroke = "#1E293B";
  const whiteAccent = "#E2E8F0";

  const blackFill = "#181E29";
  const blackStroke = "#334155";
  const blackAccent = "#38BDF8";

  switch (type) {
    case "p":
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
            fill={whiteFill}
            stroke={whiteStroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M12 39.5h21" stroke={whiteStroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
            fill={blackFill}
            stroke={blackStroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M12 39.5h21" stroke={blackAccent} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "r":
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M9 39h27v-3H9v3zm3-3v-4.5h21V36H12zm2-4.5l1.5-12.5h14L31 31.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z"
            fill={whiteFill}
            stroke={whiteStroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M12 35.5h21" stroke={whiteAccent} strokeWidth="1.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M9 39h27v-3H9v3zm3-3v-4.5h21V36H12zm2-4.5l1.5-12.5h14L31 31.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z"
            fill={blackFill}
            stroke={blackStroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M12 35.5h21" stroke={blackAccent} strokeWidth="1.5" />
        </svg>
      );

    case "n":
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M22 10c-3.5 0-6.5 2.5-7.5 6-1 3.5-.5 7.5 1 10.5-2 1-4 3-4 6.5 0 3.5 2 6 4 6h14c1.5 0 3-1.5 3-3.5 0-3-2-5.5-4-7 3-1.5 5.5-4 5.5-8 0-6-5-10.5-12-10.5z"
            fill={whiteFill}
            stroke={whiteStroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="17.5" cy="15.5" r="1.5" fill={whiteStroke} />
          <path d="M9.5 39.5h26" stroke={whiteStroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M22 10c-3.5 0-6.5 2.5-7.5 6-1 3.5-.5 7.5 1 10.5-2 1-4 3-4 6.5 0 3.5 2 6 4 6h14c1.5 0 3-1.5 3-3.5 0-3-2-5.5-4-7 3-1.5 5.5-4 5.5-8 0-6-5-10.5-12-10.5z"
            fill={blackFill}
            stroke={blackStroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="17.5" cy="15.5" r="1.5" fill={blackAccent} />
          <path d="M9.5 39.5h26" stroke={blackAccent} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "b":
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.54-2.32.52-3-.5 1.35-1.46 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM22.5 10c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5z"
            fill={whiteFill}
            stroke={whiteStroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M17.5 26h10M22.5 21v10" stroke={whiteStroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.54-2.32.52-3-.5 1.35-1.46 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM22.5 10c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5z"
            fill={blackFill}
            stroke={blackStroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M17.5 26h10M22.5 21v10" stroke={blackAccent} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "q":
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11-4-14-4.5 14-4.5-14-4 14-7-11 2 12zm0 9h27v3H9v-3zm2-6h23l-1.5 4.5h-20L11 29z"
            fill={whiteFill}
            stroke={whiteStroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="6" cy="12" r="1.5" fill={whiteFill} stroke={whiteStroke} strokeWidth="1" />
          <circle cx="14" cy="9" r="1.5" fill={whiteFill} stroke={whiteStroke} strokeWidth="1" />
          <circle cx="22.5" cy="8" r="1.5" fill={whiteFill} stroke={whiteStroke} strokeWidth="1" />
          <circle cx="31" cy="9" r="1.5" fill={whiteFill} stroke={whiteStroke} strokeWidth="1" />
          <circle cx="39" cy="12" r="1.5" fill={whiteFill} stroke={whiteStroke} strokeWidth="1" />
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11-4-14-4.5 14-4.5-14-4 14-7-11 2 12zm0 9h27v3H9v-3zm2-6h23l-1.5 4.5h-20L11 29z"
            fill={blackFill}
            stroke={blackStroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="6" cy="12" r="1.5" fill={blackAccent} />
          <circle cx="14" cy="9" r="1.5" fill={blackAccent} />
          <circle cx="22.5" cy="8" r="1.5" fill={blackAccent} />
          <circle cx="31" cy="9" r="1.5" fill={blackAccent} />
          <circle cx="39" cy="12" r="1.5" fill={blackAccent} />
        </svg>
      );

    case "k":
      return isWhite ? (
        <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M22.5 11.63V6M20 8h5M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5z"
            stroke={whiteStroke}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-3s0-4-3-6c-2.5-1.5-7-1.5-7-1.5s-4.5 0-7 1.5c-3 2-3 6-3 6v3z"
            fill={whiteFill}
            stroke={whiteStroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M11 39.5h23" stroke={whiteStroke} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 45 45" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M22.5 11.63V6M20 8h5M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5z"
            stroke={blackAccent}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M12.5 37c5.5 3.5 14.5 3.5 20 0v-3s0-4-3-6c-2.5-1.5-7-1.5-7-1.5s-4.5 0-7 1.5c-3 2-3 6-3 6v3z"
            fill={blackFill}
            stroke={blackStroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M11 39.5h23" stroke={blackAccent} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    default:
      return null;
  }
};
