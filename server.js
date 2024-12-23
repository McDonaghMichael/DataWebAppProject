const express = require('express'); 
const promise = require('promise-mysql'); 
const mysql = require('mysql');

const path = require('path');
const app = express();

const port = 3004; 

const MongoClient = require('mongodb').MongoClient

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',         
    password: 'password',
    database: 'proj2024mysql'
  });
  

  connection.connect((error) => {
    if (error) {
      console.error('Error connecting to MySQL:', error.message);
      return;
    }
    console.log('Connected to MySQL');
  });


var lecturers = null;

MongoClient.connect('mongodb://127.0.0.1:27017')
    .then((client) => {
        db = client.db('proj2024MongoDB')
        lecturers = db.collection('lecturers')
    })
        .catch((error) => {
        console.log(error.message)
    })

app.use(express.static('public'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

app.get('/students', (req, res) => {
    const query = 'SELECT * FROM student';
    connection.query(query, (error, results) => {
        if (error) {
            console.error('Error fetching students:', error.message);
            res.status(404).send('Error fetching students');
            return;
        }
        res.render('students', { students: results });
    });
});


app.get('/students/add', (req, res) => {
    res.send("Add");
});

app.post('/students/add', (req, res) => {
    res.send("post");
});

app.get('/students/edit/:id', (req, res) => {
    res.send(req.params.id);
});

app.post('/students/edit/:id', (req, res) => {
    res.send(req.params.id);
});


app.get('/lecturers', (req, res) => {
    lecturers.find().toArray()
        .then((documents) => {
            res.render('lecturers', { lecturers: documents }); 
        })
        .catch((error) => {
            console.error("Error fetching lecturers:", error.message);
            res.status(500).send("Error fetching lecturers");
        });
});