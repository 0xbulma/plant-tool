import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

// Les chemins d'erreur tracent désormais l'objet via console.error : on le
// neutralise pour garder une sortie de test propre (tous les blocs en dépendent).
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

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

  it("rend lisible un code d'erreur brut (cas Bluefy/iOS)", async () => {
    // Bluefy rejette avec un code CoreBluetooth brut (un nombre), pas une Error :
    // l'UI doit afficher un message lisible et non « 2 ».
    mocked.connectFlowerPower.mockRejectedValueOnce(2);
    const { result } = renderHook(() => useFlowerPower());
    await act(async () => {
      await result.current.connect();
    });
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBe("Erreur Bluetooth (code 2)");
  });

  it("revient à idle si l'utilisateur annule le sélecteur", async () => {
    mocked.requestFlowerPower.mockRejectedValueOnce(
      new DOMException("cancelled", "NotFoundError"),
    );
    const { result } = renderHook(() => useFlowerPower());
    await act(async () => {
      await result.current.connect();
    });
    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(result.current.error).toBeNull();
  });
});

describe("useFlowerPower — polling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mocked.requestFlowerPower.mockResolvedValue(fakeDevice());
    mocked.connectFlowerPower.mockResolvedValue({});
    mocked.readSensors.mockResolvedValue(reading);
    mocked.readBatteryLevel.mockResolvedValue(90);
  });
  afterEach(() => vi.useRealTimers());

  it("relit à chaque intervalle puis s'arrête après disconnect", async () => {
    const { result } = renderHook(() => useFlowerPower());
    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.status).toBe("connected");
    expect(mocked.readSensors).toHaveBeenCalledTimes(1); // lecture immédiate

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(mocked.readSensors).toHaveBeenCalledTimes(2); // tick suivant

    act(() => result.current.disconnect());
    mocked.readSensors.mockClear();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });
    expect(mocked.readSensors).not.toHaveBeenCalled(); // polling stoppé
  });

  it("passe en erreur et stoppe le polling si une lecture échoue", async () => {
    const { result } = renderHook(() => useFlowerPower());
    await act(async () => {
      await result.current.connect();
    });
    expect(result.current.status).toBe("connected");

    mocked.readSensors.mockRejectedValueOnce(new Error("read fail"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("read fail");

    mocked.readSensors.mockClear();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });
    expect(mocked.readSensors).not.toHaveBeenCalled();
  });
});
