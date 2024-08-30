const bcrypt = require("bcryptjs/dist/bcrypt");
const async = require("hbs/lib/async");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const res = require("express/lib/response");

const userSchema = new mongoose.Schema({
    username : {
        type:String,
        required:true,
        unique:true
    },

    email : {
        type:String,
        required:true,
        unique:true
    },

    phone : {
        type:Number,
        required:true,
        unique:true
    },

    password : {
        type:String,
        required:true 
    },

    tokens:[{
        token:{
            type:String,
            required:true
        }
    }]
})

// generating tokens
userSchema.methods.generateAuthToken = async function()
{
    try{
        const token = jwt.sign({_id:this._id.toString()}, process.env.SECRET_KEY);
        this.tokens = this.tokens.concat({token:token});
        await this.save();
        // console.log(token); 
        return token;
    }
    catch(error){
        res.send("error");
        // console.log("error");

    }

}

// password->hashing
userSchema.pre("save", async function(next) {

    if(this.isModified("password")){
      this.password = await bcrypt.hash(this.password, 10);  
    //   console.log(this.password)
    }
    
    next();

})


// now we create a collection

const Register = new mongoose.model("Register", userSchema);

module.exports = Register;