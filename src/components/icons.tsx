/* Set de iconos de línea (estilo Lucide, stroke=currentColor).
   Portado del mockup: se conserva el objeto `I` para que las vistas
   se lean igual que en el diseño original. */
import type { SVGProps } from "react"

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  size?: number
  sw?: number
}

const Svg = ({ children, size = 18, sw = 1.8, fill = "none", ...p }: IconProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    {children}
  </svg>
)

export const I = {
  PanelLeft: (p: IconProps) => (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
    </Svg>
  ),
  ChevronRight: (p: IconProps) => (
    <Svg {...p}>
      <path d="m9 18 6-6-6-6" />
    </Svg>
  ),
  ChevronLeft: (p: IconProps) => (
    <Svg {...p}>
      <path d="m15 18-6-6 6-6" />
    </Svg>
  ),
  ChevronDown: (p: IconProps) => (
    <Svg {...p}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  ),
  ChevronsLeft: (p: IconProps) => (
    <Svg {...p}>
      <path d="m11 17-5-5 5-5" />
      <path d="m18 17-5-5 5-5" />
    </Svg>
  ),
  ArrowLeft: (p: IconProps) => (
    <Svg {...p}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </Svg>
  ),
  ArrowRight: (p: IconProps) => (
    <Svg {...p}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </Svg>
  ),
  Search: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </Svg>
  ),
  Plus: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  ),
  Eye: (p: IconProps) => (
    <Svg {...p}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  ),
  EyeOff: (p: IconProps) => (
    <Svg {...p}>
      <path d="M10.7 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.7 2.4" />
      <path d="M6.6 6.6A13.3 13.3 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 5.4-1.6" />
      <path d="m2 2 20 20" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Svg>
  ),
  Pencil: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Svg>
  ),
  Trash: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </Svg>
  ),
  X: (p: IconProps) => (
    <Svg {...p}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Svg>
  ),
  Check: (p: IconProps) => (
    <Svg {...p}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  ),
  CheckCircle: (p: IconProps) => (
    <Svg {...p}>
      <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" />
      <path d="M22 4 12 14.01l-3-3" />
    </Svg>
  ),
  AlertTriangle: (p: IconProps) => (
    <Svg {...p}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </Svg>
  ),
  AlertCircle: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </Svg>
  ),
  Info: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </Svg>
  ),
  LogOut: (p: IconProps) => (
    <Svg {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </Svg>
  ),
  User: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Svg>
  ),
  Users: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 21a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5.2a3.5 3.5 0 0 1 0 6.6" />
      <path d="M18 14.3A6.5 6.5 0 0 1 21.5 21" />
    </Svg>
  ),
  Settings: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 7 2.6 1.6 1.6 0 0 0 8 1.1V1a2 2 0 0 1 4 0v.1A1.6 1.6 0 0 0 13.4 2.6a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </Svg>
  ),
  Siren: (p: IconProps) => (
    <Svg {...p}>
      <path d="M7 18v-6a5 5 0 0 1 10 0v6" />
      <path d="M5 21h14" />
      <path d="M4 18h16" />
      <path d="M12 2v1" />
      <path d="M4.9 6.3l.7.7" />
      <path d="M19.1 6.3l-.7.7" />
    </Svg>
  ),
  Beaker: (p: IconProps) => (
    <Svg {...p}>
      <path d="M9 3h6" />
      <path d="M10 3v6.5L5.2 17a2 2 0 0 0 1.7 3h10.2a2 2 0 0 0 1.7-3L14 9.5V3" />
      <path d="M7.5 14h9" />
    </Svg>
  ),
  FileText: (p: IconProps) => (
    <Svg {...p}>
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M5 21V5a2 2 0 0 1 2-2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" />
      <path d="M9 9h1" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </Svg>
  ),
  Activity: (p: IconProps) => (
    <Svg {...p}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </Svg>
  ),
  Box: (p: IconProps) => (
    <Svg {...p}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
      <path d="m3 8 9 5 9-5" />
      <path d="M12 13v8" />
    </Svg>
  ),
  Truck: (p: IconProps) => (
    <Svg {...p}>
      <path d="M14 16V5a1 1 0 0 0-1-1H2v12" />
      <path d="M14 8h4l3 3v5h-7" />
      <circle cx="6.5" cy="17.5" r="2" />
      <circle cx="17.5" cy="17.5" r="2" />
    </Svg>
  ),
  Target: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </Svg>
  ),
  Clipboard: (p: IconProps) => (
    <Svg {...p}>
      <rect x="8" y="3" width="8" height="4" rx="1" />
      <path d="M16 5h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </Svg>
  ),
  Link: (p: IconProps) => (
    <Svg {...p}>
      <path d="M9 17H7A5 5 0 0 1 7 7h2" />
      <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
      <path d="M8 12h8" />
    </Svg>
  ),
  Unlink: (p: IconProps) => (
    <Svg {...p}>
      <path d="M18.8 13.8 21 11.6a4 4 0 0 0-5.6-5.6L13 8" />
      <path d="M5.2 10.2 3 12.4a4 4 0 0 0 5.6 5.6L11 16" />
      <path d="m2 2 20 20" />
    </Svg>
  ),
  ExternalLink: (p: IconProps) => (
    <Svg {...p}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </Svg>
  ),
  Calendar: (p: IconProps) => (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
    </Svg>
  ),
  MapPin: (p: IconProps) => (
    <Svg {...p}>
      <path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </Svg>
  ),
  Phone: (p: IconProps) => (
    <Svg {...p}>
      <path d="M16.5 21A16 16 0 0 1 3 7.5 2.5 2.5 0 0 1 5.5 5h2a1 1 0 0 1 1 .8l.7 3a1 1 0 0 1-.3 1L7.5 11a13 13 0 0 0 5.5 5.5l1.2-1.4a1 1 0 0 1 1-.3l3 .7a1 1 0 0 1 .8 1v2A2.5 2.5 0 0 1 16.5 21Z" />
    </Svg>
  ),
  Users3: (p: IconProps) => (
    <Svg {...p}>
      <path d="M7 21v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2" />
      <circle cx="12" cy="7" r="3.5" />
    </Svg>
  ),
  Home: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </Svg>
  ),
  Upload: (p: IconProps) => (
    <Svg {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M12 4v12" />
    </Svg>
  ),
  Download: (p: IconProps) => (
    <Svg {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 11 5 5 5-5" />
      <path d="M12 16V4" />
    </Svg>
  ),
  Building: (p: IconProps) => (
    <Svg {...p}>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01" />
    </Svg>
  ),
  Filter: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3 5h18l-7 8v6l-4-2v-4Z" />
    </Svg>
  ),
  MoreH: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </Svg>
  ),
  Inbox: (p: IconProps) => (
    <Svg {...p}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1Z" />
    </Svg>
  ),
  Clock: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  ),
  Hash: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />
    </Svg>
  ),
  ShieldCheck: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  ),
  Wrench: (p: IconProps) => (
    <Svg {...p}>
      <path d="M14.7 6.3a4 4 0 0 1-5.2 5.2L4 17v3h3l5.5-5.5a4 4 0 0 1 5.2-5.2l-2.6 2.6-2-2 2.6-2.6Z" />
    </Svg>
  ),
  KeyRound: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="8" cy="8" r="5" />
      <path d="m11.5 11.5 8 8" />
      <path d="m16 16 2-2" />
      <path d="m19 13 2-2" />
    </Svg>
  ),
  Paperclip: (p: IconProps) => (
    <Svg {...p}>
      <path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8-8a3.3 3.3 0 0 1 4.7 4.7l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.3-7.3" />
    </Svg>
  ),
  ImageIcon: (p: IconProps) => (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </Svg>
  ),
  Dot: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
    </Svg>
  ),
  Table: (p: IconProps) => (
    <Svg {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 9v12" />
    </Svg>
  ),
  Rows: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
    </Svg>
  ),
  Ban: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </Svg>
  ),
  UserPlus: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 21a6.5 6.5 0 0 1 13 0" />
      <path d="M19 8v6" />
      <path d="M22 11h-6" />
    </Svg>
  ),
  RotateCcw: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </Svg>
  ),
}

export type IconKey = keyof typeof I
