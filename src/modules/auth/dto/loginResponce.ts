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
    age:number | null;
    group_id: number | null;
    isActive:boolean;
  };
}