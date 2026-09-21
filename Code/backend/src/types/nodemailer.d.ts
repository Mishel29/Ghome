declare module "nodemailer" {
  type MailOptions = { from: string; to: string; subject: string; html: string };
  type MailInfo = { messageId: string; accepted?: string[]; rejected?: string[]; response?: string };
  type Transport = { sendMail(options: MailOptions): Promise<MailInfo>; verify(): Promise<boolean> };
  type TransportOptions = { host?: string; port?: number; secure?: boolean; auth?: { user?: string; pass?: string } };
  const nodemailer: { createTransport(options: TransportOptions): Transport };
  export default nodemailer;
}
