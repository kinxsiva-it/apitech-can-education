import type { SVGProps } from 'react'

export type AdminIconName = 'overview' | 'members' | 'institution' | 'education' | 'component' | 'bell' | 'mail' | 'history' | 'arrow' | 'menu' | 'close' | 'logout' | 'shield' | 'layers' | 'check' | 'eye' | 'eye-off'

/** Small, local line icons; no icon library or additional runtime dependency. */
export function AdminIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: AdminIconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {name === 'overview' && <><rect x="3" y="3" width="7" height="7" rx="1.7" /><rect x="14" y="3" width="7" height="7" rx="1.7" /><rect x="3" y="14" width="7" height="7" rx="1.7" /><rect x="14" y="14" width="7" height="7" rx="1.7" /></>}
    {name === 'members' && <><circle cx="9" cy="8" r="3" /><path d="M3 21v-2a6 6 0 0 1 12 0v2m1-16a3 3 0 0 1 0 6m3 10v-2a6 6 0 0 0-2-4" /></>}
    {name === 'institution' && <><path d="m3 8 9-5 9 5M4 21h16M6 11v7m6-7v7m6-7v7M3 8h18" /></>}
    {name === 'education' && <><path d="M12 5C9 3 5 3 3 4v15c3-1 6 0 9 2 3-2 6-3 9-2V4c-2-1-6-1-9 1Zm0 0v16" /><path d="m6 8 3 1m6 0 3-1m-12 4 3 1m6 0 3-1" /></>}
    {name === 'component' && <><path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10v10M3 7l9 5 9-5M7.5 4.5l9 5v4" /></>}
    {name === 'bell' && <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0" /></>}
    {name === 'mail' && <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 7 9 6 9-6" /></>}
    {name === 'history' && <><path d="M3 11a9 9 0 1 1 2 7M3 4v7h7m2-4v5l3 2" /></>}
    {name === 'arrow' && <path d="M5 12h14m-5-5 5 5-5 5" />}
    {name === 'menu' && <path d="M4 6h16M4 12h16M4 18h16" />}
    {name === 'close' && <path d="m6 6 12 12M6 18 18 6" />}
    {name === 'logout' && <><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5m4-13 5 5-5 5M8 12h13" /></>}
    {name === 'shield' && <><path d="m12 3 8 3v5c0 5-5 9-8 10-3-1-8-5-8-10V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>}
    {name === 'layers' && <><path d="m12 3 10 5-10 5L2 8l10-5Zm-9 9 9 5 9-5m-18 5 9 5 9-5" /></>}
    {name === 'check' && <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>}
    {(name === 'eye' || name === 'eye-off') && <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{name === 'eye-off' && <path d="m3 3 18 18" />}</>}
  </svg>
}
