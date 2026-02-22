const crypto = require("crypto");

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function verifyHmac(rawBody, hmacHeader, secret) {
  if (!secret || !hmacHeader) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(hmacHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function getAdminAccessToken() {
  const shop = process.env.SHOPIFY_STORE_DOMAIN;
  const client_id = process.env.SHOPIFY_CLIENT_ID;
  const client_secret = process.env.SHOPIFY_CLIENT_SECRET;

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id,
      client_secret,
      scope: "read_orders,write_orders,read_products,write_products",
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error("No pude obtener access_token: " + JSON.stringify(json));
  }
  return json.access_token;
}

async function shopifyGraphQL(accessToken, query, variables = {}) {
  const shop = process.env.SHOPIFY_STORE_DOMAIN;
  const version = process.env.SHOPIFY_ADMIN_API_VERSION || "2024-01";

  const res = await fetch(`https://${shop}/admin/api/${version}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json));
  return json.data;
}

function propsToMap(props) {
  if (Array.isArray(props)) {
    const m = {};
    for (const p of props) if (p?.name) m[p.name] = p.value;
    return m;
  }
  if (props && typeof props === "object") return props;
  return {};
}

function countDiamondsFromOrder(order) {
  const items = order?.line_items || [];
  let count = 0;

  for (const it of items) {
    const props = propsToMap(it.properties);
    const isRifa =
      Object.prototype.hasOwnProperty.call(props, "Diamante") ||
      Object.prototype.hasOwnProperty.call(props, "Número") ||
      Object.prototype.hasOwnProperty.call(props, "Numero");

    if (isRifa) count += Number(it.quantity || 0);
  }
  return count;
}

module.exports = async (req, res) => {
  try {
    // Candado extra por query param (evita llamadas externas)
    const key = req.query?.key;
    if (!key || key !== process.env.WEBHOOK_KEY) {
      return res.status(401).send("Invalid key");
    }

    if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

    const rawBody = await readRawBody(req);

    // Validar HMAC Shopify (intentamos con 2 secretos por compatibilidad)
    const hmac = req.headers["x-shopify-hmac-sha256"];
    const secretA = process.env.SHOPIFY_WEBHOOK_SECRET;   // si ya tienes uno viejo
    const secretB = process.env.SHOPIFY_CLIENT_SECRET;    // secreto de esta app

    const ok = verifyHmac(rawBody, hmac, secretA) || verifyHmac(rawBody, hmac, secretB);
    if (!ok) return res.status(401).send("Invalid HMAC");

    const order = JSON.parse(rawBody);
    const diamonds = countDiamondsFromOrder(order);
    if (diamonds <= 0) return res.status(200).send("No diamonds");

    const orderGid =
      order.admin_graphql_api_id || (order.id ? `gid://shopify/Order/${order.id}` : null);
    if (!orderGid) return res.status(200).send("No order id");

    const accessToken = await getAdminAccessToken();

    // Evitar doble conteo
    const checkCounted = `
      query($id: ID!) {
        node(id: $id) {
          ... on Order {
            metafield(namespace: "rifa", key: "counted") { value }
          }
        }
      }
    `;
    const countedData = await shopifyGraphQL(accessToken, checkCounted, { id: orderGid });
    const already = countedData?.node?.metafield?.value === "true";
    if (already) return res.status(200).send("Already counted");

    // Buscar producto contador por handle
    const handle = process.env.COUNTER_PRODUCT_HANDLE;
    const getProduct = `
      query($h: String!) {
        productByHandle(handle: $h) {
          id
          metafield(namespace: "rifa", key: "sold_diamonds") { value }
        }
      }
    `;
    const productData = await shopifyGraphQL(accessToken, getProduct, { h: handle });
    const product = productData?.productByHandle;
    if (!product?.id) return res.status(500).send("No encuentro el producto contador");

    const current = Number(product.metafield?.value || 0);
    const totalMax = 10000;
    const next = Math.min(totalMax, Math.max(0, current + diamonds));

    // Guardar contador + marcar orden como contada
    const set = `
      mutation($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { field message }
        }
      }
    `;

    const result = await shopifyGraphQL(accessToken, set, {
      metafields: [
        {
          ownerId: product.id,
          namespace: "rifa",
          key: "sold_diamonds",
          type: "number_integer",
          value: String(next),
        },
        {
          ownerId: orderGid,
          namespace: "rifa",
          key: "counted",
          type: "boolean",
          value: "true",
        },
      ],
    });

    const errs = result?.metafieldsSet?.userErrors || [];
    if (errs.length) return res.status(500).send(JSON.stringify(errs));

    return res.status(200).send(`OK +${diamonds} => ${next}`);
  } catch (e) {
    return res.status(500).send("Error: " + (e.message || "unknown"));
  }
};
