var db = require('../config/connection')
var collection = require('../config/collections');
const { ObjectID } = require('bson');
const { response } = require('express');
const { Db } = require('mongodb');
var objectId = require('mongodb').ObjectId
var moment=require('moment');

module.exports =
{
    addProduct: (products, callback) => {
        console.log("adddd  productssssssssss",products)
        products.offer=parseInt(products.offer)
        products.price=parseInt(products.price)
        products.total=products.price-products.offer;
        db.get().collection('products').insertOne(products).then((data) => {
            callback(data.insertedId);
        })
    },
    addCategory: (category) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.PRODUCT_CATEGORY).insertOne(category).then((data) => {
                resolve(data.insertedId)
            })
        })
    },
    getAllCategory: () => {
        getOffers()
        return new Promise(async (resolve, reject) => {
            let category = await db.get().collection(collection.PRODUCT_CATEGORY).find().toArray()
            resolve(category)
        })
    },
    getAllProducts: () => {
        getOffers()
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                {
                    $lookup:
                    {
                        from:collection.PRODUCT_CATEGORY,
                        localField:'category',
                        foreignField:'_id',
                        as:'categories'
                    }
                }
            ]).toArray()
            resolve(products)
        }) 
    },
    deleteProduct: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).remove({ _id: objectId(proId) }).then((response) => {
                resolve(response)
            })
        })
    },
    deleteCategory: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_CATEGORY).remove({ _id: objectId(proId) }).then((response) => {
                resolve(response)
            })
        })
    },
    getProductDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).aggregate([{$match : { _id: objectId(proId) }},
                {
                    $lookup:
                    {
                        from:collection.PRODUCT_CATEGORY,
                        localField:'category',
                        foreignField:'_id',
                        as:'categories'
                    }
                }]).toArray().then((product) => {
                resolve(product)
            })
        })
    },
    getCategoryDetails: (catId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_CATEGORY).find({ _id: objectId(catId) }).toArray().then((category) => {
                resolve(category)
            })
        })
    },
    updateCategory: (catId, CatDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_CATEGORY).updateOne({ _id: objectId(catId) }, {
                $set:
                {
                    categoryname: CatDetails.name,
                    description: CatDetails.category,
                    categoryoffer: CatDetails.offer
                }
            }).then((response) => {
                resolve()
            })
        })
    },
    updateProduct: (proId, proDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectId(proId) }, {
                $set: {
                    name: proDetails.name,
                    description: proDetails.description,
                    price: proDetails.price,
                    category: proDetails.category
                }
            }).then((response) => {
                resolve()
            })
        })
    },
    blockUser: (userId, status) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, {
                $set:
                {
                    blockStatus: status
                }
            }).then((response) => {
                resolve()
            })
        })
    },
    getUserCount: () => {
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).find().count()
            resolve(user)
        })
    },
    getProductCount: () => {
        return new Promise(async (resolve, reject) => {
            let product = await db.get().collection(collection.PRODUCT_COLLECTION).find().count()
            resolve(product)
        })
    }, getOrderCount: () => {
        return new Promise(async (resolve, reject) => {
            let order = await db.get().collection(collection.ORDER_COLLECTION).find().count()
            resolve(order)
        })
    },
    addCoupons: (coupon) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).insertOne(coupon).then((data) => {
                resolve(data.insertedId)
            })
        })
    },
    getAllCoupons: () => {
        return new Promise((resolve, reject) => {
            let coupons = db.get().collection(collection.COUPON_COLLECTION).find().toArray()
            resolve(coupons)
        })
    },
    getCouponDetails: (couponId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).find({ _id: objectId(couponId) }).toArray().then((coupon) => {
                resolve(coupon)
            })
        })
    },
    updateCoupons: (couponId, couponDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).updateOne({ _id: objectId(couponId) },
                {
                    $set: {
                        name: couponDetails.couponname,
                        coupon_code: couponDetails.offer,
                        discount: couponDetails.discount,
                       mintotal: couponDetails.mintotal,
                    }
                }).then((response) => {
                    resolve()
                })
        })
    },
    deleteCoupons: (couponId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).remove({ _id: objectId(couponId) }).then((response) => {
                resolve(response)
            })
        })
    },
    addCategoryOff: (catId, offer, validTill) => {
        return new Promise(async (resolve, reject) => {
            let offerPrice = []
            let offTill = validTill
            let off = Number(offer)
            let categ = { category: catId }
            await db.get().collection(collection.PRODUCT_COLLECTION).find(categ).toArray().then((res) => {
                res.forEach(data => {
                    let price = Number(data.price)
                    offerPrice.push({ offerPrice: parseInt(price - (price * (off / 100))), proId: data._id })
                });
                offerPrice.forEach(data => {
                    db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: data.proId }, { $set: { offerPrice: data.offerPrice } })
                })
                    db.get().collection(collection.PRODUCT_CATEGORY).updateOne({ _id: objectId(catId) }, { $set: { offer: off, validTill: offTill } }).then((res) => {
                })
            })
            resolve()
        }) 
    },
    validateCouponCode:(coupon)=>
    {
        return new Promise((resolve,reject)=>
        {
            db.get().collection(collection.COUPON_COLLECTION).findOne({coupon_code:coupon }).then((res)=>
            {
                resolve(res)
            })
        })
    },
    addCouponDiscount : (userId, amount) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).updateOne({user: objectId(userId)}, { $set : {couponDiscount : Number(amount)}}).then(() => {
                resolve();
            })
        })
    }
}





function getOffers()
{
    return new Promise((resolve,reject)=>
    {
        let date=new Date()
        let currentDate= moment(date).format('YYYY-MM-DD')
        db.get().collection(collection.PRODUCT_CATEGORY).find().toArray().then(async(categories)=>{
            for(let i in categories)
            {
                let cartId=categories[i]._id.toString()
                let products= await db.get().collection(collection.PRODUCT_COLLECTION).find({category:cartId}).toArray()
                if(categories[i].offer)
                {
                    if(categories[i].validTill< currentDate)
                    {
                        db.get().collection(collection.PRODUCT_CATEGORY).findOneAndUpdate({_id: objectId(categories[i]._id)},
                        {
                            $unset: {
                                "offer":categories[i].offer,
                            }
                        })
                        products.forEach(data=>
                            {
                                db.get().collection(collection.PRODUCT_COLLECTION).updateMany({category:catId},
                                    {
                                        $unset:{
                                            "offerPrice":data.offerPrice
                                        }
                                    })
                            })
                    }}
            }
        })
    })
}
