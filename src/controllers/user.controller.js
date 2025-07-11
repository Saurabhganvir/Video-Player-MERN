import {asyncHandler} from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import {User}  from '../models/user.model.js';
import { uploadOnCCloudinary } from '../utils/cloudinary.js';
import jwt from 'jsonwebtoken';

//method for generating access and refress token
 
const generateAccessAndRefreshToken = async (userId)=>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        user.accessToken= accessToken;
        await user.save({validateBeforeSave: false});
        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, 'error while generating access and refresh token');
    }
}

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


// login controller
const loginUser = asyncHandler( async (req, res)=>{
    // req body->data
    // username or email base login
    // find user
    // password check
    // access and refresh token generate
    // send cookies and response

    const {email, username , password} = req.body;

    if(!(username  || email)){
        throw new ApiError(400, "Username or email required");
    }

    const user = await User.findOne({
        $or:[{email}, {username}]
    })

    if(!user){
        throw new ApiError(400, 'User does not exist');
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials");
    }

    const {refreshToken, accessToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // cookies options
    // after selecting the below options they can only  be modified via backend
    const options = {
        httpOnly: true,
        secure: true
    }
    
    return res.status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json(
        new ApiResponse(200, {
            user: loggedInUser, accessToken, refreshToken
        }, "User logged In successfully")
    )

})


const logOutUser = asyncHandler(async(req, res)=>{
    //clear cookies
    //remove access and refresh tokens
    // we do not have access of user directly so we create auth middleware and add req.user = user
    // now we can access req.user
    await User.findByIdAndUpdate(
        req.user._id,{
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie(accessToken)
    .clearCookie(refreshToken)
    .json( new ApiResponse(200, {}, "User logged out"))
})

const refreshTokenAccess = asyncHandler(async (req, res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken ;
    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(401, "Invalid refresh token");
        }
        if(incomingRefreshToken!== user?.refreshToken){
            throw new ApiError(401, "Token expired or used");
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const {accessToken, nweRefreshToken} = await generateAccessAndRefreshToken(user._id);

        return res
        .status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', nweRefreshToken, options)
        .json(
            new ApiResponse(200, 
                {accessToken, refreshToken: nweRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async(req, res)=>{
    const {oldPassword, newPassword} = req.body;
    // if(newPassword!==confPassword){
    //     throw new ApiError(401, 'Confirm password does not match')
    // }
    // this has access to user as it is already logged in
    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if(!isPasswordCorrect){
        throw new ApiError(401, "old password is incorrect");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json( new ApiResponse(200, {}, "Password is changed"));
})

const getCurrentUser = asyncHandler( async (req, res)=>{
    return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully");
})

const updateAccountDetails = asyncHandler(async(req, res)=>{
    const {fullName, email} = req.body;
    if(!fullName || !email){
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {new: true}
    ).select("-password");

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account updated successfully"));

})

//files update using multer 
const updateUserAvatar = asyncHandler( async(req, res)=>{
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath){
        throw new ApiError(400, 'Avatar file is missing');
    }
    const avatar = await uploadOnCCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id, 
        {
            $set:
            {
                avatar: avatar.url
            }
        }, {new: true}
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "user avatar updated")
    );

})

const updateUserCoverImage = asyncHandler( async(req, res)=>{
    const coverImageLocalPath = req.file?.path;
    if(!coverImageLocalPath){
        throw new ApiError(400, 'cover image file is missing');
    }
    const coverImage = await uploadOnCCloudinary(coverImageLocalPath);

    if(!avatar.url){
        throw new ApiError(400, "Error while uploading cover Image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id, 
        {
            $set:
            {
                coverImage: coverImage.url
            }
        }, {new: true}
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "cover image updated")
    )
})

const getUserChannelProfile = asyncHandler( async (req, res)=>{
    const {username} = req.params;
    if(!username?.trim()){
        throw new ApiError(400, "username is missing");
    }

    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as : "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size :"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size: "subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "channel does not exists");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})


export {
    registerUser,
    loginUser,
    logOutUser,
    refreshTokenAccess,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage, 
    getUserChannelProfile,
    getWatchHistory
}