export async function fetchTimes() {
  try {
    const res = await fetch("http://RASPBERRY_PI_IP:5000/times");
    return await res.json();
  } catch (err) {
    console.error(err);
    return {};
  }
}
