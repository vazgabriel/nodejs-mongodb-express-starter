const jwt = require("jsonwebtoken");
const authConfig = require("../../config/auth");

module.exports = async (req, res, next) => {
  const authHeaders = req.headers.authorization;

  if (!authHeaders) {
    return res.status(401).json({
      error: "No token provided"
    });
  }

  const parts = authHeaders.split(" ");

  if (!parts.length === 2) {
    return res.status(401).json({
      error: "Token error"
    });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({
      error: "Token malformatted"
    });
  }

  jwt.verify(token, authConfig.secret, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        error: "Token invalid"
      });
    }

    req.userId = decoded.params.id;
    
    return next();
  });
};
