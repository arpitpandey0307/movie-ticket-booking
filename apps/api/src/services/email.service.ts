import * as SibApiV3Sdk from '@sendinblue/client';

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY || ''
);

const FROM_EMAIL = process.env.SMTP_FROM || 'noreply@movietickets.com';

// Email service using Brevo API

export async function sendOTPEmail(
  to: string,
  otp: string,
  type: 'SIGNUP' | 'LOGIN' | 'PASSWORD_RESET',
  firstName: string
): Promise<void> {
  const subject =
    type === 'PASSWORD_RESET'
      ? 'Password Reset Code'
      : 'Email Verification Code';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-box { background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎬 Movie Tickets</h1>
        </div>
        <div class="content">
          <h2>Hi ${firstName}!</h2>
          <p>Your verification code is:</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>© 2024 Movie Tickets. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Movie Tickets' };
  sendSmtpEmail.to = [{ email: to, name: firstName }];
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`OTP email sent to ${to}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send verification email');
  }
}

export async function sendAccountLockedEmail(
  to: string,
  firstName: string,
  unlockAt: Date
): Promise<void> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Account Temporarily Locked</h2>
        <p>Hi ${firstName},</p>
        <p>Your account has been temporarily locked due to multiple failed verification attempts.</p>
        <p>Your account will be automatically unlocked at: <strong>${unlockAt.toLocaleString()}</strong></p>
        <p>If you didn't attempt to access your account, please contact support.</p>
      </div>
    </body>
    </html>
  `;

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Movie Tickets' };
  sendSmtpEmail.to = [{ email: to, name: firstName }];
  sendSmtpEmail.subject = 'Account Temporarily Locked';
  sendSmtpEmail.htmlContent = htmlContent;

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
  } catch (error) {
    console.error('Failed to send account locked email:', error);
  }
}

export async function sendPasswordResetSuccessEmail(
  to: string,
  firstName: string
): Promise<void> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Password Reset Successful</h2>
        <p>Hi ${firstName},</p>
        <p>Your password has been successfully reset.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
      </div>
    </body>
    </html>
  `;

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.sender = { email: FROM_EMAIL, name: 'Movie Tickets' };
  sendSmtpEmail.to = [{ email: to, name: firstName }];
  sendSmtpEmail.subject = 'Password Reset Successful';
  sendSmtpEmail.htmlContent = htmlContent;

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
  } catch (error) {
    console.error('Failed to send password reset success email:', error);
  }
}
