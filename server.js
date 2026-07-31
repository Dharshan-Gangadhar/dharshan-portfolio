import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Resend } from "resend";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 🔐 Fix #1: Required for Rate Limiting to work on Render/Heroku/Vercel
// Without this, Render's proxy IP is used, and ALL users share the same rate limit!
app.set("trust proxy", 1);

// Fix #2: Fixed the typo (RESEND_API_KEY)
const resend = new Resend(process.env.RESEND_API_KEY);

// 🔐 Security Headers
app.use(helmet());

// 🔐 Restrict CORS (VERY IMPORTANT)
app.use(
  cors({
    origin: "https://dharshan-portfolio-psi.vercel.app",
    methods: ["POST"],
  })
);

// 🔐 Rate Limiting (Prevents spam)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per IP
  message: { error: "Too many requests. Please try again later." },
});

app.use(limiter);

// 🔐 Fix #3: Limit payload size to 10kb to prevent Denial of Service (DoS) memory crashes
app.use(express.json({ limit: "10kb" }));

// Health check
app.get("/", (req, res) => {
  res.send("Backend is live 🚀");
});

// Contact route
app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  // Basic validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // 🔐 Fix #4: Input Length Validation (Prevents massive payload spam)
  if (name.length > 100 || email.length > 100) {
    return res.status(400).json({ error: "Name or email is too long" });
  }
  if (message.length > 5000) {
    return res.status(400).json({ error: "Message exceeds maximum length of 5000 characters" });
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    await resend.emails.send({
      from: "Portfolio <onboarding@resend.dev>",
      to: process.env.EMAIL,
      subject: `Portfolio Contact from ${name}`,
      reply_to: email,
      text: `
Name: ${name}
Email: ${email}

Message:
${message}
      `,
    });

    res.status(200).json({
      success: true,
      message: "Email sent successfully",
    });

  } catch (error) {
    console.error("Resend error:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
