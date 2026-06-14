import { useCallback, useEffect, useRef, useState } from "react";
import {
  connectFlowerPower,
  readBatteryLevel,
  readSensors,
  requestFlowerPower,
  type LiveCharacteristics,
  type SensorReading,
} from "@/lib/flowerPower";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

const POLL_INTERVAL_MS = 3000;

const toMessage = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);

export function useFlowerPower() {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [reading, setReading] = useState<SensorReading | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const charsRef = useRef<LiveCharacteristics | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingRef = useRef(false);
  const disconnectHandlerRef = useRef<(() => void) | null>(null);
  const intentionalRef = useRef(false);
  const mountedRef = useRef(true);

  const stopPolling = useCallback(() => {
    pollingRef.current = false;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Detach the disconnect listener and drop stale device/characteristic refs
  // so a later poll or reconnect never touches a dead GATT server.
  const teardownDevice = useCallback(() => {
    const device = deviceRef.current;
    if (device && disconnectHandlerRef.current) {
      device.removeEventListener(
        "gattserverdisconnected",
        disconnectHandlerRef.current,
      );
    }
    disconnectHandlerRef.current = null;
    charsRef.current = null;
    deviceRef.current = null;
  }, []);

  // Self-scheduling poll: the next tick is only armed once the current read
  // resolves, so slow BLE reads can never overlap or pile up. A read failure
  // stops the loop and surfaces the error instead of silently retrying.
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = true;

    const tick = async () => {
      const chars = charsRef.current;
      if (!chars || !pollingRef.current) return;
      try {
        const next = await readSensors(chars);
        const level = await readBatteryLevel(chars);
        if (!mountedRef.current || !pollingRef.current) return;
        setReading(next);
        setBattery(level);
        setUpdatedAt(new Date());
        timerRef.current = setTimeout(() => void tick(), POLL_INTERVAL_MS);
      } catch (e) {
        if (!mountedRef.current) return;
        stopPolling();
        setError(toMessage(e));
        setStatus("error");
      }
    };

    void tick();
  }, [stopPolling]);

  const disconnect = useCallback(() => {
    stopPolling();
    intentionalRef.current = true;
    const device = deviceRef.current;
    if (device?.gatt?.connected) {
      device.gatt.disconnect(); // fires gattserverdisconnected -> handler resets state
    } else {
      teardownDevice();
      setStatus("idle");
    }
  }, [stopPolling, teardownDevice]);

  const connect = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    // Clear any prior poll/listener before reconnecting so nothing is orphaned.
    stopPolling();
    teardownDevice();
    intentionalRef.current = false;
    try {
      const device = await requestFlowerPower();
      deviceRef.current = device;
      setDeviceName(device.name ?? "Flower Power");

      const onDisconnect = () => {
        stopPolling();
        const wasIntentional = intentionalRef.current;
        teardownDevice();
        if (!mountedRef.current) return;
        if (wasIntentional) {
          setStatus("idle");
        } else {
          setError("Capteur déconnecté.");
          setStatus("error");
        }
        intentionalRef.current = false;
      };
      disconnectHandlerRef.current = onDisconnect;
      device.addEventListener("gattserverdisconnected", onDisconnect);

      charsRef.current = await connectFlowerPower(device);
      setStatus("connected");
      startPolling();
    } catch (e) {
      setError(toMessage(e));
      setStatus("error");
    }
  }, [startPolling, stopPolling, teardownDevice]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopPolling();
      const device = deviceRef.current;
      if (device?.gatt?.connected) device.gatt.disconnect();
      teardownDevice();
    };
  }, [stopPolling, teardownDevice]);

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
