import {
  Bluetooth,
  BluetoothConnected,
  Droplets,
  FlaskConical,
  Leaf,
  Sun,
  Thermometer,
  ThermometerSun,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SensorCard } from "@/components/SensorCard";
import { useFlowerPower } from "@/hooks/useFlowerPower";
import { isWebBluetoothAvailable } from "@/lib/flowerPower";

const fmt = (n: number | null | undefined, digits = 1) =>
  n == null ? "—" : n.toFixed(digits);

function App() {
  const {
    status,
    deviceName,
    reading,
    battery,
    error,
    updatedAt,
    connect,
    disconnect,
  } = useFlowerPower();

  const connected = status === "connected";
  const supported = isWebBluetoothAvailable();

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-5 py-8">
      <header className="text-center">
        <h1 className="mb-2 inline-flex items-center gap-2 text-2xl font-semibold">
          <Leaf className="size-6 text-primary" aria-hidden /> Flower Power
        </h1>
        <p className="text-sm text-muted-foreground">
          Lecteur direct du capteur Parrot — sans compte ni cloud
        </p>
      </header>

      <div className="my-6 flex flex-wrap items-center justify-center gap-3">
        {connected ? (
          <Button variant="outline" onClick={disconnect}>
            <BluetoothConnected /> Déconnecter
          </Button>
        ) : (
          <Button onClick={connect} disabled={status === "connecting"}>
            <Bluetooth />
            {status === "connecting" ? "Connexion…" : "Connecter le capteur"}
          </Button>
        )}
      </div>

      <div
        className="mb-6 flex justify-center"
        role={status === "error" ? "alert" : "status"}
      >
        {connected ? (
          <Badge>
            <span className="size-2 rounded-full bg-primary" aria-hidden />
            Connecté — {deviceName}
          </Badge>
        ) : status === "error" ? (
          <Badge variant="destructive">{error}</Badge>
        ) : (
          <Badge variant="muted">Non connecté</Badge>
        )}
      </div>

      {!supported && (
        <p className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-center text-sm text-destructive">
          Web Bluetooth indisponible ici. Utilise Chrome/Edge (Android, desktop)
          ou l'app Bluefy sur iOS.
        </p>
      )}

      <div
        className="grid grid-cols-2 gap-3"
        aria-live="polite"
        aria-label="Mesures du capteur"
      >
        <SensorCard
          icon={Droplets}
          label="Humidité du sol"
          unit="% VWC"
          value={fmt(reading?.soilMoisture)}
          raw={reading?.raw.soilMoisture}
        />
        <SensorCard
          icon={Thermometer}
          label="Température du sol"
          unit="°C"
          value={fmt(reading?.soilTemperature)}
          raw={reading?.raw.soilTemperature}
        />
        <SensorCard
          icon={ThermometerSun}
          label="Température de l'air"
          unit="°C"
          value={fmt(reading?.airTemperature)}
          raw={reading?.raw.airTemperature}
        />
        <SensorCard
          icon={Sun}
          label="Luminosité"
          unit="mol/m²/j"
          value={fmt(reading?.sunlight, 2)}
          raw={reading?.raw.sunlight}
        />
        <SensorCard
          icon={FlaskConical}
          label="Fertilité (EC)"
          unit="brut"
          value={reading?.soilEC != null ? String(reading.soilEC) : "—"}
        />
        <SensorCard
          icon={Leaf}
          label="Batterie"
          unit="%"
          value={battery === null ? "—" : String(battery)}
        />
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {updatedAt ? `Mise à jour ${updatedAt.toLocaleTimeString("fr-FR")}` : ""}
      </p>
    </div>
  );
}

export default App;
