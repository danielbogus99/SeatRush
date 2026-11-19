export interface FanRow {
  id: string;
  username: string;
  created_at: Date;
}

export interface LoginFanInput {
  username: string;
}

export interface LoginFanResult {
  id: string;
  username: string;
  created_at: Date;
}
