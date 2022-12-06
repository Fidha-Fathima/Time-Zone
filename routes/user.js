require('dotenv').config()
var express = require('express');
const { ExplainVerbosity, Db } = require('mongodb');
const { getProductDetails } = require('../helpers/product-helpers');
var router = express.Router();
const { check, validationResult } = require('express-validator');
const { response, Router } = require('express');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
var productHelpers = require('../helpers/product-helpers')
var userHelpers = require('../helpers/user-helpers')


client.verify.v2.services.create({ friendlyName: 'timezoneotp' }).then(service => console.log(service.id))



//         m i d d l e w a r e   f o r    V E R I F Y L O G I N       //
///////////////////////////////////////////////////////////////////////

const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  }
  else {
    res.redirect('/user-login')
  }
}


/* GET home page. */
////////////////////

router.get('/user-login', function (req, res) {
  if (req.session.loggedIn) {
    res.redirect('/')
  }
  else {
    res.render('user/user-login');
    // req.session.userloginErr = false;
  }
});



router.post('/sendotp', (req, res) => {
  console.log("bunberrrrrrrrrrrrr", req.body)
  console.log("id is", accountSid)
  console.log(req.body.mobilenumber);
  client.verify.v2
    .services(process.env.TWILIO_SERVICE_SID)
    .verifications.create({
      to: `+91${req.body.mobilenumber}`,
      channel: 'sms'
    }).then(data => {
      console.log("dataaaaaaaaaaa", data.status);
      res.json({})

    })
    .catch(err => {
      console.log("otp--error", err);
    })
  res.json({ status: true })
})

router.post('/user-login', (req, res) => {
  console.log("ethiiiiiiiiiiiiiiiiiii")
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status !== null) {
      if (response.status) {
        req.session.user = response.user
        req.session.loggedIn = true
        res.redirect('/')
      }
      else {
        req.session.userloginErr = true;
        res.redirect('/user-login')
      }
    }
    else {
      res.send("The user can't access the website as the user has been blocked ");
    }
  })
})


//Registration............

router.get('/registration', function (req, res, next) {

  res.render('user/registration', { errors: req.session.errors });
  req.session.errors = null

});

router.post('/registration', (req, res) => {
  req.body.blockStatus = true;
  // console.log(req.body);

  let { firstname, email, mobilenumber, password, otp, blockStatus } = req.body;

  client.verify.services(process.env.TWILIO_SERVICE_SID).verificationChecks.create({ to: `+91${mobilenumber}`, code: otp })
    .then((resp) => {
      // console.log(req.body.number);
      if (!resp.valid) 
      {
        // console.log("otppppp failed", resp)
        res.json({ status: false })
      } else {
        console.log("otpp successssss", resp)
        let userdata = { firstname, email, mobilenumber, password, blockStatus }
        userHelpers.doSignup(userdata).then((response) => {
          res.json({ status: true })
        })

      }
    }).catch(err => {
      console.log(err);
    })
  // req.body.blockStatus = true;
  // userHelpers.doSignup(req.body).then((response) => 
  // { 
  //   res.json({status:true})
  // })


  // req.session.loggedIn=true
  // req.session.user=response ///ggggggggggggggggggggg


})


// Home page.....................


router.get('/', async function (req, res, next) {
  let user = req.session.user
  let cartcount = null
  if (req.session.user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id)
  }
  res.render('index', { user, cartcount })
})


router.get('/all-products', async function (req, res, next) {
  let cartcount = null
  if (req.session.user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id)
  }

  let category = productHelpers.getAllCategory()
  let user = req.session.user
  productHelpers.getAllProducts().then((products) => {
    
    productHelpers.getAllCategory().then((category) => {
      res.render('user/all-products', { user: true, products, user, cartcount, category })
    })

  })

})


////////    O   T   P   ////////
////////////////////////////////


router.get('/otp-login', (req, res) => {
  res.render('user/otp-login')
})

router.get('/otp-verify', (req, res) => {
  res.render('user/otp-verify')
})


//View product..............................


router.get('/product-view/:id', async (req, res) => {
  
  let cartcount = null
  if (req.session.user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id)
  }
  let user = req.session.user
  productHelpers.getProductDetails(req.params.id).then((products) => {
    productHelpers.getAllCategory().then((categories) => {

      // product == price = 900 && category = cadbury
      //category discount = 3
      //product price / category discount * 100

      res.render('user/product-view', { products: products, user, cartcount, categories })
    })
  })
})

/////////////////////////////////
//      C A T   P RO DU C T  S //
////////////////////////////////



router.get('/category-products', (req, res) => {
  productHelpers.getAllCategory().then((category) => {
    res.render('user/category-products', { user: req.session.user, category })
  })

})


router.get('/show-catproducts/:id', async (req, res) => {
  try{
    let category = await productHelpers.getAllCategory()
  let product = await userHelpers.catProducts(req.params.id)
  console.log(category)
  res.render('user/show-catproducts', { user: req.session.user, product, category })
  }
  catch(error){
    
    res.redirect('/error')
  }
  
})



/////////////////////////////////////
//         C  A  R  T             //
////////////////////////////////////


router.get('/cart', verifyLogin, async (req, res) => {
  let cartcount = null
  if (req.session.user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id)
  }
  let products = await userHelpers.getCartProducts(req.session.user._id)

  let totalValue;
  if (products.length > 0) {
    var amount = await userHelpers.getTotalAmount(req.session.user._id)
  }
  let coupons = await productHelpers.getAllCoupons()
  res.render('user/cart', { products, user: req.session.user, amount, cartcount, coupons })
})


router.get('/add-to-cart/:id', verifyLogin, (req, res) => {
  userHelpers.addtoCart(req.params.id, req.session.user._id).then(() => {
    res.redirect('/all-products')
  })
})


router.post('/change-product-quantity', (req, res) => {
  console.log("HIIIIIIIIIIIIII");
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    let total = await userHelpers.getTotalAmount(req.session.user._id)
    response.total = total ? total.total : 0
    res.json(response)
  })
})

router.post('/remove-product', (req, res) => {
  userHelpers.deleteProduct(req.body).then(async (response) => {
    res.json(response)
  })
})


router.get('/place-order', verifyLogin, async (req, res) => {
  let cartcount = null
  if (req.session.user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id)
  }
  let { total } = await userHelpers.getTotalAmount(req.session.user._id)
  let user = await userHelpers.userDetails(req.session.user._id)
  let addresses = false;
  if (user.addresses) {
    addresses = user.addresses
  }
  res.render('user/place-order', { total, user: req.session.user, cartcount, addresses })
})




router.post('/place-order', async (req, res) => {
  let products = await userHelpers.getCartProductList(req.session.user._id)
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  console.log("total is ", total, req.session.user._id, req.body)
  userHelpers.placeOrder(req.body, products, total.total, req.session.user._id).then((orderId) => {
    if (req.body['payment-method'] === 'COD') {
      res.json({ cod_success: true })
    }
    else {
      userHelpers.generateRazorpay(orderId, total.total).then((response) => {
        res.json(response)
      })
    }
  })
})



router.post('/apply-coupon', async (req, res) => {
  console.log(req.body.coupon_code)
  let coupon = await productHelpers.validateCouponCode(req.body.coupon_code.toUpperCase())
  console.log("couponnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn",coupon)
  if (coupon) {
    let totalamount= parseInt(req.body.totalamount)
    let mintotal=parseInt(coupon.mintotal)
    if(totalamount > mintotal){
      await productHelpers.addCouponDiscount(req.session.user._id, coupon.discount)
      res.status(200).json("Coupon applied")
    }else{
      res.status(401).json("Coupon cod is not valid")
    }
    
  } else {
    res.status(401).json("Coupon cod is not valid")
  }
})


router.get('/successful-order', verifyLogin, (req, res) => {
  res.render('user/successful-order', { user: req.session.user })
})


router.get('/orders', verifyLogin, async (req, res) => {
  let cartcount = null
  if (req.session.user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id)
  }
  userHelpers.getUserOrders(req.session.user._id).then((orders) => {
    res.render('user/orders', { user: req.session.user, orders, cartcount })
  })

})

// router.get('/remove-order/:id', (req, res) => {

//   userHelpers.removeOrder(proId).then((response) => {
//     res.redirect('/orders')
//   })
// })


router.get('/cancel-order/:id', async (req, res) => {
  console.log(req.params.id)
  userHelpers.CancelOrder(req.params.id).then((response) => {
    res.redirect('/orders')
  })
})




router.get('/ordered-products/:id', verifyLogin, async (req, res) => {
  // try{

    let product = await userHelpers.orderedProducts(req.params.id)
  res.render('user/ordered-products', { product, user: req.session.user })
  // }
  // catch(error)
  // {
  //   res.redirect('/error')
  // }
  
})


/////////////////////////////////////
//    W  I  S  H  L  I  S  T     //
//////////////////////////////////



router.get('/wishlist', verifyLogin, async (req, res) => {
  let cartcount = null
  if (req.session.user) {
    cartcount = await userHelpers.getCartCount(req.session.user._id)
  }
  let products = await userHelpers.getWishlistProducts(req.session.user._id)
  res.render('user/wishlist', { products, user: req.session.user, cartcount })
})

router.get('/add-to-wishlist/:id', verifyLogin, (req, res) => {
  userHelpers.addtoWishlist(req.params.id, req.session.user._id).then(() => {
    res.redirect('/all-products')
  })
})



router.post('/deletewishlist-product', (req, res) => {
  userHelpers.removeWishlist(req.body).then(async (response) => {
    res.json(response)
  })
})


/////////////////////////////////////////////////////
/////////////////////////////////////////////////////
/////////////////////  logout //////////////////////
////////////////////////////////////////////////////
///////////////////////////////////////////////////


router.post('/verify-payment', (req, res) => {
  console.log(req.body);
  userHelpers.verifyPayment(req.body).then(() => {
    userHelpers.changePaymentStatus(req.body['order[reciept]']).then(() => {
      res.json({ status: true })
    })
  }).catch((err) => {
    console.log(err)
    res.json({ status: false, errMsg: '' })
  })
})
router.get('/user-profile', verifyLogin, async (req, res) => {

  let users = await userHelpers.userDetails(req.session.user._id)
  let addresses = false;
  if (users.addresses) {
    addresses = users.addresses
  }
  res.render('user/user-profile', { user: req.session.user, users, addresses })
})
router.get('/add-address', verifyLogin, (req, res) => {
  let user = req.session.user
  res.render('user/add-address', { user })
})
router.post('/add-address', (req, res) => {

  userHelpers.addAddress(req.session.user._id, req.body).then(() => {
    res.redirect('/user-profile')
  })
})
router.get('/add-temp-address', (req, res) => {
  res.render('user/temp-address')
})
router.get('/user-logout', (req, res) => {
  req.session.destroy()
  res.redirect('/user-login')
})
module.exports = router;












