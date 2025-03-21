const express = require ('express');
const authController =require('../controllers/auth');
const path = require ('path');
const multer = require('multer');
const router = express.Router();
const mysql = require ("mysql");
const nodemailer = require("nodemailer");
const session = require("express-session");
const cors = require("cors");
const bcrypt = require("bcryptjs");

router.use(cors());


// Setup multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

require('dotenv').config(); 
router.use(session({
  secret: process.env.SESSION_SECRET, // Replace with a strong secret key
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set `true` if using HTTPS
}));

const db=mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

const app =express();
app.use(express.static(path.join(__dirname, '../public')));

router.post('/register',authController.register);
router.post('/login',authController.login);
router.post('/Adminlogin',authController.Adminlogin);

// ✅ Now use multer for image upload while adding doctor
router.post('/AddDoctors', upload.single('image_path'), authController.AddDoctors);

// ✅ Get all doctors
router.get("/getDoctors", (req, res) => {
    const sql = "SELECT * FROM DoctorsDetails";
  
    db.query(sql, (err, results) => {
      if (err) {
        console.error("Error fetching doctors data:", err);
        res.status(500).json({ message: "Error fetching doctors data", error: err });
      } else {
        res.status(200).json(results);
      }
    });
});

// ✅ Get doctor image by ID
router.get("/getDoctorImage/:id", (req, res) => {
    const doctorId = req.params.id;
    const sql = "SELECT image_path FROM DoctorsDetails WHERE doctor_id = ?";
  
    db.query(sql, [doctorId], (err, results) => {
      if (err) {
        console.error("Error fetching image:", err);
        res.status(500).json({ message: "Error fetching image", error: err });
      } else {
        if (results.length > 0) {
          const image = results[0].image_path;
          res.sendFile(path.join(__dirname, '../uploads/', image));
        } else {
          res.status(404).json({ message: "Image not found" });
        }
      }
    });
});

router.delete('/deleteDoctor/:id', authController.deleteDoctor);
router.get('/getDoctorById/:id', authController.getDoctorById);
router.put('/updateDoctor/:id', authController.updateDoctor);
router.post('/submitAttendance', authController.submitAttendance);

// ✅ Check if Doctor ID exists
router.get('/checkDoctorId/:id', (req, res) => {
    const doctorId = req.params.id;
    console.log("Checking Doctor ID:", doctorId); // ✅ Debugging
    const sql = "SELECT doctor_id FROM DoctorsDetails WHERE doctor_id = ?";
  
    db.query(sql, [doctorId], (err, results) => {
        if (err) {
            console.error("Error checking doctor ID:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
  
        console.log("Query Result:", results); // ✅ Debugging
        if (results.length > 0) {
            res.status(200).json({ exists: true });  // Doctor exists
        } else {
            res.status(404).json({ exists: false }); // Doctor does not exist
        }
    });
  });
  

// ✅ Doctor Login Route (Fix Applied)
router.post("/DoctorLogin", (req, res) => {
    const { doctor_id, password } = req.body;

    if (!doctor_id || !password) {
        return res.status(400).json({ message: "Please enter both Doctor ID and password." });
    }

    const sql = "SELECT * FROM DoctorsDetails WHERE doctor_id = ?";
    db.query(sql, [doctor_id], (err, results) => {
        if (err) {
            console.error("❌ Error fetching doctor data:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: "Invalid Doctor ID or Password" });
        }

        const doctor = results[0];

        // ✅ Store Doctor ID in session correctly
        req.session.doctor_id = doctor.doctor_id;
        console.log("✅ Session Set for Doctor:", req.session.doctor_id);

        res.status(200).json({ message: "Login successful!", redirect: "/DoctorsDashboard.html" });
    });
});


router.post("/contactAdmin", (req, res) => {
  const { doctor_id, doctor_email, subject, message } = req.body;

  if (!doctor_id || !doctor_email || !subject || !message) {
      console.log("❌ Email not sent: Missing fields.");
      return res.status(400).json({ success: false, message: "All fields are required!" });
  }

  // ✅ Configure Nodemailer
  const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
          user: "sagaaarun@gmail.com", // Replace with your real admin email
          pass: "miuy opov yrla mpkd" // Replace with the app password
      }
  });

  const mailOptions = {
      from: doctor_email,
      to: "sagaaarun@gmail.com", // Admin's email
      subject: `Doctor Inquiry from ID: ${doctor_id} - ${subject}`,
      text: `Doctor ID: ${doctor_id}\nDoctor Email: ${doctor_email}\n\nMessage:\n${message}`
  };

  // ✅ Send the email
  transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
          console.error("❌ Email failed:", error);
          return res.status(500).json({ success: false, message: "Failed to send email." });
      } else {
          console.log("✅ Email sent successfully:", info.response);
          return res.status(200).json({ success: true, message: "Email sent successfully!" });
      }
  });
});


// ✅ API to Get Current Logged-in Doctor's ID
router.get("/getCurrentDoctor", (req, res) => {
    if (req.session && req.session.doctor_id) {
        res.json({ doctor_id: req.session.doctor_id });
    } else {
        res.status(401).json({ message: "Doctor not logged in" });
    }
});


router.get("/getDoctorsBySpecialty/:specialty", (req, res) => {
  const specialty = decodeURIComponent(req.params.specialty);
  const sql = "SELECT * FROM doctorsdetails WHERE doctor_specialty = ?";

  db.query(sql, [specialty], (err, results) => {
      if (err) {
          console.error("Error fetching doctors:", err);
          return res.status(500).json({ message: "Database error", error: err });
      }

      if (results.length === 0) {
          return res.status(404).json({ message: "No doctors found for this specialty" });
      }

      res.status(200).json(results);
  });
});


//adding doctors appointment details into data base
router.post("/DoctorsAppointments", (req, res) => {
  const {
      first_name,
      last_name,
      dob,
      age,
      gender,
      email,
      phone_number,
      address1,
      address2,
      appointment_date,
      appointment_time,
      doctor_specialty,
      doctor_id
  } = req.body;

  // ✅ SQL Query to Insert Data
  const sql = `
      INSERT INTO patients_details (first_name, last_name, dob, age, gender, email, phone_number, address1, address2, appointment_date, appointment_time, doctor_specialty, doctor_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // ✅ Execute SQL Query
  db.query(sql, [first_name, last_name, dob, age, gender, email, phone_number, address1, address2, appointment_date, appointment_time, doctor_specialty, doctor_id], 
  (err, result) => {
      if (err) {
          console.error("Error inserting appointment:", err);
          return res.status(500).json({ message: "Database error", error: err });
      }
      res.status(200).json({ message: "Appointment booked successfully!", result });
  });
});

//for doctors attendance
router.get("/getDoctorsBySpecialty/:specialty/:date", (req, res) => {
    const { specialty, date } = req.params;

    // ✅ Step 1: Get all doctors who are NOT on leave for the selected date
    const sql = `
        SELECT d.doctor_id, d.first_name, d.last_name, d.email, d.doctor_specialty, d.image_path
        FROM DoctorsDetails d
        WHERE d.doctor_specialty = ? 
        AND d.doctor_id NOT IN (
            SELECT doctor_id FROM doctorattendance WHERE leave_date = ?
        )`;

    db.query(sql, [specialty, date], (err, doctors) => {
        if (err) {
            console.error("❌ Error fetching available doctors:", err);
            return res.status(500).json({ message: "Database error", error: err });
        }

        console.log("✅ Available Doctors:", doctors);
        res.status(200).json(doctors);
    });
});

//for get doctors details for doctore attendance
router.get('/getDoctorDetails/:id', (req, res) => {
    const doctorId = req.params.id;
    
    const sql = "SELECT first_name, last_name, doctor_specialty FROM DoctorsDetails WHERE doctor_id = ?";
    
    db.query(sql, [doctorId], (err, results) => {
        if (err) {
            console.error("Error fetching doctor details:", err);
            return res.status(500).json({ message: "Database error", error: err });
        }

        if (results.length > 0) {
            const doctor = results[0];
            res.status(200).json({ 
                exists: true, 
                doctor_name: `${doctor.first_name} ${doctor.last_name}`, 
                doctor_specialty: doctor.doctor_specialty 
            });
        } else {
            res.status(404).json({ exists: false, message: "Doctor not found" });
        }
    });
});

//get login user email-id
router.get("/getLoggedInUser", (req, res) => {
    if (req.session && req.session.user_email) {
        res.json({ email: req.session.user_email });
    } else {
        res.status(401).json({ message: "User not logged in" });
    }
});

//to show appointment details to the patient
router.get("/getUserAppointments", (req, res) => {
    const userEmail = req.session.user_email;

    if (!userEmail) {
        return res.status(401).json({ message: "User not logged in" });
    }

    // ✅ Convert appointment_date to actual DATE and sort properly
    const sql = `
        SELECT id, doctor_id, doctor_specialty, first_name, last_name, email, phone_number, 
               DATE_FORMAT(appointment_date, '%Y-%m-%d') AS appointment_date, 
               appointment_time, status 
        FROM patients_details 
        WHERE email = ? 
        ORDER BY STR_TO_DATE(appointment_date, '%Y-%m-%d') DESC, 
                 STR_TO_DATE(appointment_time, '%h:%i %p') DESC`;

    db.query(sql, [userEmail], (err, results) => {
        if (err) {
            console.error("❌ Error fetching user appointments:", err);
            return res.status(500).json({ message: "Database error" });
        }

        console.log("✅ Sorted Appointments Sent to Frontend:", results); // Debugging
        res.status(200).json(results);
    });
});


//to show appointmetnt details in doctors side
router.get("/getDoctorAppointments", (req, res) => {
    const doctorId = req.session.doctor_id;

    if (!doctorId) {
        return res.status(401).json({ message: "Doctor not logged in" });
    }

    const sql = "SELECT * FROM patients_details WHERE doctor_id = ? AND status = 'pending' ORDER BY appointment_date ASC";
    db.query(sql, [doctorId], (err, results) => {
        if (err) {
            console.error("Error fetching doctor appointments:", err);
            return res.status(500).json({ message: "Database error" });
        }
        res.status(200).json(results);
    });
});

// for appointment status
router.post("/updateAppointmentStatus", (req, res) => {
    const { appointmentId, status } = req.body;

    if (!appointmentId || !["accepted", "declined"].includes(status)) {
        return res.status(400).json({ message: "Invalid request" });
    }

    const sql = "UPDATE patients_details SET status = ? WHERE id = ?";
    db.query(sql, [status, appointmentId], (err, result) => {
        if (err) {
            console.error("Error updating appointment status:", err);
            return res.status(500).json({ message: "Database error" });
        }
        res.status(200).json({ message: `Appointment ${status} successfully` });
    });
});


//for booked appointments for doctors
router.post("/bookAppointment", (req, res) => {
    const {
        first_name,
        last_name,
        dob,
        age,
        gender,
        email,
        phone_number,
        address1,
        address2,
        appointment_date,
        appointment_time,
        doctor_specialty,
        doctor_id
    } = req.body;

    const sql = `
        INSERT INTO patients_details 
        (first_name, last_name, dob, age, gender, email, phone_number, address1, address2, appointment_date, appointment_time, doctor_specialty, doctor_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [first_name, last_name, dob, age, gender, email, phone_number, address1, address2, appointment_date, appointment_time, doctor_specialty, doctor_id], 
    (err, result) => {
        if (err) {
            console.error("Error booking appointment:", err);
            return res.status(500).json({ message: "Database error", error: err });
        }
        res.status(200).json({ message: "Appointment booked successfully!", appointmentId: result.insertId });
    });
});


router.get("/getBookedAppointments", (req, res) => {
    const doctorId = req.session.doctor_id;
    console.log("🔵 Fetching booked appointments for doctor ID:", doctorId);

    if (!doctorId) {
        console.log("❌ No doctor ID found in session");
        return res.status(401).json({ message: "Doctor not logged in" });
    }

    const sql = "SELECT * FROM patients_details WHERE doctor_id = ? AND status = 'accepted'";
    db.query(sql, [doctorId], (err, results) => {
        if (err) {
            console.error("❌ Error fetching booked appointments:", err);
            return res.status(500).json({ message: "Database error" });
        }

        console.log("✅ Booked Appointments Response:", results);  // ✅ Debugging Log
        res.status(200).json(results);
    });
});


//for canceled appointments to the doctors
router.post("/cancelAppointment", (req, res) => {
    const { appointmentId } = req.body;

    if (!appointmentId) {
        return res.status(400).json({ message: "Invalid request" });
    }

    const sql = "UPDATE patients_details SET status = 'cancelled' WHERE id = ?";
    db.query(sql, [appointmentId], (err, result) => {
        if (err) {
            console.error("Error cancelling appointment:", err);
            return res.status(500).json({ message: "Database error" });
        }
        res.status(200).json({ message: "Appointment cancelled successfully" });
    });
});

// ✅ Get all doctors' leave details (Ordered by recent date)
router.get('/getDoctorsLeave', (req, res) => {
    const sql = "SELECT id, doctor_id, doctor_name, doctor_specialty, DATE_FORMAT(leave_date, '%d-%m-%Y') AS formatted_date FROM doctorattendance ORDER BY leave_date DESC";

    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching leave data:", err);
            return res.status(500).json({ message: "Database error", error: err });
        }
        res.status(200).json(results);
    });
});


// ✅ Delete doctor leave entry
router.delete('/deleteDoctorLeave/:id', (req, res) => {
    const leaveId = req.params.id;
    const sql = "DELETE FROM doctorattendance WHERE id = ?";

    db.query(sql, [leaveId], (err, result) => {
        if (err) {
            console.error("Error deleting leave entry:", err);
            return res.status(500).json({ message: "Database error", error: err });
        }
        res.status(200).json({ message: "Leave entry deleted successfully!" });
    });
});


// ✅ Get leave details for the logged-in doctor
router.get('/getDoctorLeave', (req, res) => {
    if (!req.session.doctor_id) {
        return res.status(401).json({ message: "Doctor not logged in" });
    }

    const sql = "SELECT doctor_id, doctor_name, doctor_specialty, DATE_FORMAT(leave_date, '%d-%m-%Y') AS formatted_date FROM doctorattendance WHERE doctor_id = ? ORDER BY leave_date DESC";

    db.query(sql, [req.session.doctor_id], (err, results) => {
        if (err) {
            console.error("Error fetching leave data:", err);
            return res.status(500).json({ message: "Database error", error: err });
        }
        res.status(200).json(results);
    });
});

//comment html file
router.post("/sendComment", (req, res) => {
    const { user_email, message } = req.body;

    if (!user_email || !message) {
        return res.status(400).json({ success: false, message: "All fields are required!" });
    }

    // Configure Nodemailer
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "sagaaarun@gmail.com", // Replace with admin email
            pass: "miuy opov yrla mpkd"  // Replace with the app password
        }
    });

    const mailOptions = {
        from: user_email,
        to: "sagaaarun@gmail.com", // Admin email
        subject: `User Feedback from ${user_email}`,
        text: `User Email: ${user_email}\n\nMessage:\n${message}`
    };

    // ✅ Send the email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("❌ Email failed:", error);
            return res.status(500).json({ success: false, message: "Failed to send email." });
        } else {
            console.log("✅ Email sent successfully:", info.response);
            return res.status(200).json({ success: true, message: "Feedback sent successfully!" });
        }
    });
});

// ✅ Get logged-in user's profile details
router.get("/getUserProfile", (req, res) => {
    if (!req.session.user_email) {
        return res.status(401).json({ message: "User not logged in" });
    }

    const sql = "SELECT uname, email FROM register WHERE email = ?";
    db.query(sql, [req.session.user_email], (err, results) => {
        if (err) {
            console.error("Error fetching user profile:", err);
            return res.status(500).json({ message: "Database error" });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(results[0]);
    });
});

// ✅ Update user profile (Username & Password)
router.post("/updateUserProfile", async (req, res) => {
    if (!req.session.user_email) {
        return res.status(401).json({ message: "User not logged in" });
    }

    const { uname, newPassword } = req.body;
    let updateQuery = "UPDATE register SET uname = ?";
    let queryParams = [uname];

    if (newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 8);
        updateQuery += ", pass1 = ?";
        queryParams.push(hashedPassword);
    }

    updateQuery += " WHERE email = ?";
    queryParams.push(req.session.user_email);

    db.query(updateQuery, queryParams, (err, result) => {
        if (err) {
            console.error("Error updating user profile:", err);
            return res.status(500).json({ message: "Database error" });
        }
        res.status(200).json({ message: "Profile updated successfully!" });
    });
});

module.exports = router;