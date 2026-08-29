import { Router } from "express"
import { clerkClient } from "@clerk/express"

import { errorMessage } from "../errors.js"

const PASSWORD_RULES = {
  minLength: 8,
  hasUpperCase: /[A-Z]/,
  hasLowerCase: /[a-z]/,
  hasNumber: /\d/,
  hasSymbol: /[^A-Za-z0-9]/,
}

function validatePassword(password: string): string | null {
  const checks: [boolean, string][] = [
    [password.length >= PASSWORD_RULES.minLength, `at least ${PASSWORD_RULES.minLength} characters`],
    [PASSWORD_RULES.hasUpperCase.test(password), "an uppercase letter"],
    [PASSWORD_RULES.hasLowerCase.test(password), "a lowercase letter"],
    [PASSWORD_RULES.hasNumber.test(password), "a number"],
    [PASSWORD_RULES.hasSymbol.test(password), "a symbol"],
  ]

  const failed = checks.filter(([pass]) => !pass).map(([, label]) => label)
  if (failed.length === 0) return null

  return `Password must include ${failed.join(", ")}.`
}

export const registerRouter = Router()

registerRouter.post("/", async (req, res) => {
  const { email, password, firstName, lastName } = req.body ?? {}

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" })
  }

  const passwordError = validatePassword(String(password))
  if (passwordError) {
    return res.status(422).json({ error: passwordError })
  }

  try {
    const user = await clerkClient.users.createUser({
      emailAddress: [email],
      password,
      firstName,
      lastName,
      skipPasswordChecks: true,
    })

    return res.status(201).json({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
    })
  } catch (error) {
    return res.status(400).json({ error: errorMessage(error, "Registration failed") })
  }
})
