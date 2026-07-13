"use client";

import {
  Activity,
  AppWindow,
  BarChart3,
  Briefcase,
  Building2,
  ClipboardList,
  Container,
  FileText,
  Landmark,
  LayoutDashboard,
  ShieldCheck,
  Truck,
  Users,
  Warehouse,
  Wrench,
} from "lucide-react";

type IconComponent = typeof AppWindow;

/**
 * Curated icon set for the app registry. Admins pick one of these names when
 * registering an app; a curated map keeps the bundle small (no dynamic
 * lucide imports).
 */
const ICONS: Record<string, IconComponent> = {
  Activity,
  AppWindow,
  BarChart3,
  Briefcase,
  Building2,
  ClipboardList,
  Container,
  FileText,
  Landmark,
  LayoutDashboard,
  ShieldCheck,
  Truck,
  Users,
  Warehouse,
  Wrench,
};

export const APP_ICON_NAMES = Object.keys(ICONS);

export default function AppIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = (name && ICONS[name]) || AppWindow;
  return <Icon className={className} aria-hidden />;
}
