const mongoose = require('mongoose');
const FormSchema = new mongoose.Schema({
    name: String,
    email: String,
    message: String,
    filePath: String,
}, { timestamps: true });

module.exports = mongoose.model('Form', FormSchema);