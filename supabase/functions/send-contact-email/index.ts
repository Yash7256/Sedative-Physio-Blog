import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function base64Encode(str: string): string {
  return btoa(str)
}

function formatEmail(from: string, to: string, replyTo: string, subject: string, html: string): string {
  const boundary = `----=_Part_${Date.now()}`
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Reply-To: ${replyTo}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    '',
    'Please view this email in an HTML-enabled browser.',
    '',
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    '',
    html,
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n')
  return headers
}

async function sendEmail(hostname: string, port: number, username: string, password: string, from: string, to: string, replyTo: string, subject: string, html: string): Promise<void> {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const tlsConn = await Deno.connectTls({
    hostname,
    port,
  })

  const reader = tlsConn
  const writer = tlsConn

  async function sendCommand(cmd: string): Promise<string> {
    await writer.write(encoder.encode(cmd + '\r\n'))
    const buf = new Uint8Array(1024)
    const n = await reader.read(buf)
    return decoder.decode(buf.slice(0, n))
  }

  async function sendData(content: string): Promise<void> {
    const data = encoder.encode(content)
    await writer.write(data)
    await writer.write(encoder.encode('\r\n.\r\n'))
    const buf = new Uint8Array(1024)
    const n = await reader.read(buf)
    const response = decoder.decode(buf.slice(0, n))
    if (!response.startsWith('250')) {
      throw new Error(`DATA failed: ${response}`)
    }
  }

  // Read initial greeting
  const greeting = new Uint8Array(1024)
  await reader.read(greeting)
  
  // Send EHLO
  const ehlo = await sendCommand(`EHLO ${hostname}`)
  if (!ehlo.includes('250')) {
    throw new Error(`EHLO failed: ${ehlo}`)
  }

  // Check if AUTH LOGIN is supported
  const authResponse = await sendCommand('AUTH LOGIN')
  if (!authResponse.startsWith('334')) {
    throw new Error(`AUTH LOGIN failed: ${authResponse}`)
  }

  await sendCommand(base64Encode(username))
  const passResp = await sendCommand(base64Encode(password))
  if (!passResp.startsWith('235')) {
    throw new Error(`Auth failed: ${passResp}`)
  }

  await sendCommand(`MAIL FROM:<${from}>`)
  await sendCommand(`RCPT TO:<${to}>`)
  await sendCommand('DATA')
  
  const emailContent = formatEmail(from, to, replyTo, subject, html)
  await sendData(emailContent)

  await sendCommand('QUIT')
  tlsConn.close()
}

Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { name, email, message } = await req.json()

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return new Response(
        JSON.stringify({ error: 'All fields are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const html = `
      <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:28px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="color:#1e293b;margin-bottom:20px;">
          New Contact Form Message
        </h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;width:80px;">Name</td>
            <td style="padding:8px 0;color:#1e293b;font-weight:600;">${name}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;">Email</td>
            <td style="padding:8px 0;color:#1e293b;">${email}</td>
          </tr>
        </table>
        <div style="margin-top:20px;">
          <p style="color:#64748b;font-size:13px;margin-bottom:8px;">Message</p>
          <div style="background:#f8fafc;padding:16px;border-radius:8px;color:#1e293b;line-height:1.6;">
            ${message.replace(/\n/g, '<br/>')}
          </div>
        </div>
        <p style="margin-top:24px;color:#94a3b8;font-size:11px;">
          Sent on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
          · Sedative Physio Contact Form
        </p>
      </div>
    `

    await sendEmail(
      'smtp.gmail.com',
      465,
      Deno.env.get('GMAIL_USER')!,
      Deno.env.get('GMAIL_PASS')!,
      Deno.env.get('GMAIL_USER')!,
      'sedativephysio@gmail.com',
      email,
      `New Message from ${name} — Sedative Physio`,
      html
    )

    return new Response(
      JSON.stringify({ success: true, message: 'Message sent!' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Error:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: `Failed to send message: ${errorMessage}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
