const express = require ('express');
const authController =require('../controllers/auth');
const path = require ('path');
const router = express.Router();

const app =express();
app.use(express.static(path.join(__dirname, '../public')));

router.post('/register',authController.register);
//router.post('/',authController.register);

router.post('/login',authController.login);

router.post('/Adminlogin',authController.Adminlogin);

router.post('/DoctorsAppointments',authController.DoctorsAppointments);

module.exports = router;