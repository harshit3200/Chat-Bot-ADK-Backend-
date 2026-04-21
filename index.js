const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const cors = require('cors');
const multer = require("multer");
require('dotenv').config();
const Form = require('./models/Form');

//Database connection
const mongoose = require("mongoose");

mongoose.connect(process.env.MONGODB_URL)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

const app = express();

app.use(cors());
app.use(express.json());

const port = process.env.PORT || 5000;

// storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

app.get('/', (req, res) => {
    res.send('Hello from the backend!');
})

// upload file route
app.post('/api/submit', upload.single("file"), async (req, res) => {
    try{
        const {name, email, message} = req.body;
        
        const newForm = new Form({
            name,
            email,
            message,
            filePath: req.file ? req.file.path : null,
        });

        await newForm.save();

        res.status(200).json({ message: "Form submitted successfully!" });
    } catch (error) {
        console.error("Error submitting form:", error);
        res.status(500).json({ message: "Error submitting form" });
    }
})

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});