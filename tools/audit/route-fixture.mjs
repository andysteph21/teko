// Contrat HTTP Valhalla pour la CI sans extrait cartographique. Ce serveur
// ne mesure ni les routes réelles, ni leur distance, ni leur qualité terrain.
import { createServer } from "node:http";

function encode(value) {
  let number = value < 0 ? ~(value << 1) : value << 1;
  let result = "";
  while (number >= 0x20) {
    result += String.fromCharCode((0x20 | (number & 0x1f)) + 63);
    number >>= 5;
  }
  return result + String.fromCharCode(number + 63);
}
// Polyline6 : deux points de Libreville, métriques délibérément déterministes.
const shape = encode(403200) + encode(9453600) + encode(11600) + encode(13500);
const fixture = { trip: { summary: { length: 3.2, time: 720 }, legs: [{ shape }] } };
createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/route") {
    response.writeHead(404);
    response.end();
    return;
  }
  let size = 0;
  request.on("data", (chunk) => {
    size += chunk.length;
    if (size > 4096) request.destroy();
  });
  request.on("end", () => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(fixture));
  });
}).listen(8002, "0.0.0.0", () =>
  console.info("Fixture de contrat Valhalla :8002, réservée à la CI"),
);
