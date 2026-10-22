// src/library.ts
export async function getLibrary(): Promise<any[]> {
  // GET /library – placeholder returns empty array
  const res = await fetch('/v1/library');
  if (!res.ok) throw new Error(`Failed ${res.status}`);
  return res.json();
}
export async function addToLibrary(item: any): Promise<void> {
  const res = await fetch('/v1/library', {
    method: 'POST',
    headers: {'content-type':'application/json'},
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error(`Failed ${res.status}`);
}
// ponytail: stub; implement storage later