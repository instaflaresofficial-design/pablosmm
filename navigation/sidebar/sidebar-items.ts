import {
  Banknote,
  Fingerprint,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Management",
    items: [
      {
        title: "Dashboard",
        url: "/admin/default",
        icon: LayoutDashboard,
      },
      {
        title: "Services",
        url: "/admin/services",
        icon: ShoppingBag,
      },
      {
        title: "Users",
        url: "/admin/users",
        icon: Users,
      },
      {
        title: "Orders",
        url: "/admin/orders",
        icon: ShoppingBag,
      },
      {
        title: "Wallet Requests",
        url: "/admin/wallet-requests",
        icon: Banknote,
      },
    ],
  },
];
