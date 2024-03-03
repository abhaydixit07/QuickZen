// import express from "express";
// import bodyParser from "body-parser";
// import pg from "pg";
// import bcrypt, { hash } from "bcrypt"
// const app = express();
// const port = 3000;


// const saltRounds = 10;
// var conString = "postgres://ewqqlckx:IDDDSD5Gqs_cK-80uTkJKpWdCnOf58eI@ruby.db.elephantsql.com/ewqqlckx" //Can be found in the Details page
// var db = new pg.Client(conString);
// db.connect(async function(err) {
//   if(err) {
//     return console.error('could not connect to postgres', err);
//   }else{
//     app.listen(port, () => {
//       console.log(`Server running on port ${port}`);
//     });
  
//   await db.query('SELECT NOW() AS "theTime"', function(err, result) {
//     if(err) {
//       return console.error('error running query', err);
//     }
//     console.log(result.rows[0].theTime);
//     // >> output: 2018-08-23T14:02:57.117Z
    
//   });
// }
// });
// const db = new pg.Client({
//   user:"postgres",
//   host:"localhost",
//   database:"permalist",
//   password:"****",
//   port:5432,
// });
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import ora from 'ora';

const app = express();
const port = 3000;

const saltRounds = 10;
const conString = "postgres://ewqqlckx:IDDDSD5Gqs_cK-80uTkJKpWdCnOf58eI@ruby.db.elephantsql.com/ewqqlckx"; // Can be found in the Details page
const db = new pg.Client(conString);

// Create an instance of the spinner
const spinner = ora('Connecting to the database...').start();

db.connect(async function (err) {
  if (err) {
    spinner.fail('Could not connect to the database');
    return console.error('could not connect to postgres', err);
  } else {
    spinner.succeed('Connected to the database');

    await db.query('SELECT NOW() AS "theTime"', function (err, result) {
      if (err) {
        spinner.fail('Error running query');
        return console.error('error running query', err);
      }
      console.log(result.rows[0].theTime);
      // >> output: 2018-08-23T14:02:57.117Z
    });

    // Start your application after the database connection is established
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  }
});


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

async function getItems(tableName){
  const result = await db.query(`SELECT * FROM ${tableName} ORDER BY id ASC`)
  let listItems = result.rows;
  return listItems;
}

let items = [
  // { id: 1, title: "Buy milk" },
  // { id: 2, title: "Finish homework" },
];
app.get("/contact", (req,res)=>{
  res.render('contact.ejs')
})

app.get("/list", async(req, res) => {
  try{
    const name = req.query.name;
    const tableName = req.query.tableName;
    items = await getItems(tableName)
    console.log(items)
    res.render("index.ejs", {
      tableName:`${tableName}`,
      listTitle: `${name}`,
      listItems: items,
    });
  }
  catch(err){
    console.log(err)
  }
  
});
app.get('/', (req,res)=>{
  res.render('auth.ejs')
})
app.post("/register", async (req, res) => {
  const fullname = req.body.name;
  const nameArray = fullname.split(' ');

  // Take the first element
  const name = nameArray[0];
  let password = req.body.password;
  const email = req.body.username;

  console.log("email: " + email + " password: " + password);

  const checkResult = await db.query("SELECT * FROM users WHERE email=$1", [email]);

  if (checkResult.rows.length > 0) {
    res.send("EMAIL ALREADY EXISTS. TRY LOGGING IN");
  } else {
    try {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.log(err);
        } else {
          password = hash;

          // Now, the password has been hashed, and you can proceed with the database insertion
          const result = await db.query("INSERT INTO users(email, password, name) VALUES ($1, $2, $3) RETURNING id", [email, password, name]);

          // Extract the id from the result
          const insertedId = result.rows[0].id;
          const tableName = name + insertedId;
          console.log(result);

          await db.query(`CREATE TABLE ${tableName} (id SERIAL PRIMARY KEY, title VARCHAR(100) NOT NULL)`);
          res.redirect(`/list?tableName=${encodeURIComponent(tableName)}&name=${encodeURIComponent(name)}`);
        }
      });
    } catch (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
    }
  }
});
  
  
app.post("/login", async (req, res) => {
  const password = req.body.password;
  const email = req.body.username;
  console.log("email: " + email + " password: " + password);

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email=$1", [email]);

    if (checkResult.rows.length > 0) {
      const userPassword = checkResult.rows[0].password;
      const id = checkResult.rows[0].id;
      const name = checkResult.rows[0].name;
      const tableName = name + id;

      // Use a promise to handle the asynchronous bcrypt.compare
      const compareResult = await new Promise((resolve, reject) => {
        bcrypt.compare(password, userPassword, (err, result) => {
          if (err) {
            console.log(err);
            reject(err);
          } else {
            resolve(result);
          }
        });
      });

      if (compareResult) {
        res.redirect(`/list?tableName=${encodeURIComponent(tableName)}&name=${encodeURIComponent(name)}`);
      } else {
        res.send("INCORRECT PASSWORD");
      }
    } else {
      res.send("USER NOT FOUND");
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});


// app.post("/login", async (req, res) => {
//   const password = req.body.password;
//   const email = req.body.username
//   console.log("email: "+email+" password: "+password)
//   try{
//     const checkResult = await db.query("SELECT * FROM users WHERE email=$1", [email]);
//     if(checkResult.rows.length>0){
//       const userPassword = checkResult.rows[0].password;
//       const id = checkResult.rows[0].id;
//       const name = checkResult.rows[0].name;
//       const tableName = name+id
//       var check = false;
//       bcrypt.compare(password, userPassword, (err, result)=>{
//         if(err){ // result is true or false
          
//           console.log(err)
//         }
//         else{
//           check=true;
//         }
//       });
//       if(check){
//         res.redirect(`/list?tableName=${encodeURIComponent(tableName)}&name=${encodeURIComponent(name)}`);
//       }
//       else{
//         res.send("INCORRECT PASSWORD")
//       }
//     }
//     else{
//       res.send("USER NOT FOUND")
//     }
//   }
//   catch(err){
//     console.log(err)
//   }
  
// });

app.post("/add", async(req, res) => {
  const name = req.body.listTitle;
  const tableName = req.body.tableName;
  const item = req.body.newItem;
  // items.push({ title: item });
  try{
    await db.query(`INSERT INTO ${tableName}(title) VALUES ($1)`, [item]);
    res.redirect(`/list?tableName=${encodeURIComponent(tableName)}&name=${encodeURIComponent(name)}`);
  }
  catch(err){
    console.log(err)
  }
  
});

app.post("/edit", async(req, res) => {
  const name = req.body.listTitle;
  const tableName = req.body.tableName;
  const item = req.body.updatedItemTitle;
  const id = req.body.updatedItemId;
  try{
    await db.query(`UPDATE ${tableName} SET title=($1) WHERE id=($2)`, [item, id])
    res.redirect(`/list?tableName=${encodeURIComponent(tableName)}&name=${encodeURIComponent(name)}`);
  }
  catch(err){
    console.log(err)
  }
});

app.post("/delete", async(req, res) => {
  const id= req.body.deleteItemId;
  const name = req.body.listTitle;
  const tableName = req.body.tableName;
  try{
    await db.query(`DELETE FROM ${tableName} WHERE id=($1)`, [id])
    res.redirect(`/list?tableName=${encodeURIComponent(tableName)}&name=${encodeURIComponent(name)}`);
  }
  catch(err){
    console.log(err)
  }

});

app.get('/logout', (req,res)=>{
  res.redirect('/')
})


