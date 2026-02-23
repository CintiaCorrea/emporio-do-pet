import { IsEnum, IsOptional, IsString, IsInt, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeviceTypeDto } from './create-lead.dto';

export enum EventTypeDto {
  PAGE_VIEW = 'page_view',
  PRICING_VIEW = 'pricing_view',
  PRODUCT_VIEW = 'product_view',
  CHECKOUT_START = 'checkout_start',
  CHECKOUT_ABANDON = 'checkout_abandon',
  CHECKOUT_COMPLETE = 'checkout_complete',
  FORM_SUBMIT = 'form_submit',
  FORM_START = 'form_start',
  BUTTON_CLICK = 'button_click',
  SCROLL_DEPTH = 'scroll_depth',
  VIDEO_PLAY = 'video_play',
  VIDEO_COMPLETE = 'video_complete',
  DOWNLOAD = 'download',
  SHARE = 'share',
  SEARCH = 'search',
  ADD_TO_CART = 'add_to_cart',
  REMOVE_FROM_CART = 'remove_from_cart',
  WISHLIST_ADD = 'wishlist_add',
  LOGIN = 'login',
  SIGNUP = 'signup',
  CONTACT_CLICK = 'contact_click',
  WHATSAPP_CLICK = 'whatsapp_click',
  CUSTOM = 'custom',
}

export class TrackEventDto {
  @ApiProperty({ enum: EventTypeDto, example: EventTypeDto.PAGE_VIEW })
  @IsEnum(EventTypeDto)
  eventType: EventTypeDto;

  @ApiPropertyOptional({ example: '/produtos/racao-premium' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: 'sess_abc123' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ example: 45, description: 'Tempo na página em segundos' })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({ enum: DeviceTypeDto })
  @IsOptional()
  @IsEnum(DeviceTypeDto)
  device?: DeviceTypeDto;

  @ApiPropertyOptional({
    description: 'Dados extras do evento',
    example: { productId: '123', value: 99.9 },
  })
  @IsOptional()
  @IsObject()
  eventData?: Record<string, unknown>;
}

export class TrackEventByEmailDto extends TrackEventDto {
  @ApiProperty({ example: 'joao@email.com' })
  @IsString()
  email: string;
}
