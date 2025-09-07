const mongoose = require('mongoose');

const connectDB = async ()=>{
    try{
        console.log('connecting to :',process.env.MONGO_URL);
        await mongoose.connect(process.env.MONGO_URL);
        console.log("✅Connected to database");
    }catch(err){
        console.error('❌Not connected', err.message);
    }
}

module.exports = connectDB;