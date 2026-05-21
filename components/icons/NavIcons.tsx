import type { NavIconName } from "@/lib/constants/navigation";

const stroke = "currentColor";

export function NavIcon({
  name,
  className,
  variant = "default",
}: {
  name: NavIconName;
  className?: string;
  /** Compact stroke + clearer shapes for the mobile bottom tab bar. */
  variant?: "default" | "tabBar";
}) {
  const tabBar = variant === "tabBar";
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: stroke,
    strokeWidth: tabBar ? 2 : 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (name) {
    case "home":
      return tabBar ? (
        <svg {...common}>
          <path d="m4 11 8-7 8 7" />
          <path d="M6 11v9h12v-9" />
        </svg>
      ) : (
        <svg {...common}>
          <path d="M4 10.5 12 3.5 8 10.5V20a1 1 0 0 0 1 1h3.5v-6h3v6H19a1 1 0 0 0 1-1v-9.5" />
        </svg>
      );
    case "explore":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.25" />
          <rect x="14" y="3" width="7" height="7" rx="1.25" />
          <rect x="3" y="14" width="7" height="7" rx="1.25" />
          <rect x="14" y="14" width="7" height="7" rx="1.25" />
        </svg>
      );
    case "rankings":
      return tabBar ? (
        <svg {...common}>
          <path d="M7 21V11" />
          <path d="M12 21V7" />
          <path d="M17 21v-6" />
        </svg>
      ) : (
        <svg {...common}>
          <path d="M8 21V10l4-2v13" />
          <path d="M16 21V6l4 2v13" />
          <path d="M4 21V14l4 1v6" />
        </svg>
      );
    case "discover":
      return tabBar ? (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16.5 16.5 4.5 4.5" />
        </svg>
      ) : (
        <svg {...common}>
          <circle cx="11" cy="11" r="7.25" />
          <path d="M16.65 16.65 21 21" />
        </svg>
      );
    case "notifications":
      return (
        <svg {...common}>
          <path d="M10 21h4a2 2 0 0 0 2-2H8a2 2 0 0 0 2 2Z" />
          <path d="M18 8a6 6 0 1 0-12 0c0 4-2 5-2 5h16s-2-1-2-5" />
        </svg>
      );
    case "messages":
      return (
        <svg {...common}>
          <path d="M21 12a8 8 0 0 1-8 8H8l-5 3v-3a8 8 0 1 1 18-8Z" />
        </svg>
      );
    case "profile":
      return tabBar ? (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
        </svg>
      ) : (
        <svg {...common}>
          <circle cx="12" cy="8.5" r="3.25" />
          <path d="M5.5 20.2v-.6c0-2.6 2.1-4.7 4.7-4.7h3.6c2.6 0 4.7 2.1 4.7 4.7v.6" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.25" />
          <path d="M12 2v2.2M12 19.8V22M4.2 12H2M22 12h-2.2M5 5l1.6 1.6M17.4 17.4 19 19M19 5l-1.6 1.6M6.6 17.4 5 19" />
        </svg>
      );
    case "upload":
      return tabBar ? (
        <svg {...common}>
          <path d="M12 16V8" />
          <path d="m8 12 4-4 4 4" />
          <path d="M5 20h14" />
        </svg>
      ) : (
        <svg {...common}>
          <path d="M12 16V4" />
          <path d="M8 8l4-4 4 4" />
          <path d="M4 16.5V20a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 20v-3.5" />
        </svg>
      );
    case "challenges":
      return tabBar ? (
        <svg {...common}>
          <path d="M8 21h8" />
          <path d="M12 17v4" />
          <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
        </svg>
      ) : (
        <svg {...common}>
          <path d="M8 21h8M12 17v4M7 4h10l-1 7H8L7 4Z" />
          <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
        </svg>
      );
    case "premium":
      return tabBar ? (
        <svg {...common}>
          <path d="M12 3.5 2.8 9h5.4L12 20.5 5.8 9H2.2L12 3.5z" />
        </svg>
      ) : (
        <svg {...common}>
          <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6L12 2z" />
        </svg>
      );
    case "benefits":
      return (
        <svg {...common}>
          <path d="M20 12v8H4v-8" />
          <path d="M2 7h20v5H2z" />
          <path d="M12 22V7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7Z" />
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z" />
        </svg>
      );
    case "scoutDashboard":
      return tabBar ? (
        <svg {...common}>
          <path d="M4 19h16" />
          <path d="M7 5v10" />
          <path d="M12 9v6" />
          <path d="M17 13v2" />
        </svg>
      ) : (
        <svg {...common}>
          <path d="M4 19h16v2H4v-2z" />
          <path d="M6 3v14h4V3H6zM14 8v9h4V8h-4z" />
        </svg>
      );
    default:
      return null;
  }
}
