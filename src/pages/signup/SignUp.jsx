import React, { useState } from "react";
import "./SignUp.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faLock,
  faPhone,
  faBell,
} from "@fortawesome/free-solid-svg-icons"; // Import icons

export default function Signup() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    terms: false,
  });

  const [firstNameError, setFirstNameError] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFirstNameChange = (e) => {
    setForm({ ...form, firstName: e.target.value });
    if (e.target.value.length < 3) {
      setFirstNameError(true);
    } else {
      setFirstNameError(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validation and API call here
    alert("Sign up form submitted!");
  };

  return (
    <div className="signup-container">
      <div className="signup-left">
        <div className="title-container">
          {" "}
          {/* New container for title and icon */}
          <h2>MediAlert</h2>
        </div>
        <p>Smart Medication Reminder & Tracking</p>
        <p className="benefit-line">Never miss your medication again.</p>{" "}
      </div>
      <form className="signup-form" onSubmit={handleSubmit}>
        <h2>Sign up now</h2>
        <div className="form-row">
          <input
            name="firstName"
            placeholder="First name"
            value={form.firstName}
            onChange={handleFirstNameChange}
            required
            className={firstNameError ? "error shake" : "error"}
          />
          {firstNameError && (
            <p className="error-message">
              First name must be at least 3 characters
            </p>
          )}
          <input
            name="lastName"
            placeholder="Last name"
            value={form.lastName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="input-container">
          <FontAwesomeIcon icon={faEnvelope} className="input-icon" />
          <input
            name="email"
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="input-container">
          <FontAwesomeIcon icon={faPhone} className="input-icon" />
          <input
            name="phone"
            type="tel"
            placeholder="Phone number"
            value={form.phone}
            onChange={handleChange}
            required
          />
        </div>
        <div className="input-container">
          <FontAwesomeIcon icon={faLock} className="input-icon" />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              name="terms"
              checked={form.terms}
              onChange={handleChange}
              required
            />
            I agree to the Terms of use and Privacy Policy
          </label>
        </div>
        <button type="submit" className="signup-btn" disabled={!form.terms}>
          Sign up
        </button>
        <p>
          Already have an account? <a href="/login">Log in</a>
        </p>
      </form>
      <div className="how-it-works">
        {" "}
        {/* Add this section */}
        <h3>How it Works</h3>
        <div className="feature">
          <FontAwesomeIcon icon={faBell} className="feature-icon" />
          <p>Reminders: Get notified when it's time to take your medication.</p>
        </div>
        {/* Add other features similarly */}
      </div>
    </div>
  );
}
