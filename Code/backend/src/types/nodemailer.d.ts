declare module "nodemailer" {
  type MailOptions = { from: string; to: string; subject: string; html: string };
  type MailInfo = { messageId: string };
  type Transport = { sendMail(options: MailOptions): Promise<MailInfo> };
  type TransportOptions = { host?: string; port?: number; secure?: boolean; auth?: { user?: string; pass?: string } };
  const nodemailer: { createTransport(options: TransportOptions): Transport };
  export default nodemailer;
}