// Shared TypeScript types for TPH Management

export type Family = {
  id: string;
  membership_id: string;
  head_name: string;
  address: string;
  place: string;
  mobile: string;
  email: string;
  join_date: string;
};

export type Member = {
  id: string;
  family_id: string;
  name: string;
  relationship: string;
  gender: string;
  birth_date: string;
  baptism_date: string;
  marriage_date: string;
  families?: {
    head_name: string;
    mobile: string;
    membership_id?: string;
  };
};

export type Transaction = {
  id: string;
  receipt_number: string;
  amount: number;
  purpose: string;
  payment_date: string;
  remarks?: string;
};

export type SearchResult = {
  type: 'family' | 'member';
  family: Family;
  memberName?: string;
  memberRelationship?: string;
};

export type AnniversaryGroup = {
  names: string;
  marriage_date: string;
  family_name: string;
  mobile: string;
  key: string;
};

export type DashboardStats = {
  families: number;
  members: number;
  txCount: number;
};
