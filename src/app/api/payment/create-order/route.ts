import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "../../../../../lib/supabaseServer";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const { courseId, courseTitle, price } = await request.json();

    if (!courseId || !courseTitle || price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Free courses skip payment
    if (price === 0) {
      return NextResponse.json({
        free: true,
        message: "Free course — proceed directly to enrollment",
      });
    }

    // Check if already enrolled (paid)
    if (supabaseAdmin) {
      const { data: existing } = await supabaseAdmin
        .from("enrollments")
        .select("id, payment_status")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .single();

      if (existing && existing.payment_status === "paid") {
        return NextResponse.json(
          { error: "Already enrolled and paid for this course" },
          { status: 400 }
        );
      }
    }

    // Create Razorpay order (amount in paise)
    const order = await razorpay.orders.create({
      amount: Math.round(price * 100),
      currency: "INR",
      receipt: `course_${courseId}_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        courseId: String(courseId),
        courseTitle,
        userId: user.id,
        userEmail: user.email || "",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
