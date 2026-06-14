import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "@/App";

describe("<App />", () => {
  it("affiche le titre et le bouton de connexion", () => {
    render(<App />);
    expect(screen.getByText("Flower Power")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /connecter le capteur/i }),
    ).toBeInTheDocument();
  });

  it("affiche les six cartes de mesure", () => {
    render(<App />);
    expect(screen.getByText("Humidité du sol")).toBeInTheDocument();
    expect(screen.getByText("Température du sol")).toBeInTheDocument();
    expect(screen.getByText("Température de l'air")).toBeInTheDocument();
    expect(screen.getByText("Luminosité")).toBeInTheDocument();
    expect(screen.getByText("Fertilité (indice)")).toBeInTheDocument();
    expect(screen.getByText("Batterie")).toBeInTheDocument();
  });

  it("propose le sélecteur de plante", () => {
    render(<App />);
    const select = screen.getByRole("combobox", { name: /plante suivie/i });
    expect(select).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /citronnier/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /olivier/i })).toBeInTheDocument();
  });

  it("affiche les jauges de plage idéale et une bande de saison", () => {
    render(<App />);
    // Une jauge (role img) par métrique suivie, avec sa légende « Idéal … ».
    const gauges = screen.getAllByRole("img");
    expect(gauges.length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText(/Idéal/).length).toBeGreaterThanOrEqual(1);
    // Badge de saison (croissance ou repos).
    expect(
      screen.getByText(/Saison de croissance|Repos hivernal/),
    ).toBeInTheDocument();
  });
});
