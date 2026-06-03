import {
  BarChart3,
  CalendarClock,
  CreditCard,
  ListChecks,
  ReceiptText,
  Settings,
  Tags,
  type LucideIcon,
} from "lucide-react";

export type RouteId =
  | "dashboard"
  | "transactions"
  | "receipts"
  | "recurring"
  | "categories"
  | "settings";

export interface AppRoute {
  id: RouteId;
  label: string;
  shortLabel: string;
  eyebrow: string;
  icon: LucideIcon;
}

export const appRoutes: AppRoute[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    shortLabel: "Home",
    eyebrow: "Overview",
    icon: BarChart3,
  },
  {
    id: "transactions",
    label: "Transactions",
    shortLabel: "Spend",
    eyebrow: "Manual expenses",
    icon: CreditCard,
  },
  {
    id: "receipts",
    label: "Receipts",
    shortLabel: "Receipts",
    eyebrow: "Item review",
    icon: ReceiptText,
  },
  {
    id: "recurring",
    label: "Recurring",
    shortLabel: "Bills",
    eyebrow: "Subscriptions",
    icon: CalendarClock,
  },
  {
    id: "categories",
    label: "Categories",
    shortLabel: "Tags",
    eyebrow: "Rules",
    icon: Tags,
  },
  {
    id: "settings",
    label: "Settings",
    shortLabel: "Settings",
    eyebrow: "Local data",
    icon: ListChecks,
  },
];

export const settingsIcon = Settings;
