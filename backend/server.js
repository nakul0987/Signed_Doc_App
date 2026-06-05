const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 8080;

const app = express();

app.get('/',(req,res)=>{
    res.send('SaaS Signature Engine API is running smoothly.');
})

app.listen(PORT,()=>{
    console.log(`listening to port ${PORT}`);
})