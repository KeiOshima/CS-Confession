import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import url from 'url';
import slug from 'mongoose-slug-updater';

mongoose.plugin(slug);


const CommentSchema = new mongoose.Schema({
    text: String,
    createdAt: {type: Date, default: Date.now }
})

// schema for having user  login information.
const UserSchema = new mongoose.Schema({
    username: String,
    password: String,
  // password hash provided by authentication plugin
  lists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MyConfessions' }]
});

// schema for confessions
const ConfessionSchema = new mongoose.Schema({
    user: String,
    ActualConfession: String,
    Category: String,
    createdAt: {type: Date},
    comments:[CommentSchema],
    slug: {type: String, slug: 'user', unique: true}
});

const FeedBack = new mongoose.Schema({
  Rating: String,
  feedback: String
});



mongoose.model('Confession', ConfessionSchema);
mongoose.model('User', UserSchema);
mongoose.model('Comments', CommentSchema);
mongoose.model ('FeedBack', FeedBack);

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
let dbconf;

if (process.env.NODE_ENV === 'PRODUCTION') {
  // if we're in PRODUCTION mode, then read the configration from a file
  // use blocking file io to do this...
  const fn = path.join(__dirname, 'config.json');
  const data = fs.readFileSync(fn);
 
  // our configuration file will be in json, so parse it and set the
  // conenction string appropriately!
  const conf = JSON.parse(data);
  dbconf = conf.dbconf;
 } else {
  // if we're not in PRODUCTION mode, then use
  dbconf = 'mongodb://localhost/final-project';
 }

console.log('Waiting for connection to database...');
try {
  await mongoose.connect(dbconf, {useNewUrlParser: true});
  console.log('Successfully connected to database.');
} catch (err) {
  console.log('ERROR: ', err);
}
