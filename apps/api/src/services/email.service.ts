import nodemailer from 'nodemailer';
import { VerificationType } from '@repo/shared-types';
import { OTP_CONFIG } from './otp.service';

// Email configuration from environment variables
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
};

const FROM_EMAIL = process.env.SMTP_FROM || 'noreply@movietickets.com';

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

/**
 * Get or create email transporter
 */
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport(SMTP_CONFIG);
  }
  return transporter;
}

/**
 * Send OTP email based on verification type
 * @param email - Recipient email address
 * @param otp - The OTP code to send
 * @param type - Type of verification
 * @param userName - Optional user name for personalization
 */
export async function sendOTPEmail(
  email: string,
  otp: string,
  type: VerificationType,
  userName?: string
): Promise<void> {
  const transport = getTransporter();

  let subject: string;
  let htmlContent: string;
  let textContent: string;

  const expiryMinutes = OTP_CONFIG.EXPIRY_MINUTES;
  const greeting = userName ? `Hi ${userName},` : 'Hello,';

  switch (type) {
    case 'SIGNUP':
      subject = 'Verify Your Email - Movie Ticket Booking';
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .otp-box { background-color: white; border: 2px solid #4F46E5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .warning { color: #DC2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Movie Ticket Booking!</h1>
            </div>
            <div class="content">
              <p>${greeting}</p>
              <p>Thank you for signing up! To complete your registration, please verify your email address using the OTP below:</p>
              <div class="otp-box">${otp}</div>
              <p><strong>This OTP will expire in ${expiryMinutes} minutes.</strong></p>
              <p>If you didn't create an account, please ignore this email.</p>
              <p class="warning">⚠️ Never share this OTP with anyone. Our team will never ask for your OTP.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Movie Ticket Booking. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      textContent = `
${greeting}

Thank you for signing up for Movie Ticket Booking!

Your verification code is: ${otp}

This code will expire in ${expiryMinutes} minutes.

If you didn't create an account, please ignore this email.

Never share this OTP with anyone.
      `;
      break;

    case 'LOGIN':
      subject = 'Your Login Verification Code';
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .otp-box { background-color: white; border: 2px solid #4F46E5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .warning { color: #DC2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Login Verification</h1>
            </div>
            <div class="content">
              <p>${greeting}</p>
              <p>We need to verify your email address before you can log in. Please use the OTP below:</p>
              <div class="otp-box">${otp}</div>
              <p><strong>This OTP will expire in ${expiryMinutes} minutes.</strong></p>
              <p>If you didn't attempt to log in, please secure your account immediately.</p>
              <p class="warning">⚠️ Never share this OTP with anyone. Our team will never ask for your OTP.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Movie Ticket Booking. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      textContent = `
${greeting}

Your login verification code is: ${otp}

This code will expire in ${expiryMinutes} minutes.

If you didn't attempt to log in, please secure your account immediately.

Never share this OTP with anyone.
      `;
      break;

    case 'PASSWORD_RESET':
      subject = 'Reset Your Password';
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .otp-box { background-color: white; border: 2px solid #4F46E5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .warning { color: #DC2626; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>${greeting}</p>
              <p>We received a request to reset your password. Use the OTP below to proceed:</p>
              <div class="otp-box">${otp}</div>
              <p><strong>This OTP will expire in ${expiryMinutes} minutes.</strong></p>
              <p>If you didn't request a password reset, please ignore this email and ensure your account is secure.</p>
              <p class="warning">⚠️ Never share this OTP with anyone. Our team will never ask for your OTP.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Movie Ticket Booking. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      textContent = `
${greeting}

We received a request to reset your password.

Your password reset code is: ${otp}

This code will expire in ${expiryMinutes} minutes.

If you didn't request a password reset, please ignore this email.

Never share this OTP with anyone.
      `;
      break;
  }

  try {
    await transport.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject,
      text: textContent,
      html: htmlContent,
    });
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    throw new Error('Failed to send verification email. Please try again.');
  }
}

/**
 * Send account locked notification email
 * @param email - Recipient email address
 * @param unlockTime - When the account will be unlocked
 * @param userName - Optional user name
 */
export async function sendAccountLockedEmail(
  email: string,
  unlockTime: Date,
  userName?: string
): Promise<void> {
  const transport = getTransporter();
  const greeting = userName ? `Hi ${userName},` : 'Hello,';
  
  const unlockTimeStr = unlockTime.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const subject = 'Account Temporarily Locked - Security Alert';
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; }
        .alert-box { background-color: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Security Alert</h1>
        </div>
        <div class="content">
          <p>${greeting}</p>
          <div class="alert-box">
            <p><strong>Your account has been temporarily locked due to multiple failed verification attempts.</strong></p>
          </div>
          <p>For your security, we've locked your account until: <strong>${unlockTimeStr}</strong></p>
          <p>If this wasn't you, please contact our support team immediately.</p>
          <p>After the lockout period, you'll be able to log in again.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Movie Ticket Booking. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
${greeting}

SECURITY ALERT

Your account has been temporarily locked due to multiple failed verification attempts.

Your account will be unlocked at: ${unlockTimeStr}

If this wasn't you, please contact our support team immediately.
  `;

  try {
    await transport.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject,
      text: textContent,
      html: htmlContent,
    });
  } catch (error) {
    console.error('Failed to send account locked email:', error);
    // Don't throw error for notification emails
  }
}

/**
 * Send password reset success confirmation email
 * @param email - Recipient email address
 * @param userName - Optional user name
 */
export async function sendPasswordResetSuccessEmail(
  email: string,
  userName?: string
): Promise<void> {
  const transport = getTransporter();
  const greeting = userName ? `Hi ${userName},` : 'Hello,';

  const subject = 'Password Successfully Reset';
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 30px; }
        .success-box { background-color: #D1FAE5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✓ Password Reset Successful</h1>
        </div>
        <div class="content">
          <p>${greeting}</p>
          <div class="success-box">
            <p><strong>Your password has been successfully reset.</strong></p>
          </div>
          <p>You can now log in to your account using your new password.</p>
          <p>If you didn't make this change, please contact our support team immediately.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Movie Ticket Booking. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
${greeting}

Your password has been successfully reset.

You can now log in to your account using your new password.

If you didn't make this change, please contact our support team immediately.
  `;

  try {
    await transport.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject,
      text: textContent,
      html: htmlContent,
    });
  } catch (error) {
    console.error('Failed to send password reset success email:', error);
    // Don't throw error for notification emails
  }
}
