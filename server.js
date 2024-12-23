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
app.use(express.urlencoded({ extended: true }));


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
    res.render('add', { errors: null, sid: null, name: null, age: null });
});


app.post('/students/add', (req, res) => {
    const { sid, name, age } = req.body;

    const errors = [];

    if (!sid || sid.length !== 4) {
        errors.push('Student ID should be 4 characters');
    }
    if (!name || name.length < 2) {
        errors.push('Student Name should be at least 2 characters');
    }
    if (!age || age < 18) {
        errors.push('Student Age should be at least 18');
    }

    if (errors.length > 0) {
        res.render('add', { errors, sid, name, age });
        return;
    }

    const checkQuery = 'SELECT * FROM student WHERE sid = ?';
    connection.query(checkQuery, [sid], (checkError, results) => {
        if (checkError) {
            console.error('Error checking student ID:', checkError.message);
            res.status(404).send('Error checking student ID');
            return;
        }

        if (results.length > 0) {
            errors.push(`Student ID ${sid} already exists`);
            res.render('add', { errors, sid, name, age });
            return;
        }

        const insertQuery = 'INSERT INTO student (sid, name, age) VALUES (?, ?, ?)';
        connection.query(insertQuery, [sid, name, age], (insertError) => {
            if (insertError) {
                console.error('Error adding student:', insertError.message);
                res.status(404).send('Error adding student');
                return;
            }
            res.redirect('/students');
        });
    });
});

app.get('/students/edit/:id', (req, res) => {
    const studentId = req.params.id;

    const query = 'SELECT * FROM student WHERE sid = ?';
    connection.query(query, [studentId], (error, results) => {
        if (error) {
            console.error('Error fetching student:', error.message);
            res.status(404).send('Error fetching student');
            return;
        }
        if (results.length === 0) {
            res.status(404).send('Student not found');
            return;
        }

        res.render('update', { student: results[0], errors: null });
    });
});

app.post('/students/edit/:id', (req, res) => {
    const studentId = req.params.id;
    const { name, age } = req.body;

    const errors = [];

    if (!name || name.length < 2) {
        errors.push('Student Name should be at least 2 characters');
    }
    if (!age || age < 18) {
        errors.push('Student Age should be at least 18');
    }

    if (errors.length > 0) {
        const query = 'SELECT * FROM student WHERE sid = ?';
        connection.query(query, [studentId], (error, results) => {
            if (error) {
                console.error('Error fetching student:', error.message);
                res.status(404).send('Error fetching student');
                return;
            }
            res.render('update', { student: results[0], errors });
        });
        return;
    }

    const query = 'UPDATE student SET name = ?, age = ? WHERE sid = ?';
    connection.query(query, [name, age, studentId], (error) => {
        if (error) {
            console.error('Error updating student:', error.message);
            res.status(404).send('Error updating student');
            return;
        }
        res.redirect('/students');
    });
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