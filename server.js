const express = require('express'); 
const promise = require('promise-mysql'); 
const mysql = require('mysql');

const path = require('path');
const app = express();

const port = 3004; 

const MongoClient = require('mongodb').MongoClient

// This is the connection code for the mysql so we can login to our mysql database
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

// Data of lecturers are stored in this variable
var lecturers = null;

// Our code to connect to the Mongo database
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

// We use the ejs views so we can load our data into html pages
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

// Queries all of the students for this page
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

// Renders the add page for the students
app.get('/students/add', (req, res) => {
    res.render('add', { errors: null, sid: null, name: null, age: null });
});

// Post request is made when a new student is to be created
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

// Get request for when editing a student based on their mongodb id
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

// Post request to push the changes to the student
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

// Gets all of the lecturers from the variable from above
app.get('/lecturers', (req, res) => {
    lecturers.find().toArray()
        .then((documents) => {
            res.render('lecturers', { lecturers: documents }); 
        })
        .catch((error) => {
            console.error("Error fetching lecturers:", error.message);
            res.status(404).send("Error fetching lecturers");
        });
});

// Deletes a lecturer based on the given id
app.get('/lecturers/delete/:id', (req, res) => {
    const lecturerId = req.params.id;

    const query = 'SELECT * FROM module WHERE lecturer = ?';

    connection.query(query, [lecturerId], async (error, results) => {
        if (error) {
            console.error('Error checking module associations:', error.message);
            res.status(404).send('Error checking module associations');
            return;
        }

        if (results.length > 0) {
            res.send(`<h1>Error Message</h1>
                <p>Cannot delete lecturer ${lecturerId}. He/She has associated modules.</p>
                <a href="/lecturers">Back to Lecturers</a>
            `);
        } else {
           
            try {
                await lecturers.deleteOne({ _id: lecturerId });
                res.redirect('/lecturers'); 
            } catch (deleteError) {
                console.error('Error deleting lecturer:', deleteError.message);
                res.status(404).send('Error deleting lecturer');
            }
        }
    });
});

// Fetches all of the grades from the student and modules
app.get('/grades', (req, res) => {
    const query = `
        SELECT 
            student.name AS student_name,
            module.name AS module_name,
            grade.grade AS student_grade
        FROM 
            student
        LEFT JOIN 
            grade ON student.sid = grade.sid
        LEFT JOIN 
            module ON grade.mid = module.mid
        ORDER BY 
            student_name ASC, student_grade ASC;
    `;

    connection.query(query, (error, results) => {
        if (error) {
            console.error('Error fetching grades:', error.message);
            res.status(404).send('Error fetching grades');
            return;
        }
        res.render('grades', { grades: results });
    });
});
