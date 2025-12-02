import "server-only"
import arcjet, {
  detectBot,
  fixedWindow,
  protectSignup,
  sensitiveInfo,
  shield,
  slidingWindow,
} from '@arcjet/next'
import { env } from './env';

export {
    detectBot,
    fixedWindow,
    protectSignup,
    sensitiveInfo,
    shield,
    slidingWindow
};

//Export default instance đã khởi tạo
const aj = arcjet({
    key: env.ARCJET_KEY,
    characteristics: ['fingerprint'],
    rules: [
       shield({
          mode: "LIVE",
       })
    ]
});

export default aj;
