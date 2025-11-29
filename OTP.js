const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true },
    otp: { type: String, required: true }
  },
  { timestamps: true }
);

// TTL index: document expires after 5 minutes
OTPSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

module.exports = mongoose.model('OTP', OTPSchema);
