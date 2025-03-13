const express = require ('express');
const authController =require('../controllers/auth');
const path = require ('path');
const multer = require('multer');
const router = express.Router();
const mysql = require ("mysql");
const nodemailer = require("nodemailer");
const session = require("express-session");

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
router.post('/DoctorsAppointments',authController.DoctorsAppointments);

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
  const sql = "SELECT doctor_id FROM DoctorsDetails WHERE doctor_id = ?";

  db.query(sql, [doctorId], (err, results) => {
      if (err) {
          console.error("Error checking doctor ID:", err);
          return res.status(500).json({ message: "Internal Server Error" });
      }

      if (results.length > 0) {
          res.status(200).json({ exists: true });  // Doctor exists
      } else {
          res.status(404).json({ exists: false }); // Doctor does not exist
      }
  });
});

// ✅ Doctor Login Route (Fix Applied)
router.post('/DoctorLogin', (req, res) => {
  const { doctor_id, password } = req.body; // Ensure `doctor_id` is extracted properly

  if (!doctor_id || !password) {
      return res.status(400).json({ message: "Please enter both Doctor ID and password." });
  }

  const sql = "SELECT * FROM DoctorsDetails WHERE doctor_id = ?";
  db.query(sql, [doctor_id], (err, results) => {
      if (err) {
          console.error("Error fetching doctor data:", err);
          return res.status(500).json({ message: "Internal Server Error" });
      }

      if (results.length === 0) {
          return res.status(401).json({ message: "Invalid Doctor ID or Password" });
      }

      const doctor = results[0];

      // ✅ Check if session exists before setting `doctor_id`
      if (!req.session) {
          return res.status(500).json({ message: "Session is not available" });
      }

      // ✅ Store Doctor ID in session correctly
      req.session.doctor_id = doctor.doctor_id;

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



module.exports = router;
