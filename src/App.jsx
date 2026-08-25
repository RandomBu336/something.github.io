import PhoneInput from 'react-phone-number-input';
import { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useState } from "react"
import "./App.css"


function App() {
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [gender, setGender] = useState("")
  const [age, setAge] = useState("")
  const [schoolAttending, setSchoolAttending] = useState("")
  const [phone, setPhone] = useState("")
  const [gradeLevel, setGradeLevel] = useState("")

  async function handleSubmit(event) {
    event.preventDefault()

    console.log("1. BUTTON CLICKED")
    console.log("2. PHONE:", phone)

    if (!phone) {
      console.log("3. PHONE IS EMPTY")
      setError("Please enter a phone number.")
      return
    }

    console.log("3. PHONE EXISTS")

    const valid = isValidPhoneNumber(phone)

    console.log("4. PHONE VALID:", valid)

    if (!valid) {
      console.log("5. PHONE INVALID")
      setError("Please enter a valid phone number.")
      return
    }

    console.log("6. PHONE IS VALID")

    setError("")

    const endpoint = isLogin ? "/login" : "/signup"

    try {
      console.log("7. SENDING TO SERVER...")
      console.log("ENDPOINT:", endpoint)

      const response = await fetch(
        `https://k-students-union-web.onrender.com${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            password,
            gender,
            age,
            schoolAttending,
            phone,
            gradeLevel,
          }),
        }
      )

      console.log("8. SERVER STATUS:", response.status)

      const data = await response.json()

      console.log("9. SERVER RESPONSE:", data)

      if (!response.ok) {
        console.error("SERVER RETURNED ERROR:", data)

        setError(
          data.error ||
          data.message ||
          `Server error (${response.status})`
        )

        return
      }

      console.log("10. SUCCESS!")

      setError("")

      alert(data.message || "Account created successfully!")

    } catch (error) {
      console.error("SERVER CONNECTION ERROR:", error)

      setError(
        "Could not connect to the server. Please try again."
      )
    }
  }



  return (
    <div className="login-page">
      <div className="login-box">

        <h1>
          {isLogin ? "Welcome Back" : "Create Account"}
        </h1>

        <p>
          {isLogin
            ? "Log in to your account"
            : "Create a new account"}
        </p>

        <form onSubmit={handleSubmit}>

          {!isLogin && (
            <>
              <label>Name</label>

              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </>
          )}

          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {!isLogin && (
            <>
              <label>Gender</label>

              <input
                type="text"
                placeholder="Enter your gender"
                value={gender}
                onChange={(event) => setGender(event.target.value)}
          />
            </>
          )}

          {!isLogin && (
            <>
             <label>Age</label>

              <input
                type="number"
                placeholder="Enter your age"
                value={age}
                onChange={(event) => setAge(event.target.value)}
          /> 
            </>
          )}

          {!isLogin && (
            <>
             <label>School Attending</label>

              <input
                type="text"
                placeholder="Enter your school"
                value={schoolAttending}
                onChange={(event) => setSchoolAttending(event.target.value)}
          /> 
            </>
          )}

           {!isLogin && (
            <>
            <label>Phone Number</label>

              <PhoneInput
                id="phone"
                placeholder="Enter phone number"
                value={phone}
                onChange={(value) => {
                  setPhone(value);
                  setError("");
                }}
                defaultCountry="US" // Change to your preferred default
                countryCallingCodeEditable={false}
          /> 

          {error && <p className="error-message">{error}</p>}
            </>
          )}

           {!isLogin && (
            <>
            <label>Grade Level</label>

            <input
              type="number"
              min="1"
              max="12"
              placeholder="Enter your grade level"
              value={gradeLevel}
              onChange={(event) => setGradeLevel(event.target.value)}
          />
            </>
          )}

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <button type="submit">
            {isLogin ? "Log In" : "Create Account"}
          </button>

        </form>

        <div className="switch">
          {isLogin
            ? "Don't have an account?"
            : "Already have an account?"}

          <button
            type="button"
            className="switch-button"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? "Sign Up" : "Log In"}
          </button>
        </div>

      </div>
    </div>
  )
}

export default App
