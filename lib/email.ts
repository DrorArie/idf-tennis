import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return
  try {
    await transporter.sendMail({
      from: `"IDF Tennis" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
    })
  } catch (err) {
    console.error('Email send failed:', err)
  }
}
