import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "../../../../../lib/supabaseServer";
import { createServerClient } from "@supabase/ssr";
import nodemailer from "nodemailer";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

async function sendConfirmationEmail(
  to: string,
  userName: string,
  courseTitle: string,
  instructor: string,
  price: number,
  invoiceNumber: string
) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  const invoiceDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  await transporter.sendMail({
    from: `"Sedative Physio" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Course Enrollment Confirmed - ${courseTitle}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
  <div style="background: #000; color: #fff; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0;">Sedative Physio</h1>
    <p style="margin: 5px 0 0 0; opacity: 0.8;">Learning Platform</p>
  </div>
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px;">Hi ${userName},</p>
    <p style="font-size: 16px;">Your purchase was successful and your learning journey starts now.</p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
    
    <h3 style="margin: 0 0 15px 0; color: #333;">Course Details</h3>
    <ul style="list-style: none; padding: 0; margin: 0 0 20px 0;">
      <li style="margin-bottom: 8px;">• <strong>Course:</strong> ${courseTitle}</li>
      <li style="margin-bottom: 8px;">• <strong>Instructor:</strong> ${instructor}</li>
      <li style="margin-bottom: 8px;">• <strong>Amount Paid:</strong> ₹${price}</li>
      <li style="margin-bottom: 8px;">• <strong>Status:</strong> Paid Successfully</li>
    </ul>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
    
    <h3 style="margin: 0 0 15px 0; color: #333;">What You Get (Premium Benefits)</h3>
    <p style="margin: 0 0 10px 0;">You now have access to a complete learning system:</p>
    <ul style="list-style: none; padding: 0; margin: 0 0 20px 0;">
      <li style="margin-bottom: 8px;">• Unlimited AI chatbot access for instant doubt solving</li>
      <li style="margin-bottom: 8px;">• AI-powered quizzes tailored to your progress</li>
      <li style="margin-bottom: 8px;">• Interactive 3D models for better conceptual understanding</li>
    </ul>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
    
    <h3 style="margin: 0 0 15px 0; color: #333;">Platform Demo</h3>
    <p style="margin: 0 0 20px 0;">A full demo of the platform will be shared with you shortly so you can explore all features in detail.</p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
    
    <h3 style="margin: 0 0 15px 0; color: #333;">Tip</h3>
    <p style="margin: 0 0 20px 0;">Consistency matters. Even 30 minutes daily can significantly improve your skills.</p>
    
    <p style="margin: 20px 0;">If you need any help, reply to this email and we will assist you.</p>
    
    <p style="margin: 0;">Best regards,<br>Sedative Physio Team</p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">
    
    <p style="margin: 0; color: #666; font-size: 14px;">
      <strong>Invoice ID:</strong> ${invoiceNumber}<br>
      <strong>Date:</strong> ${invoiceDate}
    </p>
    
    <p style="margin-top: 30px; text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/courses" style="display: inline-block; background: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Start Learning</a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    <p style="color: #666; font-size: 12px; text-align: center;">
      © ${new Date().getFullYear()} Sedative Physio. All rights reserved.
    </p>
  </div>
</body>
</html>`,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
      courseTitle,
      instructor,
      price,
      userEmail,
    } = body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !courseId
    ) {
      return NextResponse.json(
        { error: "Missing payment details" },
        { status: 400 }
      );
    }

    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: "Payment verification failed — signature mismatch" },
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

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Verify order belongs to this user and course
    try {
      const order = await razorpay.orders.fetch(razorpay_order_id);
      
      // Check if order is paid
      if (order.status !== "paid") {
        return NextResponse.json(
          { error: "Order not paid" },
          { status: 400 }
        );
      }

      // Verify order notes match
      const orderCourseId = order.notes?.courseId;
      const orderUserId = order.notes?.userId;

      if (orderCourseId !== String(courseId)) {
        return NextResponse.json(
          { error: "Order mismatch - course ID" },
          { status: 400 }
        );
      }

      if (orderUserId !== user.id) {
        return NextResponse.json(
          { error: "Order mismatch - user ID" },
          { status: 400 }
        );
      }

      // Verify amount matches
      const expectedAmount = Math.round(price * 100);
      if (order.amount !== expectedAmount) {
        return NextResponse.json(
          { error: "Order amount mismatch" },
          { status: 400 }
        );
      }
    } catch (orderError: any) {
      console.error("Razorpay order fetch error:", orderError);
      return NextResponse.json(
        { error: "Failed to verify order with payment gateway" },
        { status: 500 }
      );
    }

    // Check if already enrolled
    const { data: existing } = await supabaseAdmin
      .from("enrollments")
      .select("*")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .single();

    if (existing) {
      // If already enrolled and payment is already paid, return success
      if (existing.payment_status === "paid") {
        return NextResponse.json({
          success: true,
          message: "Already enrolled - payment verified",
          invoiceNumber: existing.invoice_number,
          alreadyEnrolled: true,
        });
      }
      // If enrollment exists but payment wasn't recorded, update it
      const { error: updateError } = await supabaseAdmin
        .from("enrollments")
        .update({
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          payment_status: "paid",
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Enrollment update error:", updateError);
        return NextResponse.json(
          { error: "Payment verified but enrollment update failed. Contact support with payment ID: " + razorpay_payment_id },
          { status: 500 }
        );
      }

      const invoiceNumber = existing.invoice_number || `INV-${Date.now()}-${courseId}`;
      const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Student";
      
      // Send confirmation email (non-blocking)
      sendConfirmationEmail(userEmail, userName, courseTitle, instructor, price, invoiceNumber).catch(
        (e) => console.error("Email error:", e)
      );

      return NextResponse.json({
        success: true,
        message: "Payment verified and enrollment updated",
        invoiceNumber,
      });
    }

    const invoiceNumber = `INV-${Date.now()}-${courseId}`;

    // Insert enrollment with payment info
    const { error: insertError } = await supabaseAdmin
      .from("enrollments")
      .insert({
        user_id: user.id,
        user_email: userEmail,
        course_id: courseId,
        course_title: courseTitle,
        instructor,
        price,
        enrolled_at: new Date().toISOString(),
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        payment_status: "paid",
        invoice_number: invoiceNumber,
      });

    if (insertError) {
      console.error("Enrollment insert error:", insertError);
      return NextResponse.json(
        { error: "Payment verified but enrollment failed. Contact support with payment ID: " + razorpay_payment_id },
        { status: 500 }
      );
    }

    // Send confirmation email (non-blocking)
    const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Student";
    sendConfirmationEmail(userEmail, userName, courseTitle, instructor, price, invoiceNumber).catch(
      (e) => console.error("Email error:", e)
    );

    return NextResponse.json({
      success: true,
      message: "Payment verified and enrollment confirmed",
      invoiceNumber,
    });
  } catch (error: any) {
    console.error("Verify payment error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
