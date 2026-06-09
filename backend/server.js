const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require('dotenv').config();

const connectDb = require('./db');

const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/document');
const signatureRoutes = require('./routes/signature');
const auditRoutes = require('./routes/audit');

const PORT = process.env.PORT || 8080;
const app = express();

connectDb();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if(!fs.existsSync('./uploads')){
    fs.mkdirSync('./uploads');
}

app.use('/api/auth', authRoutes);
app.use('/api/docs', documentRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/audit', auditRoutes);

app.get('/',(req,res)=>{
    res.send('SaaS Signature Engine API is running smoothly.');
})

app.listen(PORT,()=>{
    console.log(`listening to port ${PORT}`);
})