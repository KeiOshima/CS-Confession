import express from 'express'
import path from 'path'
import mongoose from 'mongoose';
import sanitize from 'mongo-sanitize';
import session from 'express-session';
import { fileURLToPath } from 'url';
import './db.mjs';
import passport from 'passport';
import LocalStrategy from 'passport-local';
import bodyParser from 'body-parser';
import bcrypt from 'bcryptjs';
import flash from 'connect-flash';


const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.use(session({
    secret: "mySecret",
    resave: false,
    saveUninitialized: false

}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'hbs');

const User = mongoose.model('User');
const Confession = mongoose.model('Confession');
const Comments = mongoose.model('Comments');
const FeedBack = mongoose.model('FeedBack');


passport.use('newUser', new LocalStrategy({
    passReqToCallback: true
}, (req, username, password, done) => {
    process.nextTick(() =>{
        const CleanUsername = sanitize(username)
        User.findOne({ 'username':  CleanUsername })
        .then(user => {
            if (user) {
                return done(null, false, {message: "username already taken" });
            }
            else {
                const RegisterUser = new User();
                RegisterUser.username = CleanUsername;
                RegisterUser.password = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
                RegisterUser.save()
                .then(() =>{
                    return done(null, RegisterUser);
                })
                .catch((err)=>
                {
                    done(err)
                });
            }
        })
        .catch(err => done(err));

    });
  
}));



passport.use('logins', new LocalStrategy({
}, async (username, password, done) =>{

    try{
        const user = await User.findOne({'username': username});

        if(!user || !bcrypt.compareSync(password, user.password)){
            console.log("big error");
            return done(null, false, {message: "incorrect username or password or both"});
        }

        else{
            console.log("should have worked!");
            return done(null, user);

        }
    }
    catch (err){
        return done(err);
    }
   
}));


passport.serializeUser((user, done) =>{
    done(null, user._id);
})

passport.deserializeUser(async (id, done) =>{
    try {
        const user = await User.findById(id);
        done(null, user);
    }
    catch (err){
        done(err);
    }
});


function ensureAuthentication( req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    else{
        res.redirect('/login');
    }
    
}

app.get("/", (req, res) => {
    res.render('index', { user: req.user });
})

app.get('/index', (req, res) => {
    res.render('index', { user: req.user });
})

///login
app.get("/login", (req, res) =>{
    res.render('login', {ErrorMessage: req.flash('error')});
})

app.post('/login', passport.authenticate('logins', {
    successRedirect: '/index',
    failureRedirect: '/login',
    failureFlash: true

}));

///register
app.get("/authentication", (req, res) =>{
    res.render('authentication' ,{ErrorMessage: req.flash('error'), user: req.user });
});

app.post('/authentication', passport.authenticate('newUser', {
    successRedirect: '/index',
    failureRedirect: '/authentication',
     failureFlash: true
}));

//loggingout
app.post('/logout', (req, res) =>{
    req.logOut(function (err){
        if (err){
            return next(err);
        }
        res.redirect('index');
    })
   
})

app.get("/addConfession", ensureAuthentication, (req, res) =>{
    res.render('addConfession', { user: req.user });
})

app.post("/addConfession", (req, res) =>{
    const Confessionbody = req.body;
    const user = sanitize(Confessionbody.user);
    const Category = sanitize(Confessionbody.Category);
    const  ActualConfession =  sanitize(Confessionbody.ActualConfession);
    const date = new Date();
    const createdAt = sanitize(date.toLocaleDateString());
    console.log(createdAt);
    const toUpdate = {user, ActualConfession, Category, createdAt};

    const NewConfession = new Confession(toUpdate);
    NewConfession.save()
    .then(() =>{
        res.redirect('/viewAllConfessions');
    })
    .catch((err) =>{
        console.error(err);
        res.status(500).send("errror on server");
    });
    
});

app.get("/viewAllConfessions", ensureAuthentication, (req, res) =>{
    Confession.find({})
    .then(confessions =>{
        res.render('viewAllConfessions', { user: req.user, confessions});
    })
    .catch(err =>{
        console.error(err);
        res.status(500).send("errror on server");
    })
    
});

app.get('/confessions/:slug', async (req, res) => {
    const GetConfession = await Confession.findOne({slug:req.params.slug}).populate('user comments');
    res.render('ConfessionComment', {GetConfession});
});

app.post('/confessions/:slug/comments', async (req, res) =>{
    const ConfessionCommentAdd = await Confession.findOne({slug:req.params.slug});
    const TheComments = new Comments({text: sanitize(req.body.text)});
    ConfessionCommentAdd.comments.push(TheComments);
    await ConfessionCommentAdd.save();
    res.redirect(`/confessions/${ConfessionCommentAdd.slug}`);
});



app.get('/feedback', ensureAuthentication, (req, res) =>{
    FeedBack.find({})
    .then(Feedback =>{
        res.render('feedback',{user: req.user, Feedback})
    })
    .catch(err =>{
        console.error(err);
        res.status(500).send("errror on server");
    })
   

});

app.post('/feedback', (req, res) =>{
    const FeedBackbody = req.body;
    const Rating = sanitize(FeedBackbody.Rating);
    const feedback = sanitize(FeedBackbody.feedback);
    const toUpdate = {Rating, feedback};
    const NewFeedback = new FeedBack(toUpdate);
    NewFeedback.save()
    .then(() =>{
        res.redirect('/feedback');
    })
    .catch((err) =>{
        console.error(err);
        res.status(500).send("errror on server");
    });

    
})


// body parser (req.body)
app.use(express.urlencoded({ extended: false }));

app.listen(process.env.PORT ?? 3000);




