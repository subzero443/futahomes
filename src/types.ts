export type Role = 'user' | 'agent' | 'admin';

export type Account = {
  id: number;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  avatar?: string;
  agent?: {
    business_name: string;
    bio: string;
    verification_status: string;
    verification_note: string;
    verified_until: string | null;
    plan: string;
    plan_expires_at: string | null;
  };
};

export type Media = {
  id: number;
  file_path: string;
  media_type: 'image' | 'video';
};

export type Property = {
  id: number;
  agent_id: number;
  title: string;
  description: string;
  address: string;
  location: string;
  property_type: string;
  listing_type: string;
  price: number | string;
  total_package?: string;
  price_period: string;
  bedrooms: number;
  bathrooms: number;
  availability: string;
  moderation_status: string;
  moderation_note?: string;
  agent_name: string;
  agent_phone: string;
  agent_avatar?: string;
  business_name: string;
  image?: string;
  media?: Media[];
  effective_plan: string;
  verified_agent: boolean;
  views: number;
  created_at: string;
};

export type Booking = {
  id: number;
  title: string;
  property_id: number;
  viewing_at: string;
  phone: string;
  status: string;
  message?: string;
  user_name?: string;
  user_email?: string;
  agent_name?: string;
  image?: string;
};

export type Conversation = {
  id: number;
  property_id?: number | null;
  property_title?: string;
  property_location?: string;
  property_image?: string;
  user_id: number;
  agent_id: number;
  partner_id: number;
  partner_name: string;
  partner_email?: string;
  partner_phone?: string;
  partner_avatar?: string;
  partner_business?: string;
  last_message: string;
  last_message_at: string;
  unread_count?: number;
  created_at: string;
};

export type DirectMessage = {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  sender_avatar?: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type PropertyQuestion = {
  id: number;
  property_id: number;
  user_id: number;
  user_name: string;
  user_avatar?: string;
  question: string;
  answer?: string | null;
  answered_by?: number | null;
  answered_by_name?: string | null;
  business_name?: string | null;
  answered_at?: string | null;
  created_at: string;
};

export type PropertyReview = {
  id: number;
  property_id: number;
  user_id: number;
  user_name: string;
  user_avatar?: string;
  rating: number;
  comment: string;
  category_water?: string | null;
  category_power?: string | null;
  category_security?: string | null;
  created_at: string;
};

export type PropertyReviewSummary = {
  count: number;
  average: number | null;
  water_constant?: number;
  power_stable?: number;
  security_safe?: number;
};
