export class CreatePrinterDto {
  name: string;
  model: string;
  connection_type: 'usb' | 'lan';
  ip_address?: string;
  port?: number;
  usb_device_name?: string;
  is_default?: boolean;
  enabled?: boolean;
  auto_cut?: boolean;
  cash_drawer?: boolean;
  receipt_width?: number;
  qr_size?: number;
  auto_print?: boolean;
}

export class UpdatePrinterDto extends CreatePrinterDto {
  enabled?: boolean;
  is_default?: boolean;
}

export class TestPrinterDto {
  printer_id: number;
}
