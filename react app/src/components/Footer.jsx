import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import "@/components/ui/8bit/styles/retro.css";

export default function Footer() {
  return (
    <footer className="mt-auto">
      <Separator className="h-[3px] bg-[repeating-linear-gradient(90deg,#8b6914_0px,#8b6914_8px,transparent_8px,transparent_16px)]" />

      <div className="bg-[#1a120b] border-t-4 border-[#8b6914]">
        <div className="flex flex-col items-center gap-4 py-6 px-4">
          {/* Decorative Top */}
          <div className="retro text-[#8b6914] text-[8px] tracking-[0.3em]">
            ─── ⚔ ───
          </div>

          <h2 className="retro text-[#d4a843] text-[10px] sm:text-xs md:text-sm leading-tight m-0 tracking-wider">
            THE STRONGHOLD
          </h2>

          <p className="retro text-[#a89070] text-[7px] sm:text-[8px] tracking-widest">
            Where words are forged in iron
          </p>

          <Badge
            variant="secondary"
            className="retro bg-[#2a1f14] text-[#8b6914] border-2 border-[#8b6914]
                       text-[6px] sm:text-[7px] px-3 py-1 rounded-none"
          >
            MEMENTO MORI
          </Badge>

          <div className="retro text-[#5a4a3a] text-[7px] tracking-[0.5em]">
            ─ ─ ─ ─ ─
          </div>

          {/* Copyright */}
          <p className="retro text-[#5a4a3a] text-[6px] sm:text-[7px]">
            MMXXVI &middot; FORGED IN CODE
          </p>
        </div>
      </div>
    </footer>
  );
}
