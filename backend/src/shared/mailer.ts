import { logger } from './logger.js';

export type Mail = { to: string; subject: string; text: string };

export type Mailer = { send(mail: Mail): Promise<void> };

/** Development mailer: logs instead of sending. Replace with Resend/SES/Postmark in production. */
export const consoleMailer: Mailer = {
  async send(mail) {
    logger.info({ to: mail.to, subject: mail.subject }, `[mail] ${mail.text}`);
  },
};
