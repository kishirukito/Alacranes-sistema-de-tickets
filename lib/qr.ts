/**
 * lib/qr.ts
 * Generación de códigos QR para los boletos.
 *
 * Usa la librería 'qrcode' para generar Data URLs en formato PNG base64.
 * El QR generado se guarda en la columna qr_code de la tabla tickets.
 *
 * Instalación requerida (ya incluida si corres `npm install`):
 *   npm install qrcode
 *   npm install --save-dev @types/qrcode
 */
import QRCode from "qrcode"

/**
 * Genera un código QR como Data URL (base64 PNG).
 * Listo para usarse en <img src={dataUrl} /> o para descarga.
 *
 * @param data - El contenido del QR (ej: "TKT:uuid|MTH:matchId|ZN:zoneId|USR:userId")
 * @returns Data URL como string: "data:image/png;base64,..."
 */
export async function generateQRCode(data: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(data, {
      errorCorrectionLevel: "H",   // Alta tolerancia a errores
      type: "image/png",
      margin: 2,
      width: 400,
      color: {
        dark: "#004D40",   // Color del QR (verde oscuro Alacranes)
        light: "#FFFFFF",  // Fondo blanco
      },
    })
    return dataUrl
  } catch (err) {
    console.error("QR generation error:", err)
    // Fallback: devolver SVG básico si falla la librería
    return `data:image/svg+xml;base64,${Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <rect width="200" height="200" fill="white"/>
        <text x="100" y="100" text-anchor="middle" font-size="12" fill="#004D40">QR: ${data.slice(0, 20)}</text>
      </svg>`
    ).toString("base64")}`
  }
}

/**
 * Valida el contenido de un QR de boleto.
 * Usado en taquilla para verificar autenticidad.
 *
 * @param qrPayload - El string leído del QR
 * @returns Objeto con los datos del boleto o null si no es válido
 */
export function parseTicketQR(qrPayload: string): {
  ticketId: string
  matchId: string
  zoneId: string
  userId: string
} | null {
  try {
    const parts = qrPayload.split("|")
    if (parts.length !== 4) return null

    const ticketId = parts[0].replace("TKT:", "")
    const matchId = parts[1].replace("MTH:", "")
    const zoneId = parts[2].replace("ZN:", "")
    const userId = parts[3].replace("USR:", "")

    if (!ticketId || !matchId || !zoneId || !userId) return null

    return { ticketId, matchId, zoneId, userId }
  } catch {
    return null
  }
}
