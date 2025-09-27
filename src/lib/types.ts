export interface Admin {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  role: "admin" | "super_admin" | "moderator";
  status: "active" | "inactive" | "suspended";
  created_at: string;
  avatar?: string;
}

export interface AdminFormData {
  user_id?: string;
  name: string;
  email: string;
  role: "admin" | "super_admin" | "moderator";
  status: "active" | "inactive" | "suspended";
  password?: string;
}
export type RoleType = "super_admin" | "admin" | "moderator";
export type AdminStatus = "active" | "inactive" | "suspended";


export interface PageState {
  page: number;
  pageSize: number;
  total: number;
}


export interface ImpactDataItem {
  name: string;
  value: number;
}

export interface EngagementDataItem {
  metric: string;
  current: number;
  change: number;
}

export interface MonthlyDataItem {
  month: string;
  reports: number;
  stories: number;
  resources: number;
  support: number;
  impact_data?: ImpactDataItem[];
  engagement_data?: EngagementDataItem[];
}

export interface CommunityMember {
  id: string;
  name: string;
  email: string;
  username: string;
  status: "active" | "warned" | "suspended" | "banned";
  join_date: string;
  last_active: string;
  avatar?: string;
  bio: string;
  stories_count: number;
  comments_count: number;
  likes_received: number;
  reports_count: number;
  location: string;
  verified: boolean;
  violations: { type: "hate_speech" | "inappropriate_content" | "spam" | "harassment"; date: string; description: string }[];
}

export type AlertPriority = "High" | "Medium" | "Low" | "Critical";
export type AlertStatus = "open" | "In Progress" | "Resolved" | "dismissed";

export const IncidentType = {
  Harassment: "harassment",
  Discrimination: "discrimination",
  Violence: "violence",
  Other: "other",
} as const;

export type IncidentType = typeof IncidentType[keyof typeof IncidentType];

export interface DashAlert {
  id: string;
  title: string;
  message: string;
  type: IncidentType; 
  priority: AlertPriority;
  status: AlertStatus;
  location: string;
  timestamp: string;
  reportId: string; 
}

export interface DashActivity {
  id: string;
  message: string;
  type: "report" | "story" | "comment" | "support" | "system" | "resource";
  status: string;
  time: string;
}

export interface DashboardStats {
  totalReports: number;
  inProgressReports: number;
  criticalReports: number;
  resolvedReports: number;
  totalStories: number;
  totalMembers: number;
  totalComments: number;
  totalAdmins: number;
}

export interface ReportType {
  id: string;
  title: string;
  description: string;
  type: IncidentType;
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Resolved";
  location: string;
  reported_by: string;
  reported_at: string;
  assigned_to: string | null;
  tags: string[]; 
  follow_up_actions: string[];
  evidence: string[];
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  title: string;
  category: string;
  description: string;
  type: "pdf" | "website";
  url: string;
  image: string;
  tags: string[];
  downloads: number;
  views: number;
  is_verified: boolean;
}

export interface SupportService {
  id: string;
  name: string;
  type: "lawyer" | "therapist" | "activist" | "support-group";
  title: string;
  specialization: string;
  description: string;
  contact_info: {
    address: string;
    phone: string;
    email: string;
  };
  website?: string;
  avatar?: string;
  rating: number | null;
  reviews: number;
  verified: boolean;
  availability: "available" | "limited" | "unavailable";
  status: "pending" | "approved" | "rejected";
  credentials: string;
  languages: string[];
  tags: string[];
}

export interface Settings {
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  system: {
    maintenance_mode: boolean;
    api_rate_limit: number;
    max_file_size: number;
  };
  security: {
    two_factor_auth: boolean;
    session_timeout: number;
  };
  language: string;
}

export interface Story {
  id: string;
  slug: string;
  title: string;
  content: string;
  full_content: string;
  author: {
    id: string | null;
    name: string;
    anonymous: boolean;
    avatar: string | null;
    verified: boolean;
  };
  created_at: string;
  category: string;
  likes: number;
  comments_count: number;
  views: number;
  tags: string[];
  featured: boolean;
  is_liked: boolean;
}

export interface Comment {
  id: string;
  author_id: string | null;
  author_name: string;
  content: string;
  created_at: string;
}

// Email OTP branch
export interface VerifyEmailOtpParams {
  type: "email" | "signup" | "magiclink" | "invite" | "email_change"
  email: string
  token: string
}

// Recovery OTP branch
export interface VerifyTokenHashParams {
  type: "recovery"
  token: string
}

// Union type
export type VerifyOtpParams = VerifyEmailOtpParams | VerifyTokenHashParams
