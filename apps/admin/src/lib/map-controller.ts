import { TekoMapController } from "@teko/maps/web";
import { getVersion, setWorkerUrl } from "maplibre-gl";
import { privateAlpha } from "./private-alpha";

const basePath = privateAlpha ? "/admin" : "";
setWorkerUrl(`${basePath}/map-assets/maplibre-gl-worker.mjs?v=${getVersion()}`);

export { TekoMapController };
