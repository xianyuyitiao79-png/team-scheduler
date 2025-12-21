export type Role = 'admin' | 'member';

export interface Profile {
  id: string;
  name: string;
  role: Role;
  active: boolean;
}

export interface ShiftTemplate {
  id: string;
  name: string;
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  break_minutes: number;
}

export interface Shift {
  id: string;
  date: string; // YYYY-MM-DD
  template_id?: string;
  user_id: string;
  status: 'draft' | 'published';
  note?: string;
  // Joins
  profiles?: Profile;
  shift_templates?: ShiftTemplate;
}

export interface Settings {
  id: number;
  team_name: string;
  timezone: string;
}
