import "server-only";
import { VNPay, HashAlgorithm } from "vnpay";
import { env } from "./env";

// VNPay configuration with fallback values for demo
const vnpayConfig = {
  tmnCode: env.VNPAY_TMN_CODE,
  secureSecret: env.VNPAY_SECURE_SECRET,
  vnpayHost:"https://sandbox.vnpayment.vn",
  testMode:true,
  returnUrl:
    process.env.VNPAY_RETURN_URL || "http://localhost:3000/payment/return",
};

// Initialize VNPay instance
export const vnpay = new VNPay({
  tmnCode: vnpayConfig.tmnCode,
  secureSecret: vnpayConfig.secureSecret,
  vnpayHost: vnpayConfig.vnpayHost,
  testMode: vnpayConfig.testMode,
  hashAlgorithm: HashAlgorithm.SHA512,
  enableLog: true,
});

// Export configuration for server-side use only
export { vnpayConfig };


export const formatAmount = (amount: number): number => {
  return amount;
};

