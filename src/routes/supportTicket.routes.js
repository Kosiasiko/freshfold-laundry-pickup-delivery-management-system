import express from "express";

import {
    createSupportTicket,
    getMySupportTickets,
    getSupportTicketById,
    replyToSupportTicket,
    getAllSupportTickets,
    staffReplyToSupportTicket,
    assignSupportTicket,
    updateSupportTicketStatus,
    updateSupportTicketPriority,
    resolveSupportTicket,
} from "../controllers/supportTicket.controller.js"

import {authenticate} from "../middleware/auth.middleware.js";
import {authorizeRoles} from "../middleware/role.middleware.js";
const router = express.Router();

router.post (
    "/",
    authenticate,
    authorizeRoles("Customer"),
createSupportTicket
);

router.get(
    "/my-tickets",
    authenticate,
    authorizeRoles("Customer"),
    getMySupportTickets
);

router.get(
    "/my-tickets/:ticketId",
    authenticate,
    authorizeRoles("Customer"),
    getSupportTicketById
);

router.post (
    "/my-tickets/:ticketId/messages",
    authenticate,
    authorizeRoles("Customer"),
    replyToSupportTicket
);

//staff routes
router.get("/",
    authenticate,
    authorizeRoles("Administrator", "Laundry staff"),
    getAllSupportTickets
);

router.post(
    "/:ticketId/messages",
    authenticate,
    authorizeRoles("Adminstrator", "Laundry Staff"),
    staffReplyToSupportTicket
);

//Administrator-only routes
router.patch(
    "/:ticketId/assignment",
    authenticate,
    authorizeRoles("Administrator"),
    assignSupportTicket
);

router.patch(
    "/:ticketId/priority",
    authenticate,
    authorizeRoles("Administrator"),
    updateSupportTicketPriority
);

//staff and administrator routes
router.patch(
    "/:ticketId/status",
    authenticate,
    authorizeRoles("Administrator", "Laundry Staff"),
    updateSupportTicketStatus
);

router.patch(
    "/:ticketId/resolution",
    authenticate,
    authorizeRoles("Administrator", "Laundry Staff"),
    resolveSupportTicket
);

export default router;