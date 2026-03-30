import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import { createServerClient } from "@supabase/ssr";
import { NextRequest } from "next/server";

interface ProfileUpdateBody {
  full_name?: string;
  avatar_url?: string;
  college?: string;
  course?: string;
  year_semester?: string;
  gender?: string;
  email?: string;
}

function createSupabaseClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      },
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient(request);

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (supabaseAdmin) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Profile fetch error:", profileError);
        return NextResponse.json(
          { error: "Failed to fetch profile" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        profile: profile || { user_id: user.id, email: user.email },
      });
    }

    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Profile GET API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body: ProfileUpdateBody = await request.json();
    const supabase = createSupabaseClient(request);

    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    if (supabaseAdmin) {
      const { data: existingProfile } = await supabaseAdmin
        .from("user_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      const profileData = {
        ...body,
        user_id: user.id,
        email: user.email,
      };

      if (existingProfile) {
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
          .from("user_profiles")
          .update(profileData)
          .eq("user_id", user.id)
          .select()
          .single();

        if (updateError) {
          console.error("Profile update error:", updateError);
          return NextResponse.json(
            { error: "Failed to update profile" },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          profile: updatedProfile,
        });
      } else {
        const { data: newProfile, error: insertError } = await supabaseAdmin
          .from("user_profiles")
          .insert(profileData)
          .select()
          .single();

        if (insertError) {
          console.error("Profile insert error:", insertError);
          return NextResponse.json(
            { error: "Failed to create profile" },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          profile: newProfile,
        });
      }
    }

    return NextResponse.json(
      { error: "Database not configured" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Profile update API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
