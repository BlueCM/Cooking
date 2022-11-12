// EXPRESS
const express = require("express");
const app = express();
app.use(express.static("public")); // accès à public

//DOTENV
const dotenv = require ('dotenv').config();

const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const flash = require("connect-flash");
//const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const randtoken = require("rand-token");
const nodemailer = require("nodemailer");

//MODELS
const User = require("./models/user");
const Reset = require("./models/reset");
const Receipe = require("./models/receipe");
const Favourite = require("./models/favourite");
const Ingredient = require("./models/ingredient");
const Schedule = require("./models/schedule");

// EXPRESS SESSION
app.use(session({
    secret: "mysecret",
    resave: false,
    saveUninitialized: false
}));
//PASSPORT
const { initialize } = require("passport");
const user = require("./models/user");
app.use(passport.initialize());
app.use(passport.session());

// EJS
app.set("view engine","ejs"); // acces à views
// BODY PARSER
app.use(bodyParser.urlencoded({extended: false}));
// MONGOOSE
mongoose.connect("mongodb+srv://testWeb:test$$$@cluster0.i005zxf.mongodb.net/cooking?retryWrites=true&w=majority", {useNewUrlParser: true});
// PASSPORT LOCAL MONGOOSE
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(methodOverride('_method'));

app.use(flash());
app.use(function(req,res,next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");

    next(); // on passe à la prochaine route
});

app.get("/",function(req,res){
    res.render("index");
})

app.get("/signup",function(req,res){
    res.render("signup");
})

app.post("/signup",function(req,res){
    const newUser = new User({
        username: req.body.username
    });
    User.register(newUser, req.body.password, function(err,user){
        if(err){
            console.log(err);
            res.render("signup");            
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("signup");
            });
        }
    }); 


    // BCRYPT
    /*
    const saltRounds = 10;
    bcrypt.hash(req.body.password,saltRounds, function(err, hash){
        if(err){
            console.log(err);
        }else{
            const user = {
                username: req.body.username,
                password: hash
            }    
            User.create(user,function(err){
                if(err){
                    console.log(err);
                }else{
                    console.log("User created!");
                    res.render("index");
                }
            });
        }
    });
    */
});

app.get("/login",function(req,res){
    res.render("login");
});


app.post("/login",function(req,res){
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(req,res, function(){
                req.flash("success","Congratulations! Your are logged in");
                res.redirect("/dashboard");
            })
        }
    })

    // BCRYPT
    /*
    const user = {
        username: req.body.username,
        password: req.body.password
    }
    User.findOne({username: user.username},function(err, foundUser){
        if(err){
            console.log(err);
        }else{
            if(foundUser){
                bcrypt.compare(user.password, foundUser.password, function(err, result){
                    if(result){
                        console.log("Connection ok!")
                        res.render("index");
                    }else{
                        console.log("Wrong password!")
                    }
                });
            }else{
                console.log("User not found!")
            }
        }
    } );
    */
});

app.get("/dashboard",isLoggedIn,function(req,res){
    res.render("dashboard");
});

app.get("/logout",function(req,res){
    req.logout(function(){
        req.flash("success","Thank you for your visit!");
        res.redirect("/login");
    });
});

app.get("/forgot",function(req,res){
    res.render("forgot");
});

app.post("/forgot",function(req,res){
    user.findOne({username: req.body.username},function(err,userFound){
        if(err){
            console.log(err);
            res.redirect("/login");
        }else{
            const token = randtoken.generate(16);
            Reset.create({
                username: userFound.username,
                resetPasswordToken: token,
                resetPasswordExpires: Date.now() + 3600000
            });
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: 'guy.randria1@gmail.com',
                    pass: process.env.PWD
                }
            });
            const mailOptions = {
                from: 'guy.randria1@gmail.com',
                to: req.body.username,
                subject: 'link to reset your password',
                text: 'click on this link to reset your password: http://localhost:3000/reset/'+token
            }
            console.log("Mail pret à envoi");

            transporter.sendMail(mailOptions, function(err,response){
                if(err){
                    console.log(err);
                }else{
                    res.redirect("/login");
                }
            });
        }
    });
});


app.get("/reset/:token",function(req,res){
    Reset.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: {$gt: Date.now()}
    }, function(err,obj){
        if(err){
            req.flash("error","Token expired!");
            res.redirect("/login");
        }else{
            res.render("reset",{
                token: req.params.token
            });
        }
    });
});


app.post("/reset/",function(req,res){
    console.log("dans post /reset/:");

});


app.post("/reset/:token",function(req,res){
    Reset.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: {$gt: Date.now()}
    }, function(err,obj){
        if(err){
            console.log("token expired");
            res.redirect("/login");
        }else{
            if(req.body.password == req.body.password2){
                User.findOne({username: obj.username},function(err,user){
                    if(err){
                        console.log(err);
                    }else{
                        user.setPassword(req.body.password,function(err){
                            if(err){
                                console.log(err);
                            }else{
                                user.save();
                                const updatedReset = {
                                    resetPasswordToken: null,
                                    resetPasswordExpires: null
                                }
                                Reset.findOneAndUpdate({resetPasswordToken: req.params.token}, updatedReset,function(err,obj){
                                    if(err){
                                        console.log(err);
                                    }else{
                                        res.redirect("/login");
                                    }
                                }
                                );
                            }
                        });
                    }
                });
                    
            }
                
        }
    });
});


//RECEIPES
app.get("/dashboard/myreceipes",isLoggedIn,function(req,res){
    Receipe.find({user: req.user.id},function(err,receipe){
        if(err){
            console.log(err);
        }else{
            res.render("receipe",{receipe: receipe});            
        }
    });
})


app.get("/dashboard/newreceipe",isLoggedIn,function(req,res){
    res.render("newreceipe");
});

app.post("/dashboard/newreceipe",function(req,res){
    const newReceipe = {
        name: req.body.receipe,
        image: req.body.logo,
        user: req.user.id
    }
    Receipe.create(newReceipe,function(err,newReceipe){
        if(err){
            console.log(err);
        }else{
            req.flash("success","New receipe added!");
            res.redirect("/dashboard/myreceipes");
        }
    });
});

app.delete("/dashboard/myreceipes/:id",isLoggedIn,function(req,res){
    Receipe.deleteOne({_id: req.params.id},function(err){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Receipe has been deleted!");
            res.redirect("/dashboard/myreceipes");
        }
    });
});

// INGREDIENTS
app.get("/dashboard/myreceipes/:id",function(req,res){
    Receipe.findOne({user: req.user.id, _id: req.params.id},function(err,receipeFound)
    {
        if(err){
            console.log(err);
        }else{
            Ingredient.find({
                user: req.user.id,
                receipe: req.params.id
            },function(err,ingredientFound){
                if(err){
                    console.log(err);
                }else{
                    res.render("ingredients",{
                        ingredient: ingredientFound,
                        receipe: receipeFound
                    });
                }
            });
        }
        
    });
});

app.get("/dashboard/myreceipes/:id/newingredient",isLoggedIn,function(req,res){
    Receipe.findById({_id: req.params.id},function(err,receipeFound){
        if(err){
            console.log(err);
        }else{
            res.render("newingredient",{receipe: receipeFound});
        }
    });
});

app.post("/dashboard/myreceipes/:id",function(req,res){
    const newIngredient = {
        name: req.body.name,
        bestDish: req.body.dish,
        quantity: req.body.quantity,
        user: req.user.id,
        receipe: req.params.id
    }
    Ingredient.create(newIngredient,function(err,newIngredient){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Ingredient added!");
            res.redirect("/dashboard/myreceipes/"+req.params.id);
        }
    });
    
})

app.delete("/dashboard/myreceipes/:id/:ingredientid",isLoggedIn,function(req,res){
    Ingredient.deleteOne({_id: req.params.ingredientid},function(err){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Ingredient has been deleted!");
            res.redirect("/dashboard/myreceipes/"+req.params.id);
        }
    });
});

app.post("/dashboard/myreceipes/:id/:ingredientid/edit",isLoggedIn,function(req,res){
    Receipe.findOne({user: req.user.id,_id: req.params.id},function(err,receipeFound){
        if(err){
            console.log(err);
        }else{
            Ingredient.findOne({_id: req.params.ingredientid, receipe: req.params.id},function(err,ingredientFound){
                if(err){
                    console.log(err);
                }else{
                    res.render("edit",{receipe: receipeFound, ingredient: ingredientFound});
                }        
            });
        }
    });
});

app.put("/dashboard/myreceipes/:id/:ingredientid",isLoggedIn,function(req,res){
    const updatedIngredient = {
        name: req.body.name,
        bestDish: req.body.dish,
        user: req.user.id,
        quantity: req.body.quantity,
        receipe: req.params.id
    }
    Ingredient.findByIdAndUpdate({_id: req.params.ingredientid},updatedIngredient,function(err,updatedIngredient){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Ingredient updated!");
            res.redirect("/dashboard/myreceipes/"+req.params.id);
        }        
    });
});

// FAVOURITES

app.get("/dashboard/favourites",isLoggedIn,function(req,res){
    Favourite.find({user: req.user.id},function(err,favourites){
        if(err){
            console.log(err);
        }else{
            res.render("favourites",{favourites: favourites});
        }        

    });
});

app.get("/dashboard/favourites/newfavourite",isLoggedIn,function(req,res){
    res.render("newfavourite");
});

app.post("/dashboard/favourites",isLoggedIn,function(req,res){
    const newFavourite = {
        image: req.body.image,
        title: req.body.title,
        description: req.body.description,
        user: req.user.id
    }
    Favourite.create(newFavourite,function(err,newFavourite){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Favourite created!");
            res.redirect("/dashboard/favourites");
        }
    });
});

app.delete("/dashboard/favourites/:id",isLoggedIn,function(req,res){
    Favourite.deleteOne({_id: req.params.id},function(err){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Favourite has been deleted");
            res.redirect("/dashboard/favourites");
        }
    });
});

// SCHEDULES
app.get("/dashboard/schedule",isLoggedIn,function(req,res){
    Schedule.find({user: req.user.id},function(err, schedules){
        if(err){
            console.log(err);
        }else{
            res.render("schedule",{schedules: schedules});
        }
    });
});

app.get("/dashboard/schedule/newschedule",isLoggedIn,function(req,res){
    res.render("newSchedule");
});

app.post("/dashboard/schedule",isLoggedIn,function(req,res){
    const newSchedule = {
        receipeName: req.body.receipename,
        scheduleDate: req.body.scheduledate,
        user: req.user.id,
        time: req.body.time,
        date: Date.now()
    }
    Schedule.create(newSchedule,function(err,bewSchedule){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Schedule added!");
            res.redirect("/dashboard/schedule");
        }
    });
});

app.delete("/dashboard/schedule/:id",isLoggedIn,function(req,res){
    Schedule.deleteOne({_id: req.params.id},function(err){
        if(err){
            console.log(err);
        }else{
            req.flash("success","Schedule has been deleted");
            res.redirect("/dashboard/schedule");
        }
    });
});



// FONCTION DE CONNEXION
function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();

    }else{
        req.flash("error","Please log in first");
        res.redirect("/login");
    }
}





app.listen(3000,function(req,res){
    console.log("Ecoute port 3000 ok");
});