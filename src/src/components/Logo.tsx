import { cn } from "../lib/utils";
import React from "react";

export function Logo({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-full", className)}
    >
      {/* The Outer Perimeter (The Agora) */}
      <circle 
        cx="50" 
        cy="50" 
        r="44" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeDasharray="4 4"
        className="opacity-20"
      />
      
      {/* The Arc of Finality */}
      <path 
        d="M20 65C20 40 45 15 80 45" 
        stroke="#16A34A" 
        strokeWidth="6" 
        strokeLinecap="square"
        className="drop-shadow-sm"
      />

      {/* The Pillars of Reason (Thales) */}
      <g className="translate-y-2">
        <rect x="40" y="40" width="3" height="25" fill="currentColor" />
        <rect x="48.5" y="30" width="3" height="35" fill="currentColor" />
        <rect x="57" y="40" width="3" height="25" fill="currentColor" />
      </g>
      
      {/* The Foundation */}
      <rect x="35" y="75" width="30" height="3" fill="currentColor" />
      
      {/* The USDC Core (The stable point) */}
      <circle cx="50" cy="50" r="5" fill="#16A34A" />
      <circle cx="50" cy="50" r="8" stroke="#16A34A" strokeWidth="1" className="animate-pulse" />
    </svg>
  );
}
