const roleMiddleware = (...allowedRoles) => {
    return (req, res, next) => {

        // ==========================================
        // CHECK AUTHENTICATION
        // ==========================================

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }


        // ==========================================
        // CHECK ALLOWED ROLES
        // ==========================================

        if (!allowedRoles || allowedRoles.length === 0) {
            console.error(
                "Role Middleware Error: No allowed roles specified"
            );

            return res.status(500).json({
                success: false,
                message: "Server configuration error",
            });
        }


        // ==========================================
        // NORMALIZE USER ROLE
        // ==========================================

        const userRole = String(req.user.role || "")
            .trim()
            .toLowerCase();


        // ==========================================
        // NORMALIZE ALLOWED ROLES
        // ==========================================

        const normalizedAllowedRoles = allowedRoles.map((role) =>
            String(role)
                .trim()
                .toLowerCase()
        );


        // ==========================================
        // CHECK ROLE
        // ==========================================

        if (!normalizedAllowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You do not have permission.",
            });
        }


        // ==========================================
        // ALLOW REQUEST
        // ==========================================

        next();
    };
};


module.exports = roleMiddleware;