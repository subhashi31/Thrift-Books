const async = require("hbs/lib/async");
const jwt = require("jsonwebtoken");
const Register = require("../models/registers");

const auth = async(req, res, next) =>{
    try{
        const token = req.cookies.jwt;
        const verifyUser = jwt.verify(token, process.env.SECRET_KEY);

        const user = await Register.findOne({_id: verifyUser._id});
        
        req.token = token;
        req.user = user;
         
        next();

    }catch(error){
        res.status(200).render('login.pug');
    }
}

module.exports = auth;
