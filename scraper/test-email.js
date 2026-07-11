const { sendPriceAlertEmail } = require("./mailer");

sendPriceAlertEmail([
  {
    name: "Producto de prueba",
    store: "Magnolias Deco",
    previous: 100000,
    current: 89990,
    url: "https://www.magnoliasdeco.com.ar/",
    matchedFor: [
      { name: "Mesa de Luz Alba (El Choike)", price: 85000, url: "https://elchoikecasadeco.tiendanegocio.com/" },
    ],
  },
]).catch((e) => {
  console.error("Error enviando email de prueba:", e);
  process.exit(1);
});
