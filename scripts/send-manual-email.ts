import nodemailer from "nodemailer";
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function sendConfirmationEmail(
  to: string,
  userName: string,
  courseTitle: string,
  instructor: string,
  price: number,
  invoiceNumber: string,
  enrolledAt: string
) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email credentials not configured");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  const invoiceDate = new Date(enrolledAt).toLocaleDateString("en-IN", {
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

async function getUserName(userId: string): Promise<string> {
  const { data } = await supabase.auth.admin.getUserById(userId);
  return data?.user?.user_metadata?.full_name || data?.user?.email?.split("@")[0] || "Student";
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
📧 Sedative Physio - Manual Email Sender

Usage:
  npx tsx scripts/send-manual-email.ts all              - Send to all paid enrollments
  npx tsx scripts/send-manual-email.ts user <user_id>   - Send to specific user
  npx tsx scripts/send-manual-email.ts email <email>    - Send to specific email
`);
    return;
  }

  const command = args[0];
  let enrollments: any[] = [];

  if (command === "all") {
    const { data, error } = await supabase
      .from("enrollments")
      .select("*")
      .eq("payment_status", "paid");
    
    if (error) throw error;
    enrollments = data || [];
  } else if (command === "user" && args[1]) {
    const { data, error } = await supabase
      .from("enrollments")
      .select("*")
      .eq("user_id", args[1])
      .eq("payment_status", "paid");
    
    if (error) throw error;
    enrollments = data || [];
  } else if (command === "email" && args[1]) {
    const { data, error } = await supabase
      .from("enrollments")
      .select("*")
      .eq("user_email", args[1])
      .eq("payment_status", "paid");
    
    if (error) throw error;
    enrollments = data || [];
  } else {
    console.error("Invalid command");
    return;
  }

  console.log(`Found ${enrollments.length} enrollment(s)`);

  for (const enrollment of enrollments) {
    const userName = await getUserName(enrollment.user_id);
    
    try {
      await sendConfirmationEmail(
        enrollment.user_email,
        userName,
        enrollment.course_title,
        enrollment.instructor,
        enrollment.price,
        enrollment.invoice_number,
        enrollment.enrolled_at
      );
      console.log(`✅ Sent to ${enrollment.user_email} (${enrollment.course_title})`);
    } catch (error: any) {
      console.error(`❌ Failed to send to ${enrollment.user_email}: ${error.message}`);
    }
  }
}

main().catch(console.error);
