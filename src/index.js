import connectDB from "./db/connectDB.js";
import dotenv  from 'dotenv';
import { app } from "./app.js";

//env config
dotenv.config({path: './env'})

//connecting database
connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8080, ()=>{
        console.log(`Server is running on port : ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("Mongodb connection failed !!!", err);
})