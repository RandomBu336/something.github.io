const express = require("express")
const cors = require("cors")
const bcrypt = require("bcrypt")
const { google } = require("googleapis")
const { parsePhoneNumberFromString } = require("libphonenumber-js")
require("dotenv").config()

const app = express()

// =========================
// Middleware
// =========================

app.use(cors())
app.use(express.json())

// =========================
// Configuration
// =========================

const PORT = process.env.PORT || 5000

const SPREADSHEET_ID =
  "1iEKE313JudIzb3ld1UntldFiIm4uyrNZFy9KgdLky6I"

// =========================
// Phone Validation
// =========================

function validatePhone(phone) {
  try {
    const parsed = parsePhoneNumberFromString(phone)

    return parsed ? parsed.isValid() : false
  } catch (error) {
    return false
  }
}

// =========================
// Google Sheets Authentication
// =========================

let sheets

try {
  if (
    !process.env.PROJECT_ID ||
    !process.env.CLIENT_EMAIL ||
    !process.env.PRIVATE_KEY
  ) {
    console.error("=================================")
    console.error("MISSING GOOGLE ENVIRONMENT VARIABLES")
    console.error("=================================")
    console.error(
      "PROJECT_ID:",
      process.env.PROJECT_ID ? "FOUND" : "MISSING"
    )
    console.error(
      "CLIENT_EMAIL:",
      process.env.CLIENT_EMAIL ? "FOUND" : "MISSING"
    )
    console.error(
      "PRIVATE_KEY:",
      process.env.PRIVATE_KEY ? "FOUND" : "MISSING"
    )
  } else {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        project_id: process.env.PROJECT_ID,
        client_email: process.env.CLIENT_EMAIL,
        private_key: process.env.PRIVATE_KEY.replace(/\\n/g, "\n"),
      },
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
      ],
    })

    sheets = google.sheets({
      version: "v4",
      auth,
    })

    console.log("Google Sheets authentication configured.")
  }
} catch (error) {
  console.error("GOOGLE AUTH SETUP ERROR:")
  console.error(error.message)
}

// =========================
// Home Page
// =========================

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>K Students Union API</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            padding: 40px;
          }

          .container {
            max-width: 700px;
            margin: auto;
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }

          h1 {
            color: #222;
          }

          .success {
            color: green;
            font-weight: bold;
          }

          .route {
            background: #f0f0f0;
            padding: 10px;
            margin: 8px 0;
            border-radius: 6px;
            font-family: monospace;
          }
        </style>
      </head>

      <body>
        <div class="container">
          <h1>K Students Union Backend</h1>

          <p class="success">
            ✓ Server is running
          </p>

          <p>
            Backend is online and responding.
          </p>

          <h2>Available Routes</h2>

          <div class="route">GET /</div>
          <div class="route">GET /test</div>
          <div class="route">GET /signup</div>
          <div class="route">POST /signup</div>
          <div class="route">POST /login</div>

          <h2>Tests</h2>

          <p>
            <a href="/test">Test backend</a>
          </p>

          <p>
            <a href="/signup">Test signup endpoint</a>
          </p>
        </div>
      </body>
    </html>
  `)
})

// =========================
// Test Route
// =========================

app.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Backend is working!",
    googleSheetsConfigured: !!sheets,
    timestamp: new Date().toISOString(),
  })
})

// =========================
// Signup GET Route
// =========================

app.get("/signup", (req, res) => {
  res.send(`
    <h1>Signup endpoint exists</h1>

    <p>
      The <strong>/signup</strong> endpoint requires a POST request.
    </p>

    <p>
      Your React frontend should send POST requests here.
    </p>
  `)
})

// =========================
// SIGNUP
// =========================

app.post("/signup", async (req, res) => {
  console.log("=================================")
  console.log("SIGNUP REQUEST RECEIVED")
  console.log("=================================")

  try {
    if (!sheets) {
      return res.status(500).json({
        message: "Google Sheets is not configured.",
        error:
          "Missing PROJECT_ID, CLIENT_EMAIL, or PRIVATE_KEY environment variable.",
      })
    }

    const {
      name,
      email,
      password,
      gender,
      age,
      schoolAttending,
      phone,
      gradeLevel,
    } = req.body

    console.log("Checking required fields...")

    if (
      !name ||
      !email ||
      !password ||
      !gender ||
      !age ||
      !schoolAttending ||
      !phone ||
      !gradeLevel
    ) {
      return res.status(400).json({
        message: "Please fill in all fields.",
      })
    }

    console.log("Checking phone number...")

    if (!validatePhone(phone)) {
      return res.status(400).json({
        message: "Invalid phone number.",
      })
    }

    console.log("Phone number is valid.")

    // =========================
    // Get existing users
    // =========================

    console.log("Reading Google Sheet...")

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:I",
    })

    console.log("Google Sheet read successfully.")

    const rows = result.data.values || []

    // =========================
    // Check email
    // =========================

    const emailExists = rows.some(
      (row) =>
        row[2]?.toLowerCase() === email.toLowerCase()
    )

    if (emailExists) {
      return res.status(400).json({
        message:
          "An account with that email already exists.",
      })
    }

    // =========================
    // Hash Password
    // =========================

    console.log("Hashing password...")

    const hashedPassword = await bcrypt.hash(
      password,
      10
    )

    // =========================
    // Create ID
    // =========================

    const id = rows.length

    console.log("New user ID:", id)

    // =========================
    // Add User
    // =========================

    console.log("Writing user to Google Sheet...")

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:I",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            id,
            name,
            email,
            hashedPassword,
            gender,
            age,
            schoolAttending,
            phone,
            gradeLevel,
          ],
        ],
      },
    })

    console.log("User successfully added.")

    return res.status(200).json({
      message: "Account created successfully!",
    })
  } catch (error) {
    console.error("=================================")
    console.error("SIGNUP ERROR")
    console.error("=================================")
    console.error("Message:", error.message)
    console.error("Stack:", error.stack)

    return res.status(500).json({
      message: "Signup failed.",
      error: error.message,
    })
  }
})

// =========================
// LOGIN
// =========================

app.post("/login", async (req, res) => {
  console.log("=================================")
  console.log("LOGIN REQUEST RECEIVED")
  console.log("=================================")

  try {
    if (!sheets) {
      return res.status(500).json({
        message: "Google Sheets is not configured.",
        error:
          "Missing PROJECT_ID, CLIENT_EMAIL, or PRIVATE_KEY environment variable.",
      })
    }

    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Please enter your email and password.",
      })
    }

    console.log("Reading Google Sheet...")

    const result =
      await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "Sheet1!A:I",
      })

    const rows = result.data.values || []

    console.log("Google Sheet read successfully.")

    const user = rows.find(
      (row) =>
        row[2]?.toLowerCase() === email.toLowerCase()
    )

    if (!user) {
      return res.status(401).json({
        message: "Incorrect email or password.",
      })
    }

    const storedPassword = user[3]

    console.log("Checking password...")

    const passwordCorrect =
      await bcrypt.compare(
        password,
        storedPassword
      )

    if (!passwordCorrect) {
      return res.status(401).json({
        message: "Incorrect email or password.",
      })
    }

    console.log("Login successful.")

    return res.status(200).json({
      message: `Welcome back, ${user[1]}!`,
    })
  } catch (error) {
    console.error("=================================")
    console.error("LOGIN ERROR")
    console.error("=================================")
    console.error("Message:", error.message)
    console.error("Stack:", error.stack)

    return res.status(500).json({
      message: "Login failed.",
      error: error.message,
    })
  }
})

// =========================
// 404 Handler
// =========================

app.use((req, res) => {
  res.status(404).send(`
    <h1>404 - Route Not Found</h1>
    <p>
      The route <strong>${req.method} ${req.originalUrl}</strong>
      does not exist.
    </p>
  `)
})

// =========================
// Start Server
// =========================

app.listen(PORT, "0.0.0.0", () => {
  console.log("=================================")
  console.log("K STUDENTS UNION SERVER")
  console.log("=================================")
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || "production"}`)
  console.log(
    `Google Sheets configured: ${!!sheets}`
  )
})
