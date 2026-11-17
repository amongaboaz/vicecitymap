import { Car, EyeOff, Flag, Gem, House, MapPin, Sparkles, Store, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  "map-pin": MapPin,
  gem: Gem,
  flag: Flag,
  sparkles: Sparkles,
  store: Store,
  home: House,
  car: Car,
  "eye-off": EyeOff,
};

export const CATEGORY_ICON_NAMES = Object.keys(icons);

export function CategoryIcon({ name, className, color }: { name: string; className?: string; color?: string }) {
  const Icon = icons[name] ?? MapPin;
  return <Icon className={className} style={color ? { color } : undefined} aria-hidden />;
}
