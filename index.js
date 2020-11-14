const UserClass = require("./user.js");
const Task = require("./task.js");
bodyParser = require('body-parser');
const session = require("express-session");
const passport = require("passport");
const express = require("express");
const mongoose = require("mongoose");
mongoose.set('useFindAndModify', false);//gets rid of depcrecation error
const ppLocalMongoose = require("passport-local-mongoose");
const e = require("express");
require("dotenv").config();
const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
const port = 3333;
app.listen(port, function () {
    console.log(' server is running ' + port);
});

app.use(session({
    //secret: process.env.SECRET, // stores our secret in our .env file
    secret: "not so secret", //Used for in lab only
    resave: false,              // other config settings explained in the docs
    saveUninitialized: false,
    cookie: { path: '/', httpOnly: true, maxAge: 36000000 }
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/todoDBLab4",
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });


const userSchema = new mongoose.Schema({
    username: String,
    password: String
}
);
userSchema.plugin(ppLocalMongoose);
const User = new mongoose.model("User", userSchema);

const taskSchema = new mongoose.Schema(
    {
        name: String,
        owner: userSchema,
        creator: userSchema,
        done: Boolean,
        cleared: Boolean
    }
);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const Tasks = new mongoose.model("Task", taskSchema);





const AUTH_VALUE = '123'; // Auth code for signup

app.get('/', function (req, res) {
    if (req.user) {
        res.redirect(307, '/todo');
    } else {
        res.render('login', { errorLogin: false, errorSignup: false });
    }
});



//only registers if email doesn't already exist, and auth code is correct
app.post('/register', function (req, res) {
    let auth = req.body.authentication;
    if (auth == AUTH_VALUE) {
        User.register({ username: req.body.username }, req.body.password, function (err, user) {
            if (err) {
                console.log(err + " THIS");
                res.render('login', { errorLogin: false, errorSignup: true });
            } else {
                // authenticate using passport-local
                // what is this double function syntax?! It's called currying.
                passport.authenticate("local")(req, res, function () {

                    //req.session.username = req.body.username;
                    res.redirect(307, "/todo");

                });
            }
        });
    }
    else {
        res.render('login', { errorLogin: false, errorSignup: true });
    }

});

app.post('/login', function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        if (err) { return next(err); }
        if (!user) {
            console.log(info);
            return res.render('login', { errorLogin: true, errorSignup: false });
        }
        req.logIn(user, function (err) {
            if (err) { return next(err); }
            return res.redirect(307, '/todo');
        });
    })(req, res, next);
});




app.post('/todo', function (req, res) {
    var email = req.user.username;
    Tasks.find({}, function (err, results) {
        if (err) {
            console.log(err);
            console.log(results);
        } else {
            tasks = results;
            if (req.isAuthenticated()) {
                res.render('todo', { email: email, taskDatabase: tasks });
            }
            else {
                res.redirect("/login");
            }
        }
    });
});


app.get('/todo', function (req, res) {

    if (req.user) {
        var email = req.user.username;
        Tasks.find({}, function (err, results) {
            if (err) {
                console.log(err);
                console.log(results);
            } else {
                tasks = results;
                if (req.isAuthenticated()) {
                    res.render('todo', { email: email, taskDatabase: tasks });
                }
                else {
                    res.redirect("/");
                }
            }
        });
    } else {
        res.redirect("/");
    }

});

app.post('/unfinish', function (req, res) {
    var id = req.body.postID;
    Tasks.findByIdAndUpdate(id, { $set: { done: false } }, function (err, docs) {
        if (err) {
            console.log(err);
        }
        else {
            res.redirect(307, "/todo");
        }
    });
});


app.post('/abandonorcomplete', function (req, res) {
    var id = req.body.postID;
    var abandon = req.body.abandon;
    //if abandon is set then we abandon, else we know we are changing the done condition
    if (abandon) {
        var id = req.body.postID;
        Tasks.findByIdAndUpdate(id, { $unset: { owner: 1 } }, function (err, docs) {
            if (err) {
                console.log(err);
            }
            else {
                res.redirect(307, "/todo");
            }
        });

    } else {
        Tasks.findByIdAndUpdate(id, { $set: { done: true } }, function (err, docs) {
            if (err) {
                console.log(err);
            }
            else {
                res.redirect(307, "/todo");
            }
        });

    }


});


//claims task
app.post('/claim', function (req, res) {

    var id = req.body.postID;

    Tasks.findByIdAndUpdate(id, { $set: { owner: req.user } }, function (err, docs) {
        if (err) {
            console.log(err);
        }
        else {
            res.redirect(307, "/todo");
        }
    });

});

//adds task and automatically claims.
app.post('/addtask', function (req, res) {
    let entry = req.body.newTodo;
    let user = req.user;
    console.log(user);
    const task = new Tasks(
        {
            name: entry,
            owner: user,
            creator: user,
            done: false,
            cleared: false
        }
    );

    task.save(function (err) {
        if (err) console.log(err);
    });
    res.redirect(307, "/todo");
    //res.render('todo', { email: user, taskDatabase: jsonDatabase['Tasks'] });





});
//deletes all done tasks for logged in user
app.post('/purge', function (req, res) {

    Tasks.updateMany({ owner: req.user, done: true }, { $set: { cleared: true } }, function (err, docs) {
        if (err) {
            console.log(err);
        }
        else {
            res.redirect(307, "/todo");
        }
    });


});


//logout by going to login page, no session variables 
app.get('/logout', function (req, res) {
    req.logout();
    res.redirect("/");
});

