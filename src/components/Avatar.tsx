import type { CSSProperties } from 'react'
import { avatarHue, initials } from '../lib/format'

interface AvatarProps {
  handle: string
  size?: 'sm' | 'md' | 'lg'
}

export function Avatar({ handle, size = 'md' }: AvatarProps) {
  const hue = avatarHue(handle)
  return (
    <span
      className={`avatar avatar--${size}`}
      style={{ '--avatar-hue': hue } as CSSProperties}
      aria-hidden="true"
    >
      {initials(handle)}
    </span>
  )
}
