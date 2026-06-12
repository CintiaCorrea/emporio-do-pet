"use client";
import { useState } from "react";

const EMOJIS = ["🙂","😊","😄","😍","🥰","😘","😉","😅","🤗","😂","👍","👌","👏","🙏","🤝","💪","❤️","🧡","💛","💚","💙","💜","🐶","🐱","🐾","🐕","🐈","🦴","🩺","💉","✅","🎉","⭐","🌟","😢","😔","📅","🕐","📞","📍"];

export default function EmojiPicker({ onPick }: { onPick: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex-shrink-0">
      <button type="button" onClick={() => setOpen((o) => !o)} title="Emoji" className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#f0f0ea]">
        <span style={{ fontSize: "16px" }}>🙂</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full mb-2 right-0 z-50 bg-white border rounded-xl shadow-lg p-2 grid grid-cols-8 gap-0.5 w-[256px]" style={{ borderColor: "#e8e1d2" }}>
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => { onPick(e); setOpen(false); }} className="leading-none p-1 rounded hover:bg-[#f0f0ea]" style={{ fontSize: "18px" }}>{e}</button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
