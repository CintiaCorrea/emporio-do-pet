import { Body, Controller, Post } from "@nestjs/common";
import { EmailService } from "./email.service";
import { SendEmailDto } from "./dto/send-email.dto";

@Controller("email")
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post("send")
  async send(@Body() dto: SendEmailDto) {
    return this.emailService.sendEmail({
      to: dto.to,
      subject: dto.subject,
      html: dto.html,
      text: dto.text,
      cc: dto.cc,
      bcc: dto.bcc,
      replyTo: dto.replyTo,
    });
  }
}
