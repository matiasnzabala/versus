const nodemailer = require("nodemailer");

async function sendPriceAlertEmail(entries) {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, ALERT_EMAIL_TO } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !ALERT_EMAIL_TO) {
    console.log("  (alerta de email omitida: faltan GMAIL_USER / GMAIL_APP_PASSWORD / ALERT_EMAIL_TO)");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });

  const rows = entries
    .map((e) => {
      const isDrop = e.current < e.previous;
      const arrow = isDrop ? "▼" : "▲";
      return `${arrow} ${e.name}: $${e.previous.toLocaleString("es-AR")} → $${e.current.toLocaleString("es-AR")}\n${e.url}`;
    })
    .join("\n\n");

  await transporter.sendMail({
    from: `Versus <${GMAIL_USER}>`,
    to: ALERT_EMAIL_TO,
    subject: `Magnolias Deco: ${entries.length} cambio${entries.length !== 1 ? "s" : ""} de precio`,
    text: rows,
  });

  console.log(`  Email de alerta enviado (${entries.length} cambios de Magnolias Deco).`);
}

module.exports = { sendPriceAlertEmail };
