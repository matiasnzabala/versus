// Categorías a comparar. Cada una define, por tienda, la URL de la página
// de categoría (listado) de donde se sacan los links de producto.
// Si una tienda no tiene esa categoría, simplemente se omite la key.
const categories = [
  {
    id: "mesas-de-luz",
    label: "Mesas de luz",
    pages: {
      "Magnolias Deco": "https://www.magnoliasdeco.com.ar/muebles/mesas-de-luz/",
      "Chula Muebles": "https://chulamuebles.com/mesas-de-luz",
      "El Choike": "https://elchoikecasadeco.tiendanegocio.com/productos/mesasdeluz",
      "Manada Almacén": "https://manadaalmacen.empretienda.com.ar/mesas-de-luz",
      "Sol Palou Deco": "https://www.solpaloudeco.com.ar/mesas-de-luz/mesas-de-luz1/",
      "Buen Puerto": "https://buenpuertodesign.com.ar/muebles/mesas-ratonas-mesas-de-luz/",
      "Raíz Negra": "mesas-de-luz",
    },
  },
  {
    id: "comodas",
    label: "Cómodas",
    pages: {
      "Magnolias Deco": "https://www.magnoliasdeco.com.ar/muebles/comodas-y-aparadores/",
      "Chula Muebles": "https://chulamuebles.com/comodas",
      "El Choike": "https://elchoikecasadeco.tiendanegocio.com/productos/comodas",
      "Manada Almacén": "https://manadaalmacen.empretienda.com.ar/cajonera-comoda",
    },
  },
  {
    id: "escritorios",
    label: "Escritorios",
    pages: {
      "Magnolias Deco": "https://www.magnoliasdeco.com.ar/muebles/escritorios/",
      "Chula Muebles": "https://chulamuebles.com/escritorios",
      "El Choike": "https://elchoikecasadeco.tiendanegocio.com/productos/escritorios",
      "Manada Almacén": "https://manadaalmacen.empretienda.com.ar/escritorios",
      "Raíz Negra": "escritorios",
    },
  },
  {
    id: "mesas-ratonas",
    label: "Mesas ratonas",
    pages: {
      "Magnolias Deco": "https://www.magnoliasdeco.com.ar/muebles/mesas-ratonas/",
      "Chula Muebles": "https://chulamuebles.com/mesas-ratonas",
      "El Choike": "https://elchoikecasadeco.tiendanegocio.com/productos/mesasratonas",
      "Manada Almacén": "https://manadaalmacen.empretienda.com.ar/mesas-ratonas",
      "Raíz Negra": "mesas-ratonas",
    },
  },
  {
    id: "percheros",
    label: "Percheros",
    pages: {
      "Magnolias Deco": "https://www.magnoliasdeco.com.ar/muebles/percheros-y-repisas/",
      "Chula Muebles": "https://chulamuebles.com/percheros",
      "El Choike": "https://elchoikecasadeco.tiendanegocio.com/productos/percheros",
      "Manada Almacén": "https://manadaalmacen.empretienda.com.ar/percheros",
      "Buen Puerto": "https://buenpuertodesign.com.ar/muebles/escaleras-percheros/",
    },
  },
  {
    id: "rack-tv",
    label: "Racks TV",
    pages: {
      "Magnolias Deco": "https://www.magnoliasdeco.com.ar/muebles/racks-tv/",
      "Chula Muebles": "https://chulamuebles.com/rack-tv1",
      "El Choike": "https://elchoikecasadeco.tiendanegocio.com/productos/rackstv",
      "Manada Almacén": "https://manadaalmacen.empretienda.com.ar/rack-tv",
      "Buen Puerto": "https://buenpuertodesign.com.ar/muebles/racks/",
      "Raíz Negra": "muebles-tv",
    },
  },
  {
    id: "recibidores-consolas",
    label: "Recibidores y consolas",
    pages: {
      "Magnolias Deco": "https://www.magnoliasdeco.com.ar/muebles/recibidores-consolas/",
      "Chula Muebles": "https://chulamuebles.com/recibidores",
      "El Choike": "https://elchoikecasadeco.tiendanegocio.com/productos/recibidorconsolas",
      "Manada Almacén": "https://manadaalmacen.empretienda.com.ar/consolas",
      "Buen Puerto": "https://buenpuertodesign.com.ar/muebles/recibidores/",
      "Raíz Negra": "aparadores",
    },
  },
  {
    id: "sillones",
    label: "Sillones",
    pages: {
      "Magnolias Deco": "https://www.magnoliasdeco.com.ar/muebles/sillones/",
      "Chula Muebles": "https://chulamuebles.com/sillones",
      "Sol Palou Deco": "https://www.solpaloudeco.com.ar/sillas/sillones2/",
      "Raíz Negra": "sillon",
    },
  },
  {
    id: "mesas-de-comedor",
    label: "Mesas de comedor",
    pages: {
      "Magnolias Deco": "https://www.magnoliasdeco.com.ar/muebles/mesas-de-comedor/",
      "Chula Muebles": "https://chulamuebles.com/mesas-de-comedor",
      "El Choike": "https://elchoikecasadeco.tiendanegocio.com/productos/mesasdecomedor",
      "Buen Puerto": "https://buenpuertodesign.com.ar/muebles/mesas-de-comedor/",
    },
  },
  {
    id: "bibliotecas",
    label: "Bibliotecas",
    pages: {
      "Magnolias Deco": "https://www.magnoliasdeco.com.ar/muebles/bibliotecas/",
      "Chula Muebles": "https://chulamuebles.com/bibliotecas",
      "Raíz Negra": "bibliotecas",
    },
  },
  {
    id: "zapateros",
    label: "Zapateros",
    pages: {
      "Magnolias Deco": "https://www.magnoliasdeco.com.ar/muebles/zapateros/",
      "Chula Muebles": "https://chulamuebles.com/zapateros",
    },
  },
  {
    id: "espejos",
    label: "Espejos",
    pages: {
      "Chula Muebles": "https://chulamuebles.com/espejos",
      "Manada Almacén": "https://manadaalmacen.empretienda.com.ar/espejos",
      "Raíz Negra": "espejos",
    },
  },
];

const sites = [
  {
    store: "Magnolias Deco",
    platform: "tiendanube",
    productUrlPattern: "/productos/",
    // Descuentos según método de pago (tomados del banner de la tienda).
    discounts: { efectivo: 0.20, transferencia: 0.05, tarjeta: 0 },
  },
  {
    store: "Chula Muebles",
    platform: "tiendanube",
    productUrlPattern: "/productos/",
    // Chula no acepta tarjeta, por eso no tiene entrada "tarjeta".
    discounts: { efectivo: 0.20, transferencia: 0 },
  },
  {
    store: "El Choike",
    platform: "tiendanegocio",
    productBaseUrl: "https://elchoikecasadeco.tiendanegocio.com/producto/",
    // El descuento real viene por producto (discount_rate), pero en todos
    // los casos vistos es 20% efectivo. Transferencia/tarjeta = precio de lista.
    discounts: { efectivo: 0.20, transferencia: 0, tarjeta: 0 },
  },
  {
    store: "Manada Almacén",
    platform: "empretienda",
    // El precio publicado YA es el de efectivo. Tarjeta/débito/transferencia
    // suman un 15% (recargo, no descuento).
    discounts: { efectivo: 0, transferencia: -0.15, tarjeta: -0.15 },
  },
  {
    store: "Sol Palou Deco",
    platform: "tiendanube",
    discounts: { efectivo: 0, transferencia: 0.10, tarjeta: 0 },
  },
  {
    store: "Buen Puerto",
    platform: "tiendanube",
    discounts: { efectivo: 0.20, transferencia: 0.10, tarjeta: 0 },
  },
  {
    store: "Raíz Negra",
    platform: "shopify",
    domain: "https://www.raiznegra.com",
    // No menciona descuentos por método de pago, mismo precio para todos.
    discounts: { efectivo: 0, transferencia: 0, tarjeta: 0 },
  },
];

module.exports = { sites, categories };
