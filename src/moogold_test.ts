
import axios from "axios";
import crypto from "crypto";

const PARTNER_ID = process.env.PARTNER_ID!;
const SECRET_KEY = process.env.SECRET_KEY!;


const path = "product/list_product";

const payload = {
  path: "product/list_product",
  category_id: 50
};

const timestamp = Math.floor(Date.now() / 1000);

const stringToSign = JSON.stringify(payload) + timestamp + path;

const signature = crypto
  .createHmac("sha256", SECRET_KEY)
  .update(stringToSign)
  .digest("hex");

const authBasic = Buffer.from(`${PARTNER_ID}:${SECRET_KEY}`).toString("base64");


(async () => {
  try {
    console.log("📡 Enviando solicitud a MooGold...");

    const response = await axios.post(
      "https://moogold.com/wp-json/v1/api/product/list_product",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "timestamp": timestamp.toString(),
          "auth": signature,
          "Authorization": `Basic ${authBasic}`
        }
      }
    );

    console.log("✅ Respuesta:");
    console.log(response.data);

  } catch (error: any) {
    console.error("❌ Error en la solicitud:");
    console.error(error?.response?.data || error.message);
  }
})();
