const express = require('express')
const path = require('path')
const sqlite3 = require('sqlite3')
const fs = require('fs');
const { create } = require('domain');
const bodyParser = require('body-parser');
const { OutgoingMessage } = require('http');


fs.readFile(path.join(__dirname,'inventory.txt'), 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    let deez = data.split("\n")
    for (let i of  deez) {
        let l = i.replace("\r","")
        //console.log(l)
        addInventory(l,db)
    }
  });

fs.readFile(path.join(__dirname,'member.txt'), 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    let deez = data.split("\n")
    deez = deez.slice(1,-1)
    for (let i of  deez) {
        let l = i.replace("\r","")
        //console.log(l)
        addMembers(l,db)
    }
  });

const db = new sqlite3.Database('base.db');

const createtables = () => {
    db.exec(`CREATE TABLE IF NOT EXISTS Inventory 
        (Name TEXT, Type TEXT, Price REAL, Avail INT, imgURL TEXT, PRIMARY KEY(Name))`)
    db.exec(`CREATE TABLE IF NOT EXISTS Member 
        (mem_name TEXT, mem_email TEXT, password TEXT, PRIMARY KEY(mem_email, password))`)
}

createtables()

const addInventory = (line,destination) => {
    let lineArray = line.split(",")
    let itemName = lineArray[1]; let itemType = lineArray[2]
    let itemPrice = parseFloat(lineArray[3]); let itemCount = parseInt(lineArray[4])
    let itemUrl = lineArray[5]

    destination.exec(`INSERT OR IGNORE INTO Inventory (Name, Type, Price, Avail, imgURL) 
        VALUES ('${itemName}', '${itemType}', ${parseFloat(itemPrice)}, ${parseInt(itemCount)}, '${itemUrl}')`)
    
}

const addMembers = (line,destination) => {
    let lineArray = line.split(",")
    let mem_name = lineArray[0]; let mem_email = lineArray[1]; let password = lineArray[2]
    //console.log(mem_name,mem_email,password)
    destination.exec(`INSERT OR IGNORE INTO Member (mem_name, mem_email, password) 
        VALUES ('${mem_name}', '${mem_email}', '${password}')`)
    
}

/*const getInventory = async () => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM Inventory`;
        db.all(sql, [], (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
} */

const fetchAll = async (db, sql, params) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  };
  
(async () => {
    q = `SELECT * FROM Member`
    const res = await fetchAll(db,q)
    //console.log(res)
})()

const insertMembers = (mem_name, mem_email, password) => {
    db.exec(`INSERT OR IGNORE INTO Member (mem_name, mem_email, password) 
        VALUES ('${mem_name}', '${mem_email}', '${password}')`)
}

const app = express()

app.use(express.static('src'));
app.use('src', express.static('images'));
app.use(bodyParser.urlencoded({extended: true}))
app.set('view engine', 'ejs');

const loadfrontpage = () =>{
    app.get('/', async (req,res) => {
        const sql = `SELECT * FROM Inventory`
        const inv = await fetchAll(db,sql)
        //res.sendFile(path.join(__dirname,'index.html'))
        res.render('index',{inv:inv,error:req.query.error})
    })
}

loadfrontpage()

app.get('/signup', (req,res) => {
    res.render('signup')
})

app.post('/orderdetails', async (req, res) => {
    let totalcost = 0
    const q = req.body
    //console.log(q)
    let items = []
    let orderitems = []
        
    for (let i in q){
        items.push([i,q[i]])
    }

    let inv = items.splice(0,5)
        for (let item of inv){
            //console.log(item)
            let line = `SELECT * FROM Inventory WHERE Name = '${item[0]}'`
            let q = await fetchAll(db,line)
            let perItemPrice = parseFloat(q[0].Price)*parseFloat(item[1])
            totalcost = totalcost + perItemPrice
            orderitems.push([q[0].Name,parseFloat(q[0].Price),parseFloat(item[1])])

            let updateline = `UPDATE Inventory SET Avail = 
            CASE WHEN (Avail - ${parseInt(item[1])}) < 0 THEN Avail 
            ELSE Avail - ${parseInt(item[1])} END 
            WHERE Name = '${q[0].Name}'`

            db.exec(updateline)
        } 
    
    if (req.body.submitguest) {
        let custname = req.body.custname
        //console.log(custname)
        //console.log('GUEST')
        res.render('order',{orderitems:orderitems,totalcost:totalcost,guestname:custname})
    }
    else {
        let mememail = req.body.mememail
        let passwd = req.body.passwd
        let memberquery = `SELECT * FROM Member WHERE mem_email = '${mememail}' AND password = '${passwd}'`
        let memberresponse = await fetchAll(db,memberquery)
        if (memberresponse.length != 0) {
            //console.log(memberresponse[0].mem_name)
            res.render('order',{orderitems:orderitems,totalcost:totalcost,memname:memberresponse[0].mem_name})
        }
        else {
            //const sql = `SELECT * FROM Inventory`
            //const inv = await fetchAll(db,sql)
            let e = "Invalid email or password"
            console.log('User does not exist')
            //loadfrontpage(e)
            res.redirect('/?error=Invalid email or password')
        }
        //console.log(mememail,passwd)
        //console.log('MEMBER')
    }
})

app.post('/signupdetails', (req,res) => {
    const name = req.body.name
    const email = req.body.email
    const passwd = req.body.passwd
    //console.log(req.body)
    //console.log(name, email, passwd)
    insertMembers(name,email,passwd)
    
    res.render('signed')
})

app.listen(8080, () => {
    console.log('listening on port 8080')
})