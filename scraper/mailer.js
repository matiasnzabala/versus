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

  const matchedCount = entries.filter((e) => e.matchedFor?.length).length;

  const rows = entries
    .map((e) => {
      const isDrop = e.current < e.previous;
      const arrow = isDrop ? "▼" : "▲";
      let block = `${arrow} ${e.name} (${e.store}): $${e.previous.toLocaleString("es-AR")} → $${e.current.toLocaleString("es-AR")}\n${e.url}`;
      if (e.matchedFor?.length) {
        const mine = e.matchedFor
          .map((m) => `  • ${m.name}: $${m.price.toLocaleString("es-AR")} (${m.url})`)
          .join("\n");
        block += `\n⚠ Afecta tu producto vinculado:\n${mine}`;
      }
      return block;
    })
    .join("\n\n");

  const subject = matchedCount > 0
    ? `${matchedCount} cambio${matchedCount !== 1 ? "s" : ""} en equivalentes que vinculaste`
    : `${entries.length} cambio${entries.length !== 1 ? "s" : ""} de precio en Magnolias Deco`;

  await transporter.sendMail({
    from: `Versus <${GMAIL_USER}>`,
    to: ALERT_EMAIL_TO,
    subject,
    text: rows,
  });

  console.log(`  Email de alerta enviado (${entries.length} cambios, ${matchedCount} de equivalentes vinculados).`);
}

module.exports = { sendPriceAlertEmail };
