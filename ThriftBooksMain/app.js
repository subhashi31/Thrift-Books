require('dotenv').config();
const express = require("express");
const path = require("path");
const app = express();
const cookieParser =require("cookie-parser");
const auth = require("./middleware/auth");
const fs = require("fs");
const axios = require('axios'); //for phonepe
const uniqid = require("uniqid");
const sha256 = require("sha256");
const bodyParser = require("body-parser");
const cors = require('cors');


const port = process.env.PORT || 8000;

require("./db/conn");
const Register = require("./models/registers");
const { json } = require("express");
const bcrypt = require("bcryptjs/dist/bcrypt");

const BookRegister = require("./models/bookregisters");
const CartRegister = require("./models/cart");
const WishlistRegister = require("./models/wishlist");
const Conversation = require("./models/conversations");
const PaymentReqRegister = require("./models/paymentreq");


//EXPRESS SPECIFIC STUFF
app.use('/static', express.static('static'));//for serving static files
app.use(express.urlencoded());

//PUG SPECIFIC STUFF
app.set('view engine', 'pug');//set the template engine as pug
app.set('views', path.join(__dirname, 'views'));//set the views directory

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended:false}));

let seller="";
//ENDPOINTS
app.get("/", (req, res)=>{ 
    BookRegister.find({}, function(err,books){
        res.status(200).render('index.pug', {allbooks: books.slice(-5), seller});  
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

    Register.findOne({username:seller}, function(err,info){

        BookRegister.find({seller:seller}, function(err,books){

            Conversation.find({roomName: {$regex: `^${seller}-|-${seller}$`, $options: 'i'}}, function(err, convos){
                CartRegister.find({}, function(err,cartbooks){
                    res.status(200).render('myStore.pug', {books,info,convos,cartbooks});
                });
                     
                });
            
        });
        
    })
    
});

// new addition
app.get("/myCart", auth, (req, res)=>{ 
    Register.findOne({username:seller}, function(err,info){

        CartRegister.find({cartuser:seller}, function(err,books){ 
        PaymentReqRegister.find({buyer:seller}, function(err,paymentreqs){
            res.status(200).render('myCart.pug', {books,info,paymentreqs});    
           });  
        });
        
    })
    
});

app.get("/wishlist", auth, (req, res)=>{ 
    Register.findOne({username:seller}, function(err,info){

        WishlistRegister.find({wishlistuser:seller}, function(err,books){
         res.status(200).render('wishlist.pug', {books,info});    
        });
        
    })
    
});
// ends here

app.get("/addbook", (req, res)=>{ 
    const params = { };
    res.status(200).render('addbook.pug', params);
});

// sell to
app.get("/sellto", (req, res)=>{ 
    var bookid = req.query.id;
    BookRegister.findOne({_id:bookid}, function(err, book){
        res.status(200).render('sellto.pug', { book });
    })
    
});
// ends here

app.get("/logout", auth, async(req, res) => {
    try{
        req.user.tokens = req.user.tokens.filter((currElement)=>{
            return currElement.token != req.token;
        })
        res.clearCookie("jwt");
        await req.user.save();
        seller = "";
        res.render("login");

    }catch(error){
        res.status(500).send(error);
    }

});

app.post("/register", async(req, res)=>{ 
    try{

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
});


// login check
app.post("/login", async(req,res)=>{
    try{

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
            Conversation.find({roomName: {$regex: `^${seller}-|-${seller}$`, $options: 'i'}}, function(err, convos){
                CartRegister.find({}, function(err,cartbooks){
                    res.status(200).render('myStore.pug', {books,info,convos,cartbooks});
                });
            }); 
            });
            
        })

    }
    catch(error){
        res.status(400).send(error);
    }
});

// custom payment req via sell to btn

app.post("/sellto", async(req, res)=>{ 
    try{
        //  console.log(seller);

        const paymentReq = new PaymentReqRegister({
            book_id: req.body.bookid,
            buyer: req.body.buyer,
            seller: seller,
            book: req.body.bookname,
            author: req.body.author,
            price: req.body.price,
            genre: req.body.genre,
        })


        const paymentReqadded = await paymentReq.save();

        Register.findOne({username:seller}, function(err,info){

            BookRegister.find({seller:seller}, function(err,books){   
            Conversation.find({roomName: {$regex: `^${seller}-|-${seller}$`, $options: 'i'}}, function(err, convos){
                CartRegister.find({}, function(err,cartbooks){
                    res.status(200).render('myStore.pug', {books,info,convos,cartbooks});
                });
            });
            });
            
        })

    }
    catch(error){
        res.status(400).send(error);
    }
});
// ends here

// post add to cart & wishlist for eachbook
app.post("/eachbook", auth, async(req, res)=>{ 
    try{
        if(req.body.Action == 'bargainchat')
        {
            const info = await BookRegister.findOne({_id: req.body.BookId}).exec();
            let yourName = seller;
            let chatWith = info.seller;

            
            res.status(200).redirect('http://localhost:5500?yourName=' + yourName + '&chatWith=' + chatWith);
        }

        else if(req.body.Action == 'addtocart')
        {
        

            BookRegister.findOne({_id:req.body.BookId}, function(err,info){

                // console.log(info.seller);
                const addBookToCart = new CartRegister({
                book_id: req.body.BookId,
                cartuser: seller,
                seller: info.seller,
                bimg: info.bimg,
                book: info.book,
                author: info.author,
                price: info.price,
                genre: info.genre,
                condition: info.condition
            })


            const bookadded = addBookToCart.save();
                
            })
            
            Register.findOne({username:seller}, function(err,info){

                CartRegister.find({cartuser:seller}, function(err,books){
                PaymentReqRegister.find({buyer:seller}, function(err,paymentreqs){
                    res.status(200).render('myCart.pug', {books,info,paymentreqs});    
                   });  
                });
                
            })
        }

        else if(req.body.Action == 'wishlist')
        {
             console.log(req.body.BookId);
         
            BookRegister.findOne({_id:req.body.BookId}, function(err,info){

                const addBookToWishlist = new WishlistRegister({
                book_id: req.body.BookId,
                wishlistuser: seller,
                seller: info.seller,
                bimg: info.bimg,
                book: info.book,
                author: info.author,
                price: info.price,
                genre: info.genre,
                condition: info.condition
            })


            const bookadded = addBookToWishlist.save();
                
            })
            

            Register.findOne({username:seller}, function(err,info){

                WishlistRegister.find({wishlistuser:seller}, function(err,books){
                res.status(200).render('wishlist.pug', {books,info});    
                });
                
            })
        }

    }
    catch(error){
        res.status(400).send(error);
    }
    
});
// ends here

// post myStore delete etc
app.post("/myStore", async(req,res)=>{
    try{
        if(req.body.Action == 'delete')
            {

                const deleteBookQuery = {book_id: req.body.BookId};
            
                await CartRegister.deleteMany(deleteBookQuery).exec();
                await WishlistRegister.deleteMany(deleteBookQuery).exec();

                const deleteBook = {_id: req.body.BookId};
                await BookRegister.deleteOne(deleteBook).exec();
    
                const userInfo = await Register.findOne({username: seller}).exec();
                const books = await BookRegister.find({seller: seller}).exec();
                const convos = await Conversation.find({roomName: {$regex: `^${seller}-|-${seller}$`, $options: 'i'}}).exec();
                const cartbooks = CartRegister.find({}).exec();
                res.status(200).render('myStore.pug', {books, info: userInfo, convos, cartbooks});
            }

            else if(req.body.Action == 'bargainchat')
            {

                const firstString = seller; //Harry
                let secondString = req.body.roomName; //'Harry-Lisa'

                // Remove the first occurrence of the first string in the second string
                secondString = secondString.replace(firstString, '').replace(/^-|-$/g, '');


                let yourName = firstString;
                let chatWith = secondString;
    
                
                res.status(200).redirect('http://localhost:5500?yourName=' + yourName + '&chatWith=' + chatWith);
            }
    }
    catch(error){
        res.status(400).send(error);
    }
});
//ends here

// post delete from cart & wishlist for /myCart
app.post("/myCart", async(req, res)=>{ 
    try{
        if(req.body.Action == 'delete')
        {
            const info = await BookRegister.findOne({_id: req.body.BookId}).exec();
            const deleteBook = {
                book_id: req.body.BookId,
                cartuser: seller,
                seller: info.seller,
                bimg: info.bimg,
                book: info.book,
                author: info.author,
                price: info.price,
                genre: info.genre,
                condition: info.condition
            };

            await CartRegister.deleteOne(deleteBook).exec();

            const userInfo = await Register.findOne({username: seller}).exec();
            const books = await CartRegister.find({cartuser: seller}).exec();
            const paymentreqs = await PaymentReqRegister.find({buyer:seller}).exec();
            
            res.status(200).render('myCart.pug', {books, info: userInfo, paymentreqs});
        }

        else if(req.body.Action == 'wishlist')
        {
            const info = await BookRegister.findOne({_id: req.body.BookId}).exec();

            const addBookToWishlist = new WishlistRegister({
                book_id: req.body.BookId,
                wishlistuser: seller,
                seller: info.seller,
                bimg: info.bimg,
                book: info.book,
                author: info.author,
                price: info.price,
                genre: info.genre,
                condition: info.condition
            });

            await addBookToWishlist.save();

            const deleteBook = {
                book_id: req.body.BookId,
                cartuser: seller,
                seller: info.seller,
                bimg: info.bimg,
                book: info.book,
                author: info.author,
                price: info.price,
                genre: info.genre,
                condition: info.condition
            };

            await CartRegister.deleteOne(deleteBook).exec();

            const userInfo = await Register.findOne({username: seller}).exec();
            const books = await CartRegister.find({cartuser: seller}).exec();
            const paymentreqs = await PaymentReqRegister.find({buyer:seller}).exec();
            
            res.status(200).render('myCart.pug', {books, info: userInfo, paymentreqs});
        }

        else if(req.body.Action == 'checkout')
        {
          let amount = req.body.Amount;
          if(amount != 0)
          {
            res.status(200).redirect('/pay?amount=' + amount);
          }
        }

    }
    catch(error){
        res.status(400).send(error);
    }
    
});
// ends here

// post delete from  wishlist for /wishlist
app.post("/wishlist", async(req, res)=>{ 
    try{
        if(req.body.Action == 'addtocart')
        {
            const info = await BookRegister.findOne({_id: req.body.BookId}).exec();

                const addBookToCart = new CartRegister({
                book_id: req.body.BookId,
                cartuser: seller,
                seller: info.seller,
                bimg: info.bimg,
                book: info.book,
                author: info.author,
                price: info.price,
                genre: info.genre,
                condition: info.condition
            })


            await addBookToCart.save();

            const deleteBook = {
                book_id: req.body.BookId,
                wishlistuser: seller,
                seller: info.seller,
                bimg: info.bimg,
                book: info.book,
                author: info.author,
                price: info.price,
                genre: info.genre,
                condition: info.condition
            };

            await WishlistRegister.deleteOne(deleteBook).exec();

            const userInfo = await Register.findOne({username: seller}).exec();
            const books = await WishlistRegister.find({wishlistuser: seller}).exec();

            res.status(200).render('wishlist.pug', {books, info: userInfo});
          
        }

        else if(req.body.Action == 'delete'){
            const info = await BookRegister.findOne({_id: req.body.BookId}).exec();
            const deleteBook = {
                book_id: req.body.BookId,
                wishlistuser: seller,
                seller: info.seller,
                bimg: info.bimg,
                book: info.book,
                author: info.author,
                price: info.price,
                genre: info.genre,
                condition: info.condition
            };

            await WishlistRegister.deleteOne(deleteBook).exec();

            const userInfo = await Register.findOne({username: seller}).exec();
            const books = await WishlistRegister.find({wishlistuser: seller}).exec();

            res.status(200).render('wishlist.pug', {books, info: userInfo});
        }
    }


    catch(error){
        res.status(400).send(error);
    }
    
});
// ends here


// payment gateaway ---> PhonePe

// Setting up middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const PHONE_PE_HOST_URL = process.env.PHONE_PE_HOST_URL;
const MERCHANT_ID = process.env.MERCHANT_Id;
const SALT_INDEX = process.env.SALT_INDEX;
const SALT_KEY = process.env.SALT_KEY;

const APP_BE_URL = "http://localhost:8000"; // our application

app.get("/pay", (req,res) => {
    
    const amount = req.query.amount;
    console.log(amount);
    const payEndpoint = "/pg/v1/pay";
    const merchantTransactionId = uniqid();
    const userId = "MUID123";

//from phonepe page sample payload
 let normalPayLoad = {
   merchantId: MERCHANT_ID,
   merchantTransactionId: merchantTransactionId,
   merchantUserId: userId,
   amount: amount * 100, // converting to paise
   redirectUrl: `${APP_BE_URL}/payment/validate/${merchantTransactionId}`,
   redirectMode: "REDIRECT",
   mobileNumber: "9999999999",
   paymentInstrument: {
     type: "PAY_PAGE",
   },
 };

 // Make a base64-encoded payload
 let bufferObj = Buffer.from(JSON.stringify(normalPayLoad), "utf8");
 let base64EncodedPayload = bufferObj.toString("base64");

 // X-VERIFY => SHA256(base64EncodedPayload + "/pg/v1/pay" + SALT_KEY) + ### + SALT_INDEX
 let string = base64EncodedPayload + "/pg/v1/pay" + SALT_KEY;
 let sha256_val = sha256(string);
 let xVerifyChecksum = sha256_val + "###" + SALT_INDEX;

 axios.post(
  `${PHONE_PE_HOST_URL}/pg/v1/pay`,
  { request: base64EncodedPayload },
  {
    headers: {
      "Content-Type": "application/json",
      "X-VERIFY": xVerifyChecksum,
      accept: "application/json",
    },
  }
)
.then(function (response) {
  console.log("response->", response.data);
  res.redirect(response.data.data.instrumentResponse.redirectInfo.url);
})
.catch(function (error) {
  res.send(error);
});


});


// ends here

//validate payment

app.get("/payment/validate/:merchantTransactionId", async function (req, res) {
  const { merchantTransactionId } = req.params;
 
  if (merchantTransactionId) {
    let statusUrl =
      `${PHONE_PE_HOST_URL}/pg/v1/status/${MERCHANT_ID}/` +
      merchantTransactionId;
 
    let string =
      `/pg/v1/status/${MERCHANT_ID}/` +
      merchantTransactionId +
      SALT_KEY;
    let sha256_val = sha256(string);
    let xVerifyChecksum = sha256_val + "###" + SALT_INDEX;
 
    axios
      .get(statusUrl, {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerifyChecksum,
          "X-MERCHANT-ID": merchantTransactionId,
          accept: "application/json",
        },
      })
      .then(function (response) {
        console.log('response->', response.data);
        if (response.data && response.data.code === "PAYMENT_SUCCESS") {
          // redirect to FE payment success status page

          const userInfo = Register.findOne({username: seller}).exec();
          const books = CartRegister.find({cartuser: seller}).exec();

          //res.status(200).render('myCart.pug', {books, info: userInfo});
          res.send(response.data);
        } else {
          res.send(response.data);
        }
      })
      .catch(function (error) {
        res.send(error);
      });
  } else {
    res.send("Sorry!! Error");
  }
 });

//ends here

app.listen(port, ()=>{
    console.log(`The application started successfully on port ${port}`);
});

