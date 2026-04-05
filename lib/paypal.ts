/**
 * lib/paypal.ts
 * Funciones utilitarias para integración con PayPal Sandbox.
 *
 * CONFIGURACIÓN PENDIENTE:
 * 1. Crear cuenta en https://developer.paypal.com
 * 2. Ir a Apps & Credentials → Sandbox → Create App
 * 3. Copiar Client ID y Client Secret
 * 4. Añadir al .env.local:
 *    PAYPAL_CLIENT_ID=AZu...
 *    PAYPAL_CLIENT_SECRET=EL...
 *    NEXT_PUBLIC_PAYPAL_CLIENT_ID=AZu...
 *
 * Las APIs de PayPal (/api/paypal/*) están listas para funcionar
 * en cuanto se añadan las credenciales arriba.
 */

const PAYPAL_BASE_URL =
  process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com"
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET

export const PAYPAL_CONFIGURED =
  Boolean(PAYPAL_CLIENT_ID) && Boolean(PAYPAL_CLIENT_SECRET)

/**
 * Obtiene un Bearer token de acceso de PayPal.
 * El token expira en ~9 horas; en producción cachear con Redis.
 */
export async function getPayPalAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error(
      "PayPal no configurado. Añade PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET al .env.local"
    )
  }

  const credentials = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
  ).toString("base64")

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`PayPal auth error: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

export interface PayPalOrderItem {
  name: string
  quantity: number
  unitAmount: number // en MXN
  description?: string
}

/**
 * Crea una orden de pago en PayPal Sandbox.
 * @returns El ID de la orden en PayPal (para confirmar en el frontend)
 */
export async function createPayPalOrder(
  items: PayPalOrderItem[],
  totalAmount: number,
  currency: string = "MXN",
  orderId: string, // ID interno de nuestra BD
  baseUrl: string  // URL base de la app (ej: https://alacranes.vercel.app)
): Promise<{ paypalOrderId: string; approveUrl: string }> {
  const accessToken = await getPayPalAccessToken()

  const orderPayload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: orderId,
        description: "Boletos - Alacranes de Durango",
        amount: {
          currency_code: currency,
          value: totalAmount.toFixed(2),
          breakdown: {
            item_total: {
              currency_code: currency,
              value: totalAmount.toFixed(2),
            },
          },
        },
        items: items.map((item) => ({
          name: item.name,
          quantity: String(item.quantity),
          description: item.description || "",
          unit_amount: {
            currency_code: currency,
            value: item.unitAmount.toFixed(2),
          },
        })),
      },
    ],
    application_context: {
      return_url: `${baseUrl}/carrito?paypal=success`,
      cancel_url: `${baseUrl}/carrito?paypal=cancel`,
      brand_name: "Alacranes de Durango",
      locale: "es-MX",
      landing_page: "LOGIN",
      user_action: "PAY_NOW",
    },
  }

  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": orderId, // Idempotencia nativa de PayPal
    },
    body: JSON.stringify(orderPayload),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`PayPal create order error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  const approveLink = data.links?.find(
    (l: { rel: string; href: string }) => l.rel === "approve"
  )

  return {
    paypalOrderId: data.id,
    approveUrl: approveLink?.href || "",
  }
}

/**
 * Captura el pago de una orden aprobada por el usuario en PayPal.
 * Llamar solo cuando el usuario aprueba en el popup de PayPal.
 */
export async function capturePayPalOrder(
  paypalOrderId: string
): Promise<{ status: string; captureId: string }> {
  const accessToken = await getPayPalAccessToken()

  const response = await fetch(
    `${PAYPAL_BASE_URL}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`PayPal capture error: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  const capture =
    data.purchase_units?.[0]?.payments?.captures?.[0]

  return {
    status: data.status, // COMPLETED, APPROVED, etc.
    captureId: capture?.id || "",
  }
}
