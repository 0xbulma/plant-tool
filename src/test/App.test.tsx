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
    expect(screen.getByText("Fertilité (EC)")).toBeInTheDocument();
    expect(screen.getByText("Batterie")).toBeInTheDocument();
  });
});
