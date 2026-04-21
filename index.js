const express = require('express');
const cors = require('cors');
const multer = require("multer");
require('dotenv').config();


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

app.post('/api/submit', upload.single("file"), (req, res) => {
    const { name, email, message } = req.body;

    console.log("DATA", name, email, message);
    console.log("FILE", req.file);

    res.json({ success: true, message: "File uploaded successfully!" });
    
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});