"use client";

import { useState, useEffect } from "react";
import { X, Check, Loader2, ShieldCheck, CreditCard, Smartphone, Wallet } from "lucide-react";

interface Course {
  id: number;
  title: string;
  instructor: string;
  duration: string;
  price: number;
  description: string;
  coverImage: string;
}

interface CheckoutModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  userEmail: string | null;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutModal({ course, isOpen, onClose, userEmail }: CheckoutModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);

  useEffect(() => { if (isOpen) loadRazorpayScript(); }, [isOpen]);

  if (!isOpen) return null;

  const isFree = course.price === 0;

  const handleFreeEnroll = async () => {
    if (!userEmail) { setError("Please sign in to enroll"); return; }
    setIsProcessing(true); setError(null);
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, courseTitle: course.title, instructor: course.instructor, price: 0, userEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enrollment failed");
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally { setIsProcessing(false); }
  };

  const handlePaidEnroll = async () => {
    if (!userEmail) { setError("Please sign in to enroll"); return; }
    setIsProcessing(true); setError(null);
    try {
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) throw new Error("Failed to load payment gateway. Check your connection.");

      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, courseTitle: course.title, price: course.price }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Failed to create order");

      await new Promise<void>((resolve, reject) => {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "Sedative Physio",
          description: course.title,
          order_id: orderData.orderId,
          prefill: { email: userEmail },
          theme: { color: "#000000" },
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              const verifyRes = await fetch("/api/payment/verify", {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...response, courseId: course.id, courseTitle: course.title, instructor: course.instructor, price: course.price, userEmail }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");
              setInvoiceNumber(verifyData.invoiceNumber || null);
              resolve();
            } catch (err) { reject(err); }
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", (r: any) => reject(new Error(r?.error?.description || "Payment failed")));
        rzp.open();
      });
      setIsSuccess(true);
    } catch (err: any) {
      if (err?.message !== "Payment cancelled") setError(err.message || "Something went wrong");
    } finally { setIsProcessing(false); }
  };

  const handleClose = () => {
    if (isProcessing) return;
    setIsSuccess(false); setError(null); setInvoiceNumber(null); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        <div className="bg-black text-white px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-lg">{isSuccess ? "Enrollment Confirmed" : "Checkout"}</span>
          <button onClick={handleClose} disabled={isProcessing} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 md:p-8">
          {isSuccess ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{isFree ? "Enrolled!" : "Payment Successful!"}</h3>
              <p className="text-gray-600 mb-2">You are now enrolled in <strong>{course.title}</strong>.</p>
              {invoiceNumber && <p className="text-sm text-gray-500 mb-1">Invoice: <strong>{invoiceNumber}</strong></p>}
              <p className="text-sm text-gray-500 mb-6">Confirmation sent to <strong>{userEmail}</strong></p>
              <button onClick={handleClose} className="px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-900 transition-colors">
                Start Learning →
              </button>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 rounded-xl p-4 mb-5 flex gap-4">
                <img src={course.coverImage} alt={course.title} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-gray-900 leading-tight">{course.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{course.instructor}</p>
                  <p className="text-sm text-gray-400">{course.duration}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-5 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Course price</span><span>₹{course.price}</span>
                </div>
                {isFree && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>Free enrollment</span><span>-₹{course.price}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                  <span>Total</span><span>{isFree ? "Free" : `₹${course.price}`}</span>
                </div>
              </div>

              {!isFree && (
                <div className="flex items-center gap-3 mb-5 p-3 bg-blue-50 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-blue-800">Secure payment via Razorpay</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-blue-600"><CreditCard className="w-3 h-3" /> Cards</span>
                      <span className="flex items-center gap-1 text-xs text-blue-600"><Smartphone className="w-3 h-3" /> UPI</span>
                      <span className="flex items-center gap-1 text-xs text-blue-600"><Wallet className="w-3 h-3" /> Wallets</span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</div>
              )}
              {!userEmail && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-3 rounded-lg mb-4 text-sm">
                  Please sign in to complete enrollment
                </div>
              )}

              <button
                onClick={isFree ? handleFreeEnroll : handlePaidEnroll}
                disabled={isProcessing || !userEmail}
                className="w-full py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />{isFree ? "Enrolling..." : "Processing..."}</>
                ) : isFree ? "Enroll for Free" : `Pay ₹${course.price} via Razorpay`}
              </button>

              {!isFree && (
                <p className="text-xs text-center text-gray-400 mt-3">
                  🔒 Secured by Razorpay. We do not store your card details.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
