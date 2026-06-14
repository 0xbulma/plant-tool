import { useCallback, useEffect, useRef, useState } from "react";
import {
  connectFlowerPower,
  readBatteryLevel,
  readSensors,
  requestFlowerPower,
  type LiveCharacteristics,
  type SensorReading,
} from "@/lib/flowerPower";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error";

const POLL_INTERVAL_MS = 3000;

export function useFlowerPower() {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [reading, setReading] = useState<SensorReading | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const charsRef = useRef<LiveCharacteristics | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!charsRef.current) return;
    try {
      setReading(await readSensors(charsRef.current));
      setBattery(await readBatteryLevel(charsRef.current));
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const disconnect = useCallback(() => {
    stopPolling();
    const device = deviceRef.current;
    if (device?.gatt?.connected) device.gatt.disconnect();
    setStatus("idle");
  }, [stopPolling]);

  const connect = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    try {
      const device = await requestFlowerPower();
      deviceRef.current = device;
      setDeviceName(device.name ?? "Flower Power");
      device.addEventListener("gattserverdisconnected", () => {
        stopPolling();
        setStatus("idle");
      });

      charsRef.current = await connectFlowerPower(device);
      setStatus("connected");
      await refresh();
      timerRef.current = setInterval(refresh, POLL_INTERVAL_MS);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }, [refresh, stopPolling]);

  useEffect(() => stopPolling, [stopPolling]);

  return {
    status,
    deviceName,
    reading,
    battery,
    error,
    updatedAt,
    connect,
    disconnect,
  };
}
