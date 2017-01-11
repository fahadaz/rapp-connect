var express = require('express');
var router = express.Router();

var promise = require('bluebird'); // or any other Promise/A+ compatible library;
var options = {
    promiseLib: promise // overriding the default (ES6 Promise);
};

var pgp = require('pg-promise')(options);
var connStr = process.env.DATABASE_URL; // heroku provides postgres url as env variable 
var db = pgp(connStr);

/* GET home page. */
router.get('/', function(req, res, next) {

  db.any('select * from salesforce.Position__c where Status__c =\'Open - Approved\' ')
  .then(function(data){    
    res.render('index', { title: 'Welcome to ACME Distributions Recruiting Portal', results: data });
  })
  .catch(function(err){
    console.error(err); response.send("Error" + err);
  });

});

/**  Display Detail Page */
router.get('/detail', function(req, res, next){
    db.any('select * from salesforce.Position__c where id =$1', req.query.i)
    .then(function(data){
      res.render('detail',{title: "Detail for " + data[0].name, res: data[0]});
    })
    .catch(function(err){
      console.error(err);
      response.send('Err: '+ err);
    });    
});

router.get('/apply', function(req, res, next){
  db.any('select * from salesforce.Position__c where id = $1', req.query.i)
  .then(function(data){
    res.render('apply',{title: "Apply for " + data[0].name, res: data[0]});
  })
  .catch(function(err){
    console.error(err);
    response.send('Err: '+ err);
  }
  );  
});

router.post('/apply', function(req, res, next){
    var firstName = req.body.FirstName;
    var lastName = req.body.LastName;
    var posId = req.body.sfid_pos;
    var email = req.body.Email;
    var coverLetter = req.body.CoverLetter;
    var resume = req.body.Resume;

    console.log('Email:' + email);

    db.one('select count(*) as ct from salesforce.Candidate__c where email__c = $1', email)
      .then(function(data){
        console.log(data);
      db.tx(function(t){
        var q1;
        if(data.ct == '1'){
          q1 = this.none(
            ' UPDATE salesforce.Candidate__c SET first_name__c = $1, last_name__c = $2 where email__c=$3; '
            , [firstName, lastName, email]);
        }
        else{
          q1 = this.none(
            ' INSERT INTO salesforce.Candidate__c(first_name__c, last_name__c, email__c)  Values($1, $2, $3) '
            , [firstName, lastName, email]);
        }

        var q2 = this.none(
        '  INSERT INTO salesforce.Job_Application__c(candidate__r__email__c, resume__c, cover_letter__c, position__c)  Values($1, $2, $3, $4) '
       , [email, resume, coverLetter, posId]);

       console.log(posId);

        return this.batch([q1, q2]);
      }).then(function(data){
      res.render('apply-success',{title: "Successfully applied "});
    })
    .catch(function(err){
      console.error(err);
      res.send('Err: '+ err);
    });
        
      });
    });
    
module.exports = router;
