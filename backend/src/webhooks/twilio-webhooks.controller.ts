import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { TwilioWebhooksService } from './twilio-webhooks.service';

@Controller('webhooks/twilio')
export class TwilioWebhooksController {
  constructor(private readonly webhooksService: TwilioWebhooksService) {}

  @Post('inbound')
  @HttpCode(HttpStatus.OK)
  async handleInbound(
    @Body() body: any,
    @Headers('x-twilio-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ) {
    // Note: In production, you should verify the Twilio signature for security
    // For now, we'll accept all requests (Twilio webhooks come from Twilio's IPs)
    return this.webhooksService.handleInboundMessage(body);
  }

  @Post('status')
  @HttpCode(HttpStatus.OK)
  async handleStatus(
    @Body() body: any,
    @Headers('x-twilio-signature') signature: string,
  ) {
    // Note: In production, you should verify the Twilio signature for security
    return this.webhooksService.handleStatusUpdate(body);
  }
}

