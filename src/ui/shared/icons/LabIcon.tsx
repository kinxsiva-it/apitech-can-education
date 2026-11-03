type IconName = 'book' | 'vehicle' | 'activity' | 'code' | 'tool' | 'instructor' | 'layers' | 'check'

const paths: Record<IconName, string> = {
  book: 'M12 5C8 2 3 4 3 4v15s5-2 9 1c4-3 9-1 9-1V4s-5-2-9 1Zm0 0v15',
  vehicle: 'M5 16H3v-5l3-5h12l3 5v5h-2M5 11h14M7 16h10M7 16a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm14 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  activity: 'M2 12h5l3-8 4 16 3-8h5',
  code: 'm8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18',
  tool: 'm14 6 4 4 4-4c1 6-3 9-8 7L6 21l-3-3 8-8c-2-5 1-9 7-8l-4 4Z',
  instructor: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm4-3h6v12h-3',
  layers: 'm12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5',
  check: 'm8 12 3 3 5-6M9 3H5v18h14V3h-4M9 2h6v4H9V2Z',
}

export function LabIcon({ name }: { name: IconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
