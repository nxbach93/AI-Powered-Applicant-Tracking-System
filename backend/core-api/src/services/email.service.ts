import nodemailer, { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private isMockMode: boolean = false;
  private etherealAccount: any = null;

  constructor() {
    this.initTransporter();
  }

  /**
   * Khởi tạo transporter từ biến môi trường
   */
  private initTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    // Chỉ khởi tạo transporter thực tế khi cấu hình host và auth hợp lệ
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass
        }
      });
    } else {
      this.transporter = null;
    }
  }

  /**
   * Thiết lập Transporter tùy biến (phục vụ automated testing / mock)
   */
  public setTransporter(transporter: any) {
    this.transporter = transporter;
    this.isMockMode = true;
  }

  /**
   * Reset transporter về cấu hình môi trường ban đầu
   */
  public resetTransporter() {
    this.isMockMode = false;
    this.etherealAccount = null;
    this.initTransporter();
  }

  /**
   * Kiểm tra dịch vụ gửi mail đã sẵn sàng hay chưa
   */
  public isConfigured(): boolean {
    return this.isMockMode || this.transporter !== null;
  }

  /**
   * Lấy hoặc kích hoạt transporter phù hợp cho môi trường hiện tại
   */
  private async getActiveTransporter(): Promise<Transporter> {
    if (this.transporter) {
      return this.transporter;
    }

    // Nếu đang trong môi trường development hoặc test và chưa cấu hình SMTP thật,
    // tự động kích hoạt Ethereal test inbox để developer có thể kiểm thử luồng nhận email
    if (process.env.NODE_ENV !== 'production') {
      try {
        if (!this.etherealAccount) {
          this.etherealAccount = await nodemailer.createTestAccount();
        }
        this.transporter = nodemailer.createTransport({
          host: this.etherealAccount.smtp.host,
          port: this.etherealAccount.smtp.port,
          secure: this.etherealAccount.smtp.secure,
          auth: {
            user: this.etherealAccount.user,
            pass: this.etherealAccount.pass
          }
        });
        console.log('[EmailService] ℹ️  SMTP chưa cấu hình trong .env. Đã kích hoạt Ethereal Test Account cho môi trường Development.');
        return this.transporter;
      } catch (err: any) {
        console.warn('[EmailService] Không thể kết nối Ethereal, sử dụng jsonTransport giả lập:', err.message);
        this.transporter = nodemailer.createTransport({ jsonTransport: true });
        return this.transporter;
      }
    }

    throw new Error('Dịch vụ gửi email chưa được cấu hình thông số SMTP hợp lệ trên hệ thống.');
  }

  /**
   * Gửi email chung
   */
  public async sendMail(options: SendMailOptions): Promise<{ messageId?: string; accepted?: string[] }> {
    const activeTransporter = await this.getActiveTransporter();
    const from = process.env.SMTP_FROM || 'AI-Powered ATS <no-reply@ats-system.com>';

    try {
      const info = await activeTransporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, '')
      });

      // Nếu đang dùng Ethereal test account, cung cấp đường dẫn xem trước email (không in token hay password ra console)
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[EmailService] ✉️  Xem trước email gửi đến ${options.to} tại: ${previewUrl}`);
      }

      return info;
    } catch (error: any) {
      console.error('Lỗi khi gửi email qua SMTP:', error.message || error);
      throw new Error('Không thể gửi email đến hộp thư người nhận. Vui lòng thử lại sau.');
    }
  }

  /**
   * Gửi email đặt lại mật khẩu
   */
  public async sendPasswordResetEmail(toEmail: string, resetUrl: string, expiresMinutes: number = 15): Promise<void> {
    const subject = 'Yêu cầu đặt lại mật khẩu - AI-Powered Applicant Tracking System';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #2563eb; margin: 0; font-size: 22px;">AI-Powered ATS</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Hệ thống Quản lý Tuyển dụng Thông minh</p>
        </div>
        
        <div style="color: #1e293b; font-size: 15px; line-height: 1.6;">
          <p>Xin chào,</p>
          <p>Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản đăng ký với địa chỉ email: <strong>${toEmail}</strong>.</p>
          <p>Vui lòng nhấn vào nút bên dưới để tiến hành tạo mật khẩu mới:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 15px;">
              Đặt lại mật khẩu
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 13px;">
            Liên kết này chỉ có hiệu lực trong vòng <strong>${expiresMinutes} phút</strong> và chỉ sử dụng được 01 lần duy nhất.
          </p>
          <p style="color: #64748b; font-size: 13px;">
            Nếu bạn không yêu cầu đặt lại mật khẩu, xin vui lòng bỏ qua email này. Mật khẩu hiện tại của bạn vẫn được giữ an toàn.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
          Đây là email tự động, vui lòng không trả lời thư này.<br/>
          &copy; ${new Date().getFullYear()} AI-Powered ATS Team.
        </p>
      </div>
    `;

    await this.sendMail({
      to: toEmail,
      subject,
      html
    });
  }
}

export default new EmailService();
