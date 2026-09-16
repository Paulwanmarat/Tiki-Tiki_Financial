require('dotenv').config();
const { Resend } = require('resend');

async function diagnose() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is missing');
    process.exit(1);
  }

  const resend = new Resend(apiKey);
  const sender = process.env.RESEND_FROM_EMAIL || 'Tiki Finance <onboarding@resend.dev>';
  const recipient = 'paulwanmarat@gmail.com';

  console.log('=== RESEND EMAIL DIAGNOSTIC ===');
  console.log('Sender:', sender);
  console.log('Recipient:', recipient);
  console.log('Timestamp:', new Date().toISOString());
  console.log('');

  // Send a simple diagnostic email (not a verification email — no token involved)
  const { data, error } = await resend.emails.send({
    from: sender,
    to: [recipient],
    subject: 'SPR App - Email Delivery Test',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0F172A;">SPR App - Delivery Test</h1>
        <p style="font-size: 16px; color: #475569;">
          This is a diagnostic email to confirm delivery to your Gmail inbox.
        </p>
        <p style="font-size: 14px; color: #64748B;">
          Sent at: ${new Date().toISOString()}
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('SEND ERROR:', JSON.stringify(error, null, 2));
    process.exit(1);
  }

  console.log('SEND SUCCESS');
  console.log('Resend Email ID:', data?.id);
  console.log('');

  // Wait a moment then check email status
  console.log('Waiting 5 seconds to check delivery status...');
  await new Promise(r => setTimeout(r, 5000));

  try {
    const emailInfo = await resend.emails.get(data.id);
    console.log('');
    console.log('=== EMAIL STATUS ===');
    console.log('ID:', emailInfo.data?.id);
    console.log('From:', emailInfo.data?.from);
    console.log('To:', JSON.stringify(emailInfo.data?.to));
    console.log('Subject:', emailInfo.data?.subject);
    console.log('Created At:', emailInfo.data?.created_at);
    console.log('Last Event:', emailInfo.data?.last_event);
    console.log('');

    if (emailInfo.data?.last_event === 'delivered') {
      console.log('DIAGNOSIS: Resend confirms delivery accepted by Gmail servers.');
      console.log('The email may be in Gmail Spam folder or Promotions tab.');
      console.log('');
      console.log('RECOMMENDED ACTIONS:');
      console.log('1. Check Gmail Spam folder');
      console.log('2. Check Gmail Promotions tab');
      console.log('3. Check Gmail "All Mail" view');
      console.log('4. Search Gmail for: from:onboarding@resend.dev');
    } else if (emailInfo.data?.last_event === 'bounced') {
      console.log('DIAGNOSIS: Email was bounced by Gmail.');
    } else {
      console.log('DIAGNOSIS: Email status is:', emailInfo.data?.last_event);
    }
  } catch (err) {
    console.error('Failed to fetch email status:', err);
  }

  process.exit(0);
}

diagnose().catch(console.error);
