import { Resend } from 'resend';

export async function sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is missing.');
  }

  const resend = new Resend(apiKey);
  
  // Use a configured sender if available, otherwise default to Resend's onboarding address
  const sender = process.env.RESEND_FROM_EMAIL || 'Tiki Finance <onboarding@resend.dev>';
  
  const verificationUrl = `https://tiki-tiki-financial.onrender.com/api/auth/verify-email?token=${verificationToken}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #0F172A;">SPR App</h1>
      <h2 style="color: #334155;">Student Pecuniary Routine</h2>
      <p style="font-size: 16px; color: #475569;">
        Thank you for registering! Please verify your email address to unlock all financial features of the app.
      </p>
      <div style="margin: 30px 0;">
        <a href="${verificationUrl}" 
           style="background-color: #3B82F6; color: white; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          Verify Email Address
        </a>
      </div>
      <p style="font-size: 14px; color: #64748B;">
        Or copy and paste this link into your browser:
        <br>
        <a href="${verificationUrl}" style="color: #3B82F6;">${verificationUrl}</a>
      </p>
      <p style="font-size: 14px; color: #64748B; margin-top: 30px;">
        <em>Note: This verification link will expire in 24 hours.</em>
      </p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: sender,
    to: [email],
    subject: 'Verify your email address - SPR App',
    html: htmlContent,
  });

  if (error) {
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}
