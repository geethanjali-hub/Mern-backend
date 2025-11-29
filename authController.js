const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('./User');
const OTP = require('./OTP');
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

// create transporter lazily so we can fallback to Ethereal if real SMTP isn't configured
const createTransporter = async () => {
  const forceEthereal = String(process.env.FORCE_ETHEREAL || '').toLowerCase() === 'true';
  const hasSmtp = !!process.env.EMAIL_USER && !forceEthereal;
  if (hasSmtp) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.example.com',
      port: parseInt(process.env.EMAIL_PORT, 10) || 587,
      secure: String(process.env.EMAIL_PORT) === '465',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  // fallback to Ethereal for development/testing
  const testAccount = await nodemailer.createTestAccount();
  console.log('Using Ethereal test account. Preview emails in the console URL.');
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
};

const sendOtpEmail = async (email, otp) => {
  // If SENDGRID_API_KEY is present, prefer SendGrid Web API
  if (process.env.SENDGRID_API_KEY) {
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const from = process.env.SENDGRID_FROM || process.env.EMAIL_USER || 'no-reply@example.com';
      const msg = {
        to: email,
        from,
        subject: 'Your OTP Code',
        text: `Your OTP is: ${otp}. It expires in 5 minutes.`,
      };
      const res = await sgMail.send(msg);
      // SendGrid returns an array of responses for each recipient
      const status = Array.isArray(res) && res[0] && res[0].statusCode ? res[0].statusCode : null;
      console.log('SendGrid send result:', status);
      console.log('OTP (for convenience):', otp);
      return;
    } catch (err) {
      // Log detailed SendGrid error information, but don't stop — fall back to Nodemailer transport
      console.warn('sendOtpEmail (SendGrid) failed:', err && err.message ? err.message : err);
      if (err && err.response) {
        try {
          console.warn('SendGrid response:', err.response.statusCode, err.response.body || err.response);
        } catch (e) {
          console.warn('Error printing SendGrid response body:', e && e.message ? e.message : e);
        }
      }
      console.log('Falling back to Nodemailer transport. Fallback OTP for', email, ':', otp);
      // do not throw; allow fallback to run
    }
  }

  // Fallback to Nodemailer transport (Ethereal or real SMTP)
  try {
    const transporter = await createTransporter();
    const from = process.env.EMAIL_USER || 'no-reply@example.com';
    const mailOptions = {
      from,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP is: ${otp}. It expires in 5 minutes.`,
    };
    const info = await transporter.sendMail(mailOptions);
    // Log transport info to confirm delivery (messageId/response). For Ethereal we'll also log preview URL.
    console.log('Mail sent:', { messageId: info.messageId, response: info.response });
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) {
      console.log('Ethereal preview URL (open in browser):', preview);
      console.log('OTP (for convenience):', otp);
    } else {
      console.log('OTP sent to', email);
    }
  } catch (err) {
    console.warn('sendOtpEmail failed:', err && err.message ? err.message : err);
    // still surface OTP to server console as a fallback
    console.log('Fallback OTP for', email, ':', otp);
    throw err;
  }
};

const generateOtp = (length = 6) => {
  const min = Math.pow(10, length - 1);
  const num = Math.floor(min + Math.random() * 9 * min);
  return String(num);
};

exports.signup = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'User already exists' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), phone, password: hashed });
    const otp = generateOtp(6);
    await OTP.create({ email: user.email, otp });
    await sendOtpEmail(user.email, otp).catch((e) => console.warn('sendOtpEmail failed', e.message));
    const resp = { message: 'Signup successful. OTP sent to email.' };
    if (process.env.NODE_ENV !== 'production') resp.otp = otp;
    return res.status(201).json(resp);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Missing fields' });
    const record = await OTP.findOne({ email: email.toLowerCase(), otp });
    if (!record) return res.status(400).json({ message: 'Invalid or expired OTP' });
    // optionally mark user verified
    const user = await User.findOneAndUpdate({ email: email.toLowerCase() }, { isVerified: true }, { new: true });
    await OTP.deleteMany({ email: email.toLowerCase() });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Missing email' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: 'No user with that email' });
    const otp = generateOtp(6);
    await OTP.create({ email: user.email, otp });
    await sendOtpEmail(user.email, otp).catch((e) => console.warn('sendOtpEmail failed', e.message));
    const resp = { message: 'OTP sent to email' };
    if (process.env.NODE_ENV !== 'production') resp.otp = otp;
    return res.json(resp);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ message: 'Missing fields' });
    const record = await OTP.findOne({ email: email.toLowerCase(), otp });
    if (!record) return res.status(400).json({ message: 'Invalid or expired OTP' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ email: email.toLowerCase() }, { password: hashed });
    await OTP.deleteMany({ email: email.toLowerCase() });
    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};
