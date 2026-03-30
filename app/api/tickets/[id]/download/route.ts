/**
 * app/api/tickets/[id]/download/route.ts
 * Descarga de boleto individual como HTML imprimible / PDF.
 * GET /api/tickets/:id/download
 *
 * Usa supabaseAdmin para bypasear RLS en matches (can be unpublished).
 * Genera el QR como Data URL en el servidor a partir del payload corto.
 */
import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { generateQRCode } from "@/lib/qr"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar autenticación con el cliente del usuario
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Usar supabaseAdmin para bypasear RLS en los joins (matches puede no estar publicado)
    const { data: ticket, error } = await supabaseAdmin
      .from("tickets")
      .select(`
        id, price, status, qr_code, created_at,
        order:orders (id, created_at, total_amount),
        match:matches (
          match_date, match_time,
          home_team:teams!matches_home_team_id_fkey (name),
          away_team:teams!matches_away_team_id_fkey (name),
          venue:venues (name, address)
        ),
        zone:zones (name, zone_key, gate)
      `)
      .eq("id", id)
      .eq("user_id", user.id)  // seguimos filtrando por user_id para seguridad
      .single()

    if (error || !ticket) {
      console.error("Download ticket fetch error:", error)
      return NextResponse.json({ error: "Boleto no encontrado" }, { status: 404 })
    }

    if (ticket.status === "cancelado") {
      return NextResponse.json({ error: "Boleto cancelado" }, { status: 400 })
    }

    const match = ticket.match as unknown as {
      match_date: string; match_time: string;
      home_team: { name: string }; away_team: { name: string };
      venue: { name: string; address?: string }
    } | null

    const zone = ticket.zone as unknown as { name: string; zone_key: string; gate?: string } | null
    const order = ticket.order as unknown as { id: string; created_at: string; total_amount: number } | null

    // Generar el QR como Data URL — qr_code tiene payload corto TKT:...|MTH:...|ZN:...|USR:...
    let qrDataUrl = ""
    try {
      qrDataUrl = await generateQRCode(ticket.qr_code || ticket.id)
    } catch (qrErr) {
      console.error("QR generation error:", qrErr)
      // Continuar sin QR si falla
    }

    // Formatear fecha del evento de forma segura
    let matchDateFormatted = "Fecha por confirmar"
    let matchDateShort = ""
    if (match?.match_date) {
      const d = new Date(match.match_date + "T00:00:00")
      if (!isNaN(d.getTime())) {
        matchDateFormatted = d.toLocaleDateString("es-MX", {
          weekday: "long", day: "numeric", month: "long", year: "numeric"
        })
        matchDateShort = d.toLocaleDateString("es-MX", {
          day: "2-digit", month: "2-digit", year: "numeric"
        })
      }
    }

    const matchTime = match?.match_time?.slice(0, 5) || "20:00"
    const homeTeam = match?.home_team?.name || "Alacranes de Durango"
    const awayTeam = match?.away_team?.name || "Visitante"
    const venueName = match?.venue?.name || "Estadio Zarco"
    const venueAddress = match?.venue?.address || ""
    const zoneName = zone?.name || "General"
    const zoneGate = zone?.gate || "A"
    const zoneSection = zone?.zone_key?.split("-").pop()?.toUpperCase() || "GRAL"
    const ticketShortId = ticket.id.slice(0, 8).toUpperCase()
    const orderShortId = (order?.id || "").slice(0, 8).toUpperCase()
    const orderDate = order?.created_at
      ? new Date(order.created_at).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })
      : ""
    const ticketTitle = `Boleto #${ticketShortId} — ${homeTeam} vs ${awayTeam}${matchDateShort ? " (" + matchDateShort + ")" : ""}`

    const statusLabels: Record<string, string> = {
      activo: "VÁLIDO",
      usado: "USADO",
      expirado: "EXPIRADO",
      cancelado: "CANCELADO",
    }
    const statusColors: Record<string, string> = {
      activo: "#00C853",
      usado: "#9E9E9E",
      expirado: "#F44336",
      cancelado: "#F44336",
    }
    const ticketStatus = ticket.status as string
    const statusLabel = statusLabels[ticketStatus] || "VÁLIDO"
    const statusColor = statusColors[ticketStatus] || "#00C853"

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ticketTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
    *, *::before, *::after {
      margin: 0; padding: 0; box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: #E8F5E9;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 24px 16px;
      gap: 16px;
    }
    .ticket {
      width: 100%;
      max-width: 440px;
      background: white;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 24px 64px rgba(0,77,64,0.18), 0 4px 16px rgba(0,0,0,0.06);
    }
    .ticket-header {
      background: linear-gradient(145deg, #004D40 0%, #00695C 60%, #00897B 100%) !important;
      padding: 28px 28px 40px;
      color: white !important;
    }
    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .header-badge {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.8) !important;
      border: 1px solid rgba(255,255,255,0.4);
      padding: 4px 10px;
      border-radius: 99px;
    }
    .match-title { font-size: 26px; font-weight: 900; letter-spacing: -0.5px; line-height: 1.1; color: white !important; }
    .match-vs { font-size: 11px; font-weight: 600; letter-spacing: 3px; color: rgba(255,255,255,0.6) !important; margin: 6px 0 4px; text-transform: uppercase; }
    .match-away { font-size: 17px; font-weight: 600; color: rgba(255,255,255,0.9) !important; }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      border-radius: 99px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 2px;
      color: white !important;
      background: ${statusColor} !important;
      margin-top: 14px;
    }
    .status-dot { width: 6px; height: 6px; background: white !important; border-radius: 50%; }
    .ticket-cut {
      position: relative;
      height: 1px;
      background: repeating-linear-gradient(to right, #E0E0E0 0, #E0E0E0 8px, transparent 8px, transparent 14px);
      margin: 0 -1px;
    }
    .ticket-cut::before, .ticket-cut::after {
      content: '';
      position: absolute;
      top: -14px;
      width: 28px; height: 28px;
      background: #E8F5E9 !important;
      border-radius: 50%;
    }
    .ticket-cut::before { left: -14px; }
    .ticket-cut::after { right: -14px; }
    .ticket-body { padding: 28px; background: white !important; }
    .qr-section { display: flex; flex-direction: column; align-items: center; margin-bottom: 24px; }
    .qr-label { font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #90A4AE !important; margin-bottom: 12px; }
    .qr-wrapper { padding: 12px; background: white !important; border: 2px solid #E0F2F1; border-radius: 16px; display: inline-block; }
    .qr-wrapper img { width: 160px; height: 160px; display: block; border-radius: 8px; }
    .qr-placeholder { width: 160px; height: 160px; display: flex; align-items: center; justify-content: center; background: #f5f5f5 !important; border-radius: 8px; font-size: 11px; color: #9E9E9E; text-align: center; padding: 16px; }
    .ticket-id-label { font-size: 10px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #90A4AE !important; margin-top: 14px; margin-bottom: 2px; text-align: center; display: block; }
    .ticket-id-value { font-size: 20px; font-weight: 900; color: #004D40 !important; font-family: monospace; letter-spacing: 3px; display: block; text-align: center; }
    .divider { border: 0; border-top: 2px dashed #ECEFF1; margin: 20px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .info-item label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #00BFA5 !important; font-weight: 700; margin-bottom: 4px; }
    .info-item p { font-size: 13px; font-weight: 700; color: #1A1A1A !important; line-height: 1.3; }
    .info-item.right { text-align: right; }
    .zone-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; background: #F5FBF9 !important; border-radius: 14px; padding: 14px; }
    .zone-item { text-align: center; }
    .zone-item label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #78909C !important; font-weight: 700; margin-bottom: 4px; }
    .zone-item p { font-size: 15px; font-weight: 900; color: #004D40 !important; }
    .venue-row { margin-top: 16px; display: flex; align-items: center; gap: 8px; color: #546E7A !important; }
    .venue-row span { font-size: 12px; font-weight: 600; }
    .ticket-footer { background: #F5F5F5 !important; border-top: 1px solid #EEEEEE; padding: 16px 28px; display: flex; justify-content: space-between; align-items: center; }
    .footer-meta { font-size: 11px; color: #9E9E9E !important; line-height: 1.8; }
    .footer-price { font-size: 22px; font-weight: 900; color: #004D40 !important; }
    .footer-price span { font-size: 12px; font-weight: 600; color: #78909C !important; }
    .actions { display: flex; gap: 10px; width: 100%; max-width: 440px; }
    .btn { flex: 1; padding: 14px; border: none; border-radius: 14px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Inter', sans-serif; }
    .btn-primary { background: #004D40 !important; color: white !important; }
    .btn-secondary { background: white !important; color: #004D40 !important; border: 2px solid #004D40; }
    @media print {
      @page { margin: 0; size: A4 portrait; }
      body { background: #E8F5E9 !important; padding: 20px; min-height: unset; }
      .actions { display: none; }
      .ticket { box-shadow: none; border-radius: 24px; max-width: 420px; margin: 0 auto; }
      .ticket-header { background: linear-gradient(145deg, #004D40 0%, #00695C 60%, #00897B 100%) !important; }
      .ticket-cut::before, .ticket-cut::after { background: #E8F5E9 !important; }
      .zone-grid { background: #F5FBF9 !important; }
      .ticket-footer { background: #F5F5F5 !important; }
      .ticket-body { background: white !important; }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="ticket-header">
      <div class="header-row">
        <div class="header-badge">Boleto Oficial</div>
        <div class="header-badge">Liga TDP</div>
      </div>
      <div class="match-title">${homeTeam}</div>
      <div class="match-vs">vs</div>
      <div class="match-away">${awayTeam}</div>
      <div class="status-badge">
        <span class="status-dot"></span>
        ${statusLabel}
      </div>
    </div>

    <div class="ticket-cut"></div>

    <div class="ticket-body">
      <div class="qr-section">
        <p class="qr-label">Escanea en la entrada</p>
        <div class="qr-wrapper">
          ${qrDataUrl
        ? `<img src="${qrDataUrl}" alt="Código QR del boleto ${ticketShortId}" />`
        : `<div class="qr-placeholder">QR no disponible</div>`
      }
        </div>
        <p class="ticket-id-label">ID del Boleto</p>
        <p class="ticket-id-value">#${ticketShortId}</p>
      </div>

      <hr class="divider" />

      <div class="info-grid">
        <div class="info-item">
          <label>Fecha del Evento</label>
          <p>${matchDateFormatted}</p>
        </div>
        <div class="info-item right">
          <label>Hora Local</label>
          <p>${matchTime} HRS</p>
        </div>
      </div>

      <div class="zone-grid">
        <div class="zone-item">
          <label>Zona</label>
          <p>${zoneName}</p>
        </div>
        <div class="zone-item">
          <label>Puerta</label>
          <p>${zoneGate}</p>
        </div>
        <div class="zone-item">
          <label>Sección</label>
          <p>${zoneSection}</p>
        </div>
      </div>

      <div class="venue-row">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
        <span>${venueName}${venueAddress ? " — " + venueAddress : ""}</span>
      </div>
    </div>

    <div class="ticket-footer">
      <div class="footer-meta">
        <div>Orden #${orderShortId}</div>
        ${orderDate ? `<div>Compra: ${orderDate}</div>` : ""}
      </div>
      <div class="footer-price">$${Number(ticket.price).toFixed(2)} <span>MXN</span></div>
    </div>
  </div>

  <div class="actions">
    <button class="btn btn-primary" onclick="window.print()"> Imprimir / Guardar PDF</button>
    <button class="btn btn-secondary" onclick="window.close()">✕ Cerrar</button>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="boleto-${ticketShortId}.html"`,
        "Cache-Control": "private, no-cache",
      },
    })
  } catch (err) {
    console.error("Ticket download error:", err)
    return NextResponse.json(
      { error: "Error al generar el boleto" },
      { status: 500 }
    )
  }
}
