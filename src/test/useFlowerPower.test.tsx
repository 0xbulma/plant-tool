import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/flowerPower", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/flowerPower")>();
  return {
    ...actual,
    requestFlowerPower: vi.fn(),
    connectFlowerPower: vi.fn(),
    readSensors: vi.fn(),
    readBatteryLevel: vi.fn(),
  };
});

import { useFlowerPower } from "@/hooks/useFlowerPower";
import * as fp from "@/lib/flowerPower";
import type { SensorReading } from "@/lib/flowerPower";

const mocked = vi.mocked(fp);

function fakeDevice(): BluetoothDevice {
  const listeners = new Map<string, Set<() => void>>();
  const device = {
    name: "Flower power",
    gatt: {
      connected: true,
      disconnect() {
        this.connected = false;
        listeners.get("gattserverdisconnected")?.forEach((l) => l());
      },
    },
    addEventListener(type: string, l: () => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(l);
    },
    removeEventListener(type: string, l: () => void) {
      listeners.get(type)?.delete(l);
    },
  };
  return device as unknown as BluetoothDevice;
}

const reading: SensorReading = {
  soilMoisture: 22,
  soilTemperature: 18,
  airTemperature: 20,
  sunlight: 5,
  soilEC: 100,
  raw: {
    soilMoisture: 400,
    soilTemperature: 500,
    airTemperature: 520,
    sunlight: 1000,
    soilEC: 100,
  },
};

describe("useFlowerPower", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocked.requestFlowerPower.mockResolvedValue(fakeDevice());
    mocked.connectFlowerPower.mockResolvedValue({});
    mocked.readSensors.mockResolvedValue(reading);
    mocked.readBatteryLevel.mockResolvedValue(90);
  });

  it("démarre à l'état idle", () => {
    const { result } = renderHook(() => useFlowerPower());
    expect(result.current.status).toBe("idle");
    expect(result.current.reading).toBeNull();
  });

  it("connect() passe à connected et lit une première mesure", async () => {
    const { result } = renderHook(() => useFlowerPower());
    await act(async () => {
      await result.current.connect();
    });
    await waitFor(() => expect(result.current.status).toBe("connected"));
    await waitFor(() => expect(result.current.reading).toEqual(reading));
    expect(result.current.battery).toBe(90);
  });

  it("disconnect() arrête le polling et repasse à idle", async () => {
    const { result } = renderHook(() => useFlowerPower());
    await act(async () => {
      await result.current.connect();
    });
    await waitFor(() => expect(result.current.status).toBe("connected"));

    act(() => {
      result.current.disconnect();
    });
    await waitFor(() => expect(result.current.status).toBe("idle"));
  });

  it("surface une erreur si la connexion échoue", async () => {
    mocked.connectFlowerPower.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useFlowerPower());
    await act(async () => {
      await result.current.connect();
    });
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBe("boom");
  });
});
