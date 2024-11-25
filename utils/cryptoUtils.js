import crypto from 'crypto';
import 'dotenv/config';
const algorithm = 'aes-256-cbc';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
const iv = Buffer.from(process.env.IV, 'hex');
//console.log(process.env.IV.length,process.env.ENCRYPTION_KEY.length)
// Encrypt Function
export const encrypt = (text) => {
  if (!text) return text;
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

// Decrypt Function
export const decrypt = (text) => {
  if (!text) return text;
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(text, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
};
