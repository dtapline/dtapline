/**
 * GitHub Icon Component
 * Using simple-icons (https://simpleicons.org/)
 */

import { siGithub } from "simple-icons"

interface GithubIconProps {
  className?: string
}

export function GithubIcon({ className }: GithubIconProps) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      className={className}
      aria-label="GitHub"
    >
      <title>{siGithub.title}</title>
      <path d={siGithub.path} />
    </svg>
  )
}
