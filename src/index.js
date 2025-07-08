import connectDB from "./db/connectDB.js";
import dotenv  from 'dotenv';

//env config
dotenv.config({path: './env'})

//connecting database
connectDB();