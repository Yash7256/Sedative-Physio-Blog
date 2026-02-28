import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseServer";
import { createServerClient } from "@supabase/ssr";
import nodemailer from "nodemailer";

interface EnrollmentBody {
  courseId: number;
  courseTitle: string;
  instructor: string;
  price: number;
  userEmail: string;
}

async function sendEmailWithGmail(to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Sedative Physio" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: EnrollmentBody = await request.json();
    const { courseId, courseTitle, instructor, price, userEmail } = body;

    if (!userEmail || !courseId || !courseTitle) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      );
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        },
      },
    });

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Session error:", sessionError);
    }

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required", details: sessionError?.message },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    if (supabaseAdmin) {
      const { data: existingEnrollment } = await supabaseAdmin
        .from("enrollments")
        .select("*")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .single();

      if (existingEnrollment) {
        return NextResponse.json(
          { error: "Already enrolled in this course" },
          { status: 400 }
        );
      }

      const { error: insertError } = await supabaseAdmin
        .from("enrollments")
        .insert({
          user_id: userId,
          user_email: userEmail,
          course_id: courseId,
          course_title: courseTitle,
          instructor: instructor,
          price: price,
          enrolled_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("Enrollment insert error:", insertError);
        return NextResponse.json(
          { error: "Failed to enroll" },
          { status: 500 }
        );
      }

      const invoiceNumber = `INV-${Date.now()}-${courseId}`;
      const invoiceDate = new Date().toISOString().split("T")[0];

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Course Enrollment Invoice</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #000; color: #fff; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="margin: 0;">Sedative Physio</h1>
    <p style="margin: 5px 0 0 0; opacity: 0.8;">Learning Platform</p>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Enrollment Confirmed!</h2>
    <p>Dear Student,</p>
    <p>Thank you for enrolling in our course. Your enrollment details are as follows:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Invoice Number</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${invoiceNumber}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Date</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${invoiceDate}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Course</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${courseTitle}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Instructor</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${instructor}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Amount Paid</strong></td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">₹${price}</td>
      </tr>
    </table>
    
    <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
      <strong style="color: #2e7d32;">Payment Status: PAID</strong>
    </div>
    
    <p>You can now access your course content by logging into your account.</p>
    
    <p style="margin-top: 30px;">
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/courses" style="display: inline-block; background: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Start Learning</a>
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="color: #666; font-size: 12px; text-align: center;">
      This is an automated invoice. For any queries, contact us at support@sedativephysio.com<br>
      © ${new Date().getFullYear()} Sedative Physio. All rights reserved.
    </p>
  </div>
</body>
</html>
      `;

      const subject = `Invoice ${invoiceNumber} - Course Enrollment Confirmed`;

      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
          await sendEmailWithGmail(userEmail, subject, emailHtml);
        } catch (gmailError) {
          console.error("Gmail error:", gmailError);
        }
      } else {
        console.log("No email service configured");
      }
    }

    return NextResponse.json({
      success: true,
      message: "Successfully enrolled",
    });
  } catch (error) {
    console.error("Enrollment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
