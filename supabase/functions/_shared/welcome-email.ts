export interface WelcomeEmailInput {
  email: string;
  siteUrl: string;
  unsubscribeUrl: string;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const SUBJECT = "Ya estás en la lista";
const PREHEADER = "Te avisaremos en cuanto esté lista.";
const INTRO =
  "¡Gracias por apuntarte! Te escribiremos en cuanto PULSE esté disponible para iOS, Android y web, para que seas de los primeros en probarla.";
const TYPES_INTRO = "Tres formas de entrenar, cada una con su color:";
const NO_SPAM = "Solo te escribiremos para avisarte del lanzamiento. Nada de spam.";
const LEGAL_ENTITY = "[NOMBRE O RAZÓN SOCIAL] · [DIRECCIÓN]";

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const TRAINING_TYPES = [
  { name: "Intervalos", detail: "Con voz guía", from: "#2f5bff", to: "#1d3fcf" },
  { name: "Running", detail: "Con GPS", from: "#1b8a43", to: "#0f5f2f" },
  { name: "Fuerza", detail: "Series y pesos", from: "#c2570c", to: "#8a3a06" },
];

const HERO_BARS = [
  { height: 42, color: "#5b7cff" },
  { height: 96, color: "#5b7cff" },
  { height: 49, color: "#5b7cff" },
  { height: 105, color: "#5b7cff" },
  { height: 42, color: "#34c46a" },
  { height: 92, color: "#34c46a" },
  { height: 55, color: "#34c46a" },
  { height: 101, color: "#34c46a" },
  { height: 46, color: "#f2922f" },
  { height: 88, color: "#f2922f" },
  { height: 52, color: "#f2922f" },
  { height: 105, color: "#f2922f" },
];

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function logo(): string {
  const bar = (height: number, color: string) =>
    `<td valign="bottom" style="padding:0 2px 0 0;"><div style="width:5px;height:${height}px;background:${color};border-radius:3px;font-size:0;line-height:0;">&nbsp;</div></td>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
${bar(14, "#9aa3b2")}${bar(24, "#2f5bff")}${bar(14, "#9aa3b2")}
<td valign="bottom" style="padding:0 0 0 6px;font-family:${FONT};font-size:24px;line-height:24px;font-weight:800;color:#0b1220;letter-spacing:-0.5px;">pulse</td>
</tr></table>`;
}

function hero(): string {
  const bars = HERO_BARS.map(({ height, color }) =>
    `<td valign="bottom" width="8.33%" style="padding:0 3px;"><div style="height:${height}px;background:${color};border-radius:5px;font-size:0;line-height:0;">&nbsp;</div></td>`
  ).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0f1a;background-image:linear-gradient(90deg,#05080f,#111827);border-radius:16px;">
<tr><td style="padding:22px 19px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr style="height:106px;">${bars}</tr></table></td></tr>
</table>`;
}

function trainingTypes(): string {
  const cards = TRAINING_TYPES.map(({ name, detail, from, to }, index) => {
    const padding = index === 0 ? "0 5px 0 0" : index === TRAINING_TYPES.length - 1 ? "0 0 0 5px" : "0 5px";
    return `<td width="33.33%" valign="top" style="padding:${padding};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${from};background-image:linear-gradient(135deg,${from},${to});border-radius:14px;"><tr><td style="padding:14px;font-family:${FONT};">
<div style="font-size:17px;line-height:22px;font-weight:700;color:#ffffff;">${name}</div>
<div style="font-size:14px;line-height:20px;color:#e8ecf5;">${detail}</div>
</td></tr></table></td>`;
  }).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cards}</tr></table>`;
}

function renderHtml({ email, siteUrl, unsubscribeUrl }: WelcomeEmailInput): string {
  const privacyUrl = escapeHtml(new URL("/privacidad", siteUrl).href);
  const termsUrl = escapeHtml(new URL("/terminos", siteUrl).href);
  const unsubscribe = escapeHtml(unsubscribeUrl);
  const link = "color:#64748b;text-decoration:underline;";

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background:#eef1f5;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${PREHEADER}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef1f5;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td style="padding:0 0 16px;font-family:${FONT};font-size:13px;line-height:18px;color:#64748b;">${PREHEADER}</td></tr>
<tr><td style="background:#ffffff;border-radius:24px;padding:28px 40px 32px;">
${logo()}
<div style="height:20px;line-height:20px;font-size:0;">&nbsp;</div>
${hero()}
<h1 style="margin:28px 0 16px;font-family:${FONT};font-size:32px;line-height:38px;font-weight:800;color:#0b1220;letter-spacing:-0.5px;">${SUBJECT}</h1>
<p style="margin:0 0 16px;font-family:${FONT};font-size:17px;line-height:26px;color:#1e293b;">${INTRO}</p>
<p style="margin:0 0 16px;font-family:${FONT};font-size:17px;line-height:26px;color:#1e293b;">${TYPES_INTRO}</p>
${trainingTypes()}
<p style="margin:24px 0 0;font-family:${FONT};font-size:15px;line-height:22px;color:#64748b;">${NO_SPAM}</p>
<div style="margin:28px 0 20px;border-top:1px solid #e2e8f0;font-size:0;line-height:0;">&nbsp;</div>
<p style="margin:0;font-family:${FONT};font-size:14px;line-height:20px;color:#475569;">Un abrazo,<br>El equipo de PULSE</p>
</td></tr>
<tr><td align="center" style="padding:20px 8px 0;font-family:${FONT};font-size:13px;line-height:24px;color:#64748b;">
Recibes este correo porque te has apuntado a la lista de espera de PULSE con ${escapeHtml(email)}.<br>
${LEGAL_ENTITY}<br>
<a href="${privacyUrl}" style="${link}">Privacidad</a> · <a href="${termsUrl}" style="${link}">Términos</a> · <a href="${unsubscribe}" style="${link}">Darme de baja</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function renderText({ email, siteUrl, unsubscribeUrl }: WelcomeEmailInput): string {
  const types = TRAINING_TYPES.map(({ name, detail }) => `- ${name}: ${detail.toLowerCase()}`);
  return [
    SUBJECT,
    "",
    INTRO,
    "",
    TYPES_INTRO,
    ...types,
    "",
    NO_SPAM,
    "",
    "Un abrazo,",
    "El equipo de PULSE",
    "",
    "--",
    `Recibes este correo porque te has apuntado a la lista de espera de PULSE con ${email}.`,
    LEGAL_ENTITY,
    `Privacidad: ${new URL("/privacidad", siteUrl).href}`,
    `Términos: ${new URL("/terminos", siteUrl).href}`,
    `Darme de baja: ${unsubscribeUrl}`,
    "",
  ].join("\n");
}

export function renderWelcomeEmail(input: WelcomeEmailInput): RenderedEmail {
  return { subject: SUBJECT, html: renderHtml(input), text: renderText(input) };
}
