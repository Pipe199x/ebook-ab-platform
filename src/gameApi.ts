// src/gameApi.ts
export async function whichRead(): Promise<any> {
  // GET /which-read endpoint – placeholder implementation
  const res = await fetch('/v1/which-read');
  if (!res.ok) throw new Error(`Failed ${res.status}`);
  return res.json();
}
// ponytail: basic stub; replace with real logic when spec defined