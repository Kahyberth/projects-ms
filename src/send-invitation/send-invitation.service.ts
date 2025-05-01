import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { envs } from 'src/config/envs';
import {
  viewProjectTemplatePage,
  viewProjectTemplateProps,
} from '../mail/view-project-template';
import {
  sendInvitationTemplate,
  SendInvitationTemplateProps,
} from 'src/mail/send-invitation.template';
@Injectable()
export class SendInvitationService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: envs.MAIL_HOST,
      port: 465,
      auth: {
        user: envs.MAIL_USERNAME,
        pass: envs.MAIL_PASSWORD,
      },
    });
  }

  /**
   * @async
   * @author Kahyberth
   * @description It is responsible for sending an invitation email to a user
   * @param payload - The payload containing the user's information and the invitation link
   * @returns Promise<void>
   */
  async sendInvitationLink(
    payload: SendInvitationTemplateProps,
  ): Promise<void> {
    const mailOptions = {
      from: envs.MAIL_USERNAME,
      to: payload.invitedEmail,
      subject: 'Invitation to join the project 🎯',
      html: sendInvitationTemplate(payload),
    };
    return await this.transporter.sendMail(mailOptions);
  }

  /**
   * @async
   * @author Kahyberth
   * @description It is responsible for sending a project invitation email to a user
   * @param payload - The payload containing the user's information and the project details
   * @returns Promise<void>
   */
  async viewProjectInvitation(
    payload: viewProjectTemplateProps,
  ): Promise<void> {
    const mailOptions = {
      from: envs.MAIL_USERNAME,
      to: payload.invitedEmail,
      subject: 'You have been invited to a new project 🎯',
      html: viewProjectTemplatePage(payload),
    };
    return await this.transporter.sendMail(mailOptions);
  }
}
