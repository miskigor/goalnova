import type { NavIconName } from "@/lib/constants/navigation";

const stroke = "currentColor";

export function NavIcon({
  name,
  className,
}: {
  name: NavIconName;
  className?: string;
}) {
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: stroke,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (name) {
    case "home":
      return (
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
      return (
        <svg {...common}>
          <path d="M8 21V10l4-2v13" />
          <path d="M16 21V6l4 2v13" />
          <path d="M4 21V14l4 1v6" />
        </svg>
      );
    case "discover":
      return (
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
      return (
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
      return (
        <svg {...common}>
          <path d="M12 16V4" />
          <path d="M8 8l4-4 4 4" />
          <path d="M4 16.5V20a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 20v-3.5" />
        </svg>
      );
    case "challenges":
      return (
        <svg {...common}>
          <path d="M8 21h8M12 17v4M7 4h10l-1 7H8L7 4Z" />
          <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
        </svg>
      );
    case "premium":
      return (
        <svg {...common}>
          <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6L12 2z" />
        </svg>
      );
    case "scoutDashboard":
      return (
        <svg {...common}>
          <path d="M4 19h16v2H4v-2z" />
          <path d="M6 3v14h4V3H6zM14 8v9h4V8h-4z" />
        </svg>
      );
    default:
      return null;
  }
}
