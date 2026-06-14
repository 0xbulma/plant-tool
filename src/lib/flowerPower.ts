/**
 * Protocole BLE du capteur Parrot Flower Power.
 *
 * UUID GATT et formules de conversion repris de la librairie de référence
 * `node-flower-power` (Parrot-Developers) et de la spec BLE officielle Parrot.
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
} as const;

export const BATTERY_SERVICE = 0x180f;
export const BATTERY_LEVEL = 0x2a19;
export const DEVICE_INFORMATION_SERVICE = 0x180a;
export const FIRMWARE_REVISION = 0x2a26;

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

/** Humidité volumique du sol, en % VWC (valable 0 → 60 %). */
export function convertSoilMoisture(raw: number): number {
  const s =
    11.4293 +
    (0.0000000010698 * raw ** 4 -
      0.00000152538 * raw ** 3 +
      0.000866976 * raw ** 2 -
      0.169422 * raw);
  const moisture =
    100 * (0.0000045 * s ** 3 - 0.00055 * s ** 2 + 0.0292 * s - 0.053);
  return clamp(moisture, 0, 60);
}

/** Luminosité (DLI), en mol/m²/jour. Approximation — afficher aussi le brut. */
export function convertSunlight(raw: number): number {
  if (raw <= 0) return 0;
  return 0.0864 * (192773.17 * raw ** -1.0606619);
}

export type SensorReading = {
  soilMoisture: number;
  soilTemperature: number;
  airTemperature: number;
  sunlight: number;
  soilEC: number;
  raw: {
    soilMoisture: number;
    soilTemperature: number;
    airTemperature: number;
    sunlight: number;
    soilEC: number;
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
};

/** Connecte le GATT, active le mode "live" et résout les caractéristiques. */
export async function connectFlowerPower(
  device: BluetoothDevice,
): Promise<LiveCharacteristics> {
  const server = await device.gatt!.connect();
  const live = await server.getPrimaryService(LIVE_SERVICE);

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
  };

  // Active la mesure en continu (période = 1 s).
  await live
    .getCharacteristic(CHARACTERISTIC.livePeriod)
    .then((c) => c.writeValue(Uint8Array.of(1)))
    .catch(() => undefined);

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
  ): Promise<number> => (c ? u16(await c.readValue()) : 0);

  const raw = {
    soilMoisture: await readRaw(chars.soilMoisture),
    soilTemperature: await readRaw(chars.soilTemperature),
    airTemperature: await readRaw(chars.airTemperature),
    sunlight: await readRaw(chars.sunlight),
    soilEC: await readRaw(chars.soilEC),
  };

  return {
    soilMoisture: convertSoilMoisture(raw.soilMoisture),
    soilTemperature: convertTemperature(raw.soilTemperature),
    airTemperature: convertTemperature(raw.airTemperature),
    sunlight: convertSunlight(raw.sunlight),
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
