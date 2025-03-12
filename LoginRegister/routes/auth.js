const express = require ('express');
const authController =require('../controllers/auth');
const path = require ('path');
const multer = require('multer');
const router = express.Router();
const mysql = require ("mysql");

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

module.exports = router;
