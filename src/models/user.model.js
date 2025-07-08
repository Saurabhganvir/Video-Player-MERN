import mongoose, {Schema} from "mongoose";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const userSchema = new Schema({
    username:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullname:{
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    watchHistory:[{
        type: Schema.Types.ObjectId,
        ref: 'Video'
    }],
    password:{
        type: String,
        required: [true, 'password is required'],
    },
    avatar:{
        type: String, //cloudinary
        required: true,        
    },
    coverImage:{
        type: String,
    },
    refreshToken:{
        type: String,
    }
},{timestamps:true});


//do not use arrow functions as they do not access to 'this' keyword
userSchema.pre('save', async function (next) {
    if(!this.isModified("password")) return next();

    this.password = bcrypt.hash(this.password, 10);
    next();    
});

//adding password validation as method
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

export const User = mongoose.model('User', userSchema);