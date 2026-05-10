import type { Meta, StoryObj } from "@storybook/react-vite";
import { PlaceholderSummary } from "./PlaceholderSummary";

const meta: Meta<typeof PlaceholderSummary> = {
  title: "App/PlaceholderSummary",
  component: PlaceholderSummary,
};
export default meta;

type Story = StoryObj<typeof PlaceholderSummary>;

const REALISTIC = `
En la ciudad de ……, capital de la provincia de ……, cantón ……,
parroquia ……, sector ……, comparece el señor de nombres y apellidos
……, mayor de edad, portador de la cédula de ciudadanía No. ……,
de profesión ……, de estado civil ……, con teléfono celular número
……, correo electrónico ……, casillero judicial electrónico ……, en
calidad de propietario del inmueble ubicado en la avenida ……, calle
……, edificio ……, ante el notario …….

Suscrito en …… de …… de 20…
`.trim();

export const RealisticTemplate: Story = {
  render: () => (
    <div className="w-[640px]">
      <PlaceholderSummary text={REALISTIC} willNormalize />
    </div>
  ),
};

export const NormalizationOff: Story = {
  // Same content, normalize toggle off — strip switches to the muted
  // styling so it reads as informational rather than active.
  render: () => (
    <div className="w-[640px]">
      <PlaceholderSummary text={REALISTIC} willNormalize={false} />
    </div>
  ),
};

export const HiddenWhenNoMatches: Story = {
  // Returns null — Storybook renders empty so the operator sees that
  // the component disappears rather than persisting an empty strip.
  render: () => (
    <div className="w-[640px]">
      <PlaceholderSummary
        text="Texto sin blancos ni placeholders. Nada que reportar."
        willNormalize
      />
    </div>
  ),
};

export const HiddenWhenNoText: Story = {
  render: () => (
    <div className="w-[640px]">
      <PlaceholderSummary text={null} willNormalize={false} />
    </div>
  ),
};
