const express = require("express");
const mysql = require("mysql");
const bcrypt = require("bcryptjs");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE,
});

exports.register = (req, res) => {
  console.log(req.body);

  const { uname, email, pass1 } = req.body;

  // Check if the email already exists in the database
  db.query(
    "SELECT email FROM register WHERE email = ?",
    [email],
    async (error, results) => {
      if (error) {
        console.log(error);
        //return res.status(500).send('<center><h1>Internal Server Error</h1></center>');
      } else if (results.length > 0) {
        return res.json({
          status: "error",
          message: "Email ID already exists",
        });
      }

      // Hash the password
      let hashedPassword = await bcrypt.hash(pass1, 8);
      console.log(hashedPassword);

      // Insert the new user into the database
      db.query(
        "INSERT INTO register SET ?",
        { uname: uname, email: email, pass1: hashedPassword },
        (error, result) => {
          if (error) {
            console.log(error);
            return res
              .status(500)
              .send("<center><h1>Internal Server Error</h1></center>");
          }

          res.redirect("/login");
        }
      );
    }
  );
};

// Modify login function to store email in session
exports.login = (req, res) => {
  const { email, pass1 } = req.body;

  if (!email || !pass1) {
    return res
      .status(400)
      .json({ message: "Please enter both email and password." });
  }

  const sql = "SELECT * FROM register WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    if (results.length === 0) {
      return res
        .status(401)
        .json({ message: "Email ID or password is invalid" });
    }

    const user = results[0];
    bcrypt.compare(pass1, user.pass1, (err, isMatch) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (!isMatch) {
        return res
          .status(401)
          .json({ message: "Email ID or password is invalid" });
      }

      // ✅ Store user email in session
      req.session.user_email = user.email;
      console.log("✅ Session Set:", req.session.user_email); // ✅ Debug session storage

      res.redirect("/MediGo.html"); // Redirect user after successful login
    });
  });
};

exports.Adminlogin = (req, res) => {
  console.log(req.body);
  const { AdminId, Password } = req.body;

  if (!AdminId || !Password) {
    return res
      .status(400)
      .json({ message: "Please enter both AdminId and password." });
  }

  // Check if user exists in the database
  const sql = "SELECT * FROM admin WHERE AdminId = ?";
  db.query(sql, [AdminId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal Server Error" });
    }

    if (results.length === 0) {
      return res
        .status(401)
        .json({ message: "Admin Id or password are invalid" });
    }

    // Compare the entered password with the stored hashed password
    const user = results[0];
    bcrypt.compare(Password, user.Password, (err, isMatch) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal Server Error" });
      }

      if (!isMatch) {
        return res
          .status(401)
          .json({ message: "Admin Id or password are invalid" });
      }

      // Redirect to home page on successful login
      res.redirect("/AdminDashboard.html");
    });
  });
};

exports.AddDoctors = async (req, res) => {
  console.log(req.body);

  const {
    doctor_id,
    doctor_password,
    first_name,
    last_name,
    date_of_birth,
    age,
    gender,
    email,
    phone_number,
    permanent_address,
    current_address,
    doctor_specialty,
  } = req.body;

  if (!doctor_password) {
    return res.status(400).json({ message: "Password is required!" });
  }

  let plainPassword = doctor_password; // Store password as plain text

  const image_path = req.file ? req.file.filename : "default.jpg"; // ✅ Fix here

  const sql = `INSERT INTO DoctorsDetails (doctor_id, doctor_password, first_name, last_name, date_of_birth, age, gender, email, phone_number, permanent_address, current_address, doctor_specialty, image_path) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const values = [
    doctor_id,
    plainPassword, // ✅ Storing password as plain text
    first_name,
    last_name,
    date_of_birth,
    age,
    gender,
    email,
    phone_number,
    permanent_address,
    current_address,
    doctor_specialty,
    image_path,
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Error inserting doctor details:", err);
      res.status(500).json({ message: "Error adding doctor", error: err });
    } else {
      res.status(200).json({ message: "Doctor added successfully!" });
    }
  });
};

exports.deleteDoctor = (req, res) => {
  const doctor_id = req.params.id;

  // Get image path from the database
  const sql = "SELECT image_path FROM DoctorsDetails WHERE doctor_id = ?";

  db.query(sql, [doctor_id], (err, result) => {
    if (err) {
      console.error("Error fetching doctor image:", err);
      return res.status(500).json({ message: "Error fetching doctor details" });
    }

    if (result.length > 0) {
      const imagePath = path.join(
        __dirname,
        "../uploads",
        result[0].image_path
      );

      // ✅ Check if the file exists before deleting
      if (fs.existsSync(imagePath)) {
        fs.unlink(imagePath, (err) => {
          if (err) {
            console.error("Error deleting image:", err);
          }
        });
      }

      // ✅ Delete doctor from the database
      const deleteSql = "DELETE FROM DoctorsDetails WHERE doctor_id = ?";
      db.query(deleteSql, [doctor_id], (err, result) => {
        if (err) {
          console.error("Error deleting doctor:", err);
          return res.status(500).json({ message: "Error deleting doctor" });
        }
        res.status(200).json({ message: "Doctor deleted successfully" });
      });
    } else {
      res.status(404).json({ message: "Doctor not found" });
    }
  });
};

// ✅ Fetch Doctor By ID
exports.getDoctorById = (req, res) => {
  const doctor_id = req.params.id;
  const sql = "SELECT * FROM DoctorsDetails WHERE doctor_id = ?";

  db.query(sql, [doctor_id], (err, result) => {
    if (err) {
      console.error("❌ Error fetching doctor details:", err);
      return res.status(500).json({ message: "Error fetching doctor details" });
    }
    if (result.length > 0) {
      const doctor = result[0];

      console.log("📌 Doctor DOB from DB:", doctor.date_of_birth); // ✅ Debug raw date

      // ✅ Fix the timezone issue
      let formattedDOB = new Date(doctor.date_of_birth);
      formattedDOB.setHours(
        formattedDOB.getHours() + 5,
        formattedDOB.getMinutes() + 30
      ); // Convert UTC to IST
      console.log(
        "📌 Fixed Date in Backend:",
        formattedDOB.toISOString().split("T")[0]
      );

      doctor.date_of_birth = formattedDOB.toISOString().split("T")[0]; // Send Correct Date

      res.status(200).json(doctor);
    } else {
      res.status(404).json({ message: "Doctor not found" });
    }
  });
};

// ✅ Update Doctor Details
exports.updateDoctor = async (req, res) => {
  const doctor_id = req.params.id;
  const {
    doctor_password,
    first_name,
    last_name,
    date_of_birth,
    age,
    gender,
    email,
    phone_number,
    permanent_address,
    current_address,
    doctor_specialty,
  } = req.body;

  try {
    let hashedPassword;

    if (doctor_password) {
      hashedPassword = await bcrypt.hash(doctor_password, 8);
    } else {
      // Fetch the existing password if not updated
      const getPasswordSQL =
        "SELECT doctor_password FROM DoctorsDetails WHERE doctor_id = ?";
      db.query(getPasswordSQL, [doctor_id], (err, results) => {
        if (err) {
          console.error("❌ Error fetching old password:", err);
          return res
            .status(500)
            .json({ message: "Error updating doctor password" });
        }
        if (results.length > 0) {
          hashedPassword = results[0].doctor_password;
        } else {
          return res.status(404).json({ message: "Doctor not found" });
        }

        // Call update function after fetching the password
        updateDoctorInDB();
      });
      return;
    }

    updateDoctorInDB();

    function updateDoctorInDB() {
      const formattedDOB = new Date(date_of_birth).toISOString().split("T")[0];

      const sql = `UPDATE DoctorsDetails 
                      SET doctor_password=?, first_name=?, last_name=?, date_of_birth=?, age=?, gender=?, email=?, phone_number=?, permanent_address=?, current_address=?, doctor_specialty=? 
                      WHERE doctor_id=?`;

      const values = [
        hashedPassword,
        first_name,
        last_name,
        formattedDOB,
        age,
        gender,
        email,
        phone_number,
        permanent_address,
        current_address,
        doctor_specialty,
        doctor_id,
      ];

      db.query(sql, values, (err, result) => {
        if (err) {
          console.error("❌ Error updating doctor:", err);
          return res
            .status(500)
            .json({ message: "Error updating doctor", error: err });
        }
        console.log("✅ Doctor updated successfully!");
        res.status(200).json({ message: "Doctor updated successfully!" });
      });
    }
  } catch (err) {
    console.error("❌ Error updating doctor:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

//For storing doctors absentese
exports.submitAttendance = (req, res) => {
  console.log("✅ Received Attendance Data:", req.body);

  let { doctor_id, doctor_name, doctor_specialty, leave_date } = req.body;

  // Insert into database
  const sql = `INSERT INTO DoctorAttendance (doctor_id, doctor_name, doctor_specialty, leave_date) 
               VALUES (?, ?, ?, ?)`;

  const values = [doctor_id, doctor_name, doctor_specialty, leave_date];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("❌ Error inserting attendance record:", err);
      return res
        .status(500)
        .json({ message: "Error submitting attendance", error: err });
    }
    console.log("✅ Attendance stored successfully!");
    res.status(200).json({ message: "Attendance submitted successfully!" });
  });
};
