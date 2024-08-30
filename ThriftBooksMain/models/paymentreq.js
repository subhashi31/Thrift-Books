// const bcrypt = require("bcryptjs/dist/bcrypt");
// const async = require("hbs/lib/async");
const mongoose = require("mongoose");
// const jwt = require("jsonwebtoken");
const res = require("express/lib/response");

const paymentreqSchema = new mongoose.Schema({
    book_id : {
        type:String,
        required:true,
    },

    buyer : {
        type:String,
        required:true,
    },

    seller : {
        type:String,
        required:true,
    },


    book : {
        type:String,
        required:true
        // unique:true
    },

    author : {
        type:String,
        required:true
        // unique:true
    },

    genre : {
        type:String,
        required:true 
    },

    price : {
        type:Number,
        required:true
        // unique:true
    },

    
})


// now we create a collection

const PaymentReqRegister = new mongoose.model("PaymentReqRegister", paymentreqSchema);

module.exports = PaymentReqRegister;