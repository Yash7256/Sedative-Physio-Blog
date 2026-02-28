"use client";

import { useState } from "react";
import { X, Check, Loader2 } from "lucide-react";

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

export default function CheckoutModal({ course, isOpen, onClose, userEmail }: CheckoutModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePurchase = async () => {
    if (!userEmail) {
      setError("Please sign in to enroll in this course");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/enrollments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          courseTitle: course.title,
          instructor: course.instructor,
          price: course.price,
          userEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Enrollment failed");
      }

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      
      <div className="relative bg-white rounded-2xl max-w-md w-full p-6 md:p-8 shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {isSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Enrollment Successful!</h3>
            <p className="text-gray-600 mb-4">
              You have been enrolled in <strong>{course.title}</strong>.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              An invoice has been sent to your email: <strong>{userEmail}</strong>
            </p>
            <button
              onClick={handleClose}
              className="px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-900 transition-colors"
            >
              Start Learning
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h2>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex gap-4">
                <img
                  src={course.coverImage}
                  alt={course.title}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div>
                  <h3 className="font-bold text-gray-900">{course.title}</h3>
                  <p className="text-sm text-gray-600">{course.instructor}</p>
                  <p className="text-sm text-gray-500">{course.duration}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Course Price</span>
                <span className="font-bold">₹{course.price}</span>
              </div>
              {course.price === 0 && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Discount</span>
                  <span className="text-green-600 font-bold">-₹{course.price}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-lg font-bold pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>₹0</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            {!userEmail && (
              <div className="bg-yellow-50 text-yellow-700 p-3 rounded-lg mb-4 text-sm">
                Please sign in to complete enrollment
              </div>
            )}

            <button
              onClick={handlePurchase}
              disabled={isProcessing}
              className="w-full py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                "Purchase - ₹0"
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
