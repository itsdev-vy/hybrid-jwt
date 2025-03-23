import { Router } from 'express';
import { registerUser, loginUser, protectedUser, refreshUserToken, getActiveSessions, logoutCurrentDevice, logoutAllDevices } from '../controllers/user.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// router.use(verifyJWT); // This middleware will be applied to all routes in this file

//public routes
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);

//protected routes
router.route("/dashboard").get(verifyJWT, protectedUser);
router.route("/refresh-token").post(verifyJWT, refreshUserToken);
router.route("/active-sessions").get(verifyJWT, getActiveSessions);
router.route("/logout").get(verifyJWT, logoutCurrentDevice);
router.route("/logout-all").get(verifyJWT, logoutAllDevices);

export default router;