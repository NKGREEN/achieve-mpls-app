var express = require('express');
var router = express.Router();
var pg = require('pg');
var pool = require('../modules/db');
var incompleteTicketArray = [];
/**
 * @desc get statement that's called in the CoachService controller.
 * @param the username gets sent thought (name@email.com)
 * @return the tickets associated with that username should be sent back.
 */
router.get('/tickets/:userSession/:userID', function(req, res) {
  console.log('request params are ', req.params)
  var session_count = req.params.userSession;
  var user_id = req.params.userID;
  var today = new Date();
  console.log('today is ', today)
  var ticketsToSend = [];
  if (req.isAuthenticated()) {
    pool.connect(function(errorConnectingToDb, db, done) {
      if (errorConnectingToDb) {
        res.sendStatus(500);
      } else {
        console.log('going into the query: meeting_count ', session_count, ' user_id ', user_id)
        db.query('SELECT * FROM "events" WHERE "session_id"=(SELECT "id" from "sessions" where "session_count"=$1) AND "date_form_open" <= $2 AND "date_form_close" > $2 AND "events"."id" NOT IN (SELECT "event_id" FROM "form_responses" WHERE user_id = $3) ORDER BY "date_form_close" ASC LIMIT 1;', [session_count, today, user_id],
          function(queryError, result) {
            if (queryError) {
              res.sendStatus(500);
            } else {
              var incompleteTicketArray = result.rows;
              console.log('incomplete ticket array is ', incompleteTicketArray)
              if (incompleteTicketArray.length === 0) {
                var noTicket = {
                  noneOpen: true
                }
                res.send(noTicket);
              } else {
                db.query('SELECT "forms"."id","forms"."form_name", array_to_json(array_agg(row_to_json((SELECT d FROM (SELECT "questions"."id", "questions"."question" )d)))) AS "questions" FROM "questions" JOIN "forms" ON "forms"."id" = "questions"."form_id" WHERE "forms"."id"=$1 GROUP BY "forms"."id","forms"."form_name" ORDER BY "id";', [incompleteTicketArray[0].form_id],
                  function(queryError, result) {
                    if (queryError) {
                      done();
                      res.sendStatus(500);
                    } else {
                        var sortedQuestions = result.rows[0].questions.sort(function (a,b) {
                          return a.id - b.id;
                        })
                        console.log('sorted questions is ', sortedQuestions)
                        var formToSend = {
                          user: user_id,
                          event_id: incompleteTicketArray[0].id,
                          session_count: incompleteTicketArray[0].meeting_count,
                          session_id: incompleteTicketArray[0].session_id,
                          form_id: incompleteTicketArray[0].form_id,
                          form_name: result.rows[0].form_name,
                          questions: result.rows[0].questions
                        };
                      res.send(formToSend);
                    }
                  });
              }
            }
          });
      }
    });
  }
});

/**
 * @function find unique tickets
 * @desc compares two arrays of tickets and pushes the unique tickets into a new arrays
 * @param array of completed and array of open
 * @return unique items are pushed into the global {array} incompleteTicketArray
 */
var findUniqueTickets = function(completed, open) {
  incompleteTicketArray.length = 0;
  open.forEach(function(ticket) {
    if (completed.includes(ticket.id)) {} else {
      incompleteTicketArray.push(ticket);
    }
  });
  return incompleteTicketArray;
};


router.post('/completedTicket', function(req, res) {
  console.log('post is ', req.body);
  var dateToday = new Date();
  var _query = {
    user_id: req.body.user_id,
    event_id: req.body.event_id,
    session_id: req.body.session_id,
    form_id: req.body.form_id
  };
  var questions = req.body.questions;
  if (req.isAuthenticated()) {
    pool.connect(function(errorConnectingToDb, db, done) {
      if (errorConnectingToDb) {
        res.sendStatus(500);
      } else {
        questions.forEach(function(_q) {
          _query.question_id = _q.id;
          _query.question = _q.question;
          _query.answer = _q.answer;
          db.query('INSERT INTO "form_responses" ("user_id", "event_id", "session_id", "question_id", "question", "answer", "date_form_completed", "form_id" ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8);', [_query.user_id, _query.event_id, _query.session_id, _query.question_id, _query.question, _query.answer, dateToday, _query.form_id],
            function(queryError, result) {
              done();
              if (queryError) {
                res.sendStatus(500);
              } else {
                return;
              }
            });
        });
        res.sendStatus(200);
      }
    });
  } else {
    res.sendStatus(401);
  }
}); //end router.post


module.exports = router;
