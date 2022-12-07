const mongoClient=require('mongodb').MongoClient
const state={db:null}
require('dotenv').config

module.exports.connect=function(done){
    console.log(process.env.MONGO_PASSWORD)
    const url=`mongodb+srv://fidha:${process.env.MONGO_PASSWORD}@cluster0.pamjljm.mongodb.net/?retryWrites=true&w=majority`
    const dbname='TimeZone'

    mongoClient.connect(url,(err,data)=>{
        if(err) return  done(err)
        state.db=data.db(dbname)
        done()
    })


}
module.exports.get=function(){
    return state.db
}