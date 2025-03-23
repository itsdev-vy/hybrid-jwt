import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async (user, req) => {
    try {
        const accessToken = user.generateAccessToken();
        const newRefreshToken = user.generateRefreshToken();

        const deviceInfo = req.headers["user-agent"] || "Unknown device";     // Extract device info from request headers (e.g., User-Agent)

        user.refreshTokens.push({
            token: newRefreshToken,
            deviceInfo,
            createdAt: new Date(),
            lastUsedAt: new Date()
        });  // Add the new refresh token to the user's refreshTokens array

        if (user.refreshTokens.length > 5) {
            user.refreshTokens.shift(); // Remove the oldest token & keep the latest 5 refresh tokens means 5 active sessions
        }
        return { accessToken, newRefreshToken };
    } catch (error) {
        throw new Error(error.message);
    }
};

const registerUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        if ([firstName, lastName, email, password].some((field) => field?.trim() === "")) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const user = await User.create({ firstName, lastName, email, password });

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshTokens.push({
            token: refreshToken,
            deviceInfo: req.headers["user-agent"] || "Unknown device",
            createdAt: new Date(),
            lastUsedAt: new Date()
        });
        await user.save({ validateBeforeSave: false });

        const { password: _, refreshTokens: __, ...userWithoutPassword } = user.toObject();

        const options = { httpOnly: true, secure: true, maxAge: 24 * 60 * 60 * 1000 };

        return res
            .status(201)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json({ message: "User Registration Successful", data: userWithoutPassword });
    } catch (error) {
        return res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if ([email, password].some((field) => field?.trim() === "")) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User does not exist" });
        }

        const isPasswordValid = await user.isPasswordMatched(password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Add refresh token to user's refreshTokens array
        user.refreshTokens.push({
            token: refreshToken,
            deviceInfo: req.headers["user-agent"] || "Unknown device",
            createdAt: new Date(),
            lastUsedAt: new Date()
        });
        await user.save({ validateBeforeSave: false });

        const { password: _, refreshTokens: __, ...userWithoutPassword } = user.toObject();

        const options = {
            httpOnly: true,
            secure: true,
            maxAge: 24 * 60 * 60 * 1000,
        };

        res.cookie("accessToken", accessToken, options);
        res.cookie("refreshToken", refreshToken, options);
        res.status(200).json({ message: "Login Successful", data: userWithoutPassword });

    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error: error.message });

    }
}

const protectedUser = (req, res) => {
    res.status(200).json({ message: `Welcome ${req.user.firstName} ${req.user.lastName}! This is a protected route.` });
}

const refreshUserToken = async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

        if (!incomingRefreshToken) {
            return res.status(401).json({ message: "Unauthorized - No refresh token provided" });
        }

        const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decoded._id).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const tokenEntry = user.refreshTokens.find((entry) => entry.token === incomingRefreshToken);

        if (!tokenEntry) {
            return res.status(401).json({ message: "Unauthorized - Invalid refresh token" });
        }

        // Update lastUsedAt before removing the token
        tokenEntry.lastUsedAt = new Date();

        // Rotation: Remove the old refresh token and generate a new one
        user.refreshTokens = user.refreshTokens.filter((entry) => entry.token !== incomingRefreshToken);

        const options = {
            httpOnly: true,
            secure: true,
        };

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user, req);

        await user.save({ validateBeforeSave: false }); // Save the user with the updated refresh tokens array

        return res
            .status(200)
            .cookie("refreshToken", newRefreshToken, options)
            .cookie("accessToken", accessToken, options)
            .json({ message: "Access token refreshed", accessToken, refreshToken: newRefreshToken });

    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error: error.message });
    }
}

const getActiveSessions = async (req, res) => {
    const user = req.user;

    // Map refreshTokens to a cleaner format for the response
    const sessions = user.refreshTokens.map((entry) => ({
        deviceInfo: entry.deviceInfo,
        createdAt: entry.createdAt,
        lastUsedAt: entry.lastUsedAt,
    }));

    return res.status(200).json({ message: "Active sessions", sessions });
};

const logoutCurrentDevice = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
        if (!incomingRefreshToken) {
            return res.status(400).json({ message: "No refresh token provided" });
        }

        // Remove only the current device's refresh token
        user.refreshTokens = user.refreshTokens.filter(
            (entry) => entry.token !== incomingRefreshToken
        );

        await user.save({ validateBeforeSave: false });

        const options = {
            httpOnly: true,
            secure: true,
        };

        return res
            .status(200)
            .clearCookie("refreshToken", options)
            .clearCookie("accessToken", options)
            .json({ message: "Logout successful" });
    } catch (error) {
        return res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};

const logoutAllDevices = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Clear all refresh tokens
        user.refreshTokens = [];
        await user.save({ validateBeforeSave: false });

        const options = { httpOnly: true, secure: true };

        return res
            .status(200)
            .clearCookie("refreshToken", options)
            .clearCookie("accessToken", options)
            .json({ message: "Logged out from all devices" });
    } catch (error) {
        return res.status(500).json({ message: "Something went wrong", error: error.message });
    }
};

export { registerUser, loginUser, protectedUser, refreshUserToken, getActiveSessions, logoutCurrentDevice, logoutAllDevices };