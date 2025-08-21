import { createClient } from "@supabase/supabase-js";
import { TDatabase } from "../types";

export const supabase = () =>
  createClient<TDatabase>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
    {
      db: { schema: "assessment" }
    }
  );

