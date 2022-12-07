require('dotenv').config()
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const hbs=require('express-handlebars');
const multer  = require('multer')


var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');

var app = express();
var fileUpload = require('express-fileupload')
var db = require('./config/connection')
var session=require('express-session')

let method = hbs.create({})

method.handlebars.registerHelper('ifCond',function(v1,v2,options){
  if(v1 == v2){
    return options.fn(this);
  }
  else{
     return options.inverse(this);
  }
});





// off:function (a,b,options){    
//   return parseInt(a-(a*(b/100)))

// }



// const fileStorageEngine=multer.diskStorage({
// })
// const upload=multer({storage})


// view engine setup


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs',hbs.engine ({extname:'hbs',defaultLayout:'layout',layoutsDir:__dirname+'/views/layout/',partialDir:__dirname+'/views/partials/'}))



app.use(logger('dev')); 
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload())
app.use(session({secret:"Key",cookie:{maxAge:6000000}}))


db.connect((err) => {
  if(err) console.log('Database not connected',err)
else console.log('Database connected successfully')
})
app.use('/', userRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
  // error handler
