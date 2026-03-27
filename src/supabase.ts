import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vnmdizttzdrzqrwwjkbz.supabase.co";
const supabaseKey = "sb_publishable_mmT_eFWUR9HahlSYTiEynw_IsSPYWZm";

export const supabase = createClient(supabaseUrl, supabaseKey);
