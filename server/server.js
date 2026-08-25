const express = require("express")
const cors = require("cors")
const bcrypt = require("bcrypt")
const { google } = require("googleapis")
const { parsePhoneNumberFromString } = require("libphonenumber-js")

require("dotenv").config()

const app = express()

// ==================================================
// CONFIGURATION
// ==================================================

const PORT = process.env.PORT || 5000

const SPREADSHEET_ID =
  "1iEKE313JudIzb3ld1UntldFiIm4uyrNZFy9KgdLky6I"

// ==================================================
// MIDDLEWARE
// ==================================================

app.use(cors())
app.use(express.json())

// ==================================================
// GOOGLE SHEETS
// ==================================================

let sheets = null
let googleSetupError = null

try {
  if (!process.env.GOOGLE_CREDENTIALS_BASE64) {
    throw new Error(
      "GOOGLE_CREDENTIALS_BASE64 environment variable is missing."
    )
  }

  const credentialsJson = Buffer.from(
    process.env.GOOGLE_CREDENTIALS_BASE64,
    "base64"
  ).toString("utf8")

  const credentials = JSON.parse(credentialsJson)

  if (
    !credentials.project_id ||
    !credentials.client_email ||
    !credentials.private_key
  ) {
    throw new Error(
      "Google credentials are missing project_id, client_email, or private_key."
    )
  }

  const auth = new google.auth.GoogleAuth({
    credentials: credentials,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
    ],
  })

  sheets = google.sheets({
    version: "v4",
    auth,
  })

  console.log("=================================")
  console.log("GOOGLE SHEETS AUTHENTICATION")
  console.log("=================================")
  console.log("Google credentials loaded successfully.")
  console.log("Google project:", credentials.project_id)
  console.log("Google account:", credentials.client_email)
} catch (error) {
  googleSetupError = error.message

  console.error("=================================")
  console.error("GOOGLE AUTHENTICATION ERROR")
  console.error("=================================")
  console.error(error.message)
}

// ==================================================
// PHONE VALIDATION
// ==================================================

function validatePhone(phone) {
  try {
    const parsed = parsePhoneNumberFromString(phone)

    if (!parsed) {
      return false
    }

    return parsed.isValid()
  } catch (error) {
    return false
  }
}

// ==================================================
// HOME PAGE
// ==================================================

app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>K Students Union Backend</title>

  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f4f4f4;
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
      margin-top: 0;
    }

    .success {
      color: #16803c;
      font-weight: bold;
    }

    .error {
      color: #c62828;
      font-weight: bold;
    }

    code {
      background: #eee;
      padding: 3px 6px;
      border-radius: 4px;
    }

    .route {
      background: #f1f1f1;
      padding: 10px;
      margin: 8px 0;
      border-radius: 6px;
    }
  </style>
</head>

<body>

<div class="container">

  <h1>K Students Union Backend</h1>

  <p class="success">
    ✓ Express server is running
  </p>

  <h2>Server Status</h2>

  <p>
    Port: <code>${PORT}</code>
  </p>

  <p>
    Google Sheets:
    ${
      sheets
        ? '<span class="success">✓ Configured</span>'
        : '<span class="error">✗ Not configured</span>'
    }
  </p>

  ${
    googleSetupError
      ? `
      <p class="error">
        Google Error: ${googleSetupError}
      </p>
      `
      : ""
  }

  <h2>Routes</h2>

  <div class="route">
    GET /
  </div>

  <div class="route">
    GET /test
  </div>

  <div class="route">
    GET /signup
  </div>

  <div class="route">
    POST /signup
  </div>

  <div class="route">
    POST /login
  </div>

  <h2>Tests</h2>

  <p>
    <a href="/test">
      Test backend
    </a>
  </p>

  <p>
    <a href="/signup">
      Test signup endpoint
    </a>
  </p>

</div>

</body>
</html>
  `)
})

// ==================================================
// TEST ROUTE
// ==================================================

app.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Backend is working!",
    googleSheetsConfigured: !!sheets,
    googleSetupError: googleSetupError,
    timestamp: new Date().toISOString(),
  })
})

// ==================================================
// SIGNUP GET
// ==================================================

app.get("/signup", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Signup Endpoint</title>
</head>

<body>

<h1>Signup endpoint exists</h1>

<p>
  The <strong>POST /signup</strong> endpoint is online.
</p>

<p>
  A GET request cannot create an account.
</p>

<p>
  Your React website should send a POST request here.
</p>

</body>
</html>
  `)
})

// ==================================================
// SIGNUP POST
// ==================================================

app.post("/signup", async (req, res) => {
  console.log("=================================")
  console.log("SIGNUP REQUEST")
  console.log("=================================")

  try {
    // ----------------------------------------------
    // Check Google configuration
    // ----------------------------------------------

    if (!sheets) {
      return res.status(500).json({
        success: false,
        message: "Google Sheets is not configured.",
        error: googleSetupError,
      })
    }

    // ----------------------------------------------
    // Get form data
    // ----------------------------------------------

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

    console.log("Signup email:", email)
    console.log("Signup phone:", phone)

    // ----------------------------------------------
    // Required fields
    // ----------------------------------------------

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
        success: false,
        message: "Please fill in all fields.",
      })
    }

    // ----------------------------------------------
    // Phone validation
    // ----------------------------------------------

    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number.",
      })
    }

    // ----------------------------------------------
    // Read Google Sheet
    // ----------------------------------------------

    console.log("Reading Google Sheet...")

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:I",
    })

    console.log("Google Sheet read successfully.")

    const rows = result.data.values || []

    // ----------------------------------------------
    // Check duplicate email
    // ----------------------------------------------

    const emailExists = rows.some(
      (row) =>
        row[2] &&
        row[2].toLowerCase() === email.toLowerCase()
    )

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message:
          "An account with that email already exists.",
      })
    }

    // ----------------------------------------------
    // Hash password
    // ----------------------------------------------

    console.log("Hashing password...")

    const hashedPassword = await bcrypt.hash(
      password,
      10
    )

    // ----------------------------------------------
    // Create user ID
    // ----------------------------------------------

    const id = rows.length

    // ----------------------------------------------
    // Add user to Google Sheet
    // ----------------------------------------------

    console.log("Adding user to Google Sheet...")

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
      success: true,
      message: "Account created successfully!",
    })
  } catch (error) {
    console.error("=================================")
    console.error("SIGNUP ERROR")
    console.error("=================================")
    console.error("Error message:", error.message)
    console.error("Error code:", error.code)
    console.error("Full error:", error)

    return res.status(500).json({
      success: false,
      message: "Signup failed.",
      error: error.message,
      code: error.code || null,
    })
  }
})

// ==================================================
// LOGIN
// ==================================================

app.post("/login", async (req, res) => {
  console.log("=================================")
  console.log("LOGIN REQUEST")
  console.log("=================================")

  try {
    // ----------------------------------------------
    // Check Google configuration
    // ----------------------------------------------

    if (!sheets) {
      return res.status(500).json({
        success: false,
        message: "Google Sheets is not configured.",
        error: googleSetupError,
      })
    }

    const {
      email,
      password,
    } = req.body

    // ----------------------------------------------
    // Validate input
    // ----------------------------------------------

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter your email and password.",
      })
    }

    // ----------------------------------------------
    // Read Google Sheet
    // ----------------------------------------------

    console.log("Reading Google Sheet...")

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:I",
    })

    const rows = result.data.values || []

    // ----------------------------------------------
    // Find user
    // ----------------------------------------------

    const user = rows.find(
      (row) =>
        row[2] &&
        row[2].toLowerCase() === email.toLowerCase()
    )

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Incorrect email or password.",
      })
    }

    // ----------------------------------------------
    // Check password
    // ----------------------------------------------

    const storedPassword = user[3]

    const passwordCorrect =
      await bcrypt.compare(
        password,
        storedPassword
      )

    if (!passwordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Incorrect email or password.",
      })
    }

    console.log("Login successful.")

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user[1]}!`,
    })
  } catch (error) {
    console.error("=================================")
    console.error("LOGIN ERROR")
    console.error("=================================")
    console.error("Error message:", error.message)
    console.error("Error code:", error.code)
    console.error("Full error:", error)

    return res.status(500).json({
      success: false,
      message: "Login failed.",
      error: error.message,
      code: error.code || null,
    })
  }
})

// ==================================================
// 404
// ==================================================

app.use((req, res) => {
  res.status(404).send(`
<!DOCTYPE html>
<html>
<head>
  <title>404</title>
</head>

<body>

<h1>404 - Route Not Found</h1>

<p>
  <strong>${req.method}</strong>
  ${req.originalUrl}
</p>

</body>
</html>
  `)
})

// ==================================================
// START SERVER
// ==================================================

app.listen(PORT, "0.0.0.0", () => {
  console.log("=================================")
  console.log("K STUDENTS UNION SERVER")
  console.log("=================================")
  console.log("Server running on port:", PORT)
  console.log(
    "Google Sheets configured:",
    !!sheets
  )
})
