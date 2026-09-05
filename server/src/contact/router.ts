import { Router } from "express"
import { sendContactEmail } from "./service.js"
import { handleError } from "../enrollments/errors.js"

export const contactRouter = Router()

contactRouter.post("/", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body as Record<string, string>

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !message?.trim()) {
      res.status(400).json({ error: "First name, last name, email, and message are required." })
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Invalid email address." })
      return
    }

    await sendContactEmail({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone?.trim() ?? "",
      message: message.trim(),
    })

    res.status(200).json({ success: true })
  } catch (err) {
    handleError(err, res)
  }
})
