// const bcrypt = require("bcryptjs/dist/bcrypt");
// const async = require("hbs/lib/async");
const mongoose = require("mongoose");
// const jwt = require("jsonwebtoken");
const res = require("express/lib/response");

const cartSchema = new mongoose.Schema({
    book_id : {
        type:String,
        required:true,
    },

    cartuser : {
        type:String,
        required:true,
    },

    seller : {
        type:String,
        required:true,
    },

    bimg : {
        type:String,
        required:true
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

    condition : {
        type:String,
        required:true 
    }
    
})


// now we create a collection

const CartRegister = new mongoose.model("CartRegister", cartSchema);

module.exports = CartRegister;