import { useState } from "react"
import "./App.css"

function Members() {
  const [members, setMembers] = useState([])

  return (
    <div className="members-page">
      <h1>Members</h1>
      <p>Welcome to the members page!</p>
    </div>
  )
}

export default Members