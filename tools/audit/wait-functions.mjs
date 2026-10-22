const endpoint = `${process.env.TEKO_FUNCTIONS_URL}/notify-push`;
let ready = false;
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    const response = await fetch(endpoint, { method: "POST", signal: AbortSignal.timeout(1000) });
    const body = await response.json();
    if (response.status === 401 && body.error === "non autorisé") {
      ready = true;
      break;
    }
  } catch {
    /* Le runtime démarre. */
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (!ready) throw new Error("Runtime Edge alpha non prêt après 30 secondes");
console.info("Runtime Edge alpha prêt, refus anonyme vérifié.");
