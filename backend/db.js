const mongoose = require('mongoose');

const connectDB = async()=>{
    try{
        const dbURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/signed_app';
        const conn = await mongoose.connect(dbURI);
        console.log(`MongoDB Connected Successfully: ${conn.connection.host}`);
    }catch(error){
        console.error(`Database connection error: ${error.message}`);
        process.exit(1);
    }
}

module.exports = connectDB;