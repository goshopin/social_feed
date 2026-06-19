import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email is required' })

  // Generate a secure reset link via Supabase admin (server-side only)
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: process.env.APP_URL || 'https://socialfeed-seven.vercel.app',
    },
  })

  if (error) return res.status(400).json({ error: error.message })

  const resetLink = data.properties.action_link

  try {
    await transporter.sendMail({
      from: `"SocialFeed" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Reset your SocialFeed password',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
            <div style="background:#6366f1;border-radius:8px;width:32px;height:32px;display:inline-block"></div>
            <span style="font-size:20px;font-weight:700">SocialFeed</span>
          </div>
          <h2 style="font-size:22px;margin:0 0 8px">Reset your password</h2>
          <p style="color:#64748b;margin:0 0 24px">
            We received a request to reset your password. Click the button below — this link expires in 1 hour.
          </p>
          <a href="${resetLink}"
             style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px">
            Reset Password
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:32px">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    })

    res.json({ success: true })
  } catch (sendError) {
    console.error('[send-reset-email] SMTP error:', sendError)
    res.status(500).json({ error: 'Failed to send email. Please try again.' })
  }
}
