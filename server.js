const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const uri = process.env.MONGO_URI;

mongoose.connect(
  uri, 
    { useNewUrlParser: true, useUnifiedTopology: true });

// Mongoose schema Object
const Schema = mongoose.Schema;

// Create url schema.
const exerciseSchema = new Schema ({
  username : {
    type: String, 
    required: true,
  },
  exercise : [{
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,    
    },
    date: {
      type: String,
      required: true,
    }
  }]
});

let Exercise = mongoose.model("Exercise", exerciseSchema);

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


/* Post request to create a new user */
app.post('/api/exercise/new-user', async (req, res) => {
  
  try {
    // Get username from input
    var username = req.body.username;
    
    // Search if user exists in the database using the username as reference.
    let userExists = await Exercise.findOne({username: username});
    
    if(userExists) {  // a user exists with the username
      res.status(500).json('Username already taken');
    } else {  // No user exists with the username
      // Create a new user
      userExists = new Exercise({
        username: username,
        
      });
      // save the new user to the database
      await userExists.save();
        res.json({
        username: userExists.username,
        _id: userExists._id
      });
    }
  } catch (err) {
      console.log(err);
      res.status(500).json('Server error...')
    }   
  
})


/* Post request to add an exercise */
app.post('/api/exercise/add', async (req, res) => {
  // format today's date as yyyy-mm-dd
  var todayDate = new Date().toISOString().slice(0, 10);
  /* Get userId, description, duration and date from input */
  var userId =req.body.userId;
  var description = req.body.description;
  var duration = parseInt(req.body.duration,10);
  var date;
  // if date input field is empty set the date to the current date
  req.body.date === '' || req.body.date === null ? date = todayDate : date = req.body.date
  
  let dateInsert = req.body.date;

  if (req.body.date == "") {
    dateInsert = new Date();
    dateInsert = dateInsert.toDateString();
    //     console.log(dateInsert)
  } else if (req.body.date == null) {
    dateInsert = new Date();
    dateInsert = dateInsert.toDateString();
  } else {
    //  dateInsert = req.body.date;
    dateInsert = new Date(req.body.date).toDateString();
  }
  
  if (req.body.description) { // check if a description was inputed
    if (req.body.duration) { // check for duration
      if (req.body.userId) { // check for user id
        // find user using the user id
        Exercise.findOneAndUpdate(
          { _id: req.body.userId },
          {
            $push: { // push exercise into array
              exercise: {
                description: req.body.description,
                duration: parseInt(req.body.duration),
                date: dateInsert
              }
            }
          },
          { new: true, upsert: true },
          (err, data) => {
            if (err) return res.send(err);
            res.send({
              username: data.username,
              description: req.body.description,
              duration: parseInt(req.body.duration),
              _id: data._id,
              date: dateInsert
            });
          }
        );
      } else { // Throw error if there's no user id input
        res.send({ error: "userId is required" });
      }
    } else { // Throw error if there's no duration input
      res.send({ error: "duration is required" });
    }
  } else { // Throw error if there's no description input
    res.send({ error: "description is required" });
  } 
});

/* Get method to get array of all users */
app.get('/api/exercise/users', async (req, res) => {
  
  try {
    var users = []
    
    // get the elements in the database collection
    var find= await Exercise.find();
     
    // Map through the array to get object containing the user name and id
    find.map((object)=> {
      var userinfo = {}
      /* Update userinfo object with username and id*/
      userinfo.username = object.username;
      userinfo._id = object._id;
      // add info object to users array
      users.push(userinfo);
      //console.log(object)
      
    })
    
    res.json(
      users
    )
  } catch (err) {
    console.log(err);
    res.status(500).json('Server error...')
  }
})

/* Get method to retrieve exercise log of any user */
app.get('/api/exercise/log/', async (req, res) => {
   // Get parameters from query
  var { userId, from, to, limit } = req.query;
  
  try {
    var exerciseLog = await Exercise.findById({_id: userId});
    // exercise array
    var logs = exerciseLog.exercise;
    console.log(exerciseLog)
    
    if (from) { // Query contain "from"
      var fromDate = new Date(from);
      // filter exercise log
      logs = logs.filter(item => new Date(item.date) >= fromDate);
      fromDate = fromDate.toDateString();
    }

    if (to) { // Query contains "to"
      var toDate = new Date(to);
      // filter exercise log
      logs = logs.filter(item => new Date(item.date) <= toDate);
      toDate = toDate.toDateString();
    }

    if (limit) { // Query contains limit
      logs = logs.slice(0, +limit);
    }
    
    let fromRep = new Date(from).toDateString();
    
    res.json({
      id: exerciseLog.id,
      username: exerciseLog.username,
      from: fromDate,
      to: toDate,
      count:exerciseLog.exercise.length,
      log:logs
    })   
  } catch (err) {
    console.log(err);
    res.status(500).json('Server error...')
  }
  
  
})

// No middleware found
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    //  mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    //    report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    //     generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
