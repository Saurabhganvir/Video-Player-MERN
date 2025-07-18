import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

//setting up crossOrigin middleware
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true, 
}));

//setting up json config
app.use(express.json({
    limit: '16kb'
}));

//url configuration
//extended - object inside object
app.use(express.urlencoded({extended:true, limit:'16kb'}));

//static files config
app.use(express.static('public'));

//cookie parser - CRUD operations on users cookies
app.use(cookieParser());


//routes import 
import userRouter from './routes/user.routes.js';

//routes declarations
app.use('/api/v1/users', userRouter);
//http://localhost:8080/api/v1/users/register

export {app};