"use client";

import { LuPawPrint } from "react-icons/lu";

interface PetIconProps {
  species?: string | null;
  size?: number;
  className?: string;
}

// Versões em linha (clean Base44 — Cintia aceitou ambos)
function DogLineIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3a4 4 0 0 0-2.5 2C3.5 6 3 8 3 10s.5 4 1 5.5"/>
      <path d="M14 5.172c0-1.39 1.577-2.493 3.5-2.172a4 4 0 0 1 2.5 2c.5 1 1 3 1 5s-.5 4-1 5.5"/>
      <path d="M8 14v.5"/>
      <path d="M16 14v.5"/>
      <path d="M11.25 16.25h1.5L12 17z"/>
      <path d="M4.5 15.5c0 1.5.5 4 4.5 4s7.5-2.5 7.5-5c0-1.276-.5-2.5-1-3.5-.5-1-1-2.5-1-3.5 0-2 .5-3 1.5-4-.5 0-2 .5-3 1.5-1-1-2.5-2-4-2-1.5 0-3 1-4 2-1 1-1 2.5-1 3.5 0 1-.5 2.5-1 3.5-.5 1-1 2.224-1 3.5"/>
    </svg>
  );
}

function CatLineIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .5 1.17 1 2.27 1 3.5C21 17.32 17.31 21 12 21S3 17.32 3 13.5c0-1.23.5-2.33 1-3.5 0 0-1.82-6.42-.42-7 1.39-.58 4.64.26 6.42 2.26C10.65 5.09 11.33 5 12 5"/>
      <path d="M8 14v.5"/>
      <path d="M16 14v.5"/>
      <path d="M11.25 16.25h1.5L12 17z"/>
    </svg>
  );
}

export default function PetIcon({ species, size = 16, className = "" }: PetIconProps) {
  const sp = (species || "").toLowerCase();
  if (sp.includes("cao") || sp.includes("cão") || sp.includes("canine") || sp === "dog") {
    return <DogLineIcon size={size} className={className} />;
  }
  if (sp.includes("gato") || sp.includes("feline") || sp === "cat") {
    return <CatLineIcon size={size} className={className} />;
  }
  // fallback
  return <LuPawPrint size={size} className={className} />;
}
