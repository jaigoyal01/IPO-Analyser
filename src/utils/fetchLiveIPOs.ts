
// Use fetch for browser compatibility

export interface LiveIPO {
  name: string;
  url: string;
}

export async function fetchLiveIPOs(): Promise<LiveIPO[]> {
  const res = await fetch('http://localhost:5174/api/live-ipos');
  if (!res.ok) throw new Error('Failed to fetch live IPOs');
  return res.json();
}
