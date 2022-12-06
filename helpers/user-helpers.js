var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
const { check, validationResult } = require('express-validator')
const { ObjectID } = require('bson')
const { response } = require('express')
var objectId = require('mongodb').ObjectId
const Razorpay = require('razorpay')
const { resolve } = require('path')
var instance = new Razorpay({
  key_id: 'rzp_test_ENXqy11KzQ0i3j',
  key_secret: 'UVH0emKxc6QGo74T60shVClT',
})

module.exports = {
  // doSignup: (userData) => {
  //     return new Promise(async (resolve, reject) => {
  //         // let emailcheck= await db.get().collection(collection.USER_COLLECTION).findOne({ email :userData.email })
  //         // let numbercheck = await db.get().collection(collection.USER_COLLECTION).findOne({ mobilenumber : userData.mobilenumber})
  //         // if(emailcheck == null &&  numbercheck == null)
  //         // {
  //             userData.password = await bcrypt.hash(userData.password, 10)
  //             db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) =>
  //             {
  //                 resolve(data.insertedId)
  //             })
  //         }
  //     //     else
  //     //     {
  //     //         reject()
  //     //     }

  //     // }
  //     )
  // },
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      userData.password = await bcrypt.hash(userData.password, 10)
      db.get()
        .collection(collection.USER_COLLECTION)
        .insertOne(userData)
        .then((data) => {
          resolve(data.insertedId)
        })
    })
  },

  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false
      let response = {}
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ email: userData.email })
      if (user.blockStatus === true) {
        //Checking whether the user iis blockked or not................
        bcrypt.compare(userData.password, user.password).then((status) => {
          if (status) {
            response.user = user
            response.status = true
            resolve(response)
          } else {
            resolve({ status: false })
          }
        })
      } else {
        console.log('faileddd')
        resolve({ status: null })
      }
    })
  },
  validation: [
    check('firstname', 'Name is required')
      .not()
      .isEmpty()
      .isLength({ min: 3 })
      .withMessage('The name must me 3+ characters long'),
    check('email', 'Email is required').isEmail().normalizeEmail(),
    check('mobilenumber', 'Mobile number should contains 10 digits').isLength({
      min: 10,
      max: 10,
    }),
    check('password', 'Password is requried')
      .isLength({ min: 3 })
      .custom((password, { req, loc, path }) => {
        if (password !== req.body.con_password) {
          throw new Error("Passwords don't match")
        } else {
          return password
        }
      }),
  ],

  getAllUser: () => {
    return new Promise(async (resolve, reject) => {
      let users = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .find()
        .toArray()
      resolve(users)
    })
  },

  addtoCart: (proId, userId) => {
    let proObj = {
      item: ObjectID(proId),
      quantity: 1,
    }
    return new Promise(async (resolve, reject) => {
      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) })
      if (userCart) {
        let proExist = userCart.products.findIndex(
          (product) => product.item == proId,
        )
        if (proExist != -1) {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objectId(userId), 'products.item': objectId(proId) },
              {
                $inc: { 'products.$.quantity': 1 },
              },
            )
            .then(() => {
              resolve()
            })
        } else {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objectId(userId) },
              {
                $push: { products: proObj },
              },
            )
            .then((response) => {
              resolve()
            })
        }
      } else {
        let cartObj = {
          user: objectId(userId),
          products: [proObj],
          couponDiscount: 0,
        }
        db.get()
          .collection(collection.CART_COLLECTION)
          .insertOne(cartObj)
          .then((response) => {
            db.get()
              .collection(collection.WISHLIST_COLLECTION)
              .deleteOne({
                user: objectId(userId),
                'products.item': objectId(proId),
              })
              .then((response) => {
                resolve()
              })
          })
      }
    })
  },
  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: '$products',
          },
          {
            $project: {
              item: '$products.item',
              quantity: '$products.quantity',
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: 'item',
              foreignField: '_id',
              as: 'product',
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ['$product', 0] },
            },
          },
          // {
          // $lookup:{
          //     from:collection.PRODUCT_COLLECTION,
          //     let:{proList:'$products'},
          //     pipeline:[
          //         {
          //             $match:
          //             {
          //                 $expr:{
          //                     $in:['$_id',"$$proList"]
          //                 }
          //             }
          //         }
          //     ],
          //     as:'cartItems'
          // }
          // }
        ])
        .toArray()
      resolve(cartItems)
    })
  },
  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) })
      if (cart) {
        count = cart.products.length
      }
      resolve(count)
    })
  },
  changeProductQuantity: (details) => {
    details.count = Number(details.count)
    //details.quantity = Number(details.quantity)

    return new Promise((resolve, reject) => {
      console.log(details.product, 'asdf')
      if (details.count == -1 && details.quantity == 1) {
        // if (details.count == -1 ) {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            { _id: objectId(details.cart) },
            {
              $pull: { products: { item: objectId(details.product) } },
            },
          )
          .then((response) => {
            resolve({ removeProduct: true })
          })
      } else {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            {
              _id: objectId(details.cart),
              'products.item': objectId(details.product),
            },
            {
              $inc: { 'products.$.quantity': details.count },
            },
          )
          .then((response) => {
            resolve({ status: true })
          })
      }
    })
  },
  deleteProduct: (details) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          { _id: objectId(details.cart) },
          {
            $pull: { products: { item: objectId(details.product) } },
          },
        )
        .then((response) => {
          resolve({ deleteProduct: true })
        })
    })
  },
  getTotalAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let total = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: '$products',
          },
          {
            $project: {
              item: '$products.item',
              quantity: '$products.quantity',
              couponDiscount: 1,
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: 'item',
              foreignField: '_id',
              as: 'product',
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ['$product', 0] },
              couponDiscount: 1,
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: ['$quantity', { $toInt: '$product.total' }],
                },
              },
              couponDiscount: { $first: '$couponDiscount' },
            },
          },
          {
            $set: { total: { $subtract: ['$total', '$couponDiscount'] } },
          },
        ])
        .toArray()
      console.log(total)
      resolve(total[0])
    })
  },
  placeOrder: (order, products, total, userId) => {
    return new Promise((resolve, reject) => {
      console.log(order, products, total)
      let status = order['payment-method'] === 'COD' ? 'Placed' : 'Pending'
      let orderObj = {
        deliveryDetails: {
          address: order.address,
          city: order.city,
          district: order.district,
          state: order.state,
          zip: order.zip,
        },
        userId: objectId(order.userId),
        paymentMethod: order['payment-method'],
        products: products,
        totalAmount: total,
        status: status,
        date: new Date(),
      }

      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          db.get()
            .collection(collection.CART_COLLECTION)
            .deleteOne({ user: objectId(userId) })
          console.log('U S E R R R R R R R  R', userId)
          resolve(response.insertedId)
        })
    })
  },
  getCartProductList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) })
      console.log(cart)
      resolve(cart)
    })
  },
  getUserOrders: (userId) => {
    return new Promise(async (resolve, reject) => {
      console.log('U S E R . . . . .', userId)
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ 'products.user': objectId(userId) })
        .toArray()
      console.log('O R D E R S ', orders)
      resolve(orders)
    })
  },
  getAllOrders: () => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find()
        .toArray()
      resolve(orders)
    })
  },

  orderedProducts: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              _id: objectId(orderId),
            },
          },
          {
            $unwind: '$products.products',
          },

          {
            $project: {
              item: '$products.products.item',
              quantity: '$products.products.quantity',
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: 'item',
              foreignField: '_id',
              as: 'products',
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: {
                $arrayElemAt: ['$products', 0],
              },
            },
          },
        ])
        .toArray()
      resolve(products)
    })
  },

  deleteOrders: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .deleteOne({ _id: objectId(userId) })
        .then((response) => {
          resolve(response)
        })
    })
  },
  removeOrder: (proId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .deleteOne({ _id: objectId(proId) })
        .then((response) => {
          resolve(response)
        })
    })
  },
  removeWishlist: (details) => {
    // return new Promise((resolve, reject) =>
    // {
    //     db.get().collection(collection.WISHLIST_COLLECTION).updateOne({ _id: objectId(details.wishlist)},
    //     {
    //         $pull: { products: {item : objectId(details.product) } }).then((response) => {

    //             resolve({removeProduct: true })
    //         })
    // })

    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.WISHLIST_COLLECTION)
        .updateOne(
          { _id: objectId(details.wishlist) },
          {
            $pull: {
              products: { item: objectId(details.product) },
            },
          },
        )
        .then((response) => {
          resolve({ removeProduct: true })
        })
    })
  },

  addtoWishlist: (proId, userId) => {
    let proObj = {
      item: ObjectID(proId),
      quantity: 1,
    }
    return new Promise(async (resolve, reject) => {
      let userWishlist = await db
        .get()
        .collection(collection.WISHLIST_COLLECTION)
        .findOne({ user: objectId(userId) })
      if (userWishlist) {
        let proExist = userWishlist.products.findIndex(
          (product) => product.item == proId,
        )
        if (proExist != -1) {
          db.get()
            .collection(collection.WISHLIST_COLLECTION)
            .updateOne(
              { user: objectId(userId), 'products.item': objectId(proId) },
              {
                $inc: { 'products.$.quantity': 1 },
              },
            )
            .then(() => {
              resolve()
            })
        } else {
          db.get()
            .collection(collection.WISHLIST_COLLECTION)
            .updateOne(
              { user: objectId(userId) },
              {
                $push: { products: proObj },
              },
            )
            .then((response) => {
              resolve()
            })
        }
      } else {
        let wishlistObj = {
          user: objectId(userId),
          products: [proObj],
        }
        db.get()
          .collection(collection.WISHLIST_COLLECTION)
          .insertOne(wishlistObj)
          .then((response) => {
            resolve()
          })
      }
    })
  },

  getWishlistProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let wishlistItems = await db
        .get()
        .collection(collection.WISHLIST_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: '$products',
          },
          {
            $project: {
              item: '$products.item',
              quantity: '$products.quantity',
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: 'item',
              foreignField: '_id',
              as: 'product',
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ['$product', 0] },
            },
          },
          // from: collection.PRODUCT_COLLECTION,
          // let: { proList: '$products' },
          // pipeline: [
          //     {
          //         $match: {
          //             $expr: {
          //                 $in: ['$_id', '$$proList']
          //             }
          //         }
          //     }
          // ],
          // as: 'wishlistItems'
        ])
        .toArray()
      resolve(wishlistItems)
    })
  },
  generateRazorpay: (orderId, total) => {
    return new Promise((resolve, reject) => {
      var options = {
        amount: total * 100, // amount in the smallest currency unit
        currency: 'INR',
        receipt: '' + orderId,
      }
      instance.orders.create(options, function (err, order) {
        resolve(order)
      })
    })
  },
  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      const crypto = require('crypto')
      let hmac = crypto.createHmac('sha256', 'UVH0emKxc6QGo74T60shVClT')
      hmac.update(
        details['payment[razorpay_order_id]'] +
          '|' +
          details['payment[razorpay_payment_id]'],
      )
      hmac = hmac.digest('hex')
      if (hmac == details['payment[razorpay_signature]']) {
        resolve()
      } else {
        reject()
      }
    })
  },
  changePaymentStatus: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: ObjectID(orderId) },
          {
            $set: {
              status: 'Placed',
            },
          },
        )
        .then(() => {
          resolve()
        })
    })
  },

  getchartData: (req, res) => {
    db.get()
      .collection(collection.ORDER_COLLECTION)
      .aggregate([
        {
          $match: { status: 'Delivered' },
        },
        {
          $project: {
            date: { $convert: { input: '$_id', to: 'date' } },
            total: '$totalAmount',
          },
        },
        {
          $match: {
            date: {
              $lt: new Date(),
              $gt: new Date(new Date().getTime() - 24 * 60 * 60 * 1000 * 365),
            },
          },
        },
        {
          $group: {
            _id: { $month: '$date' },
            total: { $sum: '$total' },
          },
        },
        {
          $project: {
            month: '$_id',
            total: '$total',
            _id: 0,
          },
        },
      ])
      .toArray()
      .then((result) => {
        db.get()
          .collection(collection.ORDER_COLLECTION)
          .aggregate([
            { $match: { status: 'Delivered' } },
            {
              $project: {
                date: { $convert: { input: '$_id', to: 'date' } },
                total: '$totalAmount',
              },
            },
            {
              $match: {
                date: {
                  $lt: new Date(),
                  $gt: new Date(new Date().getTime() - 24 * 60 * 60 * 1000 * 7),
                },
              },
            },
            {
              $group: {
                _id: { $dayOfWeek: '$date' },
                total: { $sum: '$total' },
              },
            },
            {
              $project: {
                date: '$_id',
                total: '$total',
                _id: 0,
              },
            },
            {
              $sort: { date: 1 },
            },
          ])
          .toArray()
          .then((weeklyReport) => {
            console.log(weeklyReport)
            res.status(200).json({ data: result, weeklyReport })
            console.log(result)
          })
      })
  },
  deleteWishlistProduct: (details) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.WISHLIST_COLLECTION)
        .updateOne(
          { _id: objectId(details.wishlist) },
          {
            $pull: {
              products: { item: objectId(details.product) },
            },
          },
        )
        .then((response) => {
          resolve({ removeProduct: true })
        })
    })
  },
  addAddress: (userId, userDetails) => {
    return new Promise((resolve, reject) => {
      let address = {
        address: userDetails.address,
        city: userDetails.city,
        district: userDetails.district,
        state: userDetails.state,
        pin: userDetails.pin,
      }
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: objectId(userId) },
          {
            $push: {
              addresses: address,
            },
          },
        )
        .then((response) => {
          resolve()
        })
    })
  },
  getAddress: (userId) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: objectId(userId) })
        .then((address) => {
          resolve(address)
        })
    })
  },
  // getUserAddress: () => {
  //     return new Promise((resolve, reject) => {

  //     })

  // },

  userDetails: (userId) => {
    return new Promise(async (resolve, reject) => {
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: objectId(userId) })

      resolve(user)
    })
  },

  updateOrderStatus: (details) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(details.orderId) }, // C H A N G E   H E R E . . . ..
          {
            $set: {
              status: details.status,
            },
          },
        )
    })
  },
  catProducts: (id) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ category: objectId(id) })
        .toArray()
        .then((product) => {
          resolve(product)
        })
    })
  },
  CancelOrder: (id) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(id) },
          {
            $set: {
              status: 'Cancelled',
            },
          },
        )
        .then((response) => {
          resolve()
        })
    })
  },
}
