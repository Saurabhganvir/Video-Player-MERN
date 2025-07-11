import { Router } from "express";
import { loginUser, logOutUser, refreshTokenAccess, registerUser } from "../controllers/user.controller.js";
import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route('/register').post(
    upload.fields([
        {
            name: 'avatar',
            maxCount: 1
        },
        {
            name:'coverImage',
            maxCount: 1
        }
    ]),
    registerUser
);

//login route
router.route('/login').post(loginUser);

//secure route
router.route('/logout').post(verifyJWT, logOutUser);

//refresh token
router.route('/refresh-token').post(refreshTokenAccess);

export default router;