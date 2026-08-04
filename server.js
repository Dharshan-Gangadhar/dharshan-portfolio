import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Resend } from "resend";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

// Prevents app crash if key is missing during startup
const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.warn("⚠️ RESEND_API_KEY is not defined in environment variables!");
}
const resend = new Resend(apiKey || "placeholder_key");

app.use(helmet());

app.use(
  cors({
    origin: "https://dharshan-portfolio-psi.vercel.app",
    methods: ["POST"],
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many requests. Please try again later." },
});

app.use(limiter);
app.use(express.json({ limit: "10kb" }));

app.get("/", (req, res) => {
  res.send("Backend is live 🚀");
});

app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (name.length > 100 || email.length > 100) {
    return res.status(400).json({ error: "Name or email is too long" });
  }
  if (message.length > 5000) {
    return res.status(400).json({ error: "Message exceeds maximum length of 5000 characters" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    await resend.emails.send({
      from: "Portfolio <onboarding@resend.dev>",
      to: process.env.EMAIL,
      subject: `Portfolio Contact from ${name}`,
      replyTo: email, // Fixed: camelCase for Resend v2+
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
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
