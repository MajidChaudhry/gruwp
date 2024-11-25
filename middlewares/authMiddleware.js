import jwt from "jsonwebtoken";
import "dotenv/config";
const protect = async (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    // Verify the token and extract the payload
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
   
    // Attach the user details to the request object
    req.userId = decoded.id;
    req.role = decoded.role;
    if(decoded.profileId){
      req.profileId=decoded.profileId;
    }
    if (!req.userId) {
      return res.status(404).json({ message: "User not found" });
    }
   
    console.log( req.userId,req.role,req.profileId)
    next();
  } catch (err) {
    // Handle token expiration or invalid token errors
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Token verification failed" });
  }
};

export default protect;
