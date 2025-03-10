const express = require ('express');
const path = require ('path');
const router = express.Router();

const app =express();
app.use(express.static(path.join(__dirname, '../public')));

router.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname, '../public', 'register.html'));
});

router.get('/login',(req,res)=>{
    res.sendFile(path.join(__dirname, '../public', 'login.html'));
});

router.get('/Adminlogin',(req,res)=>{
    res.sendFile(path.join(__dirname, '../public', 'Adminlogin.html'));
});

router.get('/MediGo',(req,res)=>{
    res.sendFile(path.join(__dirname, '../public', 'MediGo.html'));
});

router.get('/DoctorsAppointments',(req,res)=>{
    res.sendFile(path.join(__dirname, '../public', 'DoctorsAppointments.html'));
});

router.get('/AddDoctors',(req,res)=>{
    res.sendFile(path.join(__dirname, '../public', 'AddDoctors.html'));
});

module.exports = router;