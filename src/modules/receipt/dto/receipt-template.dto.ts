export class CreateTemplateDto {
  name: string;
  font_size?: number;
  bold?: boolean;
  align?: string;
  line_width?: number;
  divider_char?: string;
  show_logo?: boolean;
  show_header?: boolean;
  show_footer?: boolean;
  show_qr_telegram?: boolean;
  show_qr_website?: boolean;
  show_qr_instagram?: boolean;
  show_qr_verify?: boolean;
  show_phones?: boolean;
  show_social?: boolean;
  show_thank_you?: boolean;
  custom_header?: string;
  custom_footer?: string;
}

export class UpdateTemplateDto extends CreateTemplateDto {
  is_default?: boolean;
}
