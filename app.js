require('dotenv').config();
const express = require("express");
const path = require("path");
const app = express();
const cookieParser =require("cookie-parser");
const auth = require("./middleware/auth");
const fs = require("fs");


const port = process.env.PORT || 8000;

require("./db/conn");
const Register = require("./models/registers");
const { json } = require("express");
const bcrypt = require("bcryptjs/dist/bcrypt");

const BookRegister = require("./models/bookregisters");



//EXPRESS SPECIFIC STUFF
app.use('/static', express.static('static'));//for serving static files
app.use(express.urlencoded());

//PUG SPECIFIC STUFF
app.set('view engine', 'pug');//set the template engine as pug
app.set('views', path.join(__dirname, 'views'));//set the views directory

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended:false}));

//ENDPOINTS
app.get("/", (req, res)=>{ 
    BookRegister.find({}, function(err,books){
        res.status(200).render('index.pug', {
            allbooks: books.slice(-5)
        });  
    })
});

app.get("/books", (req, res)=>{ 
    BookRegister.find({}, function(err,books){
        // console.log(books);
      res.status(200).render('books.pug', {
          allbooks: books
      });  
    })
    
});

app.get("/booksbycat", (req, res)=>{ 
    var cat=req.query.cat;
    BookRegister.find({genre:cat}, function(err,books){
        // console.log(books);
      res.status(200).render('books.pug', {
          allbooks: books
      });  
    })
    
});

app.get("/booksearched", (req, res)=>{ 
    var searched=req.query.booksearched;
    var search=searched.slice(1,4);
    // console.log(search)
    // let regex = new RegExp(`^[${search}0-9._-]+$`, "ig");
    BookRegister.find({book:{$regex: search} }, function(err,books){
        console.log(books);
      res.status(200).render('books.pug', {
          allbooks: books
      });  
    })
    
});

app.get("/eachbook", (req, res)=>{ 
    
    // console.log(req.query.id);
    var id=req.query.id;
    BookRegister.findOne({_id:id}, function(err,bookinfo){
        var cat = bookinfo.genre;
        BookRegister.find({genre:cat}, function(err,books){
           res.status(200).render('eachbook.pug',{bookinfo, books}); 
        })        
    })  
});

app.get("/register", (req, res)=>{ 
    const params = { };
    res.status(200).render('register.pug', params);
});

app.get("/login", (req, res)=>{ 
    const params = { };
    res.status(200).render('login.pug', params);
});

app.get("/myStore", auth, (req, res)=>{ 
    //console.log(`this is cookie ${req.cookies.jwt}`);

    // const info = Register.findOne({username:seller});
    // const books= BookRegister.find({seller:seller});
    // console.log(books);
    // res.status(200).render('myStore.pug', {info, books});
    // let info;
    // let books;
    // Register.findOne({username:seller},function(err,info){
    //     console.log(info);
    //     info=info
    // });
    
    // BookRegister.find({seller:seller}, function(err,books){
    //  res.status(200).render('myStore.pug', {books,info});    
    // });
    // console.log(seller)

    Register.findOne({username:seller}, function(err,info){

        BookRegister.find({seller:seller}, function(err,books){
         res.status(200).render('myStore.pug', {books,info});    
        });
        
    })
    
});

app.get("/addbook", (req, res)=>{ 
    const params = { };
    res.status(200).render('addbook.pug', params);
});

app.get("/logout", auth, async(req, res) => {
    try{
        req.user.tokens = req.user.tokens.filter((currElement)=>{
            return currElement.token != req.token;
        })
        res.clearCookie("jwt");
        await req.user.save();
        res.render("login");

    }catch(error){
        res.status(500).send(error);
    }

});

app.post("/register", async(req, res)=>{ 
    try{
        // console.log(req.body.username);
        // res.send(req.body.username);

        const registerUser = new Register({
            username: req.body.username,
            email: req.body.email,
            phone: req.body.phone,
            password: req.body.password
        })


        const token = await registerUser.generateAuthToken(); 
        
        res.cookie("jwt", token, {
            expires: new Date(Date.now() + 60000000),
            httpOnly: true
        });
        
        // password hashing -> middleware
        const registered = await registerUser.save();
        seller=req.body.username;
        BookRegister.find({}, function(err,books){
            res.status(200).render('index.pug', {
                allbooks: books
            });  
        })
        

    }
    catch(error){
        res.status(400).send(error);
    }
    // const params = { };
    // res.status(200).render('register.pug', params);
});

let seller;
// login check
app.post("/login", async(req,res)=>{
    try{
        // console.log(req.body.username);
        // res.send(req.body.username);

        const username= req.body.username;
        const password= req.body.password;
        seller= username;
        
        

       const usernameentry = await Register.findOne({username:username});
       
       const isMatch = await bcrypt.compare(password, usernameentry.password);
        // middleware
       const token = await usernameentry.generateAuthToken(); 

       res.cookie("jwt", token, {
            expires: new Date(Date.now() + 30000000),
            httpOnly: true
       });


       if(isMatch){
            seller = username;
            BookRegister.find({}, function(err,books){
                res.status(200).render('index.pug', {
                    allbooks: books
                });  
            })
        }
       else{
          res.send("Invalid login");

        }

    }
    catch(error){
        res.status(400).send("Invalid  login");
    }

});

app.post("/addbook", async(req, res)=>{ 
    try{
         console.log(seller);
        // res.send(req.body.username);

        const addBook = new BookRegister({
            seller: seller,
            bimg: path.join("/static/img/", req.body.bimg),
            book: req.body.book,
            author: req.body.author,
            price: req.body.price,
            genre: req.body.genre,
            condition: req.body.condition
        })


        const bookadded = await addBook.save();

        Register.findOne({username:seller}, function(err,info){

            BookRegister.find({seller:seller}, function(err,books){
             res.status(200).render('myStore.pug', {books,info});    
            });
            
        })

    }
    catch(error){
        res.status(400).send(error);
    }
    // const params = { };
    // res.status(200).render('register.pug', params);
});
 

app.listen(port, ()=>{
    console.log(`The application started successfully on port ${port}`);
});