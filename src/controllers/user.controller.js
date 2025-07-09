import {asyncHandler} from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import {User}  from '../models/user.model.js';
import { uploadOnCCloudinary } from '../utils/cloudinary.js';

const registerUser = asyncHandler( async (req, res)=>{
    // get user details from fontend
    // validations - not empty
    // check existing user: username , email
    // check for images, avatar
    // available - upload to cloudinary, avatar check
    // create user object -create entry in database
    // remove password and refresh token from response
    // check for user creation 
    // return response

    const {fullName, email, username, password} = req.body;
    console.log("email: ", email);

    // if(fullname === ""){

    //     throw new ApiError(400, "FullName is required")
    // }

    if(
        [fullName, email, username, password].some((field)=> field?.trim()==="")
    ){
        throw new ApiError(400, "All fields are required");
    }
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    const existingUser = await User.findOne({
        $or: [{email}, {username}]
    })

    if(existingUser){
        throw new ApiError(409, "User already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "avatar file is required");
    }

    const avatar = await uploadOnCCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCCloudinary(coverImageLocalPath);
    if(!avatar){
        throw new ApiError(400, "Avatar file is required");
    }

    const user  = await User.create({
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        fullName,
        username: username.toLowerCase(),
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser){
        throw new ApiError(500, "Error while registering new user");
    }


    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

})

export {registerUser}