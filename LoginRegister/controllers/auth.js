const express = require ('express');
const mysql = require ('mysql');
const bcrypt = require ('bcryptjs');
const router = express.Router();




const db=mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

exports.register = (req, res) => {
    console.log(req.body);
    
    const { uname, email, pass1 } = req.body;

    // Check if the email already exists in the database
    db.query('SELECT email FROM register WHERE email = ?', [email], async (error, results) => {
        if (error) {
            console.log(error);
            //return res.status(500).send('<center><h1>Internal Server Error</h1></center>');
        }
        else if (results.length > 0) {
             res.send('<center><h1>That email has been registered already!</h1></center>');
        }

        // Hash the password
        let hashedPassword = await bcrypt.hash(pass1, 8);
        console.log(hashedPassword);

        // Insert the new user into the database
        db.query('INSERT INTO register SET ?', { uname: uname, email: email, pass1: hashedPassword }, (error, result) => {
            if (error) {
                console.log(error);
                return res.status(500).send('<center><h1>Internal Server Error</h1></center>');
            }
            
            res.redirect('/login');
        });
    });
}

exports.login = (req, res) => {
    console.log(req.body);
        const { email, pass1 } = req.body;
    
        if (!email || !pass1) {
            return res.status(400).json({ message: "Please enter both email and password." });
        }
    
        // Check if user exists in the database
        const sql = "SELECT * FROM register WHERE email = ?";
        db.query(sql, [email], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Internal Server Error" });
            }
    
            if (results.length === 0) {
                return res.status(401).json({ message: "Email Id or password are invalid" });
            }
    
            // Compare the entered password with the stored hashed password
            const user = results[0];
            bcrypt.compare(pass1, user.pass1, (err, isMatch) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ message: "Internal Server Error" });
                }
    
                if (!isMatch) {
                    return res.status(401).json({ message: "Email Id or password are invalid" });
                }
    
                // Redirect to home page on successful login
                res.redirect('/MediGo');

            });
        });
    }



    exports.DoctorsAppointments = (req, res) => {
        console.log(req.body);
            const {first_name , last_name, dob ,age,gender,email,phone_number,address1,address2,appointment_date,appointment_time,doctor_specialty } = req.body;
            db.connect((err) => {
                if (err) {
                    console.error("Database connection failed: " + err.stack);
                    return;
                }
                console.log("Connected to MySQL database.");
            });
            
            
                const sql = `INSERT INTO patients_details 
                    (first_name, last_name, dob, age, gender, email, phone_number, address1, address2, appointment_date, appointment_time, doctor_specialty) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
                const values = [
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
                    doctor_specialty
                ];
            
                db.query(sql, values, (err, result) => {
                    if (err) {
                        console.error("Error inserting data:", err);
                        res.status(500).json({ message: "Error booking appointment", error: err });
                    } else {
                        res.status(200).json({ message: "Appointment booked successfully!" });
                    }
                });
            }