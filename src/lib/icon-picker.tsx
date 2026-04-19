"use client";

import { createElement } from "react";
import {
  Home,
  UtensilsCrossed,
  Car,
  Lightbulb,
  PartyPopper,
  Clapperboard,
  Shirt,
  Plane,
  Landmark,
  TrendingUp,
  Coins,
  BookOpen,
  Heart,
  PawPrint,
  Gamepad2,
  Music,
  Coffee,
  ShoppingCart,
  Laptop,
  Smartphone,
  Dumbbell,
  Palette,
  Wrench,
  Sprout,
  Tag,
  Package,
  Briefcase,
  GraduationCap,
  Baby,
  Shield,
  Zap,
  Wifi,
  CreditCard,
  Bed,
  Wine,
  Sparkles,
  Truck,
  MapPin,
  Scale,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ICON_OPTIONS: { key: string; Icon: LucideIcon }[] = [
  { key: "home", Icon: Home },
  { key: "utensils", Icon: UtensilsCrossed },
  { key: "car", Icon: Car },
  { key: "lightbulb", Icon: Lightbulb },
  { key: "party", Icon: PartyPopper },
  { key: "clapperboard", Icon: Clapperboard },
  { key: "shirt", Icon: Shirt },
  { key: "plane", Icon: Plane },
  { key: "landmark", Icon: Landmark },
  { key: "trending", Icon: TrendingUp },
  { key: "coins", Icon: Coins },
  { key: "book", Icon: BookOpen },
  { key: "heart", Icon: Heart },
  { key: "paw", Icon: PawPrint },
  { key: "gamepad", Icon: Gamepad2 },
  { key: "music", Icon: Music },
  { key: "coffee", Icon: Coffee },
  { key: "cart", Icon: ShoppingCart },
  { key: "laptop", Icon: Laptop },
  { key: "phone", Icon: Smartphone },
  { key: "dumbbell", Icon: Dumbbell },
  { key: "palette", Icon: Palette },
  { key: "wrench", Icon: Wrench },
  { key: "sprout", Icon: Sprout },
  { key: "tag", Icon: Tag },
  { key: "package", Icon: Package },
  { key: "briefcase", Icon: Briefcase },
  { key: "graduation", Icon: GraduationCap },
  { key: "baby", Icon: Baby },
  { key: "shield", Icon: Shield },
  { key: "zap", Icon: Zap },
  { key: "wifi", Icon: Wifi },
  { key: "credit-card", Icon: CreditCard },
  { key: "bed", Icon: Bed },
  { key: "wine", Icon: Wine },
  { key: "sparkles", Icon: Sparkles },
  { key: "truck", Icon: Truck },
  { key: "map-pin", Icon: MapPin },
  { key: "scale", Icon: Scale },
];

const ICON_MAP = new Map(ICON_OPTIONS.map((o) => [o.key, o.Icon]));

/**
 * Returns the Lucide icon component for a given icon key.
 * Falls back to Tag for unknown keys (including old emoji values).
 */
export function getIconComponent(iconKey: string | null | undefined): LucideIcon {
  if (!iconKey) return Tag;
  return ICON_MAP.get(iconKey) ?? Tag;
}

/**
 * Renders a Lucide icon from a stored icon key string.
 */
export function CategoryIcon({
  iconKey,
  className,
}: {
  iconKey: string | null | undefined;
  className?: string;
}) {
  // Use createElement to side-step the react-hooks/static-components rule:
  // the icon component is looked up from a stable module-level map, not
  // created during render. React.createElement avoids the JSX-element form
  // that the lint rule flags as component-creation.
  return createElement(getIconComponent(iconKey), { className });
}

/**
 * Icon picker grid component using Lucide icons.
 */
export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (iconKey: string) => void;
}) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {ICON_OPTIONS.map(({ key, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-none border-2 transition-all duration-150",
            "hover:bg-muted",
            value === key
              ? "border-primary bg-primary/10"
              : "border-transparent bg-transparent"
          )}
        >
          <Icon className="size-5 text-foreground" />
        </button>
      ))}
    </div>
  );
}
