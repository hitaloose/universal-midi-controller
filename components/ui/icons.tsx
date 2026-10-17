import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const PerformIcon = (p: IconProps) => <Icon {...p}><path d="M7 5l11 7-11 7z" /></Icon>
export const EditIcon = (p: IconProps) => <Icon {...p}><path d="M4 20h4l10.5-10.5-4-4L4 16z" /></Icon>
export const LooperIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11V9a3 3 0 013-3h15" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v2a3 3 0 01-3 3H3" />
  </Icon>
)
export const SongbookIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z" />
    <path d="M4 21V5" />
    <path d="M14 7v6.5" />
    <circle cx="12" cy="14" r="2" />
  </Icon>
)
export const MonitorIcon = (p: IconProps) => <Icon {...p}><path d="M3 12h4l3-8 4 16 3-8h4" /></Icon>
export const SettingsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Icon>
)
export const SpeakerIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9v6h4l5 4V5L8 9z" />
    <path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" />
  </Icon>
)
export const SpeakerOffIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9v6h4l5 4V5L8 9z" />
    <path d="M17 9l5 6M22 9l-5 6" />
  </Icon>
)
export const PowerIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v9" />
    <path d="M6.3 6.8a8 8 0 1011.4 0" />
  </Icon>
)
export const ChevronLeft = (p: IconProps) => <Icon {...p}><path d="M15 18l-6-6 6-6" /></Icon>
export const ChevronRight = (p: IconProps) => <Icon {...p}><path d="M9 18l6-6-6-6" /></Icon>
export const CloseIcon = (p: IconProps) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18" /></Icon>
export const CopyIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 012-2h9" />
  </Icon>
)
export const PlusIcon = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
export const GripIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={0} fill="currentColor">
    <circle cx="9" cy="6" r="1.5" />
    <circle cx="15" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" />
    <circle cx="15" cy="18" r="1.5" />
  </Icon>
)
export const WarnIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={2}>
    <path d="M12 3l10 18H2z" />
    <path d="M12 10v5M12 18v.5" />
  </Icon>
)
export const GearIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
  </Icon>
)

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <div
      className="rounded-[10px] bg-preset flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="#1A1200" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="7" r="1" fill="#1A1200" />
        <circle cx="7.5" cy="10" r="1" fill="#1A1200" />
        <circle cx="16.5" cy="10" r="1" fill="#1A1200" />
        <circle cx="9" cy="15.5" r="1" fill="#1A1200" />
        <circle cx="15" cy="15.5" r="1" fill="#1A1200" />
      </svg>
    </div>
  )
}
