const express = require('express');
const path = require('path');
const route = require('./routes/route');
const jwt = require("jsonwebtoken")
const morgan = require('morgan');
const mongoose = require('mongoose');
const cookieparser = require('cookie-parser');
const flash = require('connect-flash');
const session = require('express-session');
const dotenv = require('dotenv');
const getUser = require('./middlewares/getUser');
const User = require('./models/User');
dotenv.config()
const app = express();
const bcrypt = require('bcrypt')



// Session only for flash
app.use(session({
  secret: 'just_for_flash_only',
  resave: false,
  saveUninitialized: false,
}));

app.use(flash());
// Flash message variables accessible in views
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success');
  res.locals.error_msg = req.flash('error');
  res.locals.errors = req.flash('errors'); // Optional for validation arrays
  next();
});
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(morgan('tiny'));
app.use(cookieparser());
app.use('/', route);


app.use(getUser,(req, res, next)=>{
  const user = req.user;
    res.render('404', { title: '404 Not Found' , user});
})



app.listen(3000,
    async () => { // Make the callback async to use await
        console.log('🚀 Server running on http://localhost:3000');
        try {
            await mongoose.connect(process.env.dbURL);
            console.log('✅ Connected to MongoDB');

            // --- Root Admin Creation Logic ---
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
            const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword'; // Use a strong default or env var
            const adminName = process.env.ADMIN_NAME || 'Root Admin';

            const existingAdmin = await User.findOne({ email: adminEmail, role: 'admin' });

            if (!existingAdmin) {
                const hashedPassword = await bcrypt.hash(adminPassword, 10); // Hash the default password

                const rootAdmin = new User({
                    name: adminName,
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'admin'
                });

                await rootAdmin.save();
                console.log('✨ Root Admin created successfully!');
                console.log(`Admin Email: ${adminEmail}`);
                console.log(`Admin Password: ${adminPassword} (Please change this in production!)`);
            } else {
                console.log('Root Admin already exists.');
            }
            // --- End Root Admin Creation Logic ---

        } catch (err) {
            console.error('❌ Error connecting to MongoDB or creating admin:', err);
            // Optionally, exit the process if DB connection fails
            // process.exit(1);
        }
    });