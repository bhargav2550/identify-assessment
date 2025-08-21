export type Contact = {
  id: number;
  email: string | null; 
  phonenumber: string | null; 
  linked_id: number | null; 
  link_precedence: "primary" | "secondary"; 
  created_at: string; 
  updated_at: string; 
  deleted_at: string | null;
};


// db client type
export type TDatabase = {
  assessment: {
    Tables: {
      contact: {
        Row: {
          email: string;
          phone: string;
          linked_id: number;
          link_precedence: string;
          created_at?: string | null;
          updated_at?: string | null;
          deleted_at?: string | null;
        };
        Insert: {
          email: string;
          phone: string;
          linked_id: number;
          link_precedence: string;
          created_at?: string | null;
          updated_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          email?: string;
          phone?: string;
          linked_id?: number;
          link_precedence?: string;
          created_at?: string | null;
          updated_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
    };
}}