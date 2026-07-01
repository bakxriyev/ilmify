export class CreateReceiptDto {
  payment_id: number;
  amount: number;
  discount?: number;
  penalty?: number;
  total: number;
  center_id: number;
  printer_id?: number;
  printed_by?: number;
}

export class PrintReceiptDto {
  payment_id: number;
  printer_id?: number;
  template_id?: number;
  discount?: number;
  penalty?: number;
  months?: number[];
}

export class ReprintReceiptDto {
  receipt_id: number;
  printer_id?: number;
}
