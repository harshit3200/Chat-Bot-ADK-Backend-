require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const multer = require("multer");
const Form = require('./models/Form');
const nodemailer = require('nodemailer');
const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require("multer-s3");
const Minio = require("minio");
//Database connection
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));
const app = express();
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
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
const s3 = new S3Client({
  region: "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: "admin",
    secretAccessKey: "admin123",
  },
  forcePathStyle: true,
});
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: "uploads",
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + "-" + file.originalname);
    },
  }),
});

    const minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT,
      port: Number(process.env.MINIO_PORT) || 9000,
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    });
const bucketName = "uploads";
    const ensureBucketExists = async () => {
      return new Promise((resolve, reject) => {
        minioClient.bucketExists(bucketName, (err, exists) => {
          if (err) return reject(err);

          if (!exists) {
            minioClient.makeBucket(bucketName, "us-east-1", (err) => {
              if (err) return reject(err);
              console.log("Bucket created");
              resolve();
            });
          } else {
            console.log("Bucket already exists");
            resolve();
          }
        });
      });
    };


app.get('/', (req, res) => {
  res.send('Hello from the backend!');
})
// upload file route
app.post('/api/submit', upload.single("file"), async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields required" });
    }
    const newForm = new Form({
      name,
      email,
      message,
      filePath: req.file ? req.file.path : null,
    });
    await newForm.save();
    let attachments = [];
    if (req.file) {
      const stream = await minioClient.getObject("uploads", req.file.key);
      let chunks = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);
      attachments.push({
        filename: req.file.originalname,
        content: fileBuffer,
      });
    }
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "New Form Submission",
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
      attachments
      // attachment add 
    });
    res.json({
      success: true,
      message: "Form submitted successfully",
      data: {
        name,
        email,
        file: req.file?.location || req.file?.key
      }
    });
  } catch (error) {
    console.error("Error submitting form:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
})

// Start the server
app.listen(port, async () => {
  await ensureBucketExists();
  console.log(`Server is running on port ${port}`);
});