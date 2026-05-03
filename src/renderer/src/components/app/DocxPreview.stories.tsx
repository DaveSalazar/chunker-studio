import type { Meta, StoryObj } from "@storybook/react-vite";
import { sanitizeDocxHtml } from "@/lib/sanitizeDocxHtml";

/**
 * DocxPreview's IPC bridge isn't available in Storybook, so the
 * stories render pre-baked sanitized HTML through the same scoped
 * `.docx-preview` styles the live component uses. The stories exist
 * to lock in the typography (headings, lists, tables, blockquotes)
 * for visual review without spinning up Electron.
 */
function PreviewFrame({ rawHtml }: { rawHtml: string }) {
  const safe = sanitizeDocxHtml(rawHtml);
  return (
    <div className="h-[640px] w-[820px] overflow-hidden rounded-md border border-border bg-background">
      <div className="h-full overflow-auto">
        <div
          className="docx-preview mx-auto max-w-3xl px-6 py-8 text-[13.5px] leading-relaxed text-foreground/90"
          dangerouslySetInnerHTML={{ __html: safe }}
        />
      </div>
    </div>
  );
}

const meta: Meta<typeof PreviewFrame> = {
  title: "App/DocxPreview",
  component: PreviewFrame,
};
export default meta;

type Story = StoryObj<typeof PreviewFrame>;

const MINUTA_HTML = `
  <h1>MINUTA ACLARATORIA Y RECTIFICATORIA</h1>
  <p>En la ciudad de <strong>Quito</strong>, a los <em>__</em> días del mes de
  <em>__</em> de 20<em>__</em>, comparecen ante el suscrito Notario:</p>
  <h2>Comparecientes</h2>
  <ol>
    <li>El señor <strong>NOMBRE COMPLETO</strong>, ecuatoriano, mayor de edad,
        portador de la cédula de identidad No. <strong>NÚMERO DE CÉDULA</strong>,
        con domicilio en <strong>DIRECCIÓN</strong>.</li>
    <li>La señora <strong>NOMBRE COMPLETO</strong>, ecuatoriana, mayor de edad,
        portadora de la cédula de identidad No. <strong>NÚMERO DE CÉDULA</strong>.</li>
  </ol>
  <h2>Cláusulas</h2>
  <h3>PRIMERA: Antecedentes</h3>
  <p>Mediante escritura pública número <em>____</em> celebrada ante el suscrito
  Notario, los comparecientes celebraron un contrato de compraventa.</p>
  <h3>SEGUNDA: Aclaración</h3>
  <p>Por la presente minuta se aclara y rectifica la mencionada escritura en
  los siguientes términos:</p>
  <table>
    <thead>
      <tr><th>Cláusula</th><th>Decía</th><th>Debe decir</th></tr>
    </thead>
    <tbody>
      <tr><td>Tercera</td><td>__</td><td>__</td></tr>
      <tr><td>Quinta</td><td>__</td><td>__</td></tr>
    </tbody>
  </table>
  <h3>TERCERA: Aceptación</h3>
  <p>Las partes aceptan la presente aclaración en todos sus términos y se
  comprometen a su fiel cumplimiento.</p>
  <blockquote>
    Esta minuta se otorga ante el Notario que firma al pie, quien la autoriza
    e incorpora al protocolo de su despacho.
  </blockquote>
`;

const HOSTILE_HTML = `
  <h1>Stress test — sanitizer</h1>
  <p onclick="boom()">Inline event handlers should be stripped.</p>
  <a href="javascript:alert(1)">javascript: href stripped, text kept</a>
  <p style="color:red">Inline style stripped.</p>
  <script>alert(1)</script>
  <p>Visible body still renders cleanly.</p>
`;

export const RealisticMinuta: Story = {
  render: () => <PreviewFrame rawHtml={MINUTA_HTML} />,
};

export const HostileInputSurvives: Story = {
  render: () => <PreviewFrame rawHtml={HOSTILE_HTML} />,
};
