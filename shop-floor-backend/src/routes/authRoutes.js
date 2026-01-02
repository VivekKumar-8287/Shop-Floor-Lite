// routes/authRoutes.js
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();
const JWT_SECRET = "shopfloor_lite_secret_key_2024"; // Use env variable in production
const TENANT_ID = "tenant_123"; // Default tenant

// 1. REGISTER - Create new user with role selection
router.post("/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, employeeId } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email, tenant_id: TENANT_ID });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User already exists",
      });
    }

    // Validate role
    const validRoles = ["operator", "supervisor"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: "Role must be operator or supervisor",
      });
    }

    // Create user
    const user = new User({
      email: email.toLowerCase().trim(),
      password, // Hash this in production
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      employeeId: employeeId || null,
      tenant_id: TENANT_ID,
      isActive: true,
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Response
    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName} ${user.lastName}`,
          role: user.role,
          employeeId: user.employeeId,
          tenant_id: user.tenant_id,
        },
        token,
        expiresIn: 604800, // 7 days
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      error: "Registration failed",
    });
  }
});

// 2. LOGIN - Accept any email (as per requirements)
// If you want role to be REQUIRED during login
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate ALL fields are required
    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: "Email, password, and role are required",
      });
    }

    // Validate role
    if (!["operator", "supervisor"].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Role must be either "operator" or "supervisor"',
      });
    }

    // Find user
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      tenant_id: TENANT_ID,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check password
    if (password !== user.password) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Verify role matches exactly
    if (user.role !== role) {
      return res.status(403).json({
        success: false,
        error: `Cannot login as ${role}. Your account role is ${user.role}.`,
      });
    }

    // Check if active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: "Account is deactivated",
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: `Login successful as ${user.role}`,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName} ${user.lastName}`,
          role: user.role,
        },
        token,
        expiresIn: 604800,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Login failed",
    });
  }
});

// 3. USER PROFILE - Get user details (protected)
router.get("/profile", async (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    // Find user
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Return profile
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: `${user.firstName} ${user.lastName}`,
          role: user.role,
          employeeId: user.employeeId,
          department: user.department,
          currentShift: user.currentShift,
          tenant_id: user.tenant_id,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
      },
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch profile",
    });
  }
});

// 4. LOGOUT - Client-side token invalidation
router.post("/logout", (req, res) => {
  // Note: For JWT, logout is client-side (remove token from storage)
  // In production, you might want a token blacklist

  res.json({
    success: true,
    message:
      "Logged out successfully. Please remove token from device storage.",
  });
});

export default router;
