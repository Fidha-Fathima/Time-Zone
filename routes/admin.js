require('dotenv').config()
var express = require('express');
const { helpers } = require('handlebars');
const { ObjectId } = require('mongodb');
var productHelpers = require('../helpers/product-helpers');
const { getchartData } = require('../helpers/user-helpers');
const userHelpers = require('../helpers/user-helpers');
const admin_name = process.env.ADMIN
const admin_password = process.env.ADMIN_PASSWORD

var router = express.Router();



/* GET users listing. */

//     L O G I N   // 



const adminverify = (req,res,next)=>
{

  // console.log(req.session.admin.loggedIn,"wwwww");
  if(req.session.adminloggedIn)
  {
    next()
  
  }
  else
  {
  
    res.redirect('/admin/admin-login')
  }
}

router.get('/admin-login', function (req, res) 
{
  if (req.session.admin)
   {

    res.redirect('/admin/')
  }
  else {
    res.render('admin/admin-login')
  }
})

router.post('/admin-login', (req, res) => {
  if (req.body.email == admin_name && req.body.password == admin_password)
  {
    req.session.admin=req.body.email  // creating a session 
    req.session.adminloggedIn=true
    res.redirect('/admin/')
  }
  else 
  {
    res.redirect('/admin/admin-login')
  }
})



router.get('/',adminverify,async(req, res)=>
{
  let count=await productHelpers.getUserCount()
  let product=await productHelpers.getProductCount()
  let order=await productHelpers.getOrderCount()
  res.render('admin/sidebar-dashboard', { admin: true ,count , product , order})
} );






/////////////////////////////////////////////
//         D A S H B O A R D               //
/////////////////////////////////////////////

router.get('/sidebar-dashboard',adminverify,async(req,res)=>
{
  let count=await productHelpers.getUserCount()
  let product=await productHelpers.getProductCount()
  let order=await productHelpers.getOrderCount()
  res.render('admin/sidebar-dashboard',{admin:true,count,product,order})

})


///////////////////////////////////////////////
//      S I D E B A R   P R O D U C T S     //
//////////////////////////////////////////////


router.get('/sidebar-products',adminverify, function (req, res, next) {
  productHelpers.getAllProducts().then((products) => {
    res.render('admin/sidebar-products', {products, admin: true })
  })
})







/////////////////////////////////////////////////
//           A D D  P R O D U C T S           //
////////////////////////////////////////////////




router.get('/add-products',adminverify, async(req, res) =>{
  let category=await productHelpers.getAllCategory()
  res.render('admin/add-products',{admin:true,category})
})


router.post('/add-products',async(req, res) =>
{
  console.log(req.body);
  req.body.category = ObjectId(req.body.category)
  productHelpers.addProduct(req.body, (id) => 
  {
    let image = req.files.image
    console.log(req.files,"njan vannlloooo")
    console.log(req.files.image.length,"njan vannlloooo0000000000000000")
    
    // for(i=0;i<req.files.image.length;i++){
    //   image[i].mv('./public/product-images/' + id + i+ '.jpg', (err, done) => 
    //   {
    //     if (!err) 
    //     {
    //       console.log("!err");
    //       res.redirect('/admin/sidebar-products')
    //     }else{
    //        console.log("err");
    //       res.render('admin/add-products')
    //     }
       
    //   })
    // }

    for(i=0;i<req.files.image.length;i++){
      image[i].mv('./public/product-images/' + id + i+ '.jpg', (err, done) => 
      {
        if (err) 
        {res.render('admin/add-products')
          console.log("!err");
          
        }
       
      })
    }
    res.redirect('/admin/sidebar-products')
    
  })
})




////////////////////////////////////////////
//      B L O C K  & U N B L O C K       //
///////////////////////////////////////////


router.get('/block-user/:id/:blockStatus', (req, res) => {
  let userId = req.params.id;
  let userstatus = req.params.blockStatus;
  let status=true;
  if (userstatus=="true") 
  {
    status = false;
  }
  productHelpers.blockUser(userId, status).then((response) => {
    res.redirect('/admin/sidebar-users')
  })
})



  //////////////////////////////////////////
 //    S I D E B A R   C A T E G O R Y   //
//////////////////////////////////////////




router.get('/sidebar-category',adminverify, (req, res) => {
  productHelpers.getAllCategory().then((category) => {
    res.render('admin/sidebar-category', { category, admin: true })
  })
})
 



router.get('/sidebar-users',adminverify, (req, res) => {
  userHelpers.getAllUser().then((users) => {
    res.render('admin/sidebar-users', { users, admin: true })
  })
})



router.get('/add-category',adminverify, (req, res) => {
  res.render('admin/add-category', { admin: true })
})



router.post('/add-category', (req, res) => {

  productHelpers.addCategory(req.body).then((result) => {
    res.redirect('/admin/sidebar-category')
  })
})


router.get('/delete-products/:id', (req, res) => {
  let proId = req.params.id
  productHelpers.deleteProduct(proId).then((response) => {
    res.redirect('/admin/sidebar-products')
  })
})

router.get('/edit-products/:id', async (req, res) => {
  let category=await productHelpers.getAllCategory()
  let product = await productHelpers.getProductDetails(req.params.id)
  product = product[0]
  res.render('admin/edit-products', {product,admin:true,category})
})




router.get('/delete-category/:id', (req, res) => {
  let proId = req.params.id
  productHelpers.deleteCategory(proId).then((response) => {
    res.redirect('/admin/sidebar-category')
  })
})




router.get('/edit-category/:id', async (req, res) => {
  let category = await productHelpers.getCategoryDetails(req.params.id)
  category = category[0]
  res.render('admin/edit-category', { category, admin: true })
})



router.post('/edit-category/:id', (req, res) => {
  let id = req.params.id
  productHelpers.updateCategory(req.params.id, req.body).then(() => {
    res.redirect('/admin/sidebar-category')
  })
})

router.get('/add-offer/:id',(req,res)=>
{
  let catId=req.params.id
  res.render('admin/addCategoryoffers',{catId,admin:true})
})

router.post('/add-offer/:id',(req,res)=>
{
  let catId=req.params.id
  let off=req.body.off
  let validTill=req.body.offTill
  productHelpers.addCategoryOff(catId,off,validTill).then(()=>
  {
    res.redirect('/admin/sidebar-category')
  })
})



router.post('/edit-products/:id', (req, res) => {
  console.log(req.params.id)
  let id = req.params.id
  req.body.category = ObjectId(req.body.category)
  productHelpers.updateProduct(req.params.id, req.body).then(() => 
  {
   
    if (req.files) {
      let image = req.files.image
      for(i=0;i<req.files.image.length;i++){
        image[i].mv('./public/product-images/' + id + i+ '.jpg', (err, done) => 
        {
          if (err) 
          {res.render('admin/add-products')
            console.log("!err");
            
          }
         
        })
      }
  
    }
    res.redirect('/admin/sidebar-products')
  })
}
)


/////////////////////////////////////////
//            O R D E R S              //
/////////////////////////////////////////


router.get('/sidebar-orders',adminverify,function(req,res,next)
{
  userHelpers.getAllOrders().then((orders)=>
  {
    res.render('admin/sidebar-orders',{orders,admin:true})
  })
})


router.get('/delete-order/:id',(req,res)=>
{
  let userId=req.params.id;
  userHelpers.deleteOrders(userId).then((response)=>
  {
    res.redirect('/admin/sidebar-orders')
  })
})













router.post('/change-orderstatus',(req,res)=>
{
  console.log(req.body);
  userHelpers.updateOrderStatus(req.body).then((response)=>
  {
    res.status(200).json(response)
  })
})









router.get('/order-products/:id',async(req,res)=>
{
  let product= await userHelpers.orderedProducts(req.params.id)
  res.render('admin/order-products',{product,admin:true})
})






//////////////////////////////////////////////
//       S I D E B A R   C  O U P O N S     //
//////////////////////////////////////////////

router.get('/sidebar-coupons',adminverify,(req,res)=>
{
  productHelpers.getAllCoupons().then((coupons)=>
  {
    res.render('admin/sidebar-coupons',{admin:true,coupons})
  })
})


router.get('/add-coupons',adminverify,(req,res)=>
{  
  res.render('admin/add-coupons',{admin:true})
})
router.post('/add-coupons',(req,res)=>
{
  productHelpers.addCoupons(req.body).then((result)=>
  {
    res.redirect('/admin/sidebar-coupons')
  })
})

router.get('/delete-coupons/:id',(req,res)=>
{
  let couponId=req.params.id
  productHelpers.deleteCoupons(couponId).then((response)=>
  {
    res.redirect('/admin/sidebar-coupons')
  })
})


router.get('/edit-coupons/:id' ,async (req,res)=>
{
  let coupon=await productHelpers.getCouponDetails(req.params.id)
  coupon=coupon[0]
  res.render('admin/edit-coupons',{ coupon , admin:true})
})

router.post('/edit-coupons/:id',(req,res)=>
{
  productHelpers.updateCoupons(req.params.id,req.body).then(()=>
  {
    res.redirect('/admin/sidebar-coupons')
  })
})






router.get('/getChartData',getchartData)



router.get('/admin-logout', (req, res) => 
{
  req.session.destroy()
  res.redirect('/admin/admin-login')
})

module.exports = router;
