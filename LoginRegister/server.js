const express = require("express");
const path = require("path");
const mysql = require("mysql");
const dotenv = require("dotenv");
const multer = require("multer");
const session = require("express-session");
const helmet = require("helmet");

dotenv.config({ path: "./.env" });

const app = express();

const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE,
});

const cors = require("cors");
app.use(cors());

//const publicDirectory = path.join(__dirname,'public');
//app.use(express.static(publicDirectory));
app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

db.connect((error) => {
  if (error) {
    console.log(error);
  } else {
    console.log("mysql connected..");
  }
});

app.use(
    session({
      secret:process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
      cookie: { 
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    })
  );
  
  // Update CORS configuration to handle credentials
  app.use(cors({
    origin: 'http://localhost:3005', // or your frontend origin
    credentials: true
  }));

app.use("/", require("./routes/pages"));
app.use("/auth", require("./routes/auth"));

//for image storing
app.use("/uploads", express.static("uploads"));
const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

app.post("/auth/uploadDoctor", upload.single("doctor_image"), (req, res) => {
  const { first_name, last_name, doctor_specialty, email, phone_number } =
    req.body;
  const imagePath = `http://localhost:3005/uploads/${req.file.filename}`;

  const sql = `INSERT INTO DoctorsDetails (first_name, last_name, doctor_specialty, email, phone_number, image_path)
                 VALUES (?, ?, ?, ?, ?, ?)`;

  connection.query(
    sql,
    [first_name, last_name, doctor_specialty, email, phone_number, imagePath],
    (err, result) => {
      if (err) {
        res
          .status(500)
          .json({ success: false, message: "Failed to add doctor" });
      } else {
        res
          .status(200)
          .json({ success: true, message: "Doctor added successfully" });
      }
    }
  );
});

app.get("/auth/getDoctors", (req, res) => {
  const sql = "SELECT * FROM DoctorsDetails";
  connection.query(sql, (err, results) => {
    if (err) {
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch doctors" });
    } else {
      res.status(200).json(results);
    }
  });
});

app.listen(3005, () => {
  console.log("server started on Port 3005");
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
      },
    },
  })
);

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;"
  );
  next();
});
