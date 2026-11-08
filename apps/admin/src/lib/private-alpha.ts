export const privateAlpha = process.env.NEXT_PUBLIC_TEKO_ALPHA_ADMIN === "true";

export async function alphaRequest<T>(
  endpoint: "login" | "testers",
  payload: object,
  session?: string,
): Promise<T> {
  const response = await fetch(`/admin/alpha-api/${endpoint}`, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...(session && { "x-teko-session": session }),
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg ?? "Action indisponible.");
  return data as T;
}
