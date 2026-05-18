export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  device_id: string;
  student: {
    id: number;
    first_name: string;
    last_name: string;
    email: string | null;
    phone_number: string;
    photo: string;
    group: any | null;
    age: number | null;
    group_id: number | null;
    isActive: boolean;
    center_id: number | null;
    center: {
      id: number;
      name: string;
      logo: string | null;
      location: string | null;
      phone: string | null;
      is_active: boolean;
    } | null;
  };
}