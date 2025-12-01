const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function getStatus() {
  const res = await fetch(`${API_BASE_URL}/status`);
  return res.json();
}
