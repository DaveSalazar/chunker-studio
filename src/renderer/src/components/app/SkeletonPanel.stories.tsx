import type { Meta, StoryObj } from "@storybook/react-vite";
import { SkeletonPanel } from "./SkeletonPanel";

const meta: Meta<typeof SkeletonPanel> = {
  title: "App/SkeletonPanel",
  component: SkeletonPanel,
  parameters: {
    layout: "padded",
  },
};
export default meta;

type Story = StoryObj<typeof SkeletonPanel>;

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="h-[720px] w-[520px] rounded-xl border border-border bg-background p-4">
    {children}
  </div>
);

const richBody = [
  "Señor Juez:",
  "",
  "<<NOMBRE_ACTOR>>, por mis propios derechos, comparezco ante usted y digo:",
  "",
  "PRIMERA.- ANTECEDENTES.-",
  "Conforme establece el Art. 76 de la Constitución de la República y el Art. 169 del Código Orgánico Integral Penal, ejerzo el presente derecho. El demandado, <<NOMBRE_DEMANDADO>>, residente en <<DIRECCION_DEMANDADO>>, ha incumplido reiteradamente sus obligaciones.",
  "",
  "SEGUNDA.- FUNDAMENTOS DE DERECHO.-",
  "El Art. 1453 del Código Civil dispone que las obligaciones nacen del concurso real de las voluntades. Asimismo, el Art. 140 del COGEP establece los requisitos formales de la demanda.",
  "",
  "TERCERA.- PRETENSIÓN.-",
  "Solicito al señor Juez que, en sentencia, declare la responsabilidad civil del demandado y ordene el pago de <<MONTO>> dólares en concepto de indemnización.",
  "",
  "CUARTA.- PRUEBAS.-",
  "Adjunto los documentos de respaldo y solicito la práctica de las pruebas que se enuncian.",
].join("\n");

const emptyBody = [
  "Estimado cliente:",
  "",
  "Le escribimos para informarle sobre el estado de su trámite. Por favor revise los documentos adjuntos y comuníquese con su asesor si tiene alguna inquietud.",
  "",
  "Atentamente,",
  "El equipo legal.",
].join("\n");

export const RichDocument: Story = {
  render: () => (
    <Frame>
      <SkeletonPanel text={richBody} loading="ready" onIngest={() => {}} />
    </Frame>
  ),
};

export const NoStructureDetected: Story = {
  render: () => (
    <Frame>
      <SkeletonPanel text={emptyBody} loading="ready" onIngest={() => {}} />
    </Frame>
  ),
};

export const Unparsed: Story = {
  render: () => (
    <Frame>
      <SkeletonPanel text={null} loading="unparsed" onIngest={() => {}} />
    </Frame>
  ),
};

export const Parsing: Story = {
  render: () => (
    <Frame>
      <SkeletonPanel text={null} loading="parsing" onIngest={() => {}} />
    </Frame>
  ),
};
