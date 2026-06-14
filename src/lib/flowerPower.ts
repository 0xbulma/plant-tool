/**
 * Protocole BLE du capteur Parrot Flower Power.
 *
 * UUID GATT et formules de conversion repris de la librairie de référence
 * `node-flower-power` (sandeepmistry) et de la spec BLE officielle Parrot.
 * Les valeurs lues sont des entiers 16 bits non signés little-endian.
 */

export const LIVE_SERVICE = "39e1fa00-84a8-11e2-afba-0002a5d5c51b";

export const CHARACTERISTIC = {
  sunlight: "39e1fa01-84a8-11e2-afba-0002a5d5c51b",
  soilEC: "39e1fa02-84a8-11e2-afba-0002a5d5c51b",
  soilTemperature: "39e1fa03-84a8-11e2-afba-0002a5d5c51b",
  airTemperature: "39e1fa04-84a8-11e2-afba-0002a5d5c51b",
  soilMoisture: "39e1fa05-84a8-11e2-afba-0002a5d5c51b",
  livePeriod: "39e1fa06-84a8-11e2-afba-0002a5d5c51b",
  // Valeurs CALIBRÉES par le capteur (float32 little-endian), identifiées par
  // sonde GATT sur un Flower Power « Hawaii » firmware 2.0.3 (cf. TIB calibration).
  // L'EC (fa02) n'a PAS d'équivalent calibré → la fertilité reste brute/relative.
  calibratedSoilMoisture: "39e1fa09-84a8-11e2-afba-0002a5d5c51b", // % VWC
  calibratedAirTemperature: "39e1fa0a-84a8-11e2-afba-0002a5d5c51b", // °C
  calibratedSunlight: "39e1fa0b-84a8-11e2-afba-0002a5d5c51b", // mol/m²/j (DLI)
} as const;

// UUID Bluetooth standard, écrits en 128 bits complets (forme canonique de
// l'alias 16 bits, base "-0000-1000-8000-00805f9b34fb"). Chrome accepte aussi
// la forme numérique (0x180f), mais le pont CoreBluetooth de Bluefy sur iOS la
// rejette parfois dès `requestDevice` — d'où la chaîne complète ici.
export const BATTERY_SERVICE = "0000180f-0000-1000-8000-00805f9b34fb";
export const BATTERY_LEVEL = "00002a19-0000-1000-8000-00805f9b34fb";
export const DEVICE_INFORMATION_SERVICE = "0000180a-0000-1000-8000-00805f9b34fb";
export const FIRMWARE_REVISION = "00002a26-0000-1000-8000-00805f9b34fb";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Température du sol ou de l'air, en °C (valable -10 → 55 °C). */
export function convertTemperature(raw: number): number {
  const t =
    0.00000003044 * raw ** 3 -
    0.00008038 * raw ** 2 +
    0.1149 * raw -
    30.449999;
  return clamp(t, -10, 55);
}

/**
 * Humidité du sol BRUTE (formule générique node-flower-power), en % VWC avant
 * calibration. Peut sortir de [0,60] avant calibrage.
 */
function soilMoisturePoly(raw: number): number {
  const s =
    11.4293 +
    (0.0000000010698 * raw ** 4 -
      0.00000152538 * raw ** 3 +
      0.000866976 * raw ** 2 -
      0.169422 * raw);
  return 100 * (0.0000045 * s ** 3 - 0.00055 * s ** 2 + 0.0292 * s - 0.053);
}

/**
 * Calibration GÉNÉRALE à un point de l'humidité du sol.
 *
 * La formule générique sous-évalue fortement : un sol saturé (juste arrosé,
 * « terre noire complètement humide ») a été mesuré à brut 356 → ~18 %, alors
 * que la réalité est ~55 % VWC (capacité au champ d'un terreau). On applique un
 * GAIN pour que la saturation lise sa vraie valeur. Modèle à UN SEUL point (gain
 * d'origine 0), VALABLE POUR TOUT CAPTEUR (pas par pot) : il corrige l'extrémité
 * humide (le côté critique du sur-arrosage) et est exact à saturation, mais
 * déforme le milieu/bas de l'échelle tant qu'un point « sec » n'est pas ajouté
 * (cf. TIB calibration, raffinement à deux points différé).
 */
export const SOIL_MOISTURE_CAL_RAW = 356;
export const SOIL_MOISTURE_CAL_VWC = 55;
const SOIL_MOISTURE_GAIN =
  SOIL_MOISTURE_CAL_VWC / soilMoisturePoly(SOIL_MOISTURE_CAL_RAW);

/** Humidité volumique du sol calibrée, en % VWC (bornée 0 → 60 %). */
export function convertSoilMoisture(raw: number): number {
  return clamp(soilMoisturePoly(raw) * SOIL_MOISTURE_GAIN, 0, 60);
}

/**
 * Luminosité (DLI), en mol/m²/jour.
 *
 * Formule reprise verbatim de `node-flower-power` (le `0.0864` = 86400 s/jour /
 * 1e6). La relation est volontairement INVERSE : la caractéristique brute
 * décroît quand la lumière augmente, donc l'exposant négatif est correct et
 * conforme à toutes les implémentations connues du capteur — ne pas "corriger"
 * en exposant positif. Reste une approximation : la valeur brute est affichée
 * en parallèle dans l'UI pour permettre une recalibration sur matériel réel.
 */
export function convertSunlight(raw: number): number {
  if (raw <= 0) return 0;
  return 0.0864 * (192773.17 * raw ** -1.0606619);
}

/**
 * Indice de fertilité RELATIF (0–100) dérivé de la valeur brute d'EC.
 *
 * Le capteur expose une conductivité brute NON calibrée : aucune conversion
 * raw→mS/cm fiable n'est publiée. La librairie de référence `node-flower-power`
 * laisse même un `// TODO: convert raw (0 - 1771) to 0 to 10 (mS/cm)` jamais
 * implémenté, et renvoie la valeur brute telle quelle. On normalise donc sur
 * cette pleine échelle documentée (1771 ≈ ~10 mS/cm) : l'indice/10 donne un
 * ordre de grandeur en mS/cm, mais reste APPROXIMATIF — à interpréter en
 * tendance, pas comme une mesure physique. La valeur brute est affichée à côté
 * pour permettre une recalibration sur matériel réel.
 */
export const EC_RAW_FULL_SCALE = 1771;

export function fertilityIndex(raw: number): number {
  return clamp((raw / EC_RAW_FULL_SCALE) * 100, 0, 100);
}

export type SensorReading = {
  soilMoisture: number | null;
  soilTemperature: number | null;
  airTemperature: number | null;
  sunlight: number | null;
  soilEC: number | null;
  raw: {
    soilMoisture: number | null;
    soilTemperature: number | null;
    airTemperature: number | null;
    sunlight: number | null;
    soilEC: number | null;
  };
};

const u16 = (dv: DataView): number => dv.getUint16(0, true);

/** True si le navigateur expose l'API Web Bluetooth. */
export function isWebBluetoothAvailable(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

export async function requestFlowerPower(): Promise<BluetoothDevice> {
  if (!isWebBluetoothAvailable()) {
    throw new Error(
      "Web Bluetooth n'est pas disponible dans ce navigateur (voir le README).",
    );
  }
  return navigator.bluetooth.requestDevice({
    filters: [{ services: [LIVE_SERVICE] }, { namePrefix: "Flower" }],
    optionalServices: [
      LIVE_SERVICE,
      BATTERY_SERVICE,
      DEVICE_INFORMATION_SERVICE,
    ],
  });
}

export type LiveCharacteristics = {
  soilMoisture?: BluetoothRemoteGATTCharacteristic;
  soilTemperature?: BluetoothRemoteGATTCharacteristic;
  airTemperature?: BluetoothRemoteGATTCharacteristic;
  sunlight?: BluetoothRemoteGATTCharacteristic;
  soilEC?: BluetoothRemoteGATTCharacteristic;
  battery?: BluetoothRemoteGATTCharacteristic;
  // Canaux calibrés par le capteur (float32) — absents sur certains firmwares.
  calibratedSoilMoisture?: BluetoothRemoteGATTCharacteristic;
  calibratedAirTemperature?: BluetoothRemoteGATTCharacteristic;
  calibratedSunlight?: BluetoothRemoteGATTCharacteristic;
};

/** Connecte le GATT, active le mode "live" et résout les caractéristiques. */
export async function connectFlowerPower(
  device: BluetoothDevice,
): Promise<LiveCharacteristics> {
  if (!device.gatt) {
    throw new Error("Cet appareil n'expose pas de serveur GATT.");
  }
  const server = await device.gatt.connect();
  const live = await server.getPrimaryService(LIVE_SERVICE);

  // A genuinely-absent characteristic stays undefined (readSensors reports it
  // as null, not a fabricated 0). But if NONE of the live characteristics
  // resolve, the device isn't a usable Flower Power — fail loudly.
  const chars: LiveCharacteristics = {
    soilMoisture: await live
      .getCharacteristic(CHARACTERISTIC.soilMoisture)
      .catch(() => undefined),
    soilTemperature: await live
      .getCharacteristic(CHARACTERISTIC.soilTemperature)
      .catch(() => undefined),
    airTemperature: await live
      .getCharacteristic(CHARACTERISTIC.airTemperature)
      .catch(() => undefined),
    sunlight: await live
      .getCharacteristic(CHARACTERISTIC.sunlight)
      .catch(() => undefined),
    soilEC: await live
      .getCharacteristic(CHARACTERISTIC.soilEC)
      .catch(() => undefined),
    calibratedSoilMoisture: await live
      .getCharacteristic(CHARACTERISTIC.calibratedSoilMoisture)
      .catch(() => undefined),
    calibratedAirTemperature: await live
      .getCharacteristic(CHARACTERISTIC.calibratedAirTemperature)
      .catch(() => undefined),
    calibratedSunlight: await live
      .getCharacteristic(CHARACTERISTIC.calibratedSunlight)
      .catch(() => undefined),
  };

  const resolved = [
    chars.soilMoisture,
    chars.soilTemperature,
    chars.airTemperature,
    chars.sunlight,
    chars.soilEC,
  ].filter(Boolean).length;
  if (resolved === 0) {
    throw new Error(
      "Aucune caractéristique de mesure trouvée — appareil incompatible.",
    );
  }

  // Active la mesure en continu (période = 1 s). Best-effort : si l'écriture
  // échoue, on le signale (les lectures resteront figées) sans bloquer.
  await live
    .getCharacteristic(CHARACTERISTIC.livePeriod)
    .then((c) => c.writeValue(Uint8Array.of(1)))
    .catch((e) =>
      console.warn("Flower Power : impossible d'activer le live mode.", e),
    );

  chars.battery = await server
    .getPrimaryService(BATTERY_SERVICE)
    .then((s) => s.getCharacteristic(BATTERY_LEVEL))
    .catch(() => undefined);

  return chars;
}

/** Lit toutes les caractéristiques disponibles et applique les conversions. */
export async function readSensors(
  chars: LiveCharacteristics,
): Promise<SensorReading> {
  const readRaw = async (
    c: BluetoothRemoteGATTCharacteristic | undefined,
  ): Promise<number | null> => (c ? u16(await c.readValue()) : null);

  // Lit un canal CALIBRÉ (float32 little-endian) ; null si absent ou non fini.
  const readFloat = async (
    c: BluetoothRemoteGATTCharacteristic | undefined,
  ): Promise<number | null> => {
    if (!c) return null;
    const v = (await c.readValue()).getFloat32(0, true);
    return Number.isFinite(v) ? v : null;
  };

  const raw = {
    soilMoisture: await readRaw(chars.soilMoisture),
    soilTemperature: await readRaw(chars.soilTemperature),
    airTemperature: await readRaw(chars.airTemperature),
    sunlight: await readRaw(chars.sunlight),
    soilEC: await readRaw(chars.soilEC),
  };

  // Valeurs calibrées par le capteur (prioritaires) ; sinon repli sur nos
  // conversions à partir du brut. Le capteur Hawaii calibre humidité, température
  // de l'air et lumière — mais PAS l'EC ni la température du sol.
  const calSoilMoisture = await readFloat(chars.calibratedSoilMoisture);
  const calAirTemperature = await readFloat(chars.calibratedAirTemperature);
  const calSunlight = await readFloat(chars.calibratedSunlight);

  return {
    soilMoisture:
      calSoilMoisture !== null
        ? clamp(calSoilMoisture, 0, 60)
        : raw.soilMoisture === null
          ? null
          : convertSoilMoisture(raw.soilMoisture),
    soilTemperature:
      raw.soilTemperature === null ? null : convertTemperature(raw.soilTemperature),
    airTemperature:
      calAirTemperature !== null
        ? clamp(calAirTemperature, -10, 55)
        : raw.airTemperature === null
          ? null
          : convertTemperature(raw.airTemperature),
    sunlight:
      calSunlight !== null
        ? Math.max(0, calSunlight)
        : raw.sunlight === null
          ? null
          : convertSunlight(raw.sunlight),
    soilEC: raw.soilEC,
    raw,
  };
}

export async function readBatteryLevel(
  chars: LiveCharacteristics,
): Promise<number | null> {
  if (!chars.battery) return null;
  const dv = await chars.battery.readValue();
  return dv.getUint8(0);
}
