import mongoose from "mongoose";
import SupportTicket from "../models/supportTicket.model.js";
import User from "../models/user.model.js";
import Order from "../models/order.model.js"

export const createSupportTicket = async (req, res, next) => {
    try {
        const { subject, description, order } = req.body;

        if (
            typeof subject !== "string" || typeof description !== "string" || !subject.trim() || !description.trim()
        ) {
            return res.status(400).json({
                succeess: false,
                message: "subject and desciption is required.",
            });
        }

        if (subject.trim().length < 3 || subject.trim().length >150){
            return res.status(400).json({
                success: false,
                message: "Subject must be between 3 and 150 characters"
            })
        }

        if(description.trim().length > 5000) {
            return res.status(400).json({
                success: false,
                message: "description cannot exceed 5000 characters"
            });
        }

        if(order){
            if(! mongoose.isValidObjectId(order)){
                return res.status(400).json({
                    success:false,
                    message: "Invalid order ID",
                });
            }

            const customerOrder = await Order.findone({
                _id: order,
                customer: req.user._id,
            });
            if(!customerOrder) {
                return res.status(404).json({
             success:failed,
             message: "order not found for this customer."
                })
            }
            
        }

        const ticket = await SupportTicket.create({
            customer: req.user._id,
            order: order || null,
            subject: subject.trim(),
            description: description.trim(),
            messages: [
                {
                    sender: req.user._id,
                    message: description.trim(),
                },
            ],
        });

        return res.status(201).json({
            success: true,
            message: "Support ticket created successfully.",
            data: ticket,
        })
    } catch (error) {
        next(error)
    }
};

export const getMySupportTickets = async (req, res, next) => {
    try {
        const tickets = await SupportTicket.find({
            customer: req.user._id,
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: tickets.length,
            data: tickets,
        });
    } catch (error) {
        next(error);
    }
};

export const
    getSupportTicketById = async (req, res, next) => {
        try {
            const { ticketId } = req.params;
            if (!ticketId || !mongoose.isValidObjectId(ticketId
            )) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid support ticket ID",
                });
            }

            const ticket = await SupportTicket.findOne({
                _id: ticketId,
                customer: req.user._id
            }).populate("messages.sender", "name email role");

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: "support ticket not found",
                });
            }
            return res.status(200).json({
                success: true,
                data: ticket,
            })
        } catch (error) {
            next(error)
        }
    };

export const replyToSupportTicket = async (req, res, next) => {
    try {
        const { ticketId } = req.params;
        const { message } = req.body;

        if (!mongoose.isValidObjectId(ticketId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid support ticketId.",
            });
        }

        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({
                success: false,
                message: "message cannot be empty",
            })
        }

        if (message.trim().length > 5000) {
            return res.status(400).json({
                success: false,
                message: "Message cannot exceed 5000 characters.",
            });
        }

        const ticket = await SupportTicket.findOne({
            _id: ticketId,
            customer: req.user._id,
        });

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: "Suppot ticket not found",
            });
        }

        if (["Resolved", "Closed"].includes(ticket.status)) {
            return res.status(400).json({
                success: false,
                message: "This ticket is closed to new replies.",
            });
        }

        ticket.messages.push({
            sender: req.user._id,
            message: message.trim(),
        });

        await ticket.save();

        return res.status(200).json({
            success: true,
            message: "reply sent successfully",
            data: ticket,
        });
    } catch (error) {
        next(error);
    }
};

//get all tickets by support staff

export const
    getAllSupportTickets = async (req, res, next) => {
        try {
            const tickets = await SupportTicket.find().populate("customer", "name email role").populate("order", "orderReference status").populate("assignedTo", "name email role").sort({ createdAt: -1 });

            return res.status(200).json({
                success: true,
                message: "support tickets retrieved successfully",
                count: tickets.length,
                data: tickets,
            });
        } catch (error) {
            next(error);
        }
    };

//Authorized staffs to reply to ticket
export const staffReplyToSupportTicket = async (req, res, next) => {
    try {
        const { ticketId } = req.params;
        const { message } = req.body
        if (!mongoose.isValidObjectId(ticketId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid support ticket ID.",
            });
        }
        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({
                success: failed,
                message: "message cannot be empty",
            });
        }

        if (message.trim.length > 5000) {
            return res.status(400).json({
                success: false,
                message: "Message cannost exceed 5000 characters"
            });
        }

        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({
                success: failed,
                message: "Support ticket not found.",
            });
        }

        if (["Resolved", "Closed"].includes(ticket.status)) {
            return res.status(400).json({
                success: false,
                message: "Cannot reply to a resolve or closed ticket.",
            });
        }

        ticket.messages.push({
            sender: req.user._id,
            message: message.trim()
        });
        await ticket.save();

        return res.status(200).json({
            success: true,
            message: "Staff reply sent successfully",
            data: ticket,
        });
    } catch (error) {
        next(error)
    }
};

//assigning support tickets to authorized staffs
export const assignSupportTicket = async (req, res, next) => {
    try {
        const { ticketId } = req.params;
        const { staffId } = req.body

        if (!mongoose.isValidObjectId(ticketId) || !mongoose.isValidObjectId(staffId)) {
            return res.statu(400).json({
                success: false,
                message: "invalid ticket Id or staff id",
            });
        }
        const staff = await User.findOne({
            _id: staffId,
            role: { $in: ["Administrator", "Laundry Staff"] },
            isActive: true,
        });
        if (!staff) {
            return res.status(400).json({
                success: false,
                message: " Selected staff member is invalid or inacive"
            });
        }

        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: " Support ticket not found",
            });
        }
        ticket.assignedTo = staff._id
        await ticket.save()
        return res.status(200).json({
            success: true,
            message: "Support ticket assigned successfully.",
            data: ticket,
        });
    } catch (error) {
        next(error)
    }
};
//update ticket's status
export const updateSupportTicketStatus = async (req, res, next) => {
    try {
        const { ticketId } = req.params
        const { status } = req.body;
        const allowedStatuses = ["Open", "Inprogress", "Closed"];
        if (!mongoose.isValidObjectId(ticketId)) {
            return res.status(400).json({
                success: false,
                message: "invalid support ticket Id",
            });
        }
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: " invalid statuses, use open , in progress or closed"
            });
        }
        const ticket = await SupportTicket.finByIdAndUpdate(ticketId);
        if (!ticket) {
            return res.status(404), json({
                success: false,
                message: "support ticket not found."
            });
        }
        ticket.status = status;
        await ticket.save();
        return res.status(200).json({
            success: true,
            message: "Support ticket status updated successfully.",
            data: ticket
        });
    } catch (error) {
        next(error);
    }
};

//update ticket priority
export const updateSupportTicketPriority = async (req, res, next) => {
    try {
        const { ticketId } = req.params
        const { priority } = req.body
        const allowedPriorities = ["Low", "Medium", "High", "Urgent"]
        if (!mongoose.isValidObjectId(ticketId)) {
            return res.status(400).json({
                success: false,
                message: "invalid support ticket ID",
            });
        }
        if (!allowedPriorities.includes(priority)) {
            return res.status(400).json9({
                success: false,
                message: "invalid priority level",
            });
        }
        const ticket = await SupportTicket.findByIdAndUpdate(ticketId);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                messege: "Support ticket not found",
            });
        }
        ticket.priority = priority
        await ticket.save();
        return res.status(200).json({
            success: true,
            message: "support ticket priority updated successfully.",
            data: ticket,
        });

    } catch (error) {
        next(error)
    }
};

 export const resolveSupportTicket = async (req, res, next) => {
    try {
        const { ticketId } = req.params;
        const { resolution } = req.body;

        if (!mongoose.isValidObjectId(ticketId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid support ticket ID.",
            });
        }

        if (typeof resolution !== "string" || !resolution.trim()) {
            return res.status(400).json({
                success: false,
                message: "Resolution details are required(maximum of 5000 characters).",
            });
        }

        if (resolution.trim().length > 5000) {
            return res.status(400).json({
                success: false,
                message: "Resolution details cannot exceed 5000 characters.",
            });
        }

        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: "Support ticket not found.",
            });
        }

        if (["Resolved", "Closed"].includes(ticket.status)) {
            return res.status(400).json({
                success: false,
                message: "This ticket is already resolved or closed.",
            });
        }

        ticket.status = "Resolved";
        ticket.resolution = resolution.trim();
        ticket.resolvedBy = req.user._id;
        ticket.resolvedAt = new Date();
        await ticket.save();

        return res.status(200).json({
            success: true,
            message: "Support ticket resolved successfully.",
            data: ticket,
        });
    } catch (error) {
        next(error);
    }
};



