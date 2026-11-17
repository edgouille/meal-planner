// Logo: a basil-green tile with a leaf and a sun dot.
export function BrandMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      <rect width="34" height="34" rx="10" fill="var(--color-primary)" />
      <path d="M10 23c0-7.5 5-12.5 14-13-.5 9-5.5 14-13 14l-1-1Z" fill="#fff" />
      <path d="M11 23 19 15" stroke="var(--color-primary)" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="25" cy="25" r="3.5" fill="var(--color-sun)" />
    </svg>
  )
}
