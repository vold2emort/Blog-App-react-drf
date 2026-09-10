import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import "@/components/ui/8bit/styles/retro.css";
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="bg-[#1a120b] border-b-4 border-[#8b6914]">
        <div className="flex items-center justify-between px-4 sm:px-8 py-3">
          <div className="flex items-center gap-3">
            <span
              className="text-2xl sm:text-3xl"
              role="img"
              aria-label="shield"
            >
              <Link to="/">⚔️</Link>
            </span>
            <h1 className="retro text-[#d4a843] text-[10px] sm:text-xs md:text-sm leading-tight m-0 tracking-wider">
              <Link to="/">THE STRONGHOLD</Link>
            </h1>
          </div>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {["Posts", "Realms", "Chronicles"].map((item) => (
              <span
                key={item}
                className="retro text-[#a89070] text-[8px] px-3 py-2 cursor-pointer
                           hover:text-[#d4a843] hover:bg-[#2a1f14] transition-colors"
              >
                {item}
              </span>
            ))}
          </nav>

          {/* Badge */}
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="retro bg-[#2a1f14] text-[#d4a843] border-2 border-[#8b6914]
                         text-[7px] sm:text-[8px] px-2 sm:px-3 py-1 rounded-none"
            >
              EST. MMXXVI
            </Badge>
          </div>
        </div>
      </div>
      <Separator className="h-[3px] bg-[repeating-linear-gradient(90deg,#8b6914_0px,#8b6914_8px,transparent_8px,transparent_16px)]" />
    </header>
  );
}
