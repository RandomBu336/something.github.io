const express = require("express")
const cors = require("cors")
const bcrypt = require("bcrypt")
const { google } = require("googleapis")
require("dotenv").config()

const app = express()

app.use(cors())
app.use(express.json())

const { parsePhoneNumberFromString } = require("libphonenumber-js");

function validatePhone(phone) {
  const parsed = parsePhoneNumberFromString(phone);

  return parsed && parsed.isValid();
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    project_id: process.env.PROJECT_ID,
    client_email: process.env.CLIENT_EMAIL,
    private_key: process.env.PRIVATE_KEY.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({
  version: "v4",
  auth,
})

const SPREADSHEET_ID = "1iEKE313JudIzb3ld1UntldFiIm4uyrNZFy9KgdLky6I"

app.get("/", (req, res) => {
  res.send("Server is running!")
})
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, gender, age, schoolAttending, phone, gradeLevel } = req.body

    if (!name || !email  || !password || !gender || !age || !schoolAttending || !phone || !gradeLevel) {
      return res.status(400).json({
        message: "Please fill in all fields."
      })
    }

    // Get existing users
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:I",
    })

    const rows = result.data.values || []

    // Check if email already exists
    const emailExists = rows.some(
      (row) => row[2]?.toLowerCase() === email.toLowerCase()
    )

    if (emailExists) {
      return res.status(400).json({
        message: "An account with that email already exists."
      })
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create ID
    const id = rows.length

    // Add user to Google Sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:I",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [id, name, email, hashedPassword, gender, age, schoolAttending, phone, gradeLevel]
        ],
      },
    })

    res.json({
      message: "Account created successfully!"
    })

  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: "Something went wrong."
    })
  }
})
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        message: "Please enter your email and password."
      })
    }

    // Get users from Google Sheets
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Sheet1!A:I",
    })

    const rows = result.data.values || []

    // Find the user by email
    const user = rows.find(
      (row) => row[2]?.toLowerCase() === email.toLowerCase()
    )

    if (!user) {
      return res.status(401).json({
        message: "Incorrect email or password."
      })
    }

    const storedPassword = user[3]

    // Check the password
    const passwordCorrect = await bcrypt.compare(
      password,
      storedPassword
    )

    if (!passwordCorrect) {
      return res.status(401).json({
        message: "Incorrect email or password."
      })
    }

    res.json({
      message: `Welcome back, ${user[1]}! Login is currently not implemented`
    })

  } catch (error) {
    console.error("===== SIGNUP ERROR =====")
    console.error(error)
    console.error("MESSAGE:", error.message)
    console.error("STACK:", error.stack)

    res.status(500).json({
      message: "Something went wrong.",
      error: error.message
    })
  }
})
app.post("/api/signup", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number"
      });
    }

    // Your account creation code goes here

    return res.json({
      success: true
    });

  } catch (error) {
    console.error("Signup error:", error);

    return res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
});

const PORT = process.env.PORT || 5000

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`)
})
